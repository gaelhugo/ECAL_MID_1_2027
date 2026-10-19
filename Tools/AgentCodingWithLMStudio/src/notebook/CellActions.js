import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { t } from "../i18n/index.js";

/**
 * Petite barre flottante en haut à droite de la cellule sélectionnée,
 * comme dans Colab : monter, descendre, supprimer.
 */
export class CellActions {
  /** @param {{ onMove: (delta: number) => void, onDelete: () => void }} callbacks */
  constructor({ onMove, onDelete }) {
    this.element = el("div", "cell-actions");
    this.element.append(
      CellActions.button(icons.up, t("cell.moveUp"), () => onMove(-1)),
      CellActions.button(icons.down, t("cell.moveDown"), () => onMove(1)),
      CellActions.button(icons.delete, t("cell.delete"), onDelete),
    );
  }

  static button(icon, title, onClick) {
    const button = el("button", "icon-button icon-button--small", icon);
    button.title = title;
    button.addEventListener("click", onClick);
    return button;
  }
}
