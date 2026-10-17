// Taille d'une cellule de la grille, en pixels
const CELL_SIZE = 24;

// Parcourt toutes les cellules et appelle callback(cell) pour chacune
function forEachCell(callback) {
  for (let y = 0; y < canvas.height; y += CELL_SIZE) {
    for (let x = 0; x < canvas.width; x += CELL_SIZE) {
      callback({
        x, // coin supérieur gauche
        y,
        cx: x + CELL_SIZE / 2, // centre de la cellule
        cy: y + CELL_SIZE / 2,
      });
    }
  }
}

// Trace le contour de chaque cellule par-dessus la vidéo
function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  forEachCell((cell) => ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, CELL_SIZE, CELL_SIZE));
}

// On redéfinit draw() : la vidéo, puis la grille
function draw() {
  drawVideo();
  drawGrid();
}
