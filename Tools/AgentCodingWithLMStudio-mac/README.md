# proce55us — macOS app

Builds the web app in [`../AgentCodingWithLMStudio`](../AgentCodingWithLMStudio) as a **standalone macOS application** (Electron), installable on any Mac — no Node.js, terminal or `npm run dev` needed on the target machine.

The web app's code is **not modified or duplicated**: the build script compiles it (`vite build`) straight into `app/` here, and the desktop app wraps it.

## Build

On a Mac with Node.js installed:

```bash
cd Tools/AgentCodingWithLMStudio-mac
./build-mac.sh
```

Output in `dist/`:

| File                          | Use                                                 |
| ----------------------------- | --------------------------------------------------- |
| `proce55us-universal.dmg`     | Installer to share (drag the app into Applications) |
| `proce55us-universal-mac.zip` | Same app, zipped                                    |
| `mac-universal/proce55us.app` | The app itself                                      |

- **Universal binary**: runs natively on Apple Silicon and Intel Macs.
- **Requires macOS 12 (Monterey) or later** (Electron 43; Electron 44+ would require macOS 13).
- Rebuild after any change to the web app: `./build-mac.sh` always rebuilds from the current sources.

Other commands:

```bash
./build-mac.sh --web-only   # only rebuild app/ (web build)
npm start                   # run the desktop app without packaging (after --web-only)
```

> If you launch Electron from a terminal that is itself inside an Electron-based editor, unset `ELECTRON_RUN_AS_NODE` first (`env -u ELECTRON_RUN_AS_NODE npm start`) — otherwise Electron starts as plain Node and the window never opens.

## Model used for code generation

- **LM Studio (default)**: the app uses whatever model is **currently loaded in LM Studio on that Mac** (the `.env` model is intentionally not forced, since other Macs have other models). To force one: `VITE_LMSTUDIO_MODEL=model-name ./build-mac.sh`.
- **Free online models**: in the app, open ⚙︎ and paste a free API key (Google AI Studio, Groq, Mistral, OpenRouter) — same as the web version. Settings and keys are stored locally per Mac.

## Installing on another Mac

The app is **ad-hoc signed** (no paid Apple Developer ID), so macOS blocks the first launch:

1. Open the `.dmg` and drag **proce55us** into **Applications**.
2. Double-click it once — macOS shows « cannot be opened ». Click **Done**.
3. Go to **System Settings → Privacy & Security** and click **Open Anyway** (the blocked app is listed there), then confirm. From then on it opens normally.
   On macOS 14 or earlier, **right-click → Open** also works.

Alternative without any dialog: remove the quarantine flag —
`xattr -dr com.apple.quarantine /Applications/proce55us.app`
(the flag is only set on files downloaded through a browser; `curl` or `brew` installs don't trigger Gatekeeper).

When a webcam step runs, macOS asks for camera access → **Allow**.

To remove the warning entirely, the app must be signed with an Apple **Developer ID Application** certificate and notarized (Apple Developer Program). electron-builder does this automatically if such a certificate is in the keychain (remove `"identity": "-"` from `package.json`) and notarization credentials are provided.

## How it works

```
electron/main.js     # Window, camera permission (macOS prompt), external links → default browser
electron/server.js   # Local server on 127.0.0.1: serves app/ + same relay routes as vite.config.js
build-mac.sh         # vite build → app/, then electron-builder → dist/
make-icon.js         # generates build/icon.icns (pixel-mosaic "55"), run by build-mac.sh when missing
package.json         # Electron 43.7.9, electron-builder 26.17.0, packaging config
```

The web app expects the Vite dev server's relay routes (`/lmstudio`, `/gemini`, `/groq`, `/mistral`, `/openrouter`) to avoid CORS. Inside the app, `electron/server.js` provides the same routes, so the web code runs unchanged. It listens only on `127.0.0.1` (not reachable from the network), on a fixed port (41730) so settings stored in `localStorage` survive restarts.

**If a route is added to `../AgentCodingWithLMStudio/vite.config.js`, add it to `ROUTES` in `electron/server.js` too.**
