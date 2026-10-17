/**
 * Fabrique le document HTML exécuté dans l'iframe d'aperçu.
 * Chaque cellule devient une balise <script> distincte, précédée d'un
 * marqueur qui indique au document quelle cellule est en cours d'exécution :
 * ainsi, chaque erreur est rapportée à la bonne cellule.
 */
export class RuntimeDocument {
  /**
   * @param {{ id: number, code: string }[]} entries cellules à exécuter, dans l'ordre
   * @param {number} runId identifiant de l'exécution (ignore les messages périmés)
   * @param {number} focusId cellule qui reçoit les erreurs asynchrones (après chargement)
   */
  static build(entries, runId, focusId) {
    const scripts = entries
      .map(({ id, code }) => `${RuntimeDocument.script(`window.__cell = ${id};`)}\n${RuntimeDocument.script(code)}`)
      .join('\n');

    return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #fff; }
  canvas { display: block; }
</style></head><body>
${RuntimeDocument.script(RuntimeDocument.bridge(runId))}
${scripts}
${RuntimeDocument.script(`window.__cell = ${focusId}; window.__kernelDone();`)}
</body></html>`;
  }

  /** Enveloppe du code dans une balise <script> (en neutralisant un éventuel "</script>"). */
  static script(code) {
    return `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;
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
