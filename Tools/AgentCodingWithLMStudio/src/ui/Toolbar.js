import { el } from "./dom.js";
import { icons } from "./icons.js";
import { CodeExporter } from "../export/CodeExporter.js";

/**
 * Barre d'outils du notebook : « + Cellule », « Tout exécuter », « Redémarrer »,
 * « Télécharger » et un indicateur d'état (Prêt / Exécution…).
 */
export class Toolbar {
  constructor(root, notebook, getTitle = () => "processus", getMode) {
    const add = Toolbar.button(icons.add, "Cellule", "Ctrl + M puis B");
    const runAll = Toolbar.button(
      icons.playAll,
      "Tout exécuter",
      "Ctrl/⌘ + F9",
    );
    const restart = Toolbar.button(
      icons.restart,
      "Redémarrer",
      "Ctrl + M puis .",
    );
    const download = Toolbar.button(
      icons.download,
      "Télécharger",
      "cellules rendues, en fichier HTML",
    );
    // Rien à télécharger tant qu'aucune cellule n'est rendue
    const updateDownload = () =>
      (download.disabled = notebook.contents.length === 0);
    updateDownload();
    ["idle", "delete", "restart"].forEach((type) =>
      notebook.addEventListener(type, updateDownload),
    );
    const status = el("span", "toolbar__status", "Prêt");

    add.addEventListener("click", () => notebook.insert());
    download.addEventListener("click", () =>
      CodeExporter.download(notebook.contents, getTitle(), getMode?.()),
    );
    runAll.addEventListener("click", () => notebook.runAll());
    restart.addEventListener("click", () => notebook.restart());
    notebook.addEventListener(
      "busy",
      () => (status.textContent = "Exécution…"),
    );
    notebook.addEventListener("idle", () => (status.textContent = "Prêt"));

    root.append(add, runAll, restart, download, status);
  }

  static button(icon, label, shortcut) {
    const button = el("button", "tool-button", `${icon}<span>${label}</span>`);
    button.title = `${label} (${shortcut})`;
    return button;
  }
}
