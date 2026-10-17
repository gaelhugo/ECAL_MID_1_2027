/**
 * Point d'entrée : assemble les différentes pièces de l'application.
 */
import "./styles/index.css";
import { steps } from "./steps/steps.js";
import { Preview } from "./preview/Preview.js";
import { Kernel } from "./runtime/Kernel.js";
import { Notebook } from "./notebook/Notebook.js";
import { Toolbar } from "./ui/Toolbar.js";
import { Splitter } from "./ui/Splitter.js";
import { Shortcuts } from "./ui/Shortcuts.js";
import { Snackbar } from "./ui/Snackbar.js";

const preview = new Preview(document.querySelector("#preview"));
const kernel = new Kernel(preview);
const notebook = new Notebook(
  document.querySelector("#notebook"),
  steps,
  kernel,
);

// « Relancer » applique les modifications de code des cellules déjà exécutées
preview.onReload = () => notebook.rerun();

// Après une suppression, on propose d'annuler
const snackbar = new Snackbar();
notebook.addEventListener("delete", () =>
  snackbar.show("Cellule supprimée", "Annuler", () => notebook.undoDelete()),
);
// Idem après une réinitialisation complète
notebook.addEventListener("restart", () =>
  snackbar.show("Notebook réinitialisé", "Annuler", () =>
    notebook.undoRestart(),
  ),
);

new Toolbar(document.querySelector("#toolbar"), notebook);
new Splitter(
  document.querySelector("#splitter"),
  document.querySelector("#layout"),
);
new Shortcuts(notebook);
