import { el } from "./dom.js";

/**
 * Menu déroulant affiché à la place du titre : choisit l'exemple chargé
 * dans le processus. Le choix appelle onChange(exemple).
 */
export class ExamplePicker {
  constructor(root, examples, onChange) {
    this.examples = examples;
    this.select = el("select", "example-picker");
    this.select.title = "Choisir un exemple";
    examples.forEach((example, index) => {
      const option = el("option");
      option.value = index;
      option.textContent = example.title;
      this.select.append(option);
    });
    this.select.addEventListener("change", () => {
      onChange(this.current);
      this.select.blur();
    });
    root.append(this.select);
  }

  get current() {
    return this.examples[this.select.selectedIndex];
  }

  get title() {
    return this.current.title;
  }

  /** Affiche l'exemple correspondant à ces étapes (ex. après « Annuler »). */
  show(steps) {
    const index = this.examples.findIndex((example) => example.steps === steps);
    if (index >= 0) this.select.selectedIndex = index;
  }
}
