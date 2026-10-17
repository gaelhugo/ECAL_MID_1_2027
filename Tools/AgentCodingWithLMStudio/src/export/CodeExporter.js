/**
 * Exporte le notebook en un fichier HTML autonome, prêt à être ouvert
 * ou hébergé (la webcam exige https ou localhost).
 * Chaque cellule devient une balise <script>, précédée de son titre et
 * de son prompt en commentaire : le fichier se comporte comme l'aperçu.
 */
export class CodeExporter {
  /**
   * @param {{ label: string, prompt: string, code: string }[]} cells dans l'ordre du notebook
   * @param {string} title titre du document
   */
  static toHtml(cells, title) {
    const scripts = cells
      .filter((cell) => cell.code.trim())
      .map((cell) => CodeExporter.script(cell))
      .join("\n\n");

    return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${CodeExporter.escape(title)}</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #fff; }
      canvas { display: block; }
    </style>
  </head>
  <body>
${scripts}
  </body>
</html>
`;
  }

  /** Construit le fichier puis déclenche son téléchargement. */
  static download(cells, title) {
    const blob = new Blob([CodeExporter.toHtml(cells, title)], {
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
  static script({ label, prompt, code }) {
    const comment = [label, ...prompt.split("\n")]
      .filter(Boolean)
      .map((line) => `// ${line}`)
      .join("\n");
    const body = code.trim().replace(/<\/script/gi, "<\\/script");
    return `<script>\n${comment}\n\n${body}\n</script>`;
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
