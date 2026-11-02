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
  fr: "(Écris les commentaires et textes en français. Si la demande combine plusieurs mécanismes complexes, réponds uniquement par un court commentaire `// ...` et 2 à 4 lignes `// @step Titre | Prompt`.)",
  en: "(Write comments and text in English. If the request combines multiple complex mechanisms, reply only with a short `// ...` comment and 2 to 4 `// @step Title | Prompt` lines.)",
};

const STEP_REMINDERS = {
  fr: "(Implémente uniquement cette étape, sans anticiper les suivantes. Commentaires et textes en français.)",
  en: "(Implement only this step without anticipating the next ones. Comments and text in English.)",
};

// Langue des commentaires et des textes visibles du code généré
const LANGUAGE_RULES = {
  fr: "Write EVERY code comment in French — natural, correct French with all its accents (é, è, à, ç…), e.g. « // On redessine le fond à chaque image ». Any text displayed on the page (titles, labels, buttons, placeholders…) must also be in French. Keep identifiers (variable and function names) in English. Apply this even if the request or the existing code is written in another language.",
  en: "Write every code comment in English. Any text displayed on the page (titles, labels, buttons, placeholders…) must also be in English. Keep identifiers (variable and function names) in English. Apply this even if the request or the existing code is written in another language.",
};

const STEP_LANGUAGE_RULES = {
  fr: "Write the comment and every `@step` title and prompt in French, with no emoji.",
  en: "Write the comment and every `@step` title and prompt in English, with no emoji.",
};

const CODE_TO_PROMPT_LANGUAGE_RULES = {
  fr: "Write in natural French with accents (é, è, à, ç…). Never use emojis.",
  en: "Write in English. Never use emojis.",
};

const CODE_TO_PROMPT_REMINDERS = {
  fr: "(Ligne 1 : prompt court en français décrivant ce code, sans emoji. Si erreur dans le code : ligne 2 `@error ` + explication pédagogique courte en français, sans emoji.)",
  en: "(Line 1: short prompt in English describing this code, no emoji. If error in code: line 2 `@error ` + short pedagogical explanation in English, no emoji.)",
};

/** Règles concises de découpage automatique lorsqu'un prompt demande un code trop complexe. */
const splitRules = (lang) => `Step subdivision (only if the request is too complex for one cell):
${bullets([
  "If the request is a single step or simple change (~10–35 lines), write the JavaScript code directly.",
  "If it combines several distinct stages (e.g. setup/capture + grid/objects + physics/animation + interaction, > ~40 lines), DO NOT write code: reply ONLY with a 2–4 line `//` comment explaining the split, followed by 2 to 4 lines formatted as `// @step Short title | Self-contained prompt for that step`.",
  "Each sub-step must produce a visible intermediate result that the next step refines by redefining a `function`.",
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
    // Le découpage ne s'applique qu'aux cellules sans code existant et dont le prompt est assez riche
    const canSplit =
      allowSplit &&
      !CodeCleaner.hasExecutableCode(code) &&
      prompt.trim().split(/\s+/).length >= 8;
    const system = [
      rules(mode, lang),
      canSplit && splitRules(lang),
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
    const reminder = canSplit
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

  /**
   * Construit des messages légers et rapides pour générer le prompt correspondant
   * au code saisi par l'utilisateur, et signaler pédagogiquement d'éventuelles erreurs.
   */
  static promptFromCodeMessages({
    code,
    currentPrompt = "",
    before = [],
    errors = [],
    mode = DEFAULT_MODE,
    lang = uiLang,
  }) {
    const previous = before.filter((cell) => cell.code.trim());
    const previousCode = previous.map((cell) => cell.code).join("\n");
    const declaredInPrevious = [
      ...PromptBuilder.declaredNames(previousCode),
      ...[...previousCode.matchAll(/^function\s+(\w+)/gm)].map((m) => m[1]),
    ];
    const langRule =
      CODE_TO_PROMPT_LANGUAGE_RULES[lang] ?? CODE_TO_PROMPT_LANGUAGE_RULES.en;
    const system = [
      `You are a concise JavaScript assistant in an educational notebook (${mode.context}).
Given the user's cell code:
1. Line 1: write a 1-sentence prompt describing what this cell's code does (or intends to do), phrased as a direct instruction (no quotes, no markdown, no "Prompt:" prefix, no emoji).
2. Line 2 (ONLY if the code has an error/bug or a runtime error is given): write \`@error \` followed by 1–2 short pedagogical sentences explaining the cause and how to fix it with a \`code\` snippet (no emoji). If the code is valid, write ONLY Line 1.
${langRule}`,
      declaredInPrevious.length
        ? `Identifiers already defined in previous cells: ${[...new Set(declaredInPrevious)].join(", ")}`
        : "Previous cells: none (nothing defined before this cell).",
      currentPrompt.trim() && `Previous prompt to update: “${currentPrompt.trim()}”`,
      errors.length &&
        `Runtime error to explain on Line 2 with \`@error \`: ${errors.join(" | ")}`,
    ];
    return [
      { role: "system", content: system.filter(Boolean).join("\n\n") },
      {
        role: "user",
        content: `${PromptBuilder.fence(code)}\n\n${
          CODE_TO_PROMPT_REMINDERS[lang] ?? CODE_TO_PROMPT_REMINDERS.en
        }`,
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
