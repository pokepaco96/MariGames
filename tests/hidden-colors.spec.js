import { test, expect } from '@playwright/test';
import { setupPage, spoken, press, starCount, expectNoHorizontalScroll, openGame, goHome } from './helpers.js';

setupPage();

const FOODS = [
  'banana', 'ice-cream', 'tomato', 'spaghetti', 'salad', 'popcorn',
  'cookie', 'broccoli', 'orange-juice', 'cereal', 'soup',
];
const COLORS = ['yellow', 'red', 'blue', 'green', 'orange', 'pink'];
const EXPECTED_COLUMNS = { 'mobile-small': 3, tablet: 4, desktop: 6 };

const tiles = (page) => page.locator('.hc-tile');
const closedTiles = (page) => page.locator('.hc-tile:not(.is-open)');
const foodTile = (page) => page.locator('.hc-tile:not([data-food="empty"])');
const progress = (page) => page.locator('.hc-progress');

async function start(page, testInfo) {
  await openGame(page, 'Hidden Colors', testInfo);
  await expect(tiles(page)).toHaveCount(12);
}

// Tiles grouped into rows by their vertical position.
async function rowSizes(page) {
  const tops = await tiles(page).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  const rows = {};
  tops.forEach((t) => (rows[t] = (rows[t] || 0) + 1));
  return Object.values(rows);
}

