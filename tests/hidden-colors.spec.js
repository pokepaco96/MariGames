import { test, expect } from '@playwright/test';
import { setupPage, spoken, press, starCount, expectNoHorizontalScroll, openGame, goHome } from './helpers.js';

setupPage();

const FOODS = [
  'banana', 'ice-cream', 'tomato', 'spaghetti', 'salad', 'popcorn',
  'cookie', 'broccoli', 'orange-juice', 'cereal', 'soup',
];
const COLORS = ['yellow', 'red', 'blue', 'green', 'orange', 'pink'];
const EXPECTED_COLUMNS = { 'mobile-small': 3, tablet: 4, desktop: 6 };
const PRAISE = /Great!|Good job!|Yes!|Well done!/;

const tiles = (page) => page.locator('.hc-tile');
const closedTiles = (page) => page.locator('.hc-tile:not(.is-open)');
const foodTile = (page) => page.locator('.hc-tile:not([data-food="empty"])');
const progress = (page) => page.locator('.hc-progress');
const continueButton = (page) => page.getByRole('button', { name: 'Continue' });
const praise = (page) => page.locator('.hc-done-text');

async function start(page, testInfo) {
  await openGame(page, 'Hidden Colors', testInfo);
  await expect(tiles(page)).toHaveCount(12);
}

// Find the food of the current round and wait for the "completed" state.
async function findFood(page, testInfo) {
  await press(foodTile(page), testInfo);
  await expect(continueButton(page)).toBeVisible();
}

async function nextRound(page, testInfo) {
  await press(continueButton(page), testInfo);
  await expect(continueButton(page)).toHaveCount(0);
}

const overlaps = (a, b) =>
  !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

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
  await expect(continueButton(page)).toHaveCount(0);

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
  await expect(continueButton(page)).toHaveCount(0);
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

test('found food: one star, praise and → button; round waits (no timer) until →', async ({ page }, testInfo) => {
  await start(page, testInfo);
  const index = await tiles(page).evaluateAll((els) => els.findIndex((el) => el.dataset.food !== 'empty'));
  const tile = tiles(page).nth(index);
  await press(tile, testInfo);

  await expect(tile).toHaveClass(/is-found/);
  await expect(tile.locator('.hc-cover')).toHaveCSS('opacity', '0');
  const food = tile.locator('.hc-food');
  await expect(food).toBeVisible();
  await expect(praise(page)).toHaveText(PRAISE);
  await expect(continueButton(page)).toBeVisible();
  await expect(page.locator('.stars')).toContainText('1');
  await expect(page.locator('.feedback')).toHaveCount(0); // praise is shown in the game, not floating

  // Emoji fits inside its tile (not cut).
  const t = await tile.boundingBox();
  const f = await food.boundingBox();
  expect(f.x).toBeGreaterThanOrEqual(t.x - 1);
  expect(f.x + f.width).toBeLessThanOrEqual(t.x + t.width + 1);

  // → button: big, on screen, not covering the food or the praise.
  await page.waitForTimeout(400); // let the pop-in animation settle
  const btn = await continueButton(page).boundingBox();
  const msg = await praise(page).boundingBox();
  const viewport = page.viewportSize();
  expect(btn.width).toBeGreaterThanOrEqual(56);
  expect(btn.height).toBeGreaterThanOrEqual(56);
  expect(btn.x).toBeGreaterThanOrEqual(0);
  expect(btn.x + btn.width).toBeLessThanOrEqual(viewport.width);
  expect(btn.y).toBeGreaterThanOrEqual(0);
  expect(btn.y + btn.height).toBeLessThanOrEqual(viewport.height);
  expect(overlaps(btn, t)).toBe(false);
  expect(overlaps(btn, msg)).toBe(false);
  expect(msg.x).toBeGreaterThanOrEqual(0);
  expect(msg.x + msg.width).toBeLessThanOrEqual(viewport.width);
  // The grid does not move off screen when the round is completed.
  const grid = await page.locator('.hc-grid').boundingBox();
  expect(grid.y + grid.height).toBeLessThanOrEqual(viewport.height);
  await expectNoHorizontalScroll(page);

  // No auto-advance: still round 1 after waiting, food still visible, no repeated sounds.
  await expect.poll(async () => (await spoken(page)).at(-1)).toMatch(PRAISE);
  const spokenAfterFind = (await spoken(page)).length;
  await page.waitForTimeout(2500);
  await expect(progress(page)).toHaveText('1 / 11');
  await expect(food).toBeVisible();
  await expect(continueButton(page)).toBeVisible();
  expect(await starCount(page)).toBe(1);
  expect((await spoken(page)).length).toBe(spokenAfterFind);

  // Other tiles are locked: they do not open, add stars, speak or change anything.
  const other = closedTiles(page).first();
  await expect(other).toHaveAttribute('aria-disabled', 'true');
  await press(other, testInfo, { force: true });
  await press(closedTiles(page).nth(3), testInfo, { force: true });
  await press(tile, testInfo, { force: true });
  await page.waitForTimeout(500);
  await expect(closedTiles(page)).toHaveCount(11);
  expect(await starCount(page)).toBe(1);
  await expect(progress(page)).toHaveText('1 / 11');
  await expect(continueButton(page)).toBeVisible();
  expect((await spoken(page)).length).toBe(spokenAfterFind);

  // → starts round 2 with 12 closed tiles and the instruction spoken again.
  await nextRound(page, testInfo);
  await expect(progress(page)).toHaveText('2 / 11');
  await expect(praise(page)).toHaveCount(0);
  await expect(page.locator('.prompt-text')).toHaveText('Find the food!');
  await expect(closedTiles(page)).toHaveCount(12);
  await expect.poll(async () => (await spoken(page)).at(-1)).toBe('Find the food!');
  expect(await starCount(page)).toBe(1);

  // Round 2 works normally.
  await press(page.locator('.hc-tile[data-food="empty"]').first(), testInfo);
  await expect(closedTiles(page)).toHaveCount(11);
  await findFood(page, testInfo);
  await expect(page.locator('.stars')).toContainText('2');
  await expect(progress(page)).toHaveText('2 / 11');
});

