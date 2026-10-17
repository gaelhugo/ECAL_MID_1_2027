import { el } from "./dom.js";

/**
 * Message temporaire en bas de l'écran, avec une action optionnelle
 * (ex. « Cellule supprimée · Annuler »), à la manière de Google.
 */
export class Snackbar {
  timer;

  constructor(duration = 5000) {
    this.duration = duration;
    this.element = el("div", "snackbar");
    this.text = el("span", "snackbar__text");
    this.action = el("button", "snackbar__action");
    this.element.append(this.text, this.action);
    document.body.append(this.element);
  }

  show(message, actionLabel, onAction) {
    this.text.textContent = message;
    this.action.textContent = actionLabel;
    this.action.onclick = () => {
      this.hide();
      onAction();
    };
    this.element.classList.add("is-visible");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), this.duration);
  }

  hide() {
    this.element.classList.remove("is-visible");
  }
}
