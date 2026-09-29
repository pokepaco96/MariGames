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
//     makeRound(previous) {...}  // returns one round (see components/RoundGame.jsx)
//   }
// Games that need a different mechanic (memory, puzzles...) can export
// `Component` instead of `makeRound`; it receives { game, onCorrect, onTryAgain, onBack }
// (see hidden-colors/ for an example). `onCorrect()` returns the praise text; set
// `inlineFeedback: true` to show it inside the game instead of the floating message.
import countAnimals from './count-animals/index.jsx';
import findColor from './find-color/index.jsx';
import findAnimal from './find-animal/index.jsx';
import findShape from './find-shape/index.jsx';
import findFruit from './find-fruit/index.jsx';
import hiddenColors from './hidden-colors/index.jsx';

export const games = [countAnimals, findColor, findAnimal, findShape, findFruit, hiddenColors];

export function getGame(id) {
  return games.find((g) => g.id === id) || null;
}
