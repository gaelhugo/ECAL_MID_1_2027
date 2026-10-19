/**
 * Langue de l'interface : français ou anglais.
 * - Par défaut, celle du système (navigator.languages : macOS dans l'app autonome,
 *   le navigateur sinon) : français si elle commence par « fr », anglais sinon.
 * - Les Réglages (⚙︎) peuvent l'imposer (localStorage "atelier.lang") ; changer
 *   de langue recharge la page.
 * Textes de l'interface : fr.json / en.json, via t("clé", { variable }).
 * Contenus localisés (exemples) : objets { fr, en }, lus avec pick().
 */
import fr from "./fr.json";
import en from "./en.json";

const DICTIONARIES = { fr, en };
const STORAGE_KEY = "atelier.lang";

/** Langues proposées dans les Réglages (« auto » = celle du système). */
export const LANGUAGES = { fr: "Français", en: "English" };

/** Langue du système : français si la langue préférée est du français, anglais sinon. */
export function systemLanguage() {
  const preferred = navigator.languages?.[0] ?? navigator.language ?? "en";
  return preferred.toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** Choix des Réglages : "auto", "fr" ou "en". */
export const languageSetting = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved in DICTIONARIES ? saved : "auto";
  } catch {
    return "auto";
  }
})();

/** Langue effective de l'interface, des exemples et des commentaires générés. */
export const lang =
  languageSetting === "auto" ? systemLanguage() : languageSetting;

document.documentElement.lang = lang;

/** Texte de l'interface ; {nom} est remplacé par vars.nom. */
export function t(key, vars = {}) {
  const text = DICTIONARIES[lang][key] ?? DICTIONARIES.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => vars[name] ?? match);
}

/** Variante singulier / pluriel : clés "….one" et "….other". */
export function tn(key, count, vars = {}) {
  return t(`${key}.${count > 1 ? "other" : "one"}`, { count, ...vars });
}

/** Valeur localisée : { fr, en } → celle de la langue (repli sur l'autre) ; sinon telle quelle. */
export function pick(value) {
  const localized =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value[lang] ?? value.en ?? value.fr)
      : value;
  return localized;
}

/** Enregistre le choix des Réglages puis recharge la page dans la nouvelle langue. */
export function setLanguageSetting(value) {
  if (value === "auto") localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, value);
  location.reload();
}
