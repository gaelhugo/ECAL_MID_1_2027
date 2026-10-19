import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { t } from "../i18n/index.js";

/**
 * Zone fine entre deux cellules : au survol, un bouton « + Cellule »
 * apparaît pour insérer une nouvelle cellule à cet endroit (comme Colab).
 */
export class CellInserter {
  constructor(onInsert) {
    this.element = el("div", "cell-inserter");
    const button = el(
      "button",
      "cell-inserter__button",
      `${icons.add}<span>${t("toolbar.add")}</span>`,
    );
    button.title = t("cell.insert");
    button.addEventListener("click", onInsert);
    this.element.append(button);
  }
}
