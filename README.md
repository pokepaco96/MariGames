# MariGames

MariGames is a small website with simple, visual learning games **in English** for preschool children.

- **Target age:** 3 to 5 years old
- **Topics:** animals, colors, counting (1–5), shapes, fruits
- Big buttons, very little text, spoken instructions, positive feedback only (no timers, no lives, no losing).
- No login, no ads, no trackers, no personal data. Everything runs in the browser.

## Games

| Game | What the child does |
| --- | --- |
| **Count** | "How many cats?" – count 1–5 animals, pick one of 3 numbers |
| **Colors** | "Find blue" – tap the right color (3–4 choices) |
| **Animals** | "Find the dog" / "Where is the cow?" – tap the right animal |
| **Shapes** | "Find the circle" – circle, square, triangle, star |
| **Fruits** | "Find the apple" – apple, banana, orange, strawberry |
| **Hidden Colors** | "Find the food!" – 12 colored squares (2 of each of 6 colors), one hides a food; tapped squares disappear. 11 rounds, one per food (banana, ice cream, tomato, spaghetti, salad, popcorn, cookie, broccoli, orange juice, cereal, soup), in random order, then a "Great job!" screen with **Play again** |

Each correct answer adds a ⭐ (stars reset when the page is reloaded).
The 🔊 button turns all sound on/off; the 👂 button repeats the instruction.

## Technology

- [React](https://react.dev) 18
- [Vite](https://vite.dev) 6
- Plain JavaScript and CSS (no UI libraries)
- Web Audio API for sound effects, Speech Synthesis API for spoken words

## Run locally

Requires **Node.js 24 LTS** (pinned in `.node-version` and `package.json` `engines`).

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually http://localhost:5173).

## Build

```bash
npm run build     # outputs the static site to dist/
npm run preview   # serves dist/ locally
```

## Tests

Tests use [Playwright](https://playwright.dev) (dev dependency only):

- `tests/logic/` – pure logic tests for Hidden Colors (12 tiles, 2 of each color, 11 foods once each,
  randomization) using a seeded random generator, so they are deterministic.
- `tests/*.spec.js` – browser tests that play every game on a small phone (320×568), a tablet (768×1024)
  and a desktop (1280×800): right and wrong answers, stars, a full 11-round Hidden Colors game, Play again,
  back to home, Sound On/Off, the 👂 button, layout (no horizontal scroll) and console errors.

```bash
npx playwright install chromium   # first time only
npm run test:e2e                  # builds, serves dist/ and runs the tests
```

To test the deployed site instead (PowerShell): `$env:BASE_URL="https://marigames.onrender.com"; npm run test:e2e`

## Deploy

Deployed on [Render](https://render.com) as a **Static Site**:

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Branch: `main` (auto-deploy on push)
- Node.js: 24 (Render reads `.node-version`)

`render.yaml` documents the same settings.

## Project structure

```
src/
  App.jsx              # switches between Home and a game
  main.jsx             # entry point
  components/          # shared UI: TopBar, RoundGame, ChoiceButton, Feedback, ...
  context/             # GameContext: stars + sound on/off
  data/                # vocabulary: animals, colors, shapes, fruits, foods, feedback words
  games/               # one folder per game + registry.js
                       #   hidden-colors/game.js = pure round/random logic (testable)
  pages/               # Home and GamePage
  styles/              # global.css
  utils/               # random helpers, sound/speech
  assets/              # future images/audio
tests/                 # Playwright end-to-end tests
```

## Adding a game

1. Create `src/games/<my-game>/index.jsx` exporting `{ id, title, icon, color, makeRound }`.
   `makeRound(previousRound)` returns `{ prompt, say, scene?, options: [{ id, content, label, say, correct }] }`.
   (For a different mechanic, like a memory game, export `Component` instead; it receives `onCorrect` and `onTryAgain`.)
2. Add it to the list in `src/games/registry.js`.

That's it — the home card, stars, sound and feedback work automatically.
