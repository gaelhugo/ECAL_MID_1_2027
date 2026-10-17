// Luminosité perçue d'une couleur, en pourcentage (0 = noir, 100 = blanc)
// Les coefficients reflètent la sensibilité de l'œil au rouge, au vert et au bleu
function getLuminosity(color) {
  return ((0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255) * 100;
}

// On redéfinit drawCell() : la largeur de la forme suit la luminosité
function drawCell(cell) {
  cell.luminosity = getLuminosity(cell.color);
  ctx.fillStyle = toCss(cell.color);
  drawShape(cell.cx, cell.cy, CELL_SIZE * (cell.luminosity / 100));
}
