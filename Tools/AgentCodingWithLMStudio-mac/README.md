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
- All four modes (JavaScript, p5.js, three.js, DOM) work **offline**: p5.js and three.js are bundled into `app/assets/` by the web build (no CDN in the preview). Only the HTML export loads them from a CDN.

Other commands:

```bash
./build-mac.sh --web-only   # only rebuild app/ (web build)
npm start                   # run the desktop app without packaging (after --web-only)
```

> If you launch Electron from a terminal that is itself inside an Electron-based editor, unset `ELECTRON_RUN_AS_NODE` first (`env -u ELECTRON_RUN_AS_NODE npm start`) — otherwise Electron starts as plain Node and the window never opens.

## Publishing a release

```bash
# 1. add a "## 1.2.0" section to CHANGELOG.md (it becomes the release notes), commit
# 2. then:
./release.sh 1.2.0
```

`release.sh 1.2.0` sets the version in `package.json` (and its lockfile) and commits it, builds the app, pushes `main` and the `v1.2.0` tag, creates the GitHub release **proce55us v1.2.0** with the CHANGELOG section as notes, and uploads both `dist/` assets. Without an argument it releases the version already in `package.json`; re-running for an existing tag updates its notes and replaces its assets. The artifact names have no version in them (`proce55us-universal.dmg`), so the homepage's `releases/latest/download/…` link — and its version badge — always track the newest release automatically. It uses the GitHub token stored in the macOS keychain (created by `gh auth login` or GitHub Desktop); if your token lives elsewhere, export it: `GITHUB_TOKEN=… ./release.sh` — adapt the `TOKEN=` line accordingly.

## Update checker

At launch (then every 6 hours), the app compares its version with the latest GitHub release (`api.github.com/repos/gaelhugo/ECAL_MID_1_2027/releases/latest`). If a newer one exists, a small capsule appears **at the top right** of the window: **New version X.Y.Z** (opens the release notes) · **Download** (opens the `.dmg` in the default browser) · **×** (hides it until the next version; remembered in `~/Library/Application Support/proce55us/updater.json`). Its texts follow the app's language (French or English, see below).

- Installing stays manual: open the downloaded `.dmg`, drag **proce55us** into Applications (replace), then **Open Anyway** once more (see below).
- Fully automatic updates (download + replace + restart) are not possible: on macOS they require a paid Apple **Developer ID** signature.
- Offline or GitHub unreachable → nothing is shown. The capsule is injected by Electron (Shadow DOM, `electron/updater.js`): the web app is not modified and the browser version never shows it.
- To test it: set `"version": "1.0.0"` in `package.json`, run `./build-mac.sh --web-only && env -u ELECTRON_RUN_AS_NODE npm start`, then restore the version.

## Language

The app follows the **macOS language**: French if the preferred language is French (any region), English otherwise. It can be forced in ⚙︎ Settings → Langue / Language. The interface, the examples (including their code comments), the comments in generated code, the update capsule and the camera permission prompt all follow it. The camera prompt text is localized through `resources/fr.lproj` and `resources/en.lproj` (`InfoPlist.strings`, copied into the app by `extraResources`); macOS always uses the system language for that prompt.

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
electron/updater.js  # Checks the latest GitHub release, shows the "New version" capsule (FR/EN)
resources/*.lproj/   # Localized camera permission text (InfoPlist.strings)
build-mac.sh         # vite build → app/, then electron-builder → dist/
release.sh           # [version] → bump + build + push main/tag + GitHub release + upload artifacts
CHANGELOG.md         # one section per version, used as release notes
make-icon.js         # generates build/icon.icns (pixel-mosaic "55"), run by build-mac.sh when missing
package.json         # Electron 43.7.9, electron-builder 26.17.0, packaging config
```

The web app expects the Vite dev server's relay routes (`/lmstudio`, `/gemini`, `/groq`, `/mistral`, `/openrouter`) to avoid CORS. Inside the app, `electron/server.js` provides the same routes, so the web code runs unchanged. It listens only on `127.0.0.1` (not reachable from the network), on a fixed port (41730) so settings stored in `localStorage` survive restarts.

**If a route is added to `../AgentCodingWithLMStudio/vite.config.js`, add it to `ROUTES` in `electron/server.js` too.**
