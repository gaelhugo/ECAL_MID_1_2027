# Changelog

`release.sh` publishes the section of the released version as the GitHub release notes — write it before releasing.

## 1.4.0

- **Smart step subdivision**: when a cell prompt requests code that would be too sophisticated for a single simple cell, the model automatically splits the process into logical sub-steps (`// @step`), keeps a short explanatory comment in the initial cell, and generates and runs each sub-cell sequentially.
- **Code-first prompt generation & pedagogical error feedback**: writing or editing code directly in a cell and pressing Run executes the code immediately, generates (or updates) the matching prompt on the left, and pedagogically explains any errors or bugs below the cell.
- **Faster LLM responses**: streamlined system instructions and cached model resolution in LM Studio.
- **Default startup state**: starts on an empty “New processus” cell by default.

## 1.3.1

- **Toolbar layout**: the toolbar moves to its own row under the title, aligned left; the ⚙︎ settings icon sits alone on the right. The header now stays identical whatever the language or label lengths.

## 1.3.0

- **French and English**: the app follows the macOS language — French if it is French (any region), English otherwise. It can be forced in ⚙︎ Settings → Langue / Language.
- The whole interface, the four example processus (titles, prompts **and code comments**), the update capsule and the camera permission prompt are translated.
- Code generated from a custom prompt gets its comments (and on-page texts) in the app's language, whatever language the prompt is written in.
- Model instructions rewritten in English, which small local models follow best.

## 1.2.0

- **Update checker**: at launch (then every 6 hours) the app checks GitHub for a newer release. If there is one, a small capsule appears at the top right of the window — **Télécharger** opens the new `.dmg`, **×** hides it until the next version. Works silently offline.
- From this version on, you'll be told automatically when a new proce55us is available.

## 1.1.0

- **Four modes** for each processus: **JavaScript** canvas (default), **p5.js** (1.11.13, global mode), **three.js** (r186, with OrbitControls) and **DOM** (a whole web page: HTML + CSS + JS). The preview, the instructions given to the model and the HTML export adapt to the mode.
- A ready-made example per mode: Raster Image, Particules, Vague de cubes, Palette de couleurs. Switching mode loads its example.
- p5.js and three.js are bundled in the app: every mode works offline.

## 1.0.0

- First standalone macOS release of proce55us (universal: Apple Silicon + Intel, macOS 12+).
- Prompt-driven processus with editable code, live preview and HTML export.
- LM Studio by default; Google AI Studio, Groq, Mistral or OpenRouter with a free API key.
