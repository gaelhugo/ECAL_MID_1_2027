import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";

/**
 * Petite barre flottante en haut à droite de la cellule sélectionnée,
 * comme dans Colab : monter, descendre, supprimer.
 */
export class CellActions {
  /** @param {{ onMove: (delta: number) => void, onDelete: () => void }} callbacks */
  constructor({ onMove, onDelete }) {
    this.element = el("div", "cell-actions");
    this.element.append(
      CellActions.button(icons.up, "Monter (Ctrl + M puis K)", () => onMove(-1)),
      CellActions.button(icons.down, "Descendre (Ctrl + M puis J)", () => onMove(1)),
      CellActions.button(icons.delete, "Supprimer (Ctrl + M puis D)", onDelete),
    );
  }

  static button(icon, title, onClick) {
    const button = el("button", "icon-button icon-button--small", icon);
    button.title = title;
    button.addEventListener("click", onClick);
    return button;
  }
}
