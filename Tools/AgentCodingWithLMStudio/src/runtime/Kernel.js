import { RuntimeDocument } from "./RuntimeDocument.js";

/**
 * Le « noyau » : équivalent simplifié du runtime de Colab.
 *
 * Il mémorise le code de chaque cellule exécutée. À chaque exécution,
 * l'aperçu est rechargé et toutes les cellules mémorisées sont rejouées
 * dans l'ordre du notebook : le résultat est donc toujours cohérent,
 * quel que soit l'ordre dans lequel on a cliqué.
 *
 * Événement émis : 'output' (detail = { cell, type: 'error' | 'log', text }).
 */
export class Kernel extends EventTarget {
  #history = new Map(); // id de cellule → { id, code }
  #runId = 0;
  #seen = new Set(); // évite de répéter un même message (boucle d'animation)
  #done = null; // résout la promesse de l'exécution en cours

  constructor(preview) {
    super();
    this.preview = preview;
    window.addEventListener("message", (event) => this.#onMessage(event));
  }

  /**
   * Exécute des cellules ({ id, code }) ; la promesse se résout une fois le code chargé.
   * @param {number[]} order id de toutes les cellules, dans l'ordre du notebook
   */
  run(cells, order) {
    cells.forEach((cell) => this.#history.set(cell.id, cell));
    return this.#load(cells.at(-1).id, order);
  }

  /** Code tel qu'il a été exécuté pour cette cellule (undefined si jamais exécutée). */
  codeOf(id) {
    return this.#history.get(id)?.code;
  }

  /** Oublie une cellule supprimée (effectif à la prochaine exécution). */
  forget(id) {
    this.#history.delete(id);
  }

  /** Oublie tout : équivalent de « Redémarrer la session ». */
  restart() {
    this.#history.clear();
    this.#runId += 1;
    this.#finish();
    this.preview.clear();
  }

  #load(focusId, order) {
    this.#runId += 1;
    this.#seen.clear();
    this.#finish();

    const entries = [...this.#history.values()].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
    );
    this.preview.load(
      RuntimeDocument.build(entries, this.#runId, focusId),
      entries.length,
    );

    const runId = this.#runId;
    return new Promise((resolve) => {
      this.#done = resolve;
      // Sécurité si le document ne répond pas
      setTimeout(() => runId === this.#runId && this.#finish(), 5000);
    });
  }

  #finish() {
    this.#done?.();
    this.#done = null;
  }

  #onMessage({ source, data }) {
    if (
      source !== this.preview.window ||
      data?.source !== "kernel" ||
      data.runId !== this.#runId
    )
      return;
    if (data.type === "done") return this.#finish();

    const key = `${data.cell}|${data.type}|${data.text}`;
    if (this.#seen.has(key)) return;
    this.#seen.add(key);
    this.dispatchEvent(new CustomEvent("output", { detail: data }));
  }
}
