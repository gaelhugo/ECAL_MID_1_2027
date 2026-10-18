/**
 * Construit les messages envoyés au modèle.
 * L'instruction système contient :
 * - les règles du notebook et le fonctionnement du rendu ;
 * - le code complet des cellules précédentes réellement rendues, dans l'ordre,
 *   chacune précédée de son prompt ;
 * - la version active de chaque fonction (ProgramSummary) ;
 * - le code actuel de la cellule à modifier.
 * Les règles dépendent du mode du processus (JavaScript, p5.js, three.js, DOM).
 */
import { ProgramSummary } from "./ProgramSummary.js";
import { DEFAULT_MODE } from "../runtime/modes.js";

const bullets = (lines) => lines.map((line) => `- ${line}`).join("\n");

/** Instruction de base, complétée par les règles propres au mode. */
const rules = (
  mode,
) => `Tu es un assistant de code JavaScript dans un notebook pédagogique (${mode.context}).

Fonctionnement du programme (à respecter absolument) :
${bullets([
  "Chaque cellule est exécutée dans une balise <script> classique, l'une après l'autre. Ta cellule s'exécute juste après les « cellules précédentes » fournies ci-dessous.",
  "SEULS les variables et fonctions définies dans ces cellules précédentes sont disponibles : n'en suppose aucune autre. S'il te manque quelque chose (canvas, contexte, boucle…), crée-le toi-même.",
  "Une redéfinition « function nom() » remplace la précédente partout, y compris pour les appels faits par la boucle d'animation.",
  ...mode.rules,
])}

Règles impératives :
${bullets([
  "Réponds UNIQUEMENT avec le code JavaScript de la cellule, sans explication ni balise markdown.",
  'Ne redéclare jamais avec const/let un nom déjà déclaré. Pour changer un comportement existant, redéfinis la fonction concernée avec "function", uniquement si elle existe déjà.',
  "Pour redéfinir une fonction, pars EXACTEMENT de sa version active (section « Fonctions actives ») : garde toutes ses lignes et modifie seulement ce que la demande exige.",
  "Appelle les fonctions existantes (ex. drawCell(cell)) au lieu de recopier leur contenu.",
  "N'utilise une propriété (ex. cell.color) que si le code existant l'assigne avant.",
  mode.output,
  "Pars du code actuel de la cellule et adapte-le à la nouvelle demande.",
  "Même style que le code existant : simple, lisible, commentaires courts en français.",
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
   */
  static messages({
    prompt,
    originalPrompt,
    code,
    before,
    after,
    mode = DEFAULT_MODE,
  }) {
    const previous = before.filter((cell) => cell.code.trim());
    const reserved = PromptBuilder.declaredNames(after.join("\n"));
    const system = [
      rules(mode),
      previous.length
        ? `Cellules précédentes déjà exécutées, dans l'ordre (code complet) :\n${PromptBuilder.fence(
            previous.map(PromptBuilder.cellBlock).join("\n\n"),
          )}`
        : "Cellules précédentes : aucune. Rien n'existe encore.",
      previous.length &&
        `Fonctions actives (la dernière définition de chacune, celle qui s'exécute réellement) :\n${PromptBuilder.fence(
          ProgramSummary.activeFunctions(previous.map((cell) => cell.code)),
        )}`,
      reserved.length &&
        `Noms réservés par les cellules suivantes : ils ne sont PAS disponibles ici, ne les utilise pas et ne les déclare pas avec const/let : ${reserved.join(", ")}`,
      originalPrompt &&
        `Demande ayant produit le code actuel de la cellule : « ${originalPrompt} »`,
      code.trim()
        ? `Code actuel de la cellule :\n${PromptBuilder.fence(code)}`
        : "La cellule est nouvelle et vide : écris son code à partir de zéro.",
    ];
    return [
      { role: "system", content: system.filter(Boolean).join("\n\n") },
      { role: "user", content: prompt },
    ];
  }

  /** Une cellule précédente : en-tête (titre + prompt) en commentaire, puis son code. */
  static cellBlock({ label, prompt, code }) {
    const header = `// ===== ${label}${prompt ? ` — prompt : « ${prompt.replace(/\s+/g, " ")} »` : ""} =====`;
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
