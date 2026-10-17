/**
 * Point d'entrée : assemble les différentes pièces de l'application.
 */
import "./styles/index.css";
import { examples, defaultExample } from "./examples/index.js";
import { Preview } from "./preview/Preview.js";
import { Kernel } from "./runtime/Kernel.js";
import { Notebook } from "./notebook/Notebook.js";
import { Toolbar } from "./ui/Toolbar.js";
import { Splitter } from "./ui/Splitter.js";
import { Shortcuts } from "./ui/Shortcuts.js";
import { Snackbar } from "./ui/Snackbar.js";
import { ExamplePicker } from "./ui/ExamplePicker.js";

const preview = new Preview(document.querySelector("#preview"));
const kernel = new Kernel(preview);
const notebook = new Notebook(
  document.querySelector("#notebook"),
  defaultExample.steps,
  kernel,
);

// Le menu du titre charge un autre exemple dans le processus
const picker = new ExamplePicker(
  document.querySelector("#examples"),
  examples,
  (example) => notebook.restart(example.steps),
);
picker.show(defaultExample.steps);

// « Relancer » applique les modifications de code des cellules déjà exécutées
preview.onReload = () => notebook.rerun();

// Après une suppression, on propose d'annuler
const snackbar = new Snackbar();
notebook.addEventListener("delete", () =>
  snackbar.show("Cellule supprimée", "Annuler", () => notebook.undoDelete()),
);
// Idem après une réinitialisation complète ou un changement d'exemple
notebook.addEventListener("restart", ({ detail }) =>
  snackbar.show(
    detail.changed
      ? `Exemple chargé : ${picker.title}`
      : "Processus réinitialisé",
    "Annuler",
    () => {
      notebook.undoRestart();
      picker.show(notebook.steps);
    },
  ),
);

new Toolbar(document.querySelector("#toolbar"), notebook, () => picker.title);
new Splitter(
  document.querySelector("#splitter"),
  document.querySelector("#layout"),
);
new Shortcuts(notebook);
