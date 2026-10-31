/**
 * Boîtes de dialogue modales (saisie et confirmation) basées sur <dialog>,
 * compatibles avec le navigateur et l'application macOS Electron
 * (où window.prompt() n'est pas pris en charge).
 */
import { el } from "./dom.js";
import { t } from "../i18n/index.js";

export class Dialog {
  /**
   * Demande la saisie d'un texte à l'utilisateur.
   * @param {string} label message affiché au-dessus du champ
   * @param {string} [defaultValue] valeur initiale du champ
   * @param {{ password?: boolean, placeholder?: string }} [options]
   * @returns {Promise<string | null>} texte saisi ou null si annulé
   */
  static prompt(label, defaultValue = "", { password = false, placeholder = "" } = {}) {
    return new Promise((resolve) => {
      const dialog = el(
        "dialog",
        "modal",
        `<form method="dialog" class="modal__form">
          <label class="modal__label">
            <span></span>
            <input class="modal__input" type="${password ? "password" : "text"}" autocomplete="off" spellcheck="${!password}" />
          </label>
          <div class="modal__actions">
            <button type="button" class="modal__btn modal__btn--cancel">${t("dialog.cancel")}</button>
            <button type="submit" class="modal__btn modal__btn--ok">${t("dialog.ok")}</button>
          </div>
        </form>`,
      );

      dialog.querySelector(".modal__label span").textContent = label;
      const input = dialog.querySelector(".modal__input");
      input.value = defaultValue ?? "";
      if (placeholder) input.placeholder = placeholder;

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };

      dialog
        .querySelector(".modal__btn--cancel")
        .addEventListener("click", () => finish(null));
      dialog
        .querySelector(".modal__form")
        .addEventListener("submit", (event) => {
          event.preventDefault();
          finish(input.value);
        });
      dialog.addEventListener("close", () => finish(null));
      dialog.addEventListener("mousedown", (event) => {
        if (event.target === dialog) finish(null);
      });

      document.body.append(dialog);
      dialog.showModal();
      input.focus();
      input.select();
    });
  }

  /**
   * Demande une confirmation oui/non à l'utilisateur.
   * @param {string} message question posée à l'utilisateur
   * @returns {Promise<boolean>} true si confirmé, false sinon
   */
  static confirm(message) {
    return new Promise((resolve) => {
      const dialog = el(
        "dialog",
        "modal",
        `<form method="dialog" class="modal__form">
          <p class="modal__message"></p>
          <div class="modal__actions">
            <button type="button" class="modal__btn modal__btn--cancel">${t("dialog.cancel")}</button>
            <button type="submit" class="modal__btn modal__btn--ok">${t("dialog.ok")}</button>
          </div>
        </form>`,
      );

      dialog.querySelector(".modal__message").textContent = message;

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };

      dialog
        .querySelector(".modal__btn--cancel")
        .addEventListener("click", () => finish(false));
      dialog
        .querySelector(".modal__form")
        .addEventListener("submit", (event) => {
          event.preventDefault();
          finish(true);
        });
      dialog.addEventListener("close", () => finish(false));
      dialog.addEventListener("mousedown", (event) => {
        if (event.target === dialog) finish(false);
      });

      document.body.append(dialog);
      dialog.showModal();
      dialog.querySelector(".modal__btn--ok").focus();
    });
  }
}
