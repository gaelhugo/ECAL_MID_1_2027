/**
 * Icônes Material (SVG en ligne). Elles héritent de la couleur du texte
 * (currentColor), ce qui garde l'interface monochrome.
 */
const svg = (path) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;

export const icons = {
  play: svg("M8 5v14l11-7z"),
  playAll: svg("M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"),
  restart: svg(
    "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  ),
  sparkle: svg(
    "M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z",
  ),
  add: svg("M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"),
  download: svg("M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"),
  up: svg("M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"),
  down: svg("M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"),
  delete: svg(
    "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  ),
};
