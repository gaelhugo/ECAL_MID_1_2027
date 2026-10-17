import { el } from '../ui/dom.js';

const MAX_LINES = 50;

/**
 * Zone de sortie sous une cellule : messages console.log et erreurs.
 * Elle reste masquée tant qu'elle est vide.
 */
export class CellOutput {
  constructor() {
    this.element = el('div', 'cell-output');
    this.element.hidden = true;
  }

  /** Ajoute une ligne ; type = 'log' ou 'error'. */
  append(type, text) {
    const line = el('div', `cell-output__line cell-output__line--${type}`);
    line.textContent = type === 'error' ? `Erreur : ${text}` : text;
    this.element.append(line);
    if (this.element.childElementCount > MAX_LINES) this.element.firstElementChild.remove();
    this.element.hidden = false;
  }

  clear() {
    this.element.replaceChildren();
    this.element.hidden = true;
  }
}
