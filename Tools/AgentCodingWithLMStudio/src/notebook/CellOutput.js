import { el } from "../ui/dom.js";
import { t } from "../i18n/index.js";

const MAX_LINES = 50;

/**
 * Zone de sortie sous une cellule : messages console.log et erreurs.
 * Elle reste masquée tant qu'elle est vide.
 */
export class CellOutput {
  errors = [];

  constructor() {
    this.element = el("div", "cell-output");
    this.element.hidden = true;
  }

  /** Ajoute une ligne ; type = 'log', 'error' ou 'advice'. */
  append(type, text) {
    if (type === "error") this.errors.push(text);
    const line = el("div", `cell-output__line cell-output__line--${type}`);
    line.textContent =
      type === "error"
        ? t("cell.error", { text })
        : type === "advice"
          ? t("cell.advice", { text })
          : text;
    this.element.append(line);
    if (this.element.childElementCount > MAX_LINES)
      this.element.firstElementChild.remove();
    this.element.hidden = false;
  }

  clear() {
    this.errors = [];
    this.element.replaceChildren();
    this.element.hidden = true;
  }
}
