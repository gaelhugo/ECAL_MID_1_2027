/**
 * Extrait, à partir du code de plusieurs cellules, la version active de
 * chaque fonction, c'est-à-dire sa dernière définition : celle qui
 * s'exécute réellement. Complète le code brut des cellules, où plusieurs
 * versions d'une même fonction coexistent.
 */
export class ProgramSummary {
  /** @param {string[]} codes code des cellules, dans l'ordre d'exécution */
  static activeFunctions(codes) {
    const functions = new Map(); // nom → source (la dernière définition gagne)
    for (const code of codes) {
      for (const { name, source } of ProgramSummary.functions(code)) {
        functions.delete(name); // replacée à la fin : ordre de dernière définition
        functions.set(name, source);
      }
    }
    return [...functions.values()].join("\n\n");
  }

  /** Déclarations « function nom(…) { … } » de premier niveau, avec leurs commentaires. */
  static *functions(code) {
    for (const match of code.matchAll(/^function\s+(\w+)\s*\(/gm)) {
      const end = ProgramSummary.closingBrace(
        code,
        code.indexOf("{", match.index),
      );
      if (end < 0) continue;
      const start = ProgramSummary.commentStart(code, match.index);
      yield { name: match[1], source: code.slice(start, end + 1) };
    }
  }

  /** Remonte sur les lignes de commentaire qui précèdent immédiatement la fonction. */
  static commentStart(code, index) {
    const lines = code.slice(0, index).split("\n");
    lines.pop(); // début de la ligne « function »
    let start = index;
    while (lines.length && lines.at(-1).trim().startsWith("//")) {
      start -= lines.pop().length + 1;
    }
    return start;
  }

  /** Position de l'accolade fermante correspondante (ignore chaînes et commentaires). */
  static closingBrace(code, open) {
    let depth = 0;
    for (let i = open; i >= 0 && i < code.length; i++) {
      const char = code[i];
      const next = code[i + 1];
      if (char === "/" && next === "/") i = code.indexOf("\n", i);
      else if (char === "/" && next === "*") i = code.indexOf("*/", i) + 1;
      else if (char === '"' || char === "'" || char === "`")
        i = ProgramSummary.stringEnd(code, i);
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) return i;
      if (i < 0) return -1;
    }
    return -1;
  }

  /** Position du guillemet fermant (gère les caractères échappés). */
  static stringEnd(code, start) {
    for (let i = start + 1; i < code.length; i++) {
      if (code[i] === "\\") i++;
      else if (code[i] === code[start]) return i;
    }
    return -1;
  }
}
