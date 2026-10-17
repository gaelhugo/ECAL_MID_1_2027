// 1. On crée un élément <canvas> et on l'ajoute à la page
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

// 2. On récupère le contexte 2D, l'outil qui permet de dessiner
//    (willReadFrequently : on lira souvent ses pixels plus tard)
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// 3. Le canvas prend toute la taille de la fenêtre, même redimensionnée
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 4. On peint un fond gris clair pour vérifier que tout fonctionne
ctx.fillStyle = '#e8eaed';
ctx.fillRect(0, 0, canvas.width, canvas.height);
