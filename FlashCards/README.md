# Flash Cards — Creative Coding & Agentic AI Terminology

A flashcard web app for learning French technical vocabulary around creative coding and agentic AI. Built with **Vue 3** and **Vite**, featuring an animated Voronoi canvas background and slide transitions.

The UI and card content are in **French** (`fr-FR`).

---

## Quick Start

```bash
npm install
npm run dev
```

- `npm run build` — production build (`base: './'`, so the output in `dist/` works from any subpath)
- `npm run preview` — preview the production build

---

## Usage

| Action | How |
|---|---|
| Flip card | Click the card, **`Space`**, or **`Enter`** |
| Next / Previous card | **`→`** / **`←`**, the arrow buttons, or the clickable zones on each side of the card |
| Shuffle deck | Shuffle button (resets to the first card) |

Each card can reveal a **hint** (bulb icon) before flipping to the definition.

---

## Card data

The app imports `flash_cards_cc.json` (38 cards). Two other data files are present but not loaded: `flash_cards.json` (25 cards) and `new_cards.json` (20 cards). To swap decks, change the import in `src/App.vue`.

Card format:

```json
{
  "flashcards": [
    {
      "front": { "text": "Term", "language": "fr-FR" },
      "back": { "text": "Definition...", "language": "fr-FR" },
      "hint": { "text": "Optional hint" }
    }
  ]
}
```

---

## Structure

```
src/
├── main.js                        # Vue app bootstrap
├── App.vue                        # Deck state, navigation, shuffle, keyboard controls
├── style.css                      # Global styles & CSS variables
└── components/
    ├── FlashCard.vue              # Flippable card with front/back faces and hint
    ├── Controls.vue               # Shuffle / prev / next buttons
    ├── ProgressBar.vue            # "NN / total" counter and progress track
    ├── VoronoiBackground.vue      # Animated Voronoi canvas background (dat.GUI params)
    └── AppHeader.vue              # Header component (currently not used by App.vue)
```

Notes:

- `VoronoiBackground` exposes `pushFlow('next' | 'prev')`, called on navigation to push the cell flow in the swipe direction. Debug parameters (velocity, resistance, idle drift, show points) are tunable via a `dat.GUI` panel.
- `App.vue` contains known-card tracking state (`knownCards`, `markKnown`) that is not currently wired to a UI control.
- `AppHeader.vue` exists but is not imported by `App.vue`.
