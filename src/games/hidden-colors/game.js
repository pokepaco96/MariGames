import { foods } from '../../data/foods.js';
import { shuffle } from '../../utils/random.js';

export const PROMPT = 'Find the food!';

export const TILE_COLORS = [
  { name: 'yellow', hex: '#F6C945' },
  { name: 'red', hex: '#E74C3C' },
  { name: 'blue', hex: '#4A90E2' },
  { name: 'green', hex: '#4CAF50' },
  { name: 'orange', hex: '#F39C12' },
  { name: 'pink', hex: '#E83E8C' },
];

// 12 tiles: each of the 6 colors twice, in random positions.
export function makeTiles(rng = Math.random) {
  return shuffle([...TILE_COLORS, ...TILE_COLORS], rng).map((color, id) => ({ id, color }));
}

// A full game: every food exactly once, in random order (11 rounds).
// Each round has its own tile layout and one random tile hiding the food.
export function makeGame(rng = Math.random) {
  return shuffle(foods, rng).map((food) => {
    const tiles = makeTiles(rng);
    return { food, tiles, foodTile: Math.floor(rng() * tiles.length) };
  });
}
