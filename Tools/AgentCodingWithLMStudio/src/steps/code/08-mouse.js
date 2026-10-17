// Position de la souris (hors écran tant qu'elle n'est pas sur le canvas)
const mouse = { x: -1000, y: -1000 };
const MOUSE_RADIUS = 160; // rayon d'influence, en pixels

canvas.addEventListener('mousemove', (event) => {
  mouse.x = event.offsetX;
  mouse.y = event.offsetY;
});
canvas.addEventListener('mouseleave', () => {
  mouse.x = -1000;
  mouse.y = -1000;
});

// Influence de la souris sur une cellule : 1 juste dessous, 0 hors du rayon
function getInfluence(cell) {
  const distance = Math.hypot(cell.cx - mouse.x, cell.cy - mouse.y);
  return Math.max(0, 1 - distance / MOUSE_RADIUS);
}

// On redéfinit drawCell() : la forme réagit à la proximité de la souris
function drawCell(cell) {
  cell.luminosity = getLuminosity(cell.color);
  const influence = getInfluence(cell);

  // La forme est repoussée par le curseur...
  const angle = Math.atan2(cell.cy - mouse.y, cell.cx - mouse.x);
  const x = cell.cx + Math.cos(angle) * influence * CELL_SIZE;
  const y = cell.cy + Math.sin(angle) * influence * CELL_SIZE;

  // ...et grossit d'autant plus qu'elle en est proche
  const size = CELL_SIZE * (cell.luminosity / 100) * (1 + influence);

  ctx.fillStyle = FOREGROUND;
  drawShape(x, y, size);
}
