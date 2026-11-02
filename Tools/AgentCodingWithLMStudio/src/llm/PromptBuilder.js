/**
 * Construit les messages envoyés au modèle.
 * L'instruction système contient :
 * - les règles du notebook et le fonctionnement du rendu ;
 * - le code complet des cellules précédentes réellement rendues, dans l'ordre,
 *   chacune précédée de son prompt ;
 * - la version active de chaque fonction (ProgramSummary) ;
 * - le code actuel de la cellule à modifier.
 * Les règles dépendent du mode du processus (JavaScript, p5.js, three.js, DOM).
 * Elles sont rédigées en anglais (mieux suivies par les petits modèles locaux) ;
 * la langue des commentaires et des textes affichés suit celle de l'interface.
 */
import { ProgramSummary } from "./ProgramSummary.js";
import { CodeCleaner } from "./CodeCleaner.js";
import { DEFAULT_MODE } from "../runtime/modes.js";
import { lang as uiLang } from "../i18n/index.js";

const bullets = (lines) => lines.map((line) => `- ${line}`).join("\n");

// Rappel ajouté à la demande de l'utilisateur, écrit dans la langue voulue :
// c'est le message que le modèle suit le plus (même si le prompt est dans une autre langue)
const LANGUAGE_REMINDERS = {
  fr: "(Écris tous les commentaires du code en français, et les textes affichés aussi.)",
  en: "(Write all code comments in English, and any displayed text too.)",
};

const SPLIT_REMINDERS = {
  fr: "(Si cette demande est trop complexe ou combine plusieurs étapes distinctes pour une seule cellule simple, ne génère pas le code : réponds uniquement par un court commentaire `// ...` en français expliquant le découpage suivi des lignes `// @step Titre court | Prompt détaillé` en français. Si elle est simple, écris directement le code JavaScript avec commentaires et textes affichés en français.)",
  en: "(If this request is too sophisticated or combines multiple distinct stages for a single simple cell, do not write implementation code: reply only with a short `// ...` comment in English explaining the subdivision followed by `// @step Short title | Clear prompt` lines in English. If it is simple, write the JavaScript code directly with comments and displayed text in English.)",
};

const STEP_REMINDERS = {
  fr: "(Implémente uniquement cette étape, sans anticiper les étapes suivantes prévues. Écris tous les commentaires du code et les textes affichés en français.)",
  en: "(Implement only this step without anticipating the upcoming steps. Write all code comments and displayed text in English.)",
};

// Langue des commentaires et des textes visibles du code généré
const LANGUAGE_RULES = {
  fr: "Write EVERY code comment in French — natural, correct French with all its accents (é, è, à, ç…), e.g. « // On redessine le fond à chaque image ». Any text displayed on the page (titles, labels, buttons, placeholders…) must also be in French. Keep identifiers (variable and function names) in English. Apply this even if the request or the existing code is written in another language.",
  en: "Write every code comment in English. Any text displayed on the page (titles, labels, buttons, placeholders…) must also be in English. Keep identifiers (variable and function names) in English. Apply this even if the request or the existing code is written in another language.",
};

const STEP_LANGUAGE_RULES = {
  fr: "Write the subdivision comment AND every `@step` title and prompt in natural French.",
  en: "Write the subdivision comment AND every `@step` title and prompt in English.",
};

/** Règles de découpage automatique lorsqu'un prompt demande un code trop complexe. */
const splitRules = (
  lang,
) => `Automatic step subdivision (when a request is too sophisticated for a single cell):
${bullets([
  "Each cell in this educational notebook must stay short, simple, and easy to read (a single clear idea, ~10–35 lines).",
  "FIRST, evaluate the complexity of the user's request relative to what already exists in the previous cells:",
  "KEEP AS A SINGLE CELL (write the JavaScript code directly) if the request is a single logical step or a targeted modification (e.g. setting up a canvas or webcam, drawing a shape or a grid, changing colors/sizes, adding a simple motion or a single event handler).",
  "SPLIT INTO SUB-STEPS if the request asks for a complete multi-part program at once or combines 2 or more distinct mechanisms that would make a single cell long (> ~40 lines) or mix several concepts (e.g. setup/capture + grid/particles/objects + animation/physics + mouse/keyboard/audio/hand interaction + UI/scoring).",
  "When you decide to SPLIT, DO NOT write any executable JavaScript code in this cell. Reply ONLY with:",
  "1. A short JavaScript comment (2 to 6 lines starting with `//`) briefly explaining how the process is divided into simple steps.",
  "2. Immediately after, 2 to 5 lines using this exact syntax (one sub-step per line): `// @step <Short step title (2-5 words)> | <Clear, self-contained prompt describing what that cell should build>`",
  "Order the sub-steps logically so each step produces a visible, working intermediate result that the next step refines by calling or redefining functions (e.g. Step 1 creates the base scene/elements and render loop with a simple `drawItem(item)` function; Step 2 refines `drawItem(item)` or `updateItem(item)`; Step 3 adds interaction).",
  "Never mix executable JavaScript statements with `// @step` lines.",
  STEP_LANGUAGE_RULES[lang] ?? STEP_LANGUAGE_RULES.en,
])}`;

/** Instruction de base, complétée par les règles propres au mode et à la langue. */
const rules = (
  mode,
  lang,
) => `You are a JavaScript coding assistant in an educational notebook (${mode.context}).

