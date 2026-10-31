import { el } from "./dom.js";
import { icons } from "./icons.js";
import { CodeExporter } from "../export/CodeExporter.js";
import { t } from "../i18n/index.js";

/**
 * Barre d'outils du notebook : « + Cellule », « Tout exécuter », « Redémarrer »,
 * « Télécharger » et un indicateur d'état (Prêt / Exécution…).
 */
export class Toolbar {
  constructor(
    root,
    notebook,
    getTitle = () => "processus",
    getMode,
    onPublish,
  ) {
    const add = Toolbar.button(
      icons.add,
      t("toolbar.add"),
      t("toolbar.add.shortcut"),
    );
    const runAll = Toolbar.button(
      icons.playAll,
      t("toolbar.runAll"),
      "Ctrl/⌘ + F9",
    );
    const restart = Toolbar.button(
      icons.restart,
      t("toolbar.restart"),
      t("toolbar.restart.shortcut"),
    );
    const download = Toolbar.button(
      icons.download,
      t("toolbar.download"),
      t("toolbar.download.hint"),
    );
    // Rien à télécharger tant qu'aucune cellule n'est rendue
    const updateDownload = () =>
      (download.disabled = notebook.contents.length === 0);
    updateDownload();
    ["idle", "delete", "restart"].forEach((type) =>
      notebook.addEventListener(type, updateDownload),
    );
    this.status = el("span", "toolbar__status", t("toolbar.ready"));

    add.addEventListener("click", () => notebook.insert());
    download.addEventListener("click", (event) => {
      if ((event.shiftKey || event.altKey) && onPublish) return onPublish();
      CodeExporter.download(notebook.contents, getTitle(), getMode?.());
    });
    runAll.addEventListener("click", () => notebook.runAll());
    restart.addEventListener("click", () => notebook.restart());
    notebook.addEventListener(
      "busy",
      () => (this.status.textContent = t("toolbar.busy")),
    );
    notebook.addEventListener(
      "idle",
      () => (this.status.textContent = t("toolbar.ready")),
    );

    root.append(add, runAll, restart, download, this.status);
  }

  setStatus(text) {
    this.status.textContent = text || t("toolbar.ready");
  }

  static button(icon, label, shortcut) {
    const button = el("button", "tool-button", `${icon}<span>${label}</span>`);
    button.title = `${label} (${shortcut})`;
    return button;
  }
}
