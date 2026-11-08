# ECAL MID 1 — 2027

Course repository for ECAL Master Media & Interaction Design. A monorepo of demonstrations, exercises, and teaching tools around **creative coding, real-time image processing, and agentic AI**.

## Projects

| Folder                       | What it is                                                                                                                                                                        | Stack                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [`Demo/`](Demo/)             | Fullscreen webcam demos for lectures/projection: rasterization, halftone, duotone, MediaPipe pose tracking, fluid particles, ASCII, slit-scan — with an automated showcase tour   | Vanilla JS + Vite, MediaPipe Tasks Vision |
| [`FlashCards/`](FlashCards/) | Flashcard app for learning French creative-coding / agentic-AI vocabulary, with an animated Voronoi background                                                                    | Vue 3 + Vite                              |
| [`Themes/`](Themes/)         | Standalone creative coding exercises (currently: an interactive particle system)                                                                                                  | Plain HTML/JS, no build step              |
| [`Tools/`](Tools/)           | Teaching tools: a step-by-step "processus" app pairing prompts with generated creative-coding code (canvas, p5.js, three.js or DOM), using local LM Studio or a free online model | Vanilla JS + Vite, p5.js, three.js        |

Each project has its own `README.md` with more detail.

The **proce55us** landing page lives in its own repository ([gaelhugo/proce55us](https://github.com/gaelhugo/proce55us)) and is served at <https://proce55us.com/> (web editor: <https://editor.proce55us.com/>).

## Running each project

They are run differently — pick the section for the project you want.

### `Demo/` — webcam demo suite (Vite, port 3000)

```bash
cd Demo
npm install
npm run dev
```

Opens automatically at <http://localhost:3000>. Click **Start Camera** and grant webcam permission. Demos are selected with keys `0–8`, arrows, or `P` for the automated tour.

### `FlashCards/` — flashcard app (Vite, default port)

```bash
cd FlashCards
npm install
npm run dev
```

Open <http://localhost:5173>. No camera or external services needed.

### `Themes/` — standalone exercises (no build step)

No `npm install`. The sketches use ES modules, so they must be served over HTTP — from this folder or any exercise folder:

```bash
cd Themes
npx serve .            # or: python3 -m http.server
```

Then open the exercise in the browser, e.g. `http://localhost:3000/Particules/` (VS Code's Live Server works too).

### `Tools/AgentCodingWithLMStudio/` — prompt processus (Vite, default port)

```bash
cd Tools/AgentCodingWithLMStudio
npm install
npm run dev
```

Open <http://localhost:5173>. Pick a mode in the pill next to the title — **JavaScript** canvas (default), **p5.js**, **three.js** or **DOM** — then a processus in the title dropdown (**Simple canvas** by default, examples per mode, or **Nouveau processus** for an empty one). Browsing and running the steps works as-is — **a model is only needed to regenerate code from a modified prompt**:

- **LM Studio (default):** start the LM Studio local server (default `http://localhost:1234`); the model can be set in `.env` (`VITE_LMSTUDIO_MODEL`).
- **Or a free online model:** open the ⚙︎ settings in the header, choose Google AI Studio, Groq, Cohere or OpenRouter, and paste a free API key (each needs a free account, no credit card).

### `Tools/AgentCodingWithLMStudio-mac/` — **proce55us**, the same app as a macOS application

```bash
cd Tools/AgentCodingWithLMStudio-mac
./build-mac.sh
```

Produces `dist/proce55us-universal.dmg` (and automatically updates `/Applications/proce55us.app` if already installed on this Mac), installable on any Mac (macOS 12+, Apple Silicon and Intel) without Node.js. On another Mac, install directly without Gatekeeper warnings via `curl -fsSL https://proce55us.com/install | sh` or `brew install --cask gaelhugo/proce55us/proce55us`, or use **System Settings → Privacy & Security → Open Anyway** (`xattr -cr /Applications/proce55us.app`). See its README for details.

## Notes

- Camera-based demos require browser webcam permission and run 100% client-side.
- Teaching content and UI are mostly in French; code is English or French depending on the project.
