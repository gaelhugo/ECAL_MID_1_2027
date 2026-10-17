import { Cell, EMPTY_STEP } from "./Cell.js";
import { CellInserter } from "./CellInserter.js";
import { CodeGenerator } from "../llm/CodeGenerator.js";

/**
 * Le notebook : crée les cellules, gère la sélection, l'ajout, la suppression,
 * le déplacement et l'exécution. Les exécutions sont mises en file d'attente,
 * comme dans Colab.
 *
 * Événements émis : 'busy', 'idle', 'delete' (une cellule a été supprimée)
 * et 'restart' (le notebook a été réinitialisé).
 */
export class Notebook extends EventTarget {
  #steps; // étapes d'origine, pour pouvoir réinitialiser
  #cells = [];
  #beforeRestart = null; // cellules avant réinitialisation, pour pouvoir annuler
  #selected = 0; // position de la cellule sélectionnée
  #nextId = 0;
  #count = 0; // compteur d'exécution global, affiché [n]
  #executed = new Set(); // id des cellules exécutées depuis le dernier redémarrage
  #lastDeleted = null; // { cell, index } pour pouvoir annuler
  #queue = Promise.resolve();
  #pending = 0;

  constructor(root, steps, kernel, generator = new CodeGenerator()) {
    super();
    this.root = root;
    this.kernel = kernel;
    this.generator = generator;
    this.topInserter = new CellInserter(() => this.insert(0));
    this.#steps = steps;
    this.#cells = steps.map((step) => this.#createCell(step));
    this.#render();

    // Les messages du noyau sont affichés sous la cellule concernée
    kernel.addEventListener("output", ({ detail }) =>
      this.#cells
        .find((cell) => cell.id === detail.cell)
        ?.output.append(detail.type, detail.text),
    );
    this.select(0);
  }

  get selected() {
    return this.#cells[this.#selected];
  }

  /** Étapes d'origine actuellement chargées (l'exemple en cours). */
  get steps() {
    return this.#steps;
  }

  /**
   * Cellules actuellement rendues dans l'aperçu, dans l'ordre du notebook,
   * avec le code tel qu'il a été exécuté (pour l'export).
   */
  get contents() {
    return this.#cells
      .filter((cell) => this.kernel.codeOf(cell.id) !== undefined)
      .map((cell) => ({
        label: cell.label.textContent,
        prompt: cell.prompt,
        code: this.kernel.codeOf(cell.id),
      }));
  }

  /** Vrai si l'on est en train de taper dans un prompt ou un éditeur de code. */
  get isEditing() {
    const active = document.activeElement;
    return (
      (active?.tagName === "TEXTAREA" || active?.isContentEditable) &&
      this.root.contains(active)
    );
  }

  select(index) {
    this.#selected = Math.max(0, Math.min(this.#cells.length - 1, index));
    this.#cells.forEach((cell, i) => cell.select(i === this.#selected));
  }

