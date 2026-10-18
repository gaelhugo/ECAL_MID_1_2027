# Agent Coding with LM Studio

A pedagogical web app for teaching creative coding through prompting. A **processus** is an ordered list of steps; each step pairs a **natural-language prompt** (in French) with the **JavaScript code** it produces, building up a program cell by cell.

Vanilla JavaScript + **Vite** (no framework). UI and comments are in **French**.

A processus runs in one of four **modes** — each adapts the preview, the prompt rules sent to the model and the HTML export:

| Mode                     | What the cells build                                        | Library (bundled locally, works offline)     |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------- |
| **JavaScript** (default) | Canvas 2D drawing, webcam, `requestAnimationFrame` loop     | —                                            |
| **p5.js**                | p5 sketch in global mode (`setup()`, `draw()`, `mouseX`…)   | p5.js 1.11.13                                |
| **three.js**             | 3D scene (`THREE.Scene`, `setAnimationLoop`, OrbitControls) | three.js r186, exposed as the global `THREE` |
| **DOM**                  | A whole web page: HTML elements, CSS (via `css()`), events  | — (a `css(text)` helper adds a stylesheet)   |

---

## Quick Start

```bash
npm install
npm run dev
```

- `npm run build` — production build
- `npm run preview` — preview the production build

The app works fully offline for browsing and running the steps. **A model is only needed to regenerate code from a modified prompt**: LM Studio by default, or an online service chosen in the settings (see below).

## How it works

