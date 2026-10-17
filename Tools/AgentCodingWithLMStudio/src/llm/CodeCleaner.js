/**
 * Nettoie la réponse du modèle pour n'en garder que le code :
 * retire le raisonnement <think>…</think> et les balises markdown ```.
 * Fonctionne aussi sur une réponse partielle (pendant le streaming).
 */
export class CodeCleaner {
  static clean(text) {
    let code = text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '');
    const fenced = code.match(/```[\w-]*\n?([\s\S]*?)(```|$)/);
    if (fenced) code = fenced[1];
    return `${code.trim()}\n`;
  }
}
