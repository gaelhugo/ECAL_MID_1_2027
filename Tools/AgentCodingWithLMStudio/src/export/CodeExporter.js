/**
 * Exporte le notebook en un fichier HTML autonome, prêt à être ouvert
 * ou hébergé (la webcam exige https ou localhost).
 * Chaque cellule devient une balise <script>, précédée de son titre et
 * de son prompt en commentaire : le fichier se comporte comme l'aperçu.
 * La bibliothèque du mode (p5.js, three.js) est chargée depuis un CDN.
 */
import {
  DEFAULT_MODE,
  DEFERRED_RUNNER,
  headTags,
  scriptTag,
} from "../runtime/modes.js";
import { lang } from "../i18n/index.js";

export class CodeExporter {
  /**
   * @param {{ label: string, prompt: string, code: string }[]} cells dans l'ordre du notebook
   * @param {string} title titre du document
   * @param {object} mode mode du processus (voir runtime/modes.js)
   */
  static toHtml(cells, title, mode = DEFAULT_MODE) {
    const scripts = cells
      .filter((cell) => cell.code.trim())
      .map((cell) => CodeExporter.script(cell, mode))
      .join("\n\n");

    return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${CodeExporter.escape(title)}</title>
    <style>
${mode.style}
    </style>
  </head>
  <body>
${headTags(mode, "export").join("\n")}

${scripts}
${mode.deferred ? `\n${DEFERRED_RUNNER}` : ""}
  </body>
</html>
`;
  }

  /** Construit le fichier puis déclenche son téléchargement. */
  static download(cells, title, mode) {
    const blob = new Blob([CodeExporter.toHtml(cells, title, mode)], {
      type: "text/html",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${CodeExporter.slug(title)}.html`;
    link.click();
    // On libère l'URL une fois le téléchargement lancé
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /** Une cellule : commentaire (titre + prompt) puis son code. */
  static script({ label, prompt, code }, mode) {
    const comment = [label, ...prompt.split("\n")]
      .filter(Boolean)
      .map((line) => `// ${line}`)
      .join("\n");
    return scriptTag(`\n${comment}\n\n${code.trim()}\n`, mode.deferred);
  }

  static slug(text) {
    return (
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "processus"
    );
  }

  static escape(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
}
