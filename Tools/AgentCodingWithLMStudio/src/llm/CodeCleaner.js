/**
 * Nettoie la réponse du modèle pour n'en garder que le code :
 * retire le raisonnement <think>…</think>, les balises markdown ```
 * et extrait les éventuelles sous-étapes (`// @step Titre | Prompt`)
 * lorsque le modèle décide de découper une demande complexe en plusieurs cellules.
 * Fonctionne aussi sur une réponse partielle (pendant le streaming).
 */

// Ligne de sous-étape complète : `// @step Titre | Prompt` (ou `// @step Prompt`)
const STEP_LINE_RE = /^[ \t]*\/\/[ \t]*@step\b[ \t]*[:\-–—]?[ \t]*(.+)$/gim;

// Ligne `@step` complète ou en cours d'écriture pendant le streaming
const STREAM_STEP_LINE_RE = /^[ \t]*\/\/[ \t]*@s(?:t(?:e(?:p\b.*)?)?)?$/gim;

export class CodeCleaner {
  /** Retire `<think>…</think>` et les balises markdown ```. */
  static raw(text) {
    let code = text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "");
    const fenced = code.match(/```[\w-]*\n?([\s\S]*?)(```|$)/);
    if (fenced) code = fenced[1];
    return code;
  }

  /**
   * Code nettoyé affiché dans l'éditeur (y compris pendant le streaming) :
   * les lignes `// @step …` sont masquées pour ne laisser visible que le commentaire.
   */
  static clean(text) {
    const code = CodeCleaner.raw(text)
      .replace(STREAM_STEP_LINE_RE, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return code ? `${code}\n` : "";
  }

  /** Vrai si le code contient des instructions exécutables en dehors des commentaires. */
  static hasExecutableCode(code) {
    return (
      code
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^[ \t]*\/\/.*$/gm, "")
        .trim().length > 0
    );
  }

  /**
   * Analyse la réponse finale du modèle :
   * - `code` : le code de la cellule (ou le commentaire résumant le découpage) ;
   * - `steps` : sous-étapes `[{ title, prompt }, ...]` si la demande a été subdivisée.
   * @param {string} text réponse brute du modèle
   * @param {(count: number) => string} [fallbackHeader] en-tête de secours si le modèle
   *   n'a renvoyé que des lignes `@step` sans commentaire d'explication
   */
  static parse(text, fallbackHeader) {
    const raw = CodeCleaner.raw(text);
    const steps = [];
    for (const match of raw.matchAll(STEP_LINE_RE)) {
      const body = match[1].trim();
      if (!body) continue;
      const pipe = body.indexOf("|");
      if (pipe !== -1) {
        const title = body
          .slice(0, pipe)
          .trim()
          .replace(/^(?:step|étape)\s*\d+\s*[:.\-–—]?\s*/i, "");
        const prompt = body.slice(pipe + 1).trim();
        if (prompt) steps.push({ title, prompt });
      } else {
        steps.push({ title: "", prompt: body });
      }
    }

    let code = CodeCleaner.clean(text);
    if (steps.length >= 2 && !CodeCleaner.hasExecutableCode(code)) {
      const commentLines = code
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      if (commentLines.length <= 1) {
        const header =
          commentLines[0] ||
          fallbackHeader?.(steps.length) ||
          `// Step breakdown (${steps.length}):`;
        const summary = steps.map(
          (s, i) => `// ${i + 1}. ${s.title ? `${s.title} — ` : ""}${s.prompt}`,
        );
        code = `${[header, ...summary].join("\n")}\n`;
      }
    }
    return { code, steps: steps.length >= 2 ? steps : [] };
  }
}
