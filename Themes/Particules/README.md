# Particules — Interactive Particle System

Introductory canvas exercise ("Exercice particules"). Move the mouse over the window to spawn colored particles at the cursor; each particle drifts with a random velocity and bounces off the window edges.

Pure vanilla JavaScript (ES modules) and the Canvas 2D API — no dependencies, no build step. Code is in French (`vitesseX`, `verifier_les_bords`, ...).

## Run

Serve the folder through a local server (ES modules don't load over `file://`):

```bash
npx serve .
# or
python3 -m http.server
```

then open `index.html` in the browser.

## Files

| File | Role |
|---|---|
| `index.html` | Loads the three modules; empty `<body>` — the canvas is injected by the sketch |
| `sketch.js` | Entry point: creates a fullscreen canvas on `window.onload` and starts the `Systeme` |
| `Systeme.js` | Particle system: listens to `mousemove` to spawn particles at the cursor, runs the `requestAnimationFrame` loop, updates every particle |
| `Particule.js` | Single particle: random velocity & HSL color, edge bouncing (`verifier_les_bords`), draws itself as a 10px disc |

## Exercise notes

- The constructor pre-creates 500 particles but the `push` is commented out — uncomment to start with a full screen of random particles.
- The sketch redraws with `clearRect` each frame; removing that line produces paint-trail effects.
- Canvas size is fixed at load — resizing the window does not resize the canvas.
