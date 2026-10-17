import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";

/**
 * Zone fine entre deux cellules : au survol, un bouton « + Cellule »
 * apparaît pour insérer une nouvelle cellule à cet endroit (comme Colab).
 */
export class CellInserter {
  constructor(onInsert) {
    this.element = el("div", "cell-inserter");
    const button = el("button", "cell-inserter__button", `${icons.add}<span>Cellule</span>`);
    button.title = "Insérer une cellule ici";
    button.addEventListener("click", onInsert);
    this.element.append(button);
  }
}