How the program works (follow strictly):
${bullets([
  "Each cell runs in a classic <script> tag, one after the other. Your cell runs right after the “previous cells” given below.",
  "ONLY the variables and functions defined in those previous cells are available: assume nothing else exists. If something is missing (canvas, context, loop…), create it yourself.",
  "Redefining “function name()” replaces the previous definition everywhere, including for calls made by the animation loop.",
  ...mode.rules,
])}

Mandatory rules:
${bullets([
  "Reply ONLY with the JavaScript code of the cell, with no explanation and no markdown fence.",
  'Never redeclare with const/let a name that is already declared. To change an existing behavior, redefine the relevant function with "function", only if it already exists.',
  "Structure your code with small named `function` declarations (e.g. `function drawItem(item)`, `function update()`) called from the main loop so later cells can easily redefine a single function without duplicating the loop.",
  "To redefine a function, start EXACTLY from its active version (“Active functions” section): keep all its lines and change only what the request requires.",
  "Call existing functions (e.g. drawCell(cell)) instead of copying their content.",
  "Only use a property (e.g. cell.color) if the existing code assigns it first.",
  mode.output,
  "Start from the current code of the cell and adapt it to the new request.",
  "Same style as the existing code: simple, readable, short comments.",
  LANGUAGE_RULES[lang] ?? LANGUAGE_RULES.en,
])}`;

export class PromptBuilder {
  /**
   * @param {object} request
   * @param {string} request.prompt nouvelle demande (prompt modifié)
   * @param {string} request.originalPrompt demande ayant produit le code actuel
   * @param {string} request.code code actuel de la cellule
   * @param {{ label: string, prompt: string, code: string }[]} request.before
   *   cellules précédentes réellement rendues, dans l'ordre
   * @param {string[]} request.after code des cellules suivantes
   * @param {string[]} [request.upcoming] prompts des sous-étapes suivantes déjà planifiées
   * @param {boolean} [request.allowSplit] autorise le découpage en sous-étapes (vrai par défaut)
   * @param {object} [request.mode] mode du processus (voir runtime/modes.js)
   * @param {string} [request.lang] langue des commentaires : "fr" ou "en" (défaut : interface)
   */
  static messages({
    prompt,
    originalPrompt,
    code,
    before,
    after,
    upcoming = [],
    allowSplit = true,
    mode = DEFAULT_MODE,
    lang = uiLang,
  }) {
    const previous = before.filter((cell) => cell.code.trim());
    const hasPreviousExecutable = previous.some((cell) =>
      CodeCleaner.hasExecutableCode(cell.code),
    );
    const activeFunctions = previous.length
      ? ProgramSummary.activeFunctions(previous.map((cell) => cell.code))
      : "";
    const reserved = PromptBuilder.declaredNames(after.join("\n"));
    const system = [
      rules(mode, lang),
      allowSplit && splitRules(lang),
      previous.length
        ? `Previous cells already run, in order (full code):\n${PromptBuilder.fence(
            previous.map(PromptBuilder.cellBlock).join("\n\n"),
          )}${
            hasPreviousExecutable
              ? ""
              : "\n(Note: the previous cell only contains comments — no canvas, scene, variables, or functions exist yet. Create everything needed from scratch.)"
          }`
        : "Previous cells: none. Nothing exists yet.",
      activeFunctions &&
        `Active functions (the last definition of each one, the one that actually runs):\n${PromptBuilder.fence(
          activeFunctions,
        )}`,
      upcoming.length &&
        `Upcoming sub-steps planned in the following cells (DO NOT implement them in this cell; only implement the current cell's request and expose clean helper functions using \`function name()\` so those next cells can refine or override them):\n${bullets(
          upcoming,
        )}`,
      reserved.length &&
        `Names reserved by the following cells: they are NOT available here, do not use them and do not declare them with const/let: ${reserved.join(", ")}`,
      originalPrompt &&
        `Request that produced the current code of the cell: “${originalPrompt}”`,
      code.trim()
        ? `Current code of the cell:\n${PromptBuilder.fence(code)}`
        : "The cell is new and empty: write its code from scratch.",
      // Rappel final (les modèles suivent mieux une consigne placée en dernier)
      `Reminder: ${LANGUAGE_RULES[lang] ?? LANGUAGE_RULES.en}`,
    ];
    const reminder = allowSplit
      ? (SPLIT_REMINDERS[lang] ?? SPLIT_REMINDERS.en)
      : upcoming.length
        ? (STEP_REMINDERS[lang] ?? STEP_REMINDERS.en)
        : (LANGUAGE_REMINDERS[lang] ?? LANGUAGE_REMINDERS.en);
    return [
      { role: "system", content: system.filter(Boolean).join("\n\n") },
      {
        role: "user",
        content: `${prompt}\n\n${reminder}`,
      },
    ];
  }

  /** Une cellule précédente : en-tête (titre + prompt) en commentaire, puis son code. */
  static cellBlock({ label, prompt, code }) {
    const header = `// ===== ${label}${prompt ? ` — prompt: “${prompt.replace(/\s+/g, " ")}”` : ""} =====`;
    return `${header}\n${code.trim()}`;
  }

  static fence(code) {
    return code.trim() && `\`\`\`js\n${code.trim()}\n\`\`\``;
  }

  /** Noms déclarés au premier niveau avec const ou let. */
  static declaredNames(code) {
    return [...code.matchAll(/^(?:const|let)\s+(\w+)/gm)].map(
      (match) => match[1],
    );
  }
}
