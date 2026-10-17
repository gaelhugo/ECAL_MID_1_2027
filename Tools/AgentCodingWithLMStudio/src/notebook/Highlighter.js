/**
 * Coloration syntaxique minimaliste pour JavaScript.
 * Chaque groupe de l'expression régulière correspond à un type de jeton ;
 * l'ordre compte : un mot-clé est reconnu avant un nom de fonction.
 */
const TOKEN = new RegExp(
  [
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, // commentaire
    /(`(?:\\[\s\S]|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")/, // chaîne
    /\b(const|let|var|function|return|if|else|for|while|new|of|in|true|false|null|undefined|this|class|async|await)\b/, // mot-clé
    /\b(\d+(?:\.\d+)?)\b/, // nombre
    /\b([A-Z][A-Z0-9_]+)\b/, // constante en MAJUSCULES
    /([A-Za-z_$][\w$]*)(?=\s*\()/, // appel ou déclaration de fonction
  ]
    .map((part) => part.source)
    .join("|"),
  "g",
);
const TYPES = [
  "comment",
  "string",
  "keyword",
  "number",
  "constant",
  "function",
];

export class Highlighter {
  /** Transforme du code brut en HTML avec des <span class="tok-…">. */
  static toHtml(code) {
    let html = "";
    let last = 0;
    for (const match of code.matchAll(TOKEN)) {
      const type =
        TYPES[match.slice(1).findIndex((group) => group !== undefined)];
      html += Highlighter.#escape(code.slice(last, match.index));
      html += `<span class="tok-${type}">${Highlighter.#escape(match[0])}</span>`;
      last = match.index + match[0].length;
    }
    return html + Highlighter.#escape(code.slice(last));
  }

  static #escape(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
