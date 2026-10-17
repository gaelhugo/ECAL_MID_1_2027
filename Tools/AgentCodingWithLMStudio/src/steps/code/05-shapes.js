// Forme active : 'square', 'circle' ou 'star'
let shape = 'circle';

// Les touches 1, 2 et 3 changent la forme
window.addEventListener('keydown', (event) => {
  const shapes = { 1: 'square', 2: 'circle', 3: 'star' };
  shape = shapes[event.key] ?? shape;
});

// Fond sombre : il apparaît maintenant entre les formes
function drawBackground() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Trace une étoile à 5 branches centrée en (cx, cy)
function traceStar(cx, cy, radius) {
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45; // alternance pointe / creux
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  ctx.closePath();
}

// Dessine la forme active, de largeur "size", centrée en (cx, cy)
function drawShape(cx, cy, size) {
  ctx.beginPath();
  if (shape === 'square') ctx.rect(cx - size / 2, cy - size / 2, size, size);
  else if (shape === 'circle') ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  else traceStar(cx, cy, size / 2);
  ctx.fill();
}

// On redéfinit drawCell() : une forme au lieu d'un carré plein
function drawCell(cell) {
  ctx.fillStyle = toCss(cell.color);
  drawShape(cell.cx, cell.cy, CELL_SIZE);
}