  selectNext() {
    this.select(this.#selected + 1);
  }

  selectPrevious() {
    this.select(this.#selected - 1);
  }

  /** Passe en mode édition sur la cellule sélectionnée (si son code existe). */
  edit() {
    if (this.selected?.isGenerated) this.selected.editor.focus();
  }

  /** Insère une cellule vide à la position donnée (par défaut : sous la sélection). */
  insert(index = this.#selected + 1) {
    const cell = this.#createCell(EMPTY_STEP);
    this.#cells.splice(Math.min(index, this.#cells.length), 0, cell);
    this.#render();
    this.select(this.#cells.indexOf(cell));
    cell.focusPrompt();
  }

  insertAbove() {
    this.insert(this.#selected);
  }

  /** Supprime une cellule ; son code est retiré de l'aperçu à la prochaine exécution. */
  delete(cell = this.selected) {
    if (!cell) return;
    const index = this.#cells.indexOf(cell);
    this.#cells.splice(index, 1);
    cell.runButton.setRunning(false);
    this.kernel.forget(cell.id);
    this.#executed.delete(cell.id);
    this.#lastDeleted = { cell, index };
    this.#render();
    this.select(index);
    this.dispatchEvent(new Event("delete"));
  }

  /** Restaure la dernière cellule supprimée (à réexécuter). */
  undoDelete() {
    if (!this.#lastDeleted) return;
    const { cell, index } = this.#lastDeleted;
    this.#lastDeleted = null;
    cell.runButton.setCount(0);
    this.#cells.splice(index, 0, cell);
    this.#render();
    this.select(index);
  }

  /** Déplace une cellule vers le haut (-1) ou le bas (+1). */
  move(cell = this.selected, delta) {
    const from = this.#cells.indexOf(cell);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= this.#cells.length) return;
    this.#cells.splice(to, 0, ...this.#cells.splice(from, 1));
    this.#render();
    this.select(to);
  }

  /**
   * Ajoute des cellules à la file d'exécution (par défaut : la cellule sélectionnée).
   * Avec generate = false, le code actuel est exécuté tel quel, sans génération.
   */
  run(cells = [this.selected].filter(Boolean), { generate = true } = {}) {
    if (!cells.length) return this.#queue;
    cells.forEach((cell) => cell.runButton.setRunning(true));
    if (this.#pending++ === 0) this.dispatchEvent(new Event("busy"));
    this.#queue = this.#queue
      .then(() => this.#execute(cells, generate))
      .catch(console.error)
      .finally(() => {
        if (--this.#pending === 0) this.dispatchEvent(new Event("idle"));
      });
    return this.#queue;
  }

  runAll() {
    return this.run(this.#cells);
  }

  /** Réexécute les cellules déjà lancées avec leur code actuel (modifications manuelles). */
  rerun() {
    const cells = this.#cells.filter((cell) => this.#executed.has(cell.id));
    this.run(cells, { generate: false });
  }

  /**
   * Réinitialise tout : l'aperçu est vidé et les cellules reviennent à leur
   * état d'origine (prompts et code prédéfinis, cellules ajoutées retirées).
   * Avec d'autres étapes, charge un autre exemple à la place.
   */
  restart(steps = this.#steps) {
    const changed = steps !== this.#steps;
    this.#beforeRestart = { cells: this.#cells, steps: this.#steps };
    this.#steps = steps;
    this.#lastDeleted = null;
    this.#resetExecution();
    this.#cells = this.#steps.map((step) => this.#createCell(step));
    this.#render();
    this.select(0);
    this.dispatchEvent(new CustomEvent("restart", { detail: { changed } }));
  }

  /** Retrouve les cellules (et l'exemple) d'avant la réinitialisation (à réexécuter). */
  undoRestart() {
    if (!this.#beforeRestart) return;
    this.#resetExecution();
    ({ cells: this.#cells, steps: this.#steps } = this.#beforeRestart);
    this.#beforeRestart = null;
    this.#cells.forEach((cell) => {
      cell.runButton.setCount(0);
      cell.runButton.setRunning(false);
      cell.output.clear();
    });
    this.#render();
    this.select(0);
  }

  /** Vide l'aperçu et oublie l'état d'exécution. */
  #resetExecution() {
    this.kernel.restart();
    this.#executed.clear();
    this.#count = 0;
  }

  #createCell(step) {
    return new Cell(step, this.#nextId++, {
      onRun: (cell) => this.run([cell]),
      onSelect: (cell) => this.select(this.#cells.indexOf(cell)),
      onInsert: (cell) => this.insert(this.#cells.indexOf(cell) + 1),
      onMove: (cell, delta) => this.move(cell, delta),
      onDelete: (cell) => this.delete(cell),
    });
  }

  /** Replace les cellules (et leurs zones d'insertion) dans l'ordre, puis renumérote. */
  #render() {
    this.root.replaceChildren(
      this.topInserter.element,
      ...this.#cells.flatMap((cell) => [cell.element, cell.inserter.element]),
    );
    this.#cells.forEach((cell, index) => cell.setIndex(index));
  }

  async #execute(cells, generate) {
    // Une cellule supprimée pendant l'attente n'est plus exécutée
    cells = cells.filter((cell) => this.#cells.includes(cell));
    for (const cell of generate ? cells : []) {
      try {
        await cell.generate(this.generator, this.#contextFor(cell, cells));
      } catch (error) {
        // Génération impossible : on l'affiche et on annule cette exécution
        cell.output.clear();
        cell.output.append("error", error.message);
        cells.forEach((c) => c.runButton.setRunning(false));
        return;
      }
    }
    // Le notebook a pu être réinitialisé pendant la génération
    cells = cells.filter((cell) => this.#cells.includes(cell));
    if (!cells.length) return;
    cells.forEach((cell) => {
      cell.runButton.setCount(++this.#count);
      this.#executed.add(cell.id);
    });
    // Toutes les cellules sont rejouées : leurs sorties seront régénérées
    this.#cells.forEach((cell) => cell.output.clear());
    await this.kernel.run(
      cells.map((cell) => ({ id: cell.id, code: cell.code })),
      this.#cells.map((cell) => cell.id),
    );
    cells.forEach((cell) => cell.runButton.setRunning(false));
  }

  /**
   * Contexte envoyé au modèle pour générer une cellule.
   * - before : uniquement ce qui sera réellement disponible au-dessus d'elle,
   *   c'est-à-dire les cellules déjà rendues (code tel qu'exécuté) et celles
   *   du même lot d'exécution, qui passent juste avant elle ;
   * - after : code des cellules suivantes, pour éviter les conflits de noms.
   * @param {Cell} cell cellule à générer
   * @param {Cell[]} batch cellules exécutées ensemble (ex. « Tout exécuter »)
   */
  #contextFor(cell, batch) {
    const index = this.#cells.indexOf(cell);
    const before = this.#cells
      .slice(0, index)
      .map((c) => ({
        label: c.label.textContent,
        prompt: c.prompt,
        code: batch.includes(c) ? c.code : this.kernel.codeOf(c.id),
      }))
      .filter((c) => c.code !== undefined);
    const after = this.#cells.slice(index + 1).map((c) => c.code);
    return { before, after };
  }
}
