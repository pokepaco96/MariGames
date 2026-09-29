// Pure logic tests (no browser): randomization is checked with seeded generators,
// so results are deterministic and never flaky.
import { test, expect } from '@playwright/test';
import { makeGame, makeTiles, TILE_COLORS } from '../../src/games/hidden-colors/game.js';
import { foods } from '../../src/data/foods.js';
import { seededRandom } from '../../src/utils/random.js';

const FOOD_NAMES = [
  'banana', 'ice cream', 'tomato', 'spaghetti', 'salad', 'popcorn',
  'cookie', 'broccoli', 'orange juice', 'cereal', 'soup',
];

const layout = (tiles) => tiles.map((t) => t.color.name).join(',');
const order = (game) => game.map((r) => r.food.id).join(',');

test('exactly the 11 foods', () => {
  expect(foods.map((f) => f.name).sort()).toEqual([...FOOD_NAMES].sort());
  expect(new Set(foods.map((f) => f.emoji)).size).toBe(11);
});

test('makeTiles: 12 tiles, 6 colors, each exactly twice', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const tiles = makeTiles(seededRandom(seed));
    expect(tiles).toHaveLength(12);
    expect(tiles.map((t) => t.id)).toEqual([...Array(12).keys()]);
    for (const c of TILE_COLORS) expect(tiles.filter((t) => t.color === c)).toHaveLength(2);
  }
  expect(TILE_COLORS.map((c) => c.name)).toEqual(['yellow', 'red', 'blue', 'green', 'orange', 'pink']);
});

test('makeGame: 11 rounds, every food exactly once, one hidden tile per round', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const game = makeGame(seededRandom(seed));
    expect(game).toHaveLength(11);
    expect(game.map((r) => r.food.id).sort()).toEqual(foods.map((f) => f.id).sort());
    for (const r of game) {
      expect(r.tiles).toHaveLength(12);
      expect(Number.isInteger(r.foodTile)).toBe(true);
      expect(r.foodTile).toBeGreaterThanOrEqual(0);
      expect(r.foodTile).toBeLessThan(12);
    }
  }
});

test('same seed gives the same game (reproducible)', () => {
  const a = makeGame(seededRandom(42));
  const b = makeGame(seededRandom(42));
  expect(order(a)).toBe(order(b));
  expect(a.map((r) => r.foodTile)).toEqual(b.map((r) => r.foodTile));
  expect(a.map((r) => layout(r.tiles))).toEqual(b.map((r) => layout(r.tiles)));
});

test('different games get different food orders, colors and hiding places', () => {
  const games = Array.from({ length: 200 }, (_, i) => makeGame(seededRandom(i + 1)));
  // Food order changes between games.
  expect(new Set(games.map(order)).size).toBeGreaterThan(190);
  // Every food shows up first in some game, and every tile hides food sometimes.
  expect(new Set(games.map((g) => g[0].food.id)).size).toBe(11);
  expect(new Set(games.flatMap((g) => g.map((r) => r.foodTile))).size).toBe(12);
  // Color layouts change between rounds of the same game.
  for (const g of games.slice(0, 20)) expect(new Set(g.map((r) => layout(r.tiles))).size).toBeGreaterThan(8);
  // Every color appears at every position somewhere.
  const all = games.flatMap((g) => g.map((r) => r.tiles));
  for (let pos = 0; pos < 12; pos++) expect(new Set(all.map((t) => t[pos].color.name)).size).toBe(6);
});

test('default generator (Math.random) also works', () => {
  const game = makeGame();
  expect(game).toHaveLength(11);
  expect(makeTiles()).toHaveLength(12);
});
