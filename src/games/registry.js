// Every game is registered here. To add a game:
//   1. create a folder in src/games/<game-id>/ with an index.js exporting a game definition;
//   2. import it below and add it to the list.
//
// A game definition looks like:
//   {
//     id: 'find-animal',        // unique id
//     title: 'Animals',          // short name on the home card
//     icon: '🐶',                // big picture on the home card
//     color: '#ffb74d',          // card color
//     type: 'game',              // optional: 'game' (default) or 'tool' (see below)
//     makeRound(previous) {...}  // returns one round (see components/RoundGame.jsx)
//   }
// Games that need a different mechanic (memory, puzzles...) can export
// `Component` instead of `makeRound`; it receives { game, onCorrect, onTryAgain, onBack }.
// `onCorrect()` returns the praise text; set `inlineFeedback: true` to show it inside
// the game instead of the floating message.
//
// Hidden Colors categories are one call to createHiddenColorsGame() (see hidden-colors-food/).
// Classroom tools for the teacher (e.g. noise-meter/) use the same `Component` pattern
// with `type: 'tool'` and a short `description`; Home shows them first, as "Teacher Tools".
import countAnimals from './count-animals/index.jsx';
import findColor from './find-color/index.jsx';
import findAnimal from './find-animal/index.jsx';
import findShape from './find-shape/index.jsx';
import findFruit from './find-fruit/index.jsx';
import hiddenColorsFood from './hidden-colors-food/index.js';
import hiddenColorsSchool from './hidden-colors-school/index.js';
import hiddenColorsToys from './hidden-colors-toys/index.js';
import noiseMeter from './noise-meter/index.js';

// Everything that can be opened from Home (games keep this order on screen).
const entries = [countAnimals, findColor, findAnimal, findShape, findFruit, hiddenColorsFood, hiddenColorsSchool, hiddenColorsToys, noiseMeter];

const isTool = (entry) => entry.type === 'tool';
export const tools = entries.filter(isTool);
export const games = entries.filter((entry) => !isTool(entry));

// Finds a game or a tool by id.
export function getGame(id) {
  return entries.find((g) => g.id === id) || null;
}
