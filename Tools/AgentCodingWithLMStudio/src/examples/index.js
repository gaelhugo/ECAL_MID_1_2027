/**
 * Processus proposés dans le menu du titre.
 * Chaque fichier `src/examples/*.json` est chargé automatiquement :
 * pour créer un processus, il suffit d'ajouter un fichier JSON.
 *
 * Format :
 * {
 *   "title": "Nom affiché dans le menu",
 *   "steps": [
 *     { "title": "…", "prompt": "…", "code": ["ligne 1", "ligne 2"] }
 *   ]
 * }
 * `code` est une liste de lignes (ou une seule chaîne).
 *
 * Convention pour le code des étapes : chaque cellule est exécutée dans
 * sa propre balise <script>. Les `const` ne sont déclarées qu'une seule fois ;
 * ce qui doit évoluer d'une étape à l'autre est écrit sous forme de
 * `function`, qu'une étape suivante peut simplement redéfinir.
 */
import { EMPTY_STEP } from "../notebook/Cell.js";

// Fichier chargé au démarrage
const DEFAULT_FILE = "./raster-image.json";

const files = import.meta.glob("./*.json", { eager: true, import: "default" });

const load = ({ title, steps }) => ({
  title,
  steps: steps.map((step) => ({
    title: step.title ?? "",
    prompt: step.prompt ?? "",
    code: [step.code ?? ""].flat().join("\n"),
  })),
});

const loaded = Object.fromEntries(
  Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, data]) => [path, load(data)]),
);

const newProcess = { title: "Nouveau processus", steps: [EMPTY_STEP] };

export const examples = [newProcess, ...Object.values(loaded)];
export const defaultExample = loaded[DEFAULT_FILE] ?? newProcess;
