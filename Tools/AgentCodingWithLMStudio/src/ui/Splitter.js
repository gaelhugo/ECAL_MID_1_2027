/**
 * Séparateur déplaçable entre le notebook et l'aperçu.
 * La largeur du panneau gauche est stockée dans la variable CSS --left.
 */
export class Splitter {
  constructor(handle, layout, { min = 25, max = 75 } = {}) {
    handle.addEventListener('pointerdown', (event) => {
      // La capture du pointeur évite que l'iframe « avale » le glissement
      handle.setPointerCapture(event.pointerId);
      layout.classList.add('is-resizing');
    });

    handle.addEventListener('pointermove', (event) => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      const percent = (event.clientX / layout.clientWidth) * 100;
      layout.style.setProperty('--left', `${Math.max(min, Math.min(max, percent))}%`);
    });

    handle.addEventListener('lostpointercapture', () => layout.classList.remove('is-resizing'));
  }
}
