/**
 * Les modes d'un processus : JavaScript (canvas, par défaut), p5.js, three.js et DOM.
 * Un mode décrit tout ce qui change d'un environnement à l'autre :
 * - style : CSS de base du document d'aperçu (et de l'export) ;
 * - libs : balises qui chargent la bibliothèque, dans l'aperçu (fichiers locaux,
 *   fonctionne hors ligne) et dans l'export HTML (CDN) ;
 * - prelude : code fourni avant les cellules (ex. css() en mode DOM) ;
 * - deferred : la bibliothèque est un module ES, chargé après les scripts classiques :
 *   les cellules sont alors exécutées une fois le module prêt (voir cellTags) ;
 * - context, rules, output : ce que le modèle doit savoir pour écrire le code.
 *
 * Le mode d'un processus est la propriété "mode" de son fichier JSON (défaut : "vanilla").
 */
import p5Url from "p5/lib/p5.min.js?url";
import threeUrl from "./libs/three-global.js?worker&url";

const P5_VERSION = "1.11.13";
const THREE_VERSION = "0.186.0";

const CANVAS_STYLE = `html, body { margin: 0; height: 100%; overflow: hidden; background: #fff; }
canvas { display: block; }`;

const DOM_STYLE = `html, body { margin: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #202124; }`;

// css(`…`) : ajoute une feuille de style au document (mode DOM)
const CSS_HELPER = `function css(text) {
  const style = document.createElement("style");
  style.textContent = text;
  document.head.append(style);
  return style;
}`;

const THREE_CDN = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;

