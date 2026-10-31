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
const REMOTE_EXAMPLES_URL =
  "https://api.github.com/repos/gaelhugo/ECAL_MID_1_2027/contents/Tools/AgentCodingWithLMStudio/src/examples";

const files = import.meta.glob("./*.json", { eager: true, import: "default" });

export const load = ({ title, mode, steps }, path) => ({
  path,
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
    .map(([path, data]) => [path, load(data, path)]),
);

const buildExamples = () =>
  Object.values(MODES).flatMap((mode) => [
    { title: t("picker.newProcess"), mode, steps: [EMPTY_STEP] },
    ...Object.entries(loaded)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, example]) => example)
      .filter((example) => example.mode === mode),
  ]);

// Pour chaque mode : « Nouveau processus » (une cellule vide), puis ses exemples
export const examples = buildExamples();
export const defaultExample = loaded[DEFAULT_FILE] ?? examples[0];

/** Ajoute ou met à jour un exemple en mémoire et reconstruit la liste. */
export function registerExample(path, data) {
  const entry = load(data, path);
  loaded[path] = entry;
  examples.splice(0, examples.length, ...buildExamples());
  return entry;
}

/** Ajoute un processus importé localement (glisser-déposer HTML/JSON) pour la session. */
export function registerImported({ title, mode, steps }) {
  const entry = load({ title, mode: mode.id ?? mode, steps });
  loaded[`imported:${entry.title}`] = entry;
  examples.splice(0, examples.length, ...buildExamples());
  return entry;
}

/** Retire un exemple en mémoire et reconstruit la liste. */
export function unregisterExample(path) {
  delete loaded[path];
  examples.splice(0, examples.length, ...buildExamples());
}

/**
 * Synchronise en arrière-plan les exemples depuis GitHub : un processus ajouté
 * ou supprimé sur GitHub est immédiatement pris en compte sans recompiler.
 */
export async function syncRemoteExamples(onUpdate) {
  try {
    const res = await fetch(REMOTE_EXAMPLES_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const items = await res.json();
    const remoteKeys = new Set();
    let changed = false;
    for (const item of items) {
      if (!item.name?.endsWith(".json") || !item.download_url) continue;
      const key = `./${item.name}`;
      remoteKeys.add(key);
      if (loaded[key]) continue;
      const data = await (await fetch(item.download_url)).json();
      loaded[key] = load(data, key);
      changed = true;
    }
    for (const key of Object.keys(loaded)) {
      if (key.startsWith("./") && !remoteKeys.has(key)) {
        delete loaded[key];
        changed = true;
      }
    }
    if (changed) {
      examples.splice(0, examples.length, ...buildExamples());
      onUpdate?.();
    }
  } catch {
    // Hors ligne ou GitHub indisponible : les exemples intégrés suffisent
  }
}
