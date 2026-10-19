/**
 * Processus proposés dans le menu du titre.
 * Chaque fichier `src/examples/*.json` est chargé automatiquement :
 * pour créer un processus, il suffit d'ajouter un fichier JSON.
 *
 * Format :
 * {
 *   "title": "Nom affiché dans le menu",
 *   "mode": "vanilla" | "p5" | "three" | "dom",   (facultatif, défaut : "vanilla")
 *   "steps": [
 *     { "title": "…", "prompt": "…", "code": ["ligne 1", "ligne 2"] }
 *   ]
 * }
 * `code` est une liste de lignes (ou une seule chaîne).
 * Le menu n'affiche que les processus du mode choisi (voir runtime/modes.js).
 *
 * Langues : title, prompt et code peuvent être localisés avec { "fr": …, "en": … }
 * (code : commentaires et textes affichés traduits, instructions identiques).
 * La langue de l'interface choisit la version (voir i18n/) ; une valeur simple
 * sert pour toutes les langues.
 *
 * Convention pour le code des étapes : chaque cellule est exécutée dans
 * sa propre balise <script>. Les `const` ne sont déclarées qu'une seule fois ;
 * ce qui doit évoluer d'une étape à l'autre est écrit sous forme de
 * `function`, qu'une étape suivante peut simplement redéfinir.
 */
import { EMPTY_STEP } from "../notebook/Cell.js";
import { MODES, modeOf } from "../runtime/modes.js";
import { pick, t } from "../i18n/index.js";

// Fichier chargé au démarrage
const DEFAULT_FILE = "./raster-image.json";

const files = import.meta.glob("./*.json", { eager: true, import: "default" });

const load = ({ title, mode, steps }) => ({
  title: pick(title),
  mode: modeOf(mode),
  steps: steps.map((step) => ({
    title: pick(step.title) ?? "",
    prompt: pick(step.prompt) ?? "",
    code: [pick(step.code) ?? ""].flat().join("\n"),
  })),
});

const loaded = Object.fromEntries(
  Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, data]) => [path, load(data)]),
);

// Pour chaque mode : « Nouveau processus » (une cellule vide), puis ses exemples
export const examples = Object.values(MODES).flatMap((mode) => [
  { title: t("picker.newProcess"), mode, steps: [EMPTY_STEP] },
  ...Object.values(loaded).filter((example) => example.mode === mode),
]);
export const defaultExample = loaded[DEFAULT_FILE] ?? examples[0];
