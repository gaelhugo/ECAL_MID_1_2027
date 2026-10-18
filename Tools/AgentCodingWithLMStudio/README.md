# Agent Coding with LM Studio

A pedagogical web app for teaching creative coding through prompting. A **processus** is an ordered list of steps; each step pairs a **natural-language prompt** (in French) with the **JavaScript code** it produces, building up a program cell by cell.

Vanilla JavaScript + **Vite** (no framework). UI and comments are in **French**.

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
- The **title is a dropdown** to pick what to load: **Nouveau processus** (first entry, a single empty cell) or **Raster Image** (loaded by default, the 8-step webcam rasterization). Switching resets the preview; the snackbar's **Annuler** restores the previous processus.
- The right pane is a **preview**: a sandboxed `<iframe>` in which the cells' code runs, each in its own `<script>` tag, replayed in order by the `Kernel`.
- Editing a prompt and regenerating sends the code of the cells above plus the active function signatures (`ProgramSummary`) to the selected model (local **LM Studio** by default), which writes the new code.

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
│   ├── index.js                # Auto-loads every *.json here; sets the default (DEFAULT_FILE)
│   └── raster-image.json       # Demo processus: 8 steps (prompt + code), 01-canvas … 08-mouse
├── notebook/                   # Cell, CellActions, CellInserter, CellOutput, CodeEditor,
│                               #   Highlighter, Notebook, RunButton
├── runtime/                    # Kernel (replays cells in the iframe), RuntimeDocument
├── preview/                    # Preview (sandboxed iframe)
├── llm/                        # LlmClient + GeminiClient, providers, PromptBuilder, CodeGenerator,
│                               #   CodeCleaner, ProgramSummary
├── export/                     # CodeExporter
├── ui/                         # Toolbar, ExamplePicker, SettingsPanel, Splitter, Shortcuts, Snackbar, dom, icons
└── styles/                     # Modular CSS (base, layout, cell, editor, preview, structure, settings)
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
