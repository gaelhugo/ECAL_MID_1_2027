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
  MODES,
  headTags,
  modeOf,
  scriptTag,
} from "../runtime/modes.js";
import { lang, pick } from "../i18n/index.js";

export class CodeExporter {
  /**
   * @param {{ title?: string, label: string, prompt: string, code: string }[]} cells dans l'ordre du notebook
   * @param {string} title titre du document
   * @param {object} mode mode du processus (voir runtime/modes.js)
   */
  static toHtml(cells, title, mode = DEFAULT_MODE) {
    const active = cells.filter((cell) => cell.code.trim());
    const scripts = active
      .map((cell) => CodeExporter.script(cell, mode))
      .join("\n\n");
    const metadata = JSON.stringify({
      title,
      mode: mode.id,
      steps: active.map(({ title = "", prompt = "", code = "" }) => ({
        ...(title ? { title } : {}),
        prompt,
        code: code.trim(),
      })),
    }).replace(/<\/script/gi, "<\\/script");

    return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${CodeExporter.escape(title)}</title>
    <style>
${mode.style}
    </style>
    <script id="proce55us" type="application/json">${metadata}</script>
  </head>
  <body>
${headTags(mode, "export").join("\n")}

${scripts}
${mode.deferred ? `\n${DEFERRED_RUNNER}` : ""}
  </body>
</html>
`;
  }

  /**
   * Reconstruit un processus ({ title, mode, steps }) à partir d'un fichier HTML
   * téléchargé (avec métadonnées #proce55us ou anciens commentaires //) ou d'un JSON.
   */
  static fromHtml(text, fallbackTitle = "processus") {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) {
      return CodeExporter.fromJson(JSON.parse(trimmed), fallbackTitle);
    }

    const doc = new DOMParser().parseFromString(text, "text/html");
    const embedded = doc.querySelector(
      'script#proce55us[type="application/json"]',
    );
    if (embedded) {
      return CodeExporter.fromJson(
        JSON.parse(embedded.textContent),
        doc.title || fallbackTitle,
      );
    }

    // Rétrocompatibilité avec les fichiers HTML exportés avant l'ajout de #proce55us
    const title = doc.title?.trim() || fallbackTitle;
    const isThree = Boolean(
      doc.querySelector('script[data-cell], script[type="importmap"]'),
    );
    const isP5 = Boolean(doc.querySelector('script[src*="p5"]'));
    const isDom = text.includes("function css(text)");
    const mode = isThree
      ? MODES.three
      : isP5
        ? MODES.p5
        : isDom
          ? MODES.dom
          : DEFAULT_MODE;

    const selector = mode.deferred
      ? "script[data-cell]"
      : "body > script:not([src]):not([type])";
    const steps = [...doc.querySelectorAll(selector)]
      .map((script) => script.textContent.trim())
      .filter((body) => body && !body.startsWith("function css(text)"))
      .map((body) => CodeExporter.parseLegacyScript(body));

    if (!steps.length) throw new Error("Empty or unrecognized HTML file");
    return { title, mode, steps };
  }

  static fromJson(data, fallbackTitle = "processus") {
    const steps = (data.steps ?? []).map((step) => {
      const code = pick(step.code) ?? "";
      return {
        title: pick(step.title) ?? "",
        prompt: pick(step.prompt) ?? "",
        code: Array.isArray(code) ? code.join("\n") : code,
      };
    });
    if (!steps.length) throw new Error("No steps found");
    return {
      title: pick(data.title) || fallbackTitle,
      mode: modeOf(data.mode),
      steps,
    };
  }

  /** Extrait { title, prompt, code } d'une balise <script> d'un ancien export HTML. */
  static parseLegacyScript(body) {
    const lines = body.split("\n");
    const comments = [];
    let i = 0;
    while (i < lines.length && lines[i].startsWith("//")) {
      comments.push(lines[i].replace(/^\/\/ ?/, ""));
      i++;
    }
    while (i < lines.length && !lines[i].trim()) i++;
    const code = lines.slice(i).join("\n").trim();

    let title = "";
    if (comments.length && /^(Étape|Step)\s+\d+/i.test(comments[0])) {
      const first = comments.shift();
      const match = first.match(/^(?:Étape|Step)\s+\d+\s*[—-]\s*(.+)$/i);
      if (match) title = match[1].trim();
    }
    return { title, prompt: comments.join("\n").trim(), code };
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
