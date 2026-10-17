import { el } from "./dom.js";
import { icons } from "./icons.js";
import { providers, createClient } from "../llm/providers.js";

const STORAGE_KEY = "atelier.settings";

/**
 * Bouton ⚙︎ et panneau latéral des réglages : choix du service qui génère
 * le code (LM Studio par défaut) et clé API éventuelle.
 * Les réglages sont gardés dans ce navigateur (localStorage).
 * Événement émis : 'change' (le service ou la clé a changé).
 */
export class SettingsPanel extends EventTarget {
  settings = { provider: "lmstudio", keys: {} };

  constructor(buttonRoot) {
    super();
    this.load();
    this.button = el("button", "icon-button", icons.settings);
    this.button.addEventListener("click", () => this.toggle());
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
      `<header class="settings__header"><h2>Réglages</h2></header>
      <p class="settings__intro">Service utilisé pour générer le code à partir des prompts.</p>`,
    );
    const close = el("button", "icon-button", icons.close);
    close.title = "Fermer (Échap)";
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
      `<span></span><input type="password" autocomplete="off" spellcheck="false" placeholder="Collez votre clé ici" />
      <a target="_blank" rel="noopener">Obtenir une clé</a>`,
    );
    this.keyInput = this.keyField.querySelector("input");
    this.keyInput.addEventListener("input", () => {
      this.settings.keys[this.provider.id] = this.keyInput.value.trim();
      this.save();
    });
    panel.append(
      this.keyField,
      el(
        "p",
        "settings__note",
        "Les clés restent dans ce navigateur et ne transitent que par le serveur Vite local.",
      ),
    );
    panel.inert = true;
    return panel;
  }

  /** Met l'affichage à jour selon le service choisi. */
  update() {
    const provider = this.provider;
    const needsKey = provider.id !== "lmstudio";
    this.keyField.hidden = !needsKey;
    this.keyField.querySelector("span").textContent =
      `Clé API ${provider.name}`;
    this.keyField.querySelector("a").href = provider.keyUrl ?? "";
    this.keyInput.value = this.settings.keys[provider.id] ?? "";
    this.button.title = `Réglages · ${provider.label} (${provider.name})`;
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
