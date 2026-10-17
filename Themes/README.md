# Themes — Creative Coding Exercises

Collection of standalone creative coding exercises. Each subfolder is a self-contained experiment — no build tools, just plain HTML/JavaScript (ES modules) on a `<canvas>`.

## Contents

| Folder | Description |
|---|---|
| [`Particules/`](Particules/) | Interactive mouse-driven particle system (bouncing colored dots spawned at the cursor) |

## Running an exercise

Because the sketches use ES modules, open them through a local web server rather than `file://`:

```bash
# from this folder, pick one:
npx serve .
# or
python3 -m http.server
```

Then open the exercise folder in the browser (e.g. `http://localhost:3000/Particules/`). The VS Code **Live Server** extension works too.
