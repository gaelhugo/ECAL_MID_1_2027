# Atelier Prompts Webcam — Agent Coding with LM Studio

A pedagogical, notebook-style web app for teaching creative coding through prompting. Each step pairs a **natural-language prompt** (in French) with the **JavaScript code** it produces, building up a webcam-processing program cell by cell — canvas setup, webcam capture, grid rasterization, color sampling, shapes, luminosity, duotone, and mouse interaction.

Vanilla JavaScript + **Vite** (no framework). UI and comments are in **French**.

---

## Quick Start

```bash
npm install
npm run dev
```

- `npm run build` — production build
- `npm run preview` — preview the production build

The app works fully offline for browsing and running the steps. **LM Studio is only needed if you want to regenerate code from a modified prompt** (see below).

## How it works

- The left pane is a **notebook**: ordered cells, each showing a prompt and its resulting code in a highlighted editor.
- The right pane is a **preview**: a sandboxed `<iframe>` in which the cells' code runs, each in its own `<script>` tag, replayed in order by the `Kernel`.
- Editing a prompt and regenerating sends the code of the cells above plus the active function signatures (`ProgramSummary`) to a local **LM Studio** server, which writes the new code.

## LM Studio setup (optional, for code regeneration)

1. Install [LM Studio](https://lmstudio.ai), download a model, and start the local server (default `http://localhost:1234`).
2. Configure via `.env` (already committed, safe to edit):

   ```
   VITE_LMSTUDIO_MODEL=qwen2.5-coder-14b-instruct   # model name, or omit to use the loaded model
   # LMSTUDIO_URL=http://localhost:1234            # uncomment to change the server address
   ```

3. The browser calls `/lmstudio/…`, which Vite proxies to the LM Studio server (avoids CORS). Configured in `vite.config.js`.

## Code conventions for step cells

Each cell executes in its own `<script>` tag inside the preview iframe, replayed in order:

- Declare each `const`/`let` **once** — later cells redefine behavior with `function` declarations (which are hoisted and overridable).
- Cells have stable unique ids; the kernel replays them in notebook order (`kernel.run(cells, order)`).
- Double quotes are used throughout (Prettier formatting).

## Structure

```
src/
├── main.js                     # Assembles notebook, preview, kernel, toolbar, splitter, shortcuts
├── steps/
│   ├── steps.js                # Ordered steps: prompt + code (imported as ?raw text)
│   └── code/NN-*.js            # The reference code for each step (01-canvas … 08-mouse)
├── notebook/                   # Cell, CellActions, CellInserter, CellOutput, CodeEditor,
│                               #   Highlighter, Notebook, RunButton
├── runtime/                    # Kernel (replays cells in the iframe), RuntimeDocument
├── preview/                    # Preview (sandboxed iframe)
├── llm/                        # LlmClient, PromptBuilder, CodeGenerator, CodeCleaner, ProgramSummary
├── export/                     # CodeExporter
├── ui/                         # Toolbar, Splitter, Shortcuts, Snackbar, dom, icons
└── styles/                     # Modular CSS (base, layout, cell, editor, preview, structure)
```

See `AGENTS.md` for maintainer notes (in French).
