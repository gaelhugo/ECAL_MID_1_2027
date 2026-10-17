// Les deux seules couleurs du rendu
const BACKGROUND = '#202124';
const FOREGROUND = '#f8f9fa';

// Le fond utilise la première couleur
function drawBackground() {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// On redéfinit drawCell() : la couleur d'origine n'est plus utilisée,
// seule sa luminosité compte encore (pour la taille)
function drawCell(cell) {
  cell.luminosity = getLuminosity(cell.color);
  ctx.fillStyle = FOREGROUND;
  drawShape(cell.cx, cell.cy, CELL_SIZE * (cell.luminosity / 100));
}
