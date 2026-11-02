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

// Début de bloc `@error` (complet ou en cours de streaming) lors de la génération d'un prompt à partir du code
const STREAM_ERROR_BLOCK_RE =
  /^[ \t]*(?:\/\/[ \t]*)?@e(?:r(?:r(?:o(?:r\b[\s\S]*)?)?)?)?(?:\r?\n[\s\S]*|$)/im;
const ERROR_MARKER_RE = /^[ \t]*(?:\/\/[ \t]*)?@error\b[ \t]*[:\-–—]?[ \t]*/gim;
const EMOJI_RE = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

export class CodeCleaner {
  /** Retire uniquement le bloc de raisonnement `<think>…</think>`. */
  static stripThink(text) {
    return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "");
  }

  /** Retire `<think>…</think>` et extrait le bloc de code markdown ``` s'il y en a un. */
  static raw(text) {
    let code = CodeCleaner.stripThink(text);
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

  /**
   * Nettoie le prompt généré à partir du code utilisateur (y compris pendant le streaming) :
   * ne conserve que la première ligne de texte (avant tout bloc `@error` ou ```),
   * sans `CodeCleaner.raw()` qui extrairait par erreur un bloc ``` de fin de réponse.
   */
  static cleanPrompt(text) {
    const firstLine =
      CodeCleaner.stripThink(text)
        .replace(STREAM_ERROR_BLOCK_RE, "")
        .replace(/```[\s\S]*$/g, "")
        .trim()
        .split(/\r?\n/)[0] || "";
    return firstLine
      .replace(EMOJI_RE, "")
      .replace(/^(?:prompt|consigne)\s*:\s*/i, "")
      .trim()
      .replace(/^(?:["«“]([\s\S]*?)["»”])$/, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .trim();
  }

  /**
   * Analyse la réponse finale lors de la génération d'un prompt à partir du code :
   * - `prompt` : la consigne correspondant au code de l'utilisateur ;
   * - `advice` : explication pédagogique si le code contient une ou plusieurs erreurs.
   */
  static parsePrompt(text) {
    const cleaned = CodeCleaner.stripThink(text);
    const match = cleaned.match(/^[ \t]*(?:\/\/[ \t]*)?@error\b/im);
    const prompt = CodeCleaner.cleanPrompt(
      match ? cleaned.slice(0, match.index) : cleaned,
    );
    const advice = match
      ? cleaned
          .slice(match.index)
          .replace(ERROR_MARKER_RE, "")
          .replace(EMOJI_RE, "")
          .replace(/```[\w-]*\s*([\s\S]*?)(?:```|$)/g, (_, snippet) => {
            const inline = snippet.trim().replace(/\s+/g, " ");
            return inline ? `\`${inline}\`` : "";
          })
          .replace(/\s*\r?\n\s*/g, " ")
          .trim()
      : "";
    return { prompt, advice };
  }
}
