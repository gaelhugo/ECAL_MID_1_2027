import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { RunButton } from "./RunButton.js";
import { CodeEditor } from "./CodeEditor.js";
import { CellOutput } from "./CellOutput.js";
import { CellActions } from "./CellActions.js";
import { CellInserter } from "./CellInserter.js";

/** Contenu d'une nouvelle cellule vide. */
export const EMPTY_STEP = { title: "", prompt: "", code: "" };

/**
 * Une cellule du notebook : le prompt (modifiable) à gauche, le code à droite,
 * le bouton d'exécution dans la marge et la sortie en dessous.
 * Sous chaque cellule, une zone permet d'en insérer une nouvelle.
 */
export class Cell {
  generated;
  sourcePrompt; // prompt qui a produit le code actuel

  /**
   * @param {{ title: string, prompt: string, code: string }} step
   * @param {number} id identifiant unique et stable (indépendant de la position)
   * @param {object} callbacks onRun, onSelect, onInsert, onMove, onDelete
   */
  constructor(step, id, { onRun, onSelect, onInsert, onMove, onDelete }) {
    this.step = step;
    this.id = id;
    this.sourcePrompt = step.prompt;
    // Une cellule sans code prédéfini est directement modifiable
    this.generated = !step.code;
    this.runButton = new RunButton(() => onRun(this));
    this.editor = new CodeEditor(
      this.generated
        ? "Écrivez du code, ou un prompt à gauche"
        : "Exécutez la cellule pour générer le code",
    );
    this.editor.readOnly = !this.generated;
    this.output = new CellOutput();
    this.actions = new CellActions({
      onMove: (delta) => onMove(this, delta),
      onDelete: () => onDelete(this),
    });
    this.inserter = new CellInserter(() => onInsert(this));
    this.element = this.build();
    this.element.addEventListener("mousedown", () => onSelect(this));
  }

  /** Code actuel (le code prédéfini tant que la cellule n'a pas été générée). */
  get code() {
    return this.generated ? this.editor.value : this.step.code;
  }

  get prompt() {
    return this.promptText.innerText.trim();
  }

  get isGenerated() {
    return this.generated;
  }

  /** Vrai si le prompt a changé depuis la génération du code actuel. */
  get isPromptModified() {
    return this.prompt !== this.sourcePrompt;
  }

  /**
   * Prépare le code avant exécution :
   * - prompt modifié (et non vide) → le modèle génère un nouveau code ;
   * - première exécution → le code prédéfini « s'écrit » ;
   * - sinon → le code actuel (éventuellement modifié à la main) est conservé.
   * @param {import('../llm/CodeGenerator.js').CodeGenerator} generator
   * @param {{ before: string[], after: string[] }} context code des autres cellules
   */
  async generate(generator, context) {
    if (this.isPromptModified && this.prompt)
      return this.generateFromPrompt(generator, context);
    if (this.generated) return;
    this.generated = true;
    await this.editor.type(this.step.code);
    this.editor.readOnly = false;
  }

  /** Met à jour le numéro affiché (« Étape n »), qui suit la position. */
  setIndex(index) {
    const title = this.step.title ? ` · ${this.step.title}` : "";
    this.label.textContent = `Étape ${index + 1}${title}`;
  }

  select(state) {
    const wasSelected = this.element.classList.contains("is-selected");
    this.element.classList.toggle("is-selected", state);
    if (state && !wasSelected)
      this.element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  focusPrompt() {
    this.promptText.focus();
  }

  async generateFromPrompt(generator, context) {
    const prompt = this.prompt;
    const previous = this.editor.value;
    this.editor.readOnly = true;
    this.element.classList.add("is-generating");
    try {
      const request = {
        ...context,
        prompt,
        originalPrompt: this.sourcePrompt,
        code: this.code,
      };
      this.editor.value = await generator.generate(
        request,
        (code) => (this.editor.value = code),
      );
      this.sourcePrompt = prompt;
      this.generated = true;
      this.updateModified();
    } catch (error) {
      this.editor.value = previous; // en cas d'échec, on retrouve le code d'avant
      throw error;
    } finally {
      this.editor.readOnly = !this.generated;
      this.element.classList.remove("is-generating");
    }
  }

  updateModified() {
    this.element.classList.toggle(
      "is-modified",
      this.isPromptModified && this.prompt !== "",
    );
  }

  build() {
    const prompt = el(
      "div",
      "prompt",
      `<div class="prompt__label">${icons.sparkle}<span></span></div>`,
    );
    this.label = prompt.querySelector("span");
    this.promptText = el("p", "prompt__text", "");
    this.promptText.textContent = this.step.prompt;
    this.promptText.dataset.placeholder = "Décrivez ce que le code doit faire…";
    this.promptText.contentEditable = "plaintext-only";
    this.promptText.spellcheck = false;
    this.promptText.addEventListener("input", () => this.updateModified());
    prompt.append(this.promptText);

    const body = el("div", "cell__body");
    body.append(prompt, this.editor.element);

    const gutter = el("div", "cell__gutter");
    gutter.append(this.runButton.element);

    const cell = el("article", "cell");
    cell.append(gutter, body, this.output.element, this.actions.element);
    return cell;
  }
}
