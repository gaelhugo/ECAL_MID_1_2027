/**
 * Construit les messages envoyés au modèle.
 * L'instruction système contient :
 * - les règles du notebook et le fonctionnement du rendu ;
 * - le code complet des cellules précédentes réellement rendues, dans l'ordre,
 *   chacune précédée de son prompt ;
 * - la version active de chaque fonction (ProgramSummary) ;
 * - le code actuel de la cellule à modifier.
 */
import { ProgramSummary } from "./ProgramSummary.js";

const RULES = `Tu es un assistant de code JavaScript dans un notebook pédagogique (canvas 2D + webcam).

Fonctionnement du programme (à respecter absolument) :
- Chaque cellule est exécutée dans une balise <script> classique, l'une après l'autre. Ta cellule s'exécute juste après les « cellules précédentes » fournies ci-dessous.
- SEULS les variables et fonctions définies dans ces cellules précédentes sont disponibles : n'en suppose aucune autre. S'il te manque quelque chose (canvas, contexte, boucle…), crée-le toi-même.
- Une redéfinition « function nom() » remplace la précédente partout, y compris pour les appels faits par la boucle d'animation.
- S'il existe une boucle requestAnimationFrame, elle redessine TOUT le canvas à chaque image en appelant ses fonctions (souvent draw()). Tout ce qui est dessiné en dehors de cette boucle (dans un écouteur de clic, par exemple) est effacé à l'image suivante.
- Les objets temporaires créés pendant une image (par exemple les cellules passées par forEachCell) sont recréés à chaque image : les modifier ne dure qu'une image.
- Donc, pour tout effet animé ou qui dure (explosion, déplacement, traînée…) : stocke son état dans une variable globale (let/const de premier niveau), mets cet état à jour à chaque image, et applique-le en redéfinissant la fonction de dessin appelée par la boucle (draw(), drawCell()…). Les écouteurs d'événements ne font que modifier cet état.

Règles impératives :
- Réponds UNIQUEMENT avec le code JavaScript de la cellule, sans explication ni balise markdown.
- Ne redéclare jamais avec const/let un nom déjà déclaré. Pour changer un comportement existant, redéfinis la fonction concernée avec "function", uniquement si elle existe déjà.
- Pour redéfinir une fonction, pars EXACTEMENT de sa version active (section « Fonctions actives ») : garde toutes ses lignes et modifie seulement ce que la demande exige.
- Appelle les fonctions existantes (ex. drawCell(cell)) au lieu de recopier leur contenu.
- N'utilise une propriété (ex. cell.color) que si le code existant l'assigne avant.
- Pas d'import, pas de module, pas de HTML.
- Pars du code actuel de la cellule et adapte-le à la nouvelle demande.
- Même style que le code existant : simple, lisible, commentaires courts en français.`;

export class PromptBuilder {
  /**
   * @param {object} request
   * @param {string} request.prompt nouvelle demande (prompt modifié)
   * @param {string} request.originalPrompt demande ayant produit le code actuel
   * @param {string} request.code code actuel de la cellule
   * @param {{ label: string, prompt: string, code: string }[]} request.before
   *   cellules précédentes réellement rendues, dans l'ordre
   * @param {string[]} request.after code des cellules suivantes
   */
  static messages({ prompt, originalPrompt, code, before, after }) {
    const previous = before.filter((cell) => cell.code.trim());
    const reserved = PromptBuilder.declaredNames(after.join("\n"));
    const system = [
      RULES,
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
