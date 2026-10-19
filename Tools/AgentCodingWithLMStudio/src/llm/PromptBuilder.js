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
import { DEFAULT_MODE } from "../runtime/modes.js";
import { lang as uiLang } from "../i18n/index.js";

const bullets = (lines) => lines.map((line) => `- ${line}`).join("\n");

// Rappel ajouté à la demande de l'utilisateur, écrit dans la langue voulue :
// c'est le message que le modèle suit le plus (même si le prompt est dans une autre langue)
const LANGUAGE_REMINDERS = {
  fr: "(Écris tous les commentaires du code en français, et les textes affichés aussi.)",
  en: "(Write all code comments in English, and any displayed text too.)",
};

// Langue des commentaires et des textes visibles du code généré
const LANGUAGE_RULES = {
  fr: "Write EVERY code comment in French — natural, correct French with all its accents (é, è, à, ç…), e.g. « // On redessine le fond à chaque image ». Any text displayed on the page (titles, labels, buttons, placeholders…) must also be in French. Keep identifiers (variable and function names) in English. Apply this even if the request or the existing code is written in another language.",
  en: "Write every code comment in English. Any text displayed on the page (titles, labels, buttons, placeholders…) must also be in English. Keep identifiers (variable and function names) in English. Apply this even if the request or the existing code is written in another language.",
};

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
   * @param {object} [request.mode] mode du processus (voir runtime/modes.js)
   * @param {string} [request.lang] langue des commentaires : "fr" ou "en" (défaut : interface)
   */
  static messages({
    prompt,
    originalPrompt,
    code,
    before,
    after,
    mode = DEFAULT_MODE,
    lang = uiLang,
  }) {
    const previous = before.filter((cell) => cell.code.trim());
    const reserved = PromptBuilder.declaredNames(after.join("\n"));
    const system = [
      rules(mode, lang),
      previous.length
        ? `Previous cells already run, in order (full code):\n${PromptBuilder.fence(
            previous.map(PromptBuilder.cellBlock).join("\n\n"),
          )}`
        : "Previous cells: none. Nothing exists yet.",
      previous.length &&
        `Active functions (the last definition of each one, the one that actually runs):\n${PromptBuilder.fence(
          ProgramSummary.activeFunctions(previous.map((cell) => cell.code)),
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
    return [
      { role: "system", content: system.filter(Boolean).join("\n\n") },
      {
        role: "user",
        content: `${prompt}\n\n${LANGUAGE_REMINDERS[lang] ?? LANGUAGE_REMINDERS.en}`,
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