export const MODES = {
  vanilla: {
    id: "vanilla",
    label: "JavaScript",
    context: "canvas 2D + webcam",
    style: CANVAS_STYLE,
    rules: [
      "S'il existe une boucle requestAnimationFrame, elle redessine TOUT le canvas à chaque image en appelant ses fonctions (souvent draw()). Tout ce qui est dessiné en dehors de cette boucle (dans un écouteur de clic, par exemple) est effacé à l'image suivante.",
      "Les objets temporaires créés pendant une image (par exemple les cellules passées par forEachCell) sont recréés à chaque image : les modifier ne dure qu'une image.",
      "Donc, pour tout effet animé ou qui dure (explosion, déplacement, traînée…) : stocke son état dans une variable globale (let/const de premier niveau), mets cet état à jour à chaque image, et applique-le en redéfinissant la fonction de dessin appelée par la boucle (draw(), drawCell()…). Les écouteurs d'événements ne font que modifier cet état.",
    ],
    output: "Pas d'import, pas de module, pas de HTML.",
  },

  p5: {
    id: "p5",
    label: "p5.js",
    context: `p5.js ${P5_VERSION}, mode global`,
    style: CANVAS_STYLE,
    libs: {
      preview: [`<script src="${p5Url}"></script>`],
      export: [
        `<script src="https://cdn.jsdelivr.net/npm/p5@${P5_VERSION}/lib/p5.min.js"></script>`,
      ],
    },
    rules: [
      `p5.js ${P5_VERSION} est chargé en mode global : createCanvas(), background(), ellipse(), mouseX, width, random()… sont disponibles directement. N'écris jamais new p5().`,
      "Une fois toutes les cellules chargées, p5 appelle setup() une seule fois, puis draw() à chaque image (environ 60 par seconde). Une redéfinition de setup() ou draw() remplace la précédente : seule la dernière définition est utilisée.",
      "Les fonctions et variables de p5 (random(), width, color()…) n'existent qu'une fois p5 démarré : au premier niveau d'une cellule, n'en utilise aucune. Utilise-les seulement dans des fonctions appelées depuis setup() ou draw() (par exemple une fonction init() appelée par setup(), qu'une cellule suivante peut redéfinir).",
      "S'il n'existe pas encore de setup(), crée-le avec createCanvas(windowWidth, windowHeight), et ajoute windowResized() qui appelle resizeCanvas(windowWidth, windowHeight).",
      "draw() redessine TOUT à chaque image (background() au début, sauf effet de traînée voulu). Pour un effet animé ou qui dure, stocke l'état dans une variable globale, mets-le à jour dans draw() et découpe le dessin en petites fonctions (drawParticle()…) appelées par draw(), qu'une cellule suivante peut redéfinir.",
      "Pour réagir à la souris ou au clavier, utilise les fonctions de p5 (mousePressed(), keyPressed()…) ou mouseX, mouseY, key : elles ne font que modifier l'état.",
      "Ne déclare jamais une variable portant le nom d'une fonction ou variable de p5 (width, height, mouseX, color, random, map, text, image, frameCount, point, line…).",
      "La webcam s'obtient avec createCapture(VIDEO), puis capture.hide() et image(capture, …) dans draw().",
    ],
    output: "Pas d'import, pas de module, pas de HTML.",
  },

  three: {
    id: "three",
    label: "three.js",
    context: `three.js r${THREE_VERSION.split(".")[1]}, 3D WebGL`,
    style: CANVAS_STYLE,
    deferred: true,
    libs: {
      preview: [`<script type="module" src="${threeUrl}"></script>`],
      export: [
        `<script type="importmap">{ "imports": { "three": "${THREE_CDN}/build/three.module.js", "three/addons/": "${THREE_CDN}/examples/jsm/" } }</script>`,
        `<script type="module">
  import * as THREE from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  window.THREE = { ...THREE, OrbitControls };
</script>`,
      ],
    },
    rules: [
      `three.js r${THREE_VERSION.split(".")[1]} est disponible dans l'objet global THREE (THREE.Scene, THREE.Mesh, THREE.MeshStandardMaterial…), ainsi que THREE.OrbitControls. N'écris jamais d'import.`,
      "S'il manque la scène, la caméra ou le rendu, crée-les toi-même : const renderer = new THREE.WebGLRenderer({ antialias: true }), à la taille de la fenêtre, ajouté avec document.body.appendChild(renderer.domElement), et un écouteur resize qui met à jour la taille du rendu et camera.aspect (puis camera.updateProjectionMatrix()).",
      "La boucle d'animation : renderer.setAnimationLoop(loop), où function loop(time) appelle update(time) puis renderer.render(scene, camera). Pour animer, redéfinis update() (ou une fonction qu'elle appelle) dans une cellule suivante.",
      "Les objets ajoutés à la scène (scene.add) restent d'une image à l'autre : crée-les une seule fois, garde-les dans des variables globales et modifie leurs propriétés (position, rotation, scale, material.color…) dans update(). Pour remplacer un objet d'une cellule précédente, retire-le avec scene.remove() avant d'ajouter le nouveau.",
      "Un matériau éclairé (MeshStandardMaterial…) a besoin de lumières : ajoute-en (THREE.AmbientLight, THREE.DirectionalLight) si aucune cellule précédente ne l'a fait.",
    ],
    output: "Pas d'import, pas de module, pas de HTML.",
  },

  dom: {
    id: "dom",
    label: "DOM",
    context: "page web : HTML + CSS + JavaScript",
    style: DOM_STYLE,
    prelude: CSS_HELPER,
    rules: [
      "Le document est une page web vide (body sans marge, police système, défilement possible). Tu construis la page ENTIÈRE : structure HTML, styles et interactions — pas seulement un canvas.",
      "Crée les éléments en JavaScript (document.createElement, append, innerHTML pour un contenu statique) et garde dans des const les éléments réutilisés par les cellules suivantes.",
      "Le CSS s'ajoute avec la fonction css(`…`), déjà fournie : elle ajoute une feuille de style au document. Donne des classes (className) aux éléments et écris leur mise en forme dans css() — pas avec element.style. Pour changer le style d'une cellule précédente, ajoute une nouvelle règle css() qui le surcharge (la dernière gagne) au lieu de tout réécrire.",
      "Pour un contenu qui évolue (liste filtrée, compteur, thème…), stocke l'état dans une variable globale et écris une fonction render() qui reconstruit la partie concernée ; les écouteurs modifient l'état puis appellent render(). Une cellule suivante peut redéfinir render().",
      "N'utilise un canvas que si la demande le demande explicitement.",
    ],
    output:
      "Pas d'import ni de module. Le HTML se crée en JavaScript, le CSS avec css(`…`).",
  },
};

export const DEFAULT_MODE = MODES.vanilla;

/** Mode d'un identifiant (inconnu ou absent → JavaScript). */
export function modeOf(id) {
  return MODES[id] ?? DEFAULT_MODE;
}

/** Balise <script> (en neutralisant un éventuel "</script>" dans le code). */
export function scriptTag(code, deferred = false) {
  const body = code.replace(/<\/script/gi, "<\\/script");
  return deferred
    ? `<script type="text/plain" data-cell>${body}</script>`
    : `<script>${body}</script>`;
}

/**
 * Exécute, dans l'ordre, les cellules mises en attente (mode « deferred ») :
 * ce module passe après celui de la bibliothèque. Chaque cellule redevient une
 * balise <script> classique, exécutée dès son insertion.
 */
export const DEFERRED_RUNNER = `<script type="module">
  for (const cell of document.querySelectorAll("script[data-cell]")) {
    const script = document.createElement("script");
    script.textContent = cell.textContent;
    cell.replaceWith(script);
  }
</script>`;

/** Ce qui précède les cellules : bibliothèque et code fourni. */
export function headTags(mode, target) {
  return [
    ...(mode.libs?.[target] ?? []),
    mode.prelude && scriptTag(mode.prelude, mode.deferred),
  ].filter(Boolean);
}