test('full game: 11 rounds, each food once, round 11 waits for →, end screen, Play again, Home', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await start(page, testInfo);
  const played = [];
  for (let round = 1; round <= 11; round++) {
    await expect(progress(page)).toHaveText(`${round} / 11`);
    await expect(closedTiles(page)).toHaveCount(12);
    played.push(await foodTile(page).getAttribute('data-food'));
    await findFood(page, testInfo);
    await expect(page.locator('.stars')).toContainText(String(round));
    if (round < 11) await nextRound(page, testInfo);
  }
  expect([...played].sort()).toEqual([...FOODS].sort());

  // Round 11: the end screen does not appear by itself.
  await page.waitForTimeout(2500);
  await expect(page.locator('.hc-end-card')).toHaveCount(0);
  await expect(progress(page)).toHaveText('11 / 11');
  await expect(page.locator('.hc-food')).toBeVisible();
  await expect(continueButton(page)).toBeVisible();

  // → shows the end screen, no round 12.
  await press(continueButton(page), testInfo);
  await expect(page.getByRole('heading', { name: 'Great job!' })).toBeVisible();
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
  await findFood(page, testInfo);
  await expect(page.locator('.stars')).toContainText('12');

  await goHome(page, testInfo);
  await expect(page.locator('.stars')).toContainText('12');
});

test('end screen has a big Home button', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await start(page, testInfo);
  for (let round = 1; round <= 11; round++) {
    await expect(progress(page)).toHaveText(`${round} / 11`);
    await findFood(page, testInfo);
    await nextRound(page, testInfo);
  }
  const home = page.locator('.big-btn-home');
  await expect(home).toBeVisible();
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

  // Sound off: finding the food and going to the next round say nothing.
  await press(page.getByRole('button', { name: 'Sound off' }), testInfo);
  await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0);
  const silent = (await spoken(page)).length;
  await findFood(page, testInfo);
  await nextRound(page, testInfo);
  await expect(progress(page)).toHaveText('2 / 11');
  await page.waitForTimeout(800); // the new round would speak here
  expect((await spoken(page)).length).toBe(silent);

  // Sound on: 👂 works, praise is spoken once, and → speaks the next instruction.
  await press(page.getByRole('button', { name: 'Sound on' }), testInfo);
  await press(page.getByRole('button', { name: 'Listen' }), testInfo);
  await expect.poll(async () => (await spoken(page)).at(-1)).toBe('Find the food!');
  expect((await spoken(page)).length).toBe(silent + 1);
  await findFood(page, testInfo);
  await expect.poll(async () => (await spoken(page)).at(-1)).toMatch(PRAISE);
  const afterPraise = (await spoken(page)).length;
  await nextRound(page, testInfo);
  await expect.poll(async () => (await spoken(page)).at(-1)).toBe('Find the food!');
  expect((await spoken(page)).length).toBe(afterPraise + 1);
});
