// Lit la couleur du pixel (x, y) dans le tableau de pixels du canvas
function getColor(pixels, x, y) {
  const px = Math.min(Math.floor(x), canvas.width - 1);
  const py = Math.min(Math.floor(y), canvas.height - 1);
  const i = (py * canvas.width + px) * 4; // 4 valeurs par pixel : r, g, b, a
  return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
}

// Convertit une couleur { r, g, b } en texte CSS
function toCss(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

// Fond derrière les cellules (vide pour l'instant : les carrés couvrent tout)
function drawBackground() {}

// Dessine une cellule remplie avec sa couleur
function drawCell(cell) {
  ctx.fillStyle = toCss(cell.color);
  ctx.fillRect(cell.x, cell.y, CELL_SIZE, CELL_SIZE);
}

// On redéfinit draw() : on lit les pixels, puis on dessine les cellules
function draw() {
  drawVideo();
  // On capture tous les pixels de l'image une seule fois par frame
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  drawBackground();
  forEachCell((cell) => {
    cell.color = getColor(pixels, cell.cx, cell.cy); // couleur du point central
    drawCell(cell);
  });
}
