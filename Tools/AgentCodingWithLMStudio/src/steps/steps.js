/**
 * Liste ordonnée des étapes du notebook.
 * Chaque étape associe un prompt (ce que l'on demanderait à une IA)
 * au code qui en résulte. Le code est importé tel quel (texte brut)
 * grâce au suffixe `?raw` de Vite.
 *
 * Convention pour le code des étapes : chaque cellule est exécutée dans
 * sa propre balise <script>. Les `const` ne sont déclarées qu'une seule fois ;
 * ce qui doit évoluer d'une étape à l'autre est écrit sous forme de
 * `function`, qu'une étape suivante peut simplement redéfinir.
 */
import canvas from './code/01-canvas.js?raw';
import webcam from './code/02-webcam.js?raw';
import grid from './code/03-grid.js?raw';
import color from './code/04-color.js?raw';
import shapes from './code/05-shapes.js?raw';
import luminosity from './code/06-luminosity.js?raw';
import duotone from './code/07-duotone.js?raw';
import mouse from './code/08-mouse.js?raw';

export const steps = [
  {
    title: 'Créer un canvas',
    prompt:
      'Crée un canvas HTML qui occupe toute la fenêtre, récupère son contexte 2D et peins un fond gris clair pour vérifier qu’il s’affiche.',
    code: canvas,
  },
  {
    title: 'Activer la webcam',
    prompt:
      'Active la webcam avec getUserMedia, place le flux dans un élément vidéo invisible et dessine chaque image dans le canvas, en miroir, dans une boucle requestAnimationFrame.',
    code: webcam,
  },
  {
    title: 'Créer une grille',
    prompt:
      'Découpe le canvas en une grille de cellules carrées de 24 px et trace leurs contours par-dessus l’image de la caméra.',
    code: grid,
  },
  {
    title: 'Lire la couleur des cellules',
    prompt:
      'Pour chaque cellule, lis la couleur du pixel situé en son centre, assigne-la à la cellule et remplis la cellule avec cette couleur.',
    code: color,
  },
  {
    title: 'Changer la forme',
    prompt:
      'Remplace le remplissage des cellules par une forme au choix (carré, cercle ou étoile) sur un fond noir. Les touches 1, 2 et 3 changent la forme — clique d’abord dans l’aperçu.',
    code: shapes,
  },
  {
    title: 'Luminosité → largeur',
    prompt:
      'Calcule le pourcentage de luminosité de la couleur de chaque cellule et applique ce pourcentage à la largeur de sa forme.',
    code: luminosity,
  },
  {
    title: 'Rendu duotone',
    prompt:
      'Supprime la couleur d’origine : n’utilise plus que deux couleurs, une pour les formes et une pour le fond.',
    code: duotone,
  },
  {
    title: 'Interaction souris',
    prompt:
      'Fais réagir chaque cellule à la souris : plus elle est proche du curseur, plus sa forme grossit et s’en écarte.',
    code: mouse,
  },
];
