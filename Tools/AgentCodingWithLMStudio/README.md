# Agent Coding with LM Studio

A pedagogical web app for teaching creative coding through prompting. A **processus** is an ordered list of steps; each step pairs a **natural-language prompt** with the **JavaScript code** it produces, building up a program cell by cell.

Vanilla JavaScript + **Vite** (no framework). The interface, the example processus and the comments in generated code are in **French or English** — see [Languages](#languages). Source-code comments are in French.

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

A hosted version runs at **https://gaelhugo.github.io/editor.proce55us/** — see [Web version](#web-version).

## How it works

- The left pane is a **processus** (notebook): ordered cells, each showing a prompt and its resulting code in a highlighted editor.
- The **title is a dropdown** to pick what to load, next to a small **mode** pill (JavaScript · p5.js · three.js · DOM). The title lists only the current mode's processus: **Nouveau processus** / **New processus** (first entry, a single empty cell) then its examples. Changing the mode loads that mode's first example (or its empty processus if it has none). Startup default: **Raster Image** (JavaScript, the 8-step webcam rasterization). Switching resets the preview; the snackbar's **Annuler** / **Undo** restores the previous processus (and its mode).
- The right pane is a **preview**: a sandboxed `<iframe>` in which the cells' code runs, each in its own `<script>` tag, replayed in order by the `Kernel`. The mode sets its base CSS and loads its library first (three.js is an ES module, so its cells run once the module is ready).
- Editing a prompt and regenerating sends the code of the cells above plus the active function signatures (`ProgramSummary`) to the selected model (local **LM Studio** by default), which writes the new code. The rules in the system prompt depend on the mode (e.g. p5: don't call p5 functions at top level; three.js: create objects once and update them in `update()`; DOM: build the whole page, style with `css()`).
- **Télécharger** / **Download** exports the rendered cells as a standalone HTML file; p5.js / three.js are loaded there from the jsDelivr CDN (same pinned versions).

| Mode       | Example processus (FR / EN)                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------- |
| JavaScript | **Raster Image** — webcam → grid → shapes → luminosity → duotone → mouse                       |
| p5.js      | **Particules / Particles** — canvas → particles → motion → mouse attraction → trails           |
| three.js   | **Vague de cubes / Cube wave** — scene → lit cube → wave grid → OrbitControls → color          |
| DOM        | **Palette de couleurs / Color palette** — header → cards → search filter → select → dark theme |

## Languages

- **Automatic:** the system language decides — French if the preferred language starts with `fr` (fr-CH, fr-FR, fr-BE…), English otherwise. In the macOS app this is the macOS language; in a browser, the browser's language (`navigator.languages`).
- **Override:** ⚙︎ Settings → **Langue / Language**: Automatic, Français or English (stored in `localStorage` as `atelier.lang`; changing it reloads the page).
- **What follows the language:**
  - the whole interface: `src/i18n/fr.json` and `en.json`, used through `t("key", { variables })`;
  - the example processus: titles, prompts **and code**, i.e. code comments and texts shown on the page (the instructions themselves are identical);
  - code generated from a custom prompt: its comments and on-page texts are written in the interface language, whatever language the prompt is written in;
  - the HTML export (`<html lang>`).
- **Model instructions** are written in English, which small local models follow best. Two parts depend on the language: a rule saying which language to use for comments and on-page texts (with a reminder at the end of the instructions), and a short note in that language added to the user's request.

## LM Studio setup (optional, for code regeneration)

1. Install [LM Studio](https://lmstudio.ai), download a model, and start the local server (default `http://localhost:1234`).
2. Configure via `.env` (already committed, safe to edit):

   ```
   VITE_LMSTUDIO_MODEL=qwen2.5-coder-14b-instruct   # model name, or omit to use the loaded model
   # LMSTUDIO_URL=http://localhost:1234            # uncomment to change the server address
   ```

3. The browser calls `/lmstudio/…`, which Vite proxies to the LM Studio server (avoids CORS). Configured in `vite.config.js`.

## Web version

The same app is published as a static site on GitHub Pages: **https://gaelhugo.github.io/editor.proce55us/** (repo `gaelhugo/editor.proce55us`, built output only — don't edit it by hand).

- `./deploy-web.sh` builds it and pushes it. `../AgentCodingWithLMStudio-mac/release.sh` runs it automatically after each release, **with the same version number as the macOS app** — the web editor and the desktop app always ship from the same commit. To publish a web update by hand between releases, run `deploy-web.sh` directly.
- GitHub Pages has no proxy, so the build sets `VITE_DIRECT_API=1` (`vite build --base /editor.proce55us/`): the service URLs then come straight from `src/llm/endpoints.js` instead of the `/lmstudio`, `/groq`… proxy routes. `vite.config.js` (dev proxy) and `../AgentCodingWithLMStudio-mac/electron/server.js` (app relay) read the same table — keep them in sync.
- All services accept cross-origin calls from the page. For **LM Studio**, two things are needed on the visitor's machine: **Enable CORS** in LM Studio's server settings, and — in Chrome/Edge — allowing the **Local network access** permission the first time (the page declares `targetAddressSpace: "local"`, which triggers Chrome's prompt; other browsers don't gate localhost). If it fails, the cell shows a message explaining both steps.

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
├── i18n/                       # index.js (language detection, t(), pick()), fr.json, en.json
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
  "title": { "fr": "Nom dans le menu", "en": "Name shown in the dropdown" },
  "mode": "p5",
  "steps": [
    {
      "title": { "fr": "Titre de l'étape", "en": "Step title" },
      "prompt": {
        "fr": "Ce que le code doit faire…",
        "en": "What the code should do…"
      },
      "code": {
        "fr": ["// une chaîne par ligne", "const x = 1;"],
        "en": ["// one string per line", "const x = 1;"]
      }
    }
  ]
}
```

`title`, `prompt` and `code` are localized with `{ "fr": …, "en": … }`; translate only the comments and the texts shown on the page — the instructions must stay identical in both versions. A plain value (not localized) is used for every language. `mode` is `"vanilla"` (default when omitted), `"p5"`, `"three"` or `"dom"`. `code` may also be a single string. To load a different file at startup, change `DEFAULT_FILE` in `src/examples/index.js`.

### Adding a mode

Add an entry to `MODES` in `src/runtime/modes.js`: `label`, base `style`, `libs` (tags for the preview — local files via Vite imports — and for the export — CDN), optional `prelude` code, `deferred: true` if the library is an ES module, and the `context` / `rules` / `output` lines given to the model (in English). It then appears in the mode pill automatically.

See `AGENTS.md` for maintainer notes (in French).
