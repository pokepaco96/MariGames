# Teacher Maria

Teacher Maria is a small website with simple, visual learning games **in English** for preschool children.

- **Target age:** 3 to 5 years old
- **Topics:** animals, colors, counting (1–5), shapes, fruits, food, school objects, toys
- Live: https://marigames.onrender.com (the repository, Render service and URL keep the technical name *marigames*)
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
| **Hidden Colors (Food)** | "Find the food!" – 12 colored squares (2 of each of 6 colors), one hides a food; tapped squares disappear. When it is found the round stops (no timer) until the child taps the big → button. 11 rounds in random order (banana, ice cream, tomato, spaghetti, salad, popcorn, cookie, broccoli, orange juice, cereal, soup), then a "Great job!" screen with **Play again** |
| **Hidden Colors (School)** | Same game with "Find the object!" and school objects: door, window, pencil, pen, eraser, window, glue, book, scissors, backpack, ruler (window twice on purpose = 11 rounds). Eraser and glue are our own SVG drawings (no emoji exists) |
| **Hidden Colors (Toys)** | Same game with "Find the toy!": doll, teddy bear, ball, puzzle, car, kite, video game console, train, bicycle, scooter, motorcycle (11 rounds). The doll is our own SVG drawing (🪆 is a nesting doll) |

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

- `tests/logic/` – pure logic tests for the Hidden Colors engine (12 tiles, 2 of each color, exact item
  counts per category, randomization) using a seeded random generator, so they are deterministic.
- `tests/*.spec.js` – browser tests that play every game on a small phone (320×568), a tablet (768×1024)
  and a desktop (1280×800): right and wrong answers, stars, full 11-round games of every Hidden Colors category, Play again,
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
  config.js            # visible app name (Teacher Maria)
  components/          # shared UI: TopBar, RoundGame, ChoiceButton, Feedback, ItemIcon, icons/ ...
  context/             # GameContext: stars + sound on/off
  data/                # vocabulary: animals, colors, shapes, fruits, foods, school objects, toys, feedback words
  games/               # one folder per game + registry.js
                       #   hidden-colors/ = shared Hidden Colors engine (engine.js = pure, testable logic)
                       #   hidden-colors-food/, hidden-colors-school/, hidden-colors-toys/ = categories
  pages/               # Home and GamePage
  styles/              # global.css
  utils/               # random helpers, sound/speech
  assets/              # future images/audio
tests/                 # Playwright end-to-end tests
```

## Adding a game

1. Create `src/games/<my-game>/index.jsx` exporting `{ id, title, icon, color, makeRound }`.
   `makeRound(previousRound)` returns `{ prompt, say, scene?, options: [{ id, content, label, say, correct }] }`.
   (For a different mechanic, like a memory game, export `Component` instead; it receives `game`, `onCorrect`, `onTryAgain` and `onBack`.)
2. Add it to the list in `src/games/registry.js`.

That's it — the home card, stars, sound and feedback work automatically.

## Adding a Hidden Colors category

Add the items to `src/data/` (`{ id, name, emoji }`, or `{ id, name, icon }` for an own SVG drawing registered
in `src/components/ItemIcon.jsx`), then create `src/games/hidden-colors-<category>/index.js`:

```js
import { createHiddenColorsGame } from '../hidden-colors/createHiddenColorsGame.js';
import { toys } from '../../data/toys.js';

export default createHiddenColorsGame({
  id: 'hidden-colors-toys',
  title: 'Hidden Colors (Toys)',
  icon: '🧸',
  color: '#A4D4C9',
  prompt: 'Find the toy!',
  items: toys, // one round per entry
});
```

and add it to `src/games/registry.js`.
