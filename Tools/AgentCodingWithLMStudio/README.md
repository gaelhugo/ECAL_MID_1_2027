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

- The left pane is a **processus** (notebook): ordered cells, each showing a prompt and its resulting code in a highlighted editor.
- The **title is a dropdown** to pick what to load: **Nouveau processus** (first entry, a single empty cell) or **Raster Image** (loaded by default, the 8-step webcam rasterization). Switching resets the preview; the snackbar's **Annuler** restores the previous processus.
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
├── examples/
│   ├── index.js                # Auto-loads every *.json here; sets the default (DEFAULT_FILE)
│   └── raster-image.json       # Demo processus: 8 steps (prompt + code), 01-canvas … 08-mouse
├── notebook/                   # Cell, CellActions, CellInserter, CellOutput, CodeEditor,
│                               #   Highlighter, Notebook, RunButton
├── runtime/                    # Kernel (replays cells in the iframe), RuntimeDocument
├── preview/                    # Preview (sandboxed iframe)
├── llm/                        # LlmClient, PromptBuilder, CodeGenerator, CodeCleaner, ProgramSummary
├── export/                     # CodeExporter
├── ui/                         # Toolbar, ExamplePicker, Splitter, Shortcuts, Snackbar, dom, icons
└── styles/                     # Modular CSS (base, layout, cell, editor, preview, structure)
```

### Adding a demo processus

Drop a JSON file into `src/examples/` — it appears in the dropdown automatically (after "Nouveau processus", sorted by file name):

```json
{
  "title": "Name shown in the dropdown",
  "steps": [
    {
      "title": "Step title",
      "prompt": "What the code should do…",
      "code": ["// one string per line", "const x = 1;"]
    }
  ]
}
```

`code` may also be a single string. To load a different file at startup, change `DEFAULT_FILE` in `src/examples/index.js`.

See `AGENTS.md` for maintainer notes (in French).
