import { el } from "./dom.js";
import { icons } from "./icons.js";
import { providers, createClient } from "../llm/providers.js";
import {
  LANGUAGES,
  languageSetting,
  setLanguageSetting,
  systemLanguage,
  t,
} from "../i18n/index.js";

const STORAGE_KEY = "atelier.settings";

/**
 * Bouton ⚙︎ et panneau latéral des réglages : choix du service qui génère
 * le code (LM Studio par défaut) et clé API éventuelle.
 * Les réglages sont gardés dans ce navigateur (localStorage).
 * Événement émis : 'change' (le service ou la clé a changé).
 */
export class SettingsPanel extends EventTarget {
  settings = { provider: "lmstudio", keys: {}, githubToken: "" };

  constructor(buttonRoot) {
    super();
    this.load();
    this.button = el("button", "icon-button settings__button", icons.settings);
    this.button.addEventListener("click", (event) => {
      if (event.altKey || event.shiftKey) {
        this.unlockAdmin();
        this.toggle(true);
      } else {
        this.toggle();
      }
    });
    buttonRoot.append(this.button);

    this.element = this.build();
    document.body.append(this.element);
    // Clic en dehors du panneau ou Échap : on ferme
    document.addEventListener("mousedown", (event) => {
      if (
        !this.element.contains(event.target) &&
        !this.button.contains(event.target)
      )
        this.toggle(false);
    });
    this.element.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.toggle(false);
    });
    this.update();
  }

  get provider() {
    return (
      providers.find((provider) => provider.id === this.settings.provider) ??
      providers[0]
    );
  }

  /** Client du service choisi, avec sa clé. */
  createClient() {
    return createClient(this.provider, this.settings.keys[this.provider.id]);
  }

  toggle(open = !this.element.classList.contains("is-open")) {
    this.element.classList.toggle("is-open", open);
    this.element.inert = !open;
  }

  build() {
    const panel = el(
      "aside",
      "settings",
      `<header class="settings__header"><h2>${t("settings.title")}</h2></header>
      <p class="settings__intro">${t("settings.intro")}</p>`,
    );
    const close = el("button", "icon-button", icons.close);
    close.title = t("settings.close");
    close.addEventListener("click", () => this.toggle(false));
    panel.querySelector("header").append(close);

    // Liste des services, regroupés
    let group;
    for (const provider of providers) {
      if (provider.group !== group) {
        group = provider.group;
        panel.append(el("h3", "settings__group", group));
      }
      const option = el(
        "label",
        "settings__option",
        `<input type="radio" name="provider" value="${provider.id}" />
        <span><strong>${provider.label}</strong><small>${provider.note}</small></span>`,
      );
      const radio = option.querySelector("input");
      radio.checked = provider.id === this.provider.id;
      radio.addEventListener("change", () => {
        this.settings.provider = provider.id;
        this.save();
      });
      panel.append(option);
    }

    // Clé API du service choisi
    this.keyField = el(
      "label",
      "settings__key",
      `<span></span><input type="password" autocomplete="off" spellcheck="false" placeholder="${t("settings.keyPlaceholder")}" />
      <a target="_blank" rel="noopener">${t("settings.getKey")}</a>`,
    );
    this.keyInput = this.keyField.querySelector("input");
    this.keyInput.addEventListener("input", () => {
      this.settings.keys[this.provider.id] = this.keyInput.value.trim();
      this.save();
    });
    panel.append(
      this.keyField,
      el("p", "settings__note", t("settings.keysNote")),
      ...this.buildLanguage(),
      ...this.buildAdmin(),
    );
    panel.inert = true;
    return panel;
  }

  /** Section discrète d'administration : jeton GitHub + bouton de publication. */
  buildAdmin() {
    const details = el(
      "details",
      "settings__admin",
      `<summary class="settings__group">${t("settings.admin")}</summary>`,
    );
    const field = el(
      "label",
      "settings__key",
      `<span>${t("settings.githubToken")}</span>
      <input type="password" autocomplete="off" spellcheck="false" placeholder="ghp_…" />
      <a href="https://github.com/settings/tokens/new?scopes=repo&description=proce55us" target="_blank" rel="noopener">${t("settings.getGithubToken")}</a>`,
    );
    this.githubInput = field.querySelector("input");
    this.githubInput.value = this.settings.githubToken ?? "";
    this.githubInput.addEventListener("input", () => {
      this.settings.githubToken = this.githubInput.value.trim();
      this.save();
    });

    this.publishButton = el(
      "button",
      "settings__action",
      `${icons.sparkle}<span>${t("publish.button")}</span>`,
    );
    this.publishButton.type = "button";
    this.publishButton.addEventListener("click", () =>
      this.dispatchEvent(new Event("publish")),
    );

    this.deleteButton = el(
      "button",
      "settings__action settings__action--secondary",
      `${icons.delete}<span>${t("publish.deleteButton")}</span>`,
    );
    this.deleteButton.type = "button";
    this.deleteButton.addEventListener("click", () =>
      this.dispatchEvent(new Event("unpublish")),
    );

    details.append(
      field,
      el("p", "settings__note", t("settings.adminNote")),
      this.publishButton,
      this.deleteButton,
    );
    const hasToken = Boolean(this.settings.githubToken);
    details.hidden = !hasToken;
    details.open = hasToken;
    this.adminSection = details;
    return [details];
  }

  /** Déverrouille et ouvre la section d'administration. */
  unlockAdmin() {
    if (!this.adminSection) return;
    this.adminSection.hidden = false;
    this.adminSection.open = true;
  }

  get githubToken() {
    return this.settings.githubToken?.trim() ?? "";
  }

  set githubToken(value) {
    this.settings.githubToken = value.trim();
    if (this.githubInput) this.githubInput.value = this.settings.githubToken;
    if (this.settings.githubToken) this.unlockAdmin();
    this.save();
  }

  /** Choix de la langue : automatique (système), français ou anglais. */
  buildLanguage() {
    const choices = {
      auto: t("settings.language.auto", {
        language: LANGUAGES[systemLanguage()],
      }),
      ...LANGUAGES,
    };
    const options = Object.entries(choices).map(([value, label]) => {
      const option = el(
        "label",
        "settings__option",
        `<input type="radio" name="language" value="${value}" />
        <span><strong>${label}</strong></span>`,
      );
      const radio = option.querySelector("input");
      radio.checked = value === languageSetting;
      radio.addEventListener("change", () => setLanguageSetting(value));
      return option;
    });
    return [
      el("h3", "settings__group", t("settings.language")),
      ...options,
      el("p", "settings__note", t("settings.language.note")),
    ];
  }

  /** Met l'affichage à jour selon le service choisi. */
  update() {
    const provider = this.provider;
    const needsKey = provider.id !== "lmstudio";
    this.keyField.hidden = !needsKey;
    this.keyField.querySelector("span").textContent = t("settings.key", {
      name: provider.name,
    });
    this.keyField.querySelector("a").href = provider.keyUrl ?? "";
    this.keyInput.value = this.settings.keys[provider.id] ?? "";
    this.button.title = t("settings.button", {
      label: provider.label,
      name: provider.name,
    });
  }

  load() {
    try {
      Object.assign(
        this.settings,
        JSON.parse(localStorage.getItem(STORAGE_KEY)),
      );
    } catch {
      // Réglages absents ou illisibles : on garde les valeurs par défaut
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    this.update();
    this.dispatchEvent(new Event("change"));
  }
}
