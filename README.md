# ECAL MID 1 — 2027

Course repository for ECAL Master Media & Interaction Design. A monorepo of demonstrations, exercises, and teaching tools around **creative coding, real-time image processing, and agentic AI**.

## Projects

| Folder | What it is | Stack |
|---|---|---|
| [`Demo/`](Demo/) | Fullscreen webcam demos for lectures/projection: rasterization, halftone, duotone, MediaPipe pose tracking, fluid particles, ASCII, slit-scan — with an automated showcase tour | Vanilla JS + Vite, MediaPipe Tasks Vision |
| [`FlashCards/`](FlashCards/) | Flashcard app for learning French creative-coding / agentic-AI vocabulary, with an animated Voronoi background | Vue 3 + Vite |
| [`Themes/`](Themes/) | Standalone creative coding exercises (currently: an interactive particle system) | Plain HTML/JS, no build step |
| [`Tools/`](Tools/) | Teaching tools: a notebook-style app pairing prompts with generated creative-coding code, powered by a local LM Studio server | Vanilla JS + Vite |

Each project has its own `README.md` with setup and usage instructions.

## Notes

- `Demo`, `FlashCards`, and `Tools/AgentCodingWithLMStudio` are npm projects — `cd` into them and run `npm install && npm run dev`.
- Camera-based demos require browser webcam permission and run 100% client-side.
- Teaching content and UI are mostly in French; code is English or French depending on the project.