- The left pane is a **processus** (notebook): ordered cells, each showing a prompt and its resulting code in a highlighted editor.
- The **title is a dropdown** to pick what to load, next to a small **mode** pill (JavaScript · p5.js · three.js · DOM). The title lists only the current mode's processus: **Nouveau processus** (first entry, a single empty cell) then its examples. Changing the mode loads that mode's Nouveau processus. Startup default: **Raster Image** (JavaScript, the 8-step webcam rasterization). Switching resets the preview; the snackbar's **Annuler** restores the previous processus (and its mode).
- The right pane is a **preview**: a sandboxed `<iframe>` in which the cells' code runs, each in its own `<script>` tag, replayed in order by the `Kernel`. The mode sets its base CSS and loads its library first (three.js is an ES module, so its cells run once the module is ready).
- Editing a prompt and regenerating sends the code of the cells above plus the active function signatures (`ProgramSummary`) to the selected model (local **LM Studio** by default), which writes the new code. The rules in the system prompt depend on the mode (e.g. p5: don't call p5 functions at top level; three.js: create objects once and update them in `update()`; DOM: build the whole page, style with `css()`).
- **Télécharger** exports the rendered cells as a standalone HTML file; p5.js / three.js are loaded there from the jsDelivr CDN (same pinned versions).

| Mode       | Example processus                                                              |
| ---------- | ------------------------------------------------------------------------------ |
| JavaScript | **Raster Image** — webcam → grid → shapes → luminosity → duotone → mouse       |
| p5.js      | **Particules** — canvas → particles → motion → mouse attraction → trails       |
| three.js   | **Vague de cubes** — scene → lit cube → wave grid → OrbitControls → color      |
| DOM        | **Palette de couleurs** — header → cards → search filter → select → dark theme |

## LM Studio setup (optional, for code regeneration)

1. Install [LM Studio](https://lmstudio.ai), download a model, and start the local server (default `http://localhost:1234`).
2. Configure via `.env` (already committed, safe to edit):

   ```
   VITE_LMSTUDIO_MODEL=qwen2.5-coder-14b-instruct   # model name, or omit to use the loaded model
   # LMSTUDIO_URL=http://localhost:1234            # uncomment to change the server address
   ```

3. The browser calls `/lmstudio/…`, which Vite proxies to the LM Studio server (avoids CORS). Configured in `vite.config.js`.

## Settings: other models (⚙︎ in the header)

The gear icon opens a side panel to pick the service that generates code. **LM Studio stays the default.** Any other choice asks for an API key, stored only in this browser (`localStorage`) and sent only through the local Vite server.

Each free service still needs **its own free API key**: sign up for a free account (no credit card), then create a key at the link below or via "Obtenir une clé" in the panel. Never commit a key or share it publicly. If a request fails, the error under the cell shows a short French hint plus the service's exact message (e.g. invalid key, daily limit reached).

| Choice           | Model                                 | Cost                      | Get a key                             |
| ---------------- | ------------------------------------- | ------------------------- | ------------------------------------- |
| LM Studio        | model loaded locally                  | free, local               | —                                     |
| Google AI Studio | `gemini-3.8-flash`                    | free tier                 | <https://aistudio.google.com/apikey>  |
| Groq             | `openai/gpt-oss-120b`                 | free tier (1,000 req/day) | <https://console.groq.com/keys>       |
| Mistral          | `mistral-small-latest`                | free "Free mode"          | <https://console.mistral.ai/api-keys> |
| OpenRouter       | `openrouter/free` (random free model) | free (50 req/day)         | <https://openrouter.ai/keys>          |

The free tiers need no credit card but are rate-limited, and some providers may use free-tier prompts to improve their models. Services are defined in `src/llm/providers.js`; each goes through a proxy route in `vite.config.js` (so it works with `npm run dev` / `npm run preview`).

## Code conventions for step cells

Each cell executes in its own `<script>` tag inside the preview iframe, replayed in order:

- Declare each `const`/`let` **once** — later cells redefine behavior with `function` declarations (which are hoisted and overridable).
- Cells have stable unique ids; the kernel replays them in notebook order (`kernel.run(cells, order)`).
- Double quotes are used throughout (Prettier formatting).

## Structure

```
src/
├── main.js                     # Assembles processus, preview, kernel, toolbar, dropdown, settings, shortcuts
├── examples/
│   ├── index.js                # Auto-loads every *.json here, grouped by mode; sets the default (DEFAULT_FILE)
│   ├── raster-image.json       # JavaScript: 8 steps (prompt + code), canvas … mouse
│   ├── p5-particules.json      # p5.js: 5 steps
│   ├── three-vague-de-cubes.json # three.js: 5 steps
│   └── dom-palette.json        # DOM: 5 steps
├── notebook/                   # Cell, CellActions, CellInserter, CellOutput, CodeEditor,
│                               #   Highlighter, Notebook, RunButton
├── runtime/                    # Kernel (replays cells in the iframe), RuntimeDocument,
│                               #   modes.js (per-mode style, libraries, prompt rules),
│                               #   libs/three-global.js (bundles three.js → window.THREE)
├── preview/                    # Preview (sandboxed iframe)
├── llm/                        # LlmClient + GeminiClient, providers, PromptBuilder, CodeGenerator,
│                               #   CodeCleaner, ProgramSummary
├── export/                     # CodeExporter
├── ui/                         # Toolbar, ExamplePicker, SettingsPanel, Splitter, Shortcuts, Snackbar, dom, icons
└── styles/                     # Modular CSS (base, layout, cell, editor, preview, structure, settings)
```

### Adding a demo processus

Drop a JSON file into `src/examples/` — it appears in the dropdown of its mode automatically (after "Nouveau processus", sorted by file name):

```json
{
  "title": "Name shown in the dropdown",
  "mode": "p5",
  "steps": [
    {
      "title": "Step title",
      "prompt": "What the code should do…",
      "code": ["// one string per line", "const x = 1;"]
    }
  ]
}
```

`mode` is `"vanilla"` (default when omitted), `"p5"`, `"three"` or `"dom"`. `code` may also be a single string. To load a different file at startup, change `DEFAULT_FILE` in `src/examples/index.js`.

### Adding a mode

Add an entry to `MODES` in `src/runtime/modes.js`: `label`, base `style`, `libs` (tags for the preview — local files via Vite imports — and for the export — CDN), optional `prelude` code, `deferred: true` if the library is an ES module, and the `context` / `rules` / `output` lines given to the model. It then appears in the mode pill automatically.

See `AGENTS.md` for maintainer notes (in French).
