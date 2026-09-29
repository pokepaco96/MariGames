import { shuffle } from '../../utils/random.js';

// Pure logic shared by every Hidden Colors category (no React, easy to test).

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

// A full game: one round per entry of `items`, in random order.
// Entries are kept as given, so a repeated item (e.g. two windows) gives two rounds.
// Each round has its own tile layout and one random tile hiding the item.
export function makeGame(items, rng = Math.random) {
  return shuffle(items, rng).map((item) => {
    const tiles = makeTiles(rng);
    return { item, tiles, itemTile: Math.floor(rng() * tiles.length) };
  });
}
