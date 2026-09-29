// Pure logic tests (no browser): randomization is checked with seeded generators,
// so results are deterministic and never flaky.
import { test, expect } from '@playwright/test';
import { makeGame, makeTiles, TILE_COLORS } from '../../src/games/hidden-colors/engine.js';
import { foods } from '../../src/data/foods.js';
import { schoolObjects } from '../../src/data/schoolObjects.js';
import { toys } from '../../src/data/toys.js';
import { seededRandom } from '../../src/utils/random.js';
import { readFileSync } from 'node:fs';

function countOf(list) {
  const counts = {};
  for (const x of list) counts[x] = (counts[x] || 0) + 1;
  return counts;
}

const layout = (tiles) => tiles.map((t) => t.color.name).join(',');
const order = (game) => game.map((r) => r.item.id).join(',');

const CATEGORIES = [
  {
    name: 'food',
    items: foods,
    expected: {
      banana: 1, 'ice-cream': 1, tomato: 1, spaghetti: 1, salad: 1, popcorn: 1,
      cookie: 1, broccoli: 1, 'orange-juice': 1, cereal: 1, soup: 1,
    },
  },
  {
    name: 'school',
    items: schoolObjects,
    expected: {
      door: 1, window: 2, pencil: 1, pen: 1, eraser: 1, glue: 1,
      book: 1, scissors: 1, backpack: 1, ruler: 1,
    },
  },
  {
    name: 'toys',
    items: toys,
    expected: {
      doll: 1, 'teddy-bear': 1, ball: 1, puzzle: 1, car: 1, kite: 1,
      'video-game-console': 1, train: 1, bicycle: 1, scooter: 1, motorcycle: 1,
    },
  },
];

test('food list: exactly the 11 foods', () => {
  expect(foods.map((f) => f.name).sort()).toEqual(
    ['banana', 'ice cream', 'tomato', 'spaghetti', 'salad', 'popcorn', 'cookie', 'broccoli', 'orange juice', 'cereal', 'soup'].sort()
  );
  expect(new Set(foods.map((f) => f.emoji)).size).toBe(11);
});

test('school list: exactly the 11 given entries, in order, with Window twice', () => {
  expect(schoolObjects.map((o) => o.name)).toEqual([
    'door', 'window', 'pencil', 'pen', 'eraser', 'window', 'glue', 'book', 'scissors', 'backpack', 'ruler',
  ]);
  for (const o of schoolObjects) expect(Boolean(o.emoji) !== Boolean(o.icon), o.id).toBe(true); // one picture each
  expect(schoolObjects.filter((o) => o.icon).map((o) => o.id)).toEqual(['eraser', 'glue']);
});

test('toys list: exactly the 11 given toys, in order, each once', () => {
  expect(toys.map((t) => t.name)).toEqual([
    'doll', 'teddy bear', 'ball', 'puzzle', 'car', 'kite', 'video game console', 'train', 'bicycle', 'scooter', 'motorcycle',
  ]);
  expect(new Set(toys.map((t) => t.id)).size).toBe(11);
  expect(toys.filter((t) => t.icon).map((t) => t.id)).toEqual(['doll']);
});

test('every Hidden Colors item has exactly one valid picture: a real emoji or a registered SVG icon', () => {
  // Names registered in ItemIcon's customIcons (an unknown icon name would render nothing).
  const source = readFileSync(new URL('../../src/components/ItemIcon.jsx', import.meta.url), 'utf8');
  const registered = [...source.match(/const customIcons = \{([^}]*)\}/)[1].matchAll(/(\w+):/g)].map((m) => m[1]);
  for (const item of [...foods, ...schoolObjects, ...toys]) {
    expect(Boolean(item.emoji) !== Boolean(item.icon), item.id).toBe(true);
    if (item.icon) expect(registered, item.id).toContain(item.icon);
    else expect(item.emoji, item.id).toMatch(/^\p{Extended_Pictographic}/u);
  }
  // Pictures differ inside each category.
  for (const list of [foods, toys]) expect(new Set(list.map((i) => i.emoji || i.icon)).size).toBe(list.length);
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

for (const cat of CATEGORIES) {
  test(`${cat.name}: 11 rounds with exact item counts, one hidden tile per round`, () => {
    for (let seed = 1; seed <= 50; seed++) {
      const game = makeGame(cat.items, seededRandom(seed));
      expect(game).toHaveLength(11);
      expect(countOf(game.map((r) => r.item.id))).toEqual(cat.expected);
      for (const r of game) {
        expect(r.tiles).toHaveLength(12);
        expect(Number.isInteger(r.itemTile)).toBe(true);
        expect(r.itemTile).toBeGreaterThanOrEqual(0);
        expect(r.itemTile).toBeLessThan(12);
      }
    }
  });

  test(`${cat.name}: same seed gives the same game (reproducible)`, () => {
    const a = makeGame(cat.items, seededRandom(42));
    const b = makeGame(cat.items, seededRandom(42));
    expect(order(a)).toBe(order(b));
    expect(a.map((r) => r.itemTile)).toEqual(b.map((r) => r.itemTile));
    expect(a.map((r) => layout(r.tiles))).toEqual(b.map((r) => layout(r.tiles)));
  });

  test(`${cat.name}: different games get different orders, colors and hiding places`, () => {
    const games = Array.from({ length: 200 }, (_, i) => makeGame(cat.items, seededRandom(i + 1)));
    // Item order changes between games.
    expect(new Set(games.map(order)).size).toBeGreaterThan(150);
    // Every item shows up first in some game, and every tile hides an item sometimes.
    expect(new Set(games.map((g) => g[0].item.id)).size).toBe(Object.keys(cat.expected).length);
    expect(new Set(games.flatMap((g) => g.map((r) => r.itemTile))).size).toBe(12);
    // Color layouts change between rounds of the same game.
    for (const g of games.slice(0, 20)) expect(new Set(g.map((r) => layout(r.tiles))).size).toBeGreaterThan(8);
    // Every color appears at every position somewhere.
    const all = games.flatMap((g) => g.map((r) => r.tiles));
    for (let pos = 0; pos < 12; pos++) expect(new Set(all.map((t) => t[pos].color.name)).size).toBe(6);
  });
}

test('does not change the given item list', () => {
  const copy = [...schoolObjects];
  makeGame(schoolObjects, seededRandom(7));
  expect(schoolObjects).toEqual(copy);
});

test('default generator (Math.random) also works', () => {
  expect(makeGame(foods)).toHaveLength(11);
  expect(makeTiles()).toHaveLength(12);
});
