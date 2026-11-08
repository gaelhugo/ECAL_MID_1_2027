import { el } from "./dom.js";
import { icons } from "./icons.js";
import { DIRECT_API } from "../llm/endpoints.js";
import { t } from "../i18n/index.js";

/**
 * Bandeau d'information temporaire (uniquement sur la version web en ligne) :
 * - au démarrage, informe qu'autoriser l'accès local est requis pour utiliser LM Studio ;
 * - s'il a été fermé mais que l'utilisateur lance une cellule et refuse l'accès local
 *   (ou que la connexion locale à LM Studio échoue), il réapparaît pour expliquer
 *   pourquoi cet accès est nécessaire et proposer un modèle cloud gratuit.
 */
export class LocalAccessBanner {
  mode = "info"; // "info" | "denied"
  dismissed = false;

  constructor(container, settings) {
    if (!DIRECT_API) return;
    this.settings = settings;

    this.text = el("p", "local-banner__text");
    this.cloudButton = el(
      "button",
      "local-banner__action",
      t("localBanner.cloudButton"),
    );
    this.cloudButton.type = "button";
    this.cloudButton.addEventListener("click", () =>
      this.settings.toggle(true),
    );

    const closeButton = el(
      "button",
      "icon-button icon-button--small local-banner__close",
      icons.close,
    );
    closeButton.type = "button";
    closeButton.title = t("settings.close");
    closeButton.addEventListener("click", () => {
      this.dismissed = true;
      this.update();
    });

    this.element = el("div", "local-banner");
    this.element.append(this.text, this.cloudButton, closeButton);
    container.prepend(this.element);

    this.settings.addEventListener("change", () => this.update());
    window.addEventListener("lmstudio-local-blocked", () => this.showDenied());
    window.addEventListener("lmstudio-local-ok", () => {
      this.dismissed = true;
      this.update();
    });

    this.watchPermissions();
    this.update();
  }

  /** Réaffiche le bandeau avec l'explication complète et l'invitation au cloud gratuit. */
  showDenied() {
    this.mode = "denied";
    this.dismissed = false;
    this.update();
  }

  /** Surveille l'état de la permission « Applis sur l'appareil » du navigateur lorsqu'elle existe. */
  async watchPermissions() {
    if (!navigator.permissions?.query) return;
    for (const name of ["loopback-network", "local-network-access"]) {
      try {
        const status = await navigator.permissions.query({ name });
        const applyState = () => {
          if (status.state === "denied") {
            this.showDenied();
          } else if (status.state === "granted") {
            this.dismissed = true;
            this.update();
          }
        };
        applyState();
        status.addEventListener("change", applyState);
        return;
      } catch {
        /* Permission non prise en charge par ce navigateur */
      }
    }
  }

  update() {
    const isLmStudio = this.settings.provider.id === "lmstudio";
    const visible = isLmStudio && !this.dismissed;
    this.element.hidden = !visible;
    this.element.classList.toggle("is-denied", this.mode === "denied");
    this.text.textContent =
      this.mode === "denied" ? t("localBanner.denied") : t("localBanner.info");
    this.cloudButton.hidden = this.mode !== "denied";
  }
}
