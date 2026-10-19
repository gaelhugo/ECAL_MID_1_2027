import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { t, tn } from "../i18n/index.js";

/**
 * Panneau de droite : affiche le résultat en direct dans une iframe.
 * L'iframe est autorisée à utiliser la caméra (attribut allow).
 */
export class Preview {
  /** Appelé quand on clique sur « Relancer » (branché par main.js). */
  onReload = () => {};

  constructor(root) {
    this.info = el("p", "preview__info", t("preview.none"));
    const reload = el("button", "icon-button", icons.restart);
    reload.title = t("preview.reload");
    reload.addEventListener("click", () => this.onReload());

    const header = el("header", "preview__header");
    const title = el("div", "preview__title", `<h2>${t("preview.title")}</h2>`);
    title.append(this.info);
    header.append(title, reload);

    this.iframe = el("iframe", "preview__frame");
    this.iframe.allow = "camera";
    this.empty = el("div", "preview__empty", t("preview.empty"));

    const stage = el("div", "preview__stage");
    stage.append(this.iframe, this.empty);
    root.append(header, stage);
  }

  /** Fenêtre de l'iframe (pour filtrer les messages reçus). */
  get window() {
    return this.iframe.contentWindow;
  }

  /** Charge un nouveau document dans l'iframe. */
  load(html, count) {
    this.iframe.srcdoc = html;
    this.empty.hidden = true;
    this.info.textContent = tn("preview.loaded", count);
  }

  /** Vide l'aperçu. */
  clear() {
    this.iframe.srcdoc = "";
    this.empty.hidden = false;
    this.info.textContent = t("preview.none");
  }
}
