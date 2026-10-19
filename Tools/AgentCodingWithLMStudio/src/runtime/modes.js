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
    context: "2D canvas + webcam",
    style: CANVAS_STYLE,
    rules: [
      "If there is a requestAnimationFrame loop, it redraws the WHOLE canvas every frame by calling its functions (often draw()). Anything drawn outside that loop (in a click listener, for example) is erased on the next frame.",
      "Temporary objects created during a frame (for example the cells passed by forEachCell) are recreated every frame: changing them only lasts one frame.",
      "So, for any animated or lasting effect (explosion, movement, trail…): store its state in a global variable (top-level let/const), update that state every frame, and apply it by redefining the drawing function called by the loop (draw(), drawCell()…). Event listeners only change that state.",
    ],
    output: "No import, no module, no HTML.",
  },

  p5: {
    id: "p5",
    label: "p5.js",
    context: `p5.js ${P5_VERSION}, global mode`,
    style: CANVAS_STYLE,
    libs: {
      preview: [`<script src="${p5Url}"></script>`],
      export: [
        `<script src="https://cdn.jsdelivr.net/npm/p5@${P5_VERSION}/lib/p5.min.js"></script>`,
      ],
    },
    rules: [
      `p5.js ${P5_VERSION} is loaded in global mode: createCanvas(), background(), ellipse(), mouseX, width, random()… are available directly. Never write new p5().`,
      "Once all the cells are loaded, p5 calls setup() once, then draw() every frame (about 60 per second). A redefinition of setup() or draw() replaces the previous one: only the last definition is used.",
      "p5 functions and variables (random(), width, color()…) only exist once p5 has started: never use them at the top level of a cell. Only use them inside functions called from setup() or draw() (for example an init() function called by setup(), which a later cell can redefine).",
      "If there is no setup() yet, create it with createCanvas(windowWidth, windowHeight), and add windowResized() calling resizeCanvas(windowWidth, windowHeight).",
      "draw() redraws EVERYTHING every frame (background() first, unless a trail effect is wanted). For an animated or lasting effect, store the state in a global variable, update it in draw() and split the drawing into small functions (drawParticle()…) called by draw(), which a later cell can redefine.",
      "To react to the mouse or keyboard, use p5's functions (mousePressed(), keyPressed()…) or mouseX, mouseY, key: they only change the state.",
      "Never declare a variable named like a p5 function or variable (width, height, mouseX, color, random, map, text, image, frameCount, point, line…).",
      "The webcam is obtained with createCapture(VIDEO), then capture.hide() and image(capture, …) in draw().",
    ],
    output: "No import, no module, no HTML.",
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
      `three.js r${THREE_VERSION.split(".")[1]} is available in the global THREE object (THREE.Scene, THREE.Mesh, THREE.MeshStandardMaterial…), as well as THREE.OrbitControls. Never write an import.`,
      "If the scene, camera or renderer is missing, create it yourself: const renderer = new THREE.WebGLRenderer({ antialias: true }), sized to the window, added with document.body.appendChild(renderer.domElement), and a resize listener that updates the renderer size and camera.aspect (then camera.updateProjectionMatrix()).",
      "The animation loop: renderer.setAnimationLoop(loop), where function loop(time) calls update(time) then renderer.render(scene, camera). To animate, redefine update() (or a function it calls) in a later cell.",
      "Objects added to the scene (scene.add) stay from one frame to the next: create them once, keep them in global variables and change their properties (position, rotation, scale, material.color…) in update(). To replace an object from a previous cell, remove it with scene.remove() before adding the new one.",
      "A lit material (MeshStandardMaterial…) needs lights: add some (THREE.AmbientLight, THREE.DirectionalLight) if no previous cell did.",
    ],
    output: "No import, no module, no HTML.",
  },

  dom: {
    id: "dom",
    label: "DOM",
    context: "web page: HTML + CSS + JavaScript",
    style: DOM_STYLE,
    prelude: CSS_HELPER,
    rules: [
      "The document is an empty web page (body without margin, system font, scrolling allowed). You build the WHOLE page: HTML structure, styles and interactions — not just a canvas.",
      "Create elements in JavaScript (document.createElement, append, innerHTML for static content) and keep the elements reused by later cells in const variables.",
      "CSS is added with the css(`…`) function, already provided: it adds a stylesheet to the document. Give classes (className) to elements and write their styling in css() — not with element.style. To change the style from a previous cell, add a new css() rule that overrides it (the last one wins) instead of rewriting everything.",
      "For changing content (filtered list, counter, theme…), store the state in a global variable and write a render() function that rebuilds the relevant part; listeners change the state then call render(). A later cell can redefine render().",
      "Only use a canvas if the request explicitly asks for one.",
    ],
    output:
      "No import, no module. HTML is created in JavaScript, CSS with css(`…`).",
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
