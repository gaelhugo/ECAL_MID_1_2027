import { el } from "./dom.js";
import { MODES } from "../runtime/modes.js";

/**
 * Menus affichés à la place du titre :
 * - le processus chargé (seulement ceux du mode choisi) ;
 * - le mode : JavaScript (canvas), p5.js, three.js ou DOM.
 * Changer de mode charge son « Nouveau processus ». Tout choix appelle onChange(exemple).
 */
export class ExamplePicker {
  constructor(root, examples, onChange) {
    this.examples = examples;
    this.select = el("select", "example-picker");
    this.select.title = "Choisir un exemple";
    this.modeSelect = el("select", "mode-picker");
    this.modeSelect.title = "Environnement du processus";
    Object.values(MODES).forEach((mode) =>
      this.modeSelect.append(ExamplePicker.option(mode.id, mode.label)),
    );

    this.select.addEventListener("change", () => {
      onChange(this.current);
      this.select.blur();
    });
    this.modeSelect.addEventListener("change", () => {
      this.fill(MODES[this.modeSelect.value]);
      onChange(this.current);
      this.modeSelect.blur();
    });
    root.append(this.select, this.modeSelect);
  }

  /** Processus du mode affiché dans le menu. */
  get visible() {
    return this.examples.filter((example) => example.mode === this.mode);
  }

  get current() {
    return this.visible[this.select.selectedIndex];
  }

  get title() {
    return this.current.title;
  }

  get mode() {
    return MODES[this.modeSelect.value];
  }

  /** Remplit le menu des processus avec ceux de ce mode. */
  fill(mode) {
    this.modeSelect.value = mode.id;
    this.select.replaceChildren(
      ...this.visible.map((example, index) =>
        ExamplePicker.option(index, example.title),
      ),
    );
  }

  /** Affiche l'exemple correspondant à ces étapes (ex. après « Annuler »). */
  show(steps) {
    const example = this.examples.find((example) => example.steps === steps);
    if (!example) return;
    this.fill(example.mode);
    this.select.selectedIndex = this.visible.indexOf(example);
  }

  static option(value, text) {
    const option = el("option");
    option.value = value;
    option.textContent = text;
    return option;
  }
}