test('structure: 12 same-size tiles, 2 of each color, 1 / 11, layout fits the screen', async ({ page }, testInfo) => {
  await expect(page.getByRole('button', { name: 'Hidden Colors', exact: true })).toBeVisible();
  await start(page, testInfo);
  await expect(progress(page)).toHaveText('1 / 11');
  await expect(page.locator('.prompt-text')).toHaveText('Find the food!');
  await expect(closedTiles(page)).toHaveCount(12);
  await expect(foodTile(page)).toHaveCount(1);
  await expect(page.locator('.hc-food')).toHaveCount(0);

  const colors = await tiles(page).evaluateAll((els) => els.map((el) => el.dataset.color));
  for (const c of COLORS) expect(colors.filter((x) => x === c), c).toHaveLength(2);

  // Layout: 6+6 on desktop, fewer columns on narrow screens; all tiles equal and big.
  const cols = EXPECTED_COLUMNS[testInfo.project.name];
  expect(await rowSizes(page)).toEqual(Array(12 / cols).fill(cols));
  const boxes = await tiles(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  const viewport = page.viewportSize();
  for (const b of boxes) {
    expect(Math.abs(b.width - boxes[0].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.height - b.width)).toBeLessThanOrEqual(1);
    expect(b.width).toBeGreaterThanOrEqual(80);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(viewport.width);
  }
  // Nothing overlaps: prompt above progress above grid.
  const prompt = await page.locator('.prompt').boundingBox();
  const prog = await progress(page).boundingBox();
  const grid = await page.locator('.hc-grid').boundingBox();
  expect(prog.y).toBeGreaterThanOrEqual(prompt.y + prompt.height - 1);
  expect(grid.y).toBeGreaterThanOrEqual(prog.y + prog.height - 1);
  expect(grid.y + grid.height).toBeLessThanOrEqual(viewport.height); // every tile visible without scrolling
  await expectNoHorizontalScroll(page);
});

test('empty tile disappears, leaves white, no food, no star, no retry message', async ({ page }, testInfo) => {
  await start(page, testInfo);
  const empties = page.locator('.hc-tile[data-food="empty"]');
  const empty = empties.first();
  await press(empty, testInfo);
  await expect(empty).toHaveClass(/is-open/);
  await expect(empty.locator('.hc-cover')).toHaveCSS('opacity', '0');
  await expect(empty).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(empty.locator('.hc-food')).toHaveCount(0);
  await expect(page.locator('.feedback')).toHaveCount(0);
  expect(await starCount(page)).toBe(0);
  await expect(progress(page)).toHaveText('1 / 11');
  expect(await spoken(page)).not.toContain('Try again');

  // Tapping an open tile again does nothing.
  const spokenBefore = (await spoken(page)).length;
  await press(empty, testInfo, { force: true });
  await page.waitForTimeout(300);
  expect(await starCount(page)).toBe(0);
  await expect(progress(page)).toHaveText('1 / 11');
  expect((await spoken(page)).length).toBe(spokenBefore);

  // Can keep playing.
  await press(empties.nth(1), testInfo);
  await expect(closedTiles(page)).toHaveCount(10);
});

test('food tile shows the food, one star only, then round 2 / 11', async ({ page }, testInfo) => {
  await start(page, testInfo);
  const index = await tiles(page).evaluateAll((els) => els.findIndex((el) => el.dataset.food !== 'empty'));
  const tile = tiles(page).nth(index);
  await press(tile, testInfo);
  await expect(tile).toHaveClass(/is-found/);
  await expect(tile.locator('.hc-cover')).toHaveCSS('opacity', '0');
  const food = tile.locator('.hc-food');
  await expect(food).toBeVisible();

  // Emoji fits inside its tile (not cut).
  const t = await tile.boundingBox();
  const f = await food.boundingBox();
  expect(f.x).toBeGreaterThanOrEqual(t.x - 1);
  expect(f.x + f.width).toBeLessThanOrEqual(t.x + t.width + 1);

  const feedback = page.locator('.feedback-success');
  await expect(feedback).toHaveText(/Great!|Good job!|Yes!|Well done!/);
  await expect(page.locator('.stars')).toContainText('1');
  // Feedback fits the screen and does not cover the found food.
  const fb = await feedback.boundingBox();
  expect(fb.x).toBeGreaterThanOrEqual(0);
  expect(fb.x + fb.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(fb.y + fb.height <= f.y || fb.y >= f.y + f.height || fb.x + fb.width <= f.x || fb.x >= f.x + f.width).toBe(true);

  // Tapping again (found tile or another tile) adds nothing and keeps the round.
  await press(tile, testInfo, { force: true });
  await press(tile, testInfo, { force: true });
  await press(closedTiles(page).first(), testInfo);
  expect(await starCount(page)).toBe(1);
  await expect(progress(page)).toHaveText('1 / 11');

  await expect(progress(page)).toHaveText('2 / 11', { timeout: 4000 });
  await expect(closedTiles(page)).toHaveCount(12);
  expect(await starCount(page)).toBe(1);
});

test('full game: 11 rounds, each food once, end screen, Play again, Home', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await start(page, testInfo);
  const played = [];
  for (let round = 1; round <= 11; round++) {
    await expect(progress(page)).toHaveText(`${round} / 11`);
    await expect(closedTiles(page)).toHaveCount(12);
    const tile = foodTile(page);
    played.push(await tile.getAttribute('data-food'));
    await press(tile, testInfo);
    await expect(page.locator('.stars')).toContainText(String(round));
  }
  expect([...played].sort()).toEqual([...FOODS].sort());

  // End screen, no round 12.
  await expect(page.getByRole('heading', { name: 'Great job!' })).toBeVisible({ timeout: 4000 });
  await expect(page.getByText('You found them all!')).toBeVisible();
  await expect(page.locator('.hc-end-stars')).toContainText('11');
  await expect(tiles(page)).toHaveCount(0);
  await expect(progress(page)).toHaveCount(0);
  await expect.poll(() => spoken(page)).toContain('Great job! You found them all!');
  await expectNoHorizontalScroll(page);

  // Play again: new game from 1 / 11 with 12 closed tiles; stars keep counting globally.
  await press(page.getByRole('button', { name: 'Play again' }), testInfo);
  await expect(progress(page)).toHaveText('1 / 11');
  await expect(closedTiles(page)).toHaveCount(12);
  await expect(foodTile(page)).toHaveCount(1);
  expect(await starCount(page)).toBe(11);
  await press(foodTile(page), testInfo);
  await expect(page.locator('.stars')).toContainText('12');

  await goHome(page, testInfo);
  await expect(page.locator('.stars')).toContainText('12');
});

test('end screen has a big Home button', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await start(page, testInfo);
  for (let round = 1; round <= 11; round++) {
    await expect(progress(page)).toHaveText(`${round} / 11`);
    await press(foodTile(page), testInfo);
  }
  const home = page.locator('.big-btn-home');
  await expect(home).toBeVisible({ timeout: 4000 });
  expect((await home.boundingBox()).height).toBeGreaterThanOrEqual(70);
  await press(home, testInfo);
  await expect(page.locator('.logo')).toBeVisible();
});

test('sound: "Find the food!" spoken, 👂 repeats, Sound Off silences, Sound On restores', async ({ page }, testInfo) => {
  await start(page, testInfo);
  await expect.poll(() => spoken(page)).toContain('Find the food!');

  const before = (await spoken(page)).length;
  await press(page.getByRole('button', { name: 'Listen' }), testInfo);
  await expect.poll(async () => (await spoken(page)).length).toBe(before + 1);
  expect((await spoken(page)).at(-1)).toBe('Find the food!');

  await press(page.getByRole('button', { name: 'Sound off' }), testInfo);
  await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0);
  const silent = (await spoken(page)).length;
  await press(foodTile(page), testInfo);
  await expect(progress(page)).toHaveText('2 / 11', { timeout: 4000 });
  await page.waitForTimeout(800); // the new round would speak here
  expect((await spoken(page)).length).toBe(silent);

  await press(page.getByRole('button', { name: 'Sound on' }), testInfo);
  await press(page.getByRole('button', { name: 'Listen' }), testInfo);
  await expect.poll(async () => (await spoken(page)).at(-1)).toBe('Find the food!');
  expect((await spoken(page)).length).toBe(silent + 1);
});
