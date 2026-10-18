import { DEFAULT_MODE, DEFERRED_RUNNER, headTags, scriptTag } from "./modes.js";

/**
 * Fabrique le document HTML exécuté dans l'iframe d'aperçu.
 * Chaque cellule devient une balise <script> distincte, précédée d'un
 * marqueur qui indique au document quelle cellule est en cours d'exécution :
 * ainsi, chaque erreur est rapportée à la bonne cellule.
 * Le mode (JavaScript, p5.js, three.js, DOM) fournit le style de base et la bibliothèque.
 */
export class RuntimeDocument {
  /**
   * @param {{ id: number, code: string }[]} entries cellules à exécuter, dans l'ordre
   * @param {number} runId identifiant de l'exécution (ignore les messages périmés)
   * @param {number} focusId cellule qui reçoit les erreurs asynchrones (après chargement)
   * @param {object} mode voir modes.js
   */
  static build(entries, runId, focusId, mode = DEFAULT_MODE) {
    const tag = (code) => scriptTag(code, mode.deferred);
    const scripts = entries
      .map(({ id, code }) => `${tag(`window.__cell = ${id};`)}\n${tag(code)}`)
      .join("\n");

    return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${mode.style}
</style></head><body>
${scriptTag(RuntimeDocument.bridge(runId))}
${headTags(mode, "preview").join("\n")}
${scripts}
${tag(`window.__cell = ${focusId}; window.__kernelDone();`)}
${mode.deferred ? DEFERRED_RUNNER : ""}
</body></html>`;
  }

  /** Pont iframe → parent : renvoie erreurs, console.log et fin d'exécution. */
  static bridge(runId) {
    return `(() => {
  const send = (type, text) =>
    parent.postMessage({ source: 'kernel', runId: ${runId}, cell: window.__cell, type, text }, '*');
  window.addEventListener('error', (e) => send('error', e.message));
  window.addEventListener('unhandledrejection', (e) => send('error', String(e.reason?.message ?? e.reason)));
  const log = console.log;
  console.log = (...args) => { log(...args); send('log', args.map(String).join(' ')); };
  window.__kernelDone = () => send('done', '');
})();`;
  }
}
