import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { t } from "../i18n/index.js";

/**
 * Bouton d'exécution à la manière de Colab :
 * affiche le compteur [n] au repos, l'icône ▶ au survol,
 * et un anneau qui tourne pendant l'exécution.
 */
export class RunButton {
  constructor(onClick) {
    this.element = el("button", "run-button");
    this.element.title = t("cell.run");
    this.count = el("span", "run-button__count");
    this.element.append(el("span", "run-button__icon", icons.play), this.count);
    this.element.addEventListener("click", onClick);
    this.setCount(0);
  }

  /** 0 = jamais exécutée. */
  setCount(n) {
    this.count.textContent = n ? `[${n}]` : "[ ]";
  }

  setRunning(state) {
    this.element.classList.toggle("is-running", state);
  }
}
