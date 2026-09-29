import { test, expect } from '@playwright/test';
import { setupPage, spoken, tones, press, starCount, expectNoHorizontalScroll, openGame, goHome } from './helpers.js';

setupPage();

// Every Hidden Colors category runs the same suite.
// `items` = how many rounds each item must appear in a full game (repeats count!).
const CATEGORIES = [
  {
    title: 'Hidden Colors (Food)',
    prompt: 'Find the food!',
    items: {
      banana: 1, 'ice-cream': 1, tomato: 1, spaghetti: 1, salad: 1, popcorn: 1,
      cookie: 1, broccoli: 1, 'orange-juice': 1, cereal: 1, soup: 1,
    },
  },
  {
    title: 'Hidden Colors (School)',
    prompt: 'Find the object!',
    items: {
      door: 1, window: 2, pencil: 1, pen: 1, eraser: 1, glue: 1,
      book: 1, scissors: 1, backpack: 1, ruler: 1,
    },
    svgItems: ['eraser', 'glue'], // own drawings instead of emoji
  },
  {
    title: 'Hidden Colors (Toys)',
    prompt: 'Find the toy!',
    items: {
      doll: 1, 'teddy-bear': 1, ball: 1, puzzle: 1, car: 1, kite: 1,
      'video-game-console': 1, train: 1, bicycle: 1, scooter: 1, motorcycle: 1,
    },
    svgItems: ['doll'],
  },
];

const COLORS = ['yellow', 'red', 'blue', 'green', 'orange', 'pink'];
const EXPECTED_COLUMNS = { 'mobile-small': 3, tablet: 4, desktop: 6 };
const PRAISE = /Great!|Good job!|Yes!|Well done!/;

const tiles = (page) => page.locator('.hc-tile');
const closedTiles = (page) => page.locator('.hc-tile:not(.is-open)');
const itemTile = (page) => page.locator('.hc-tile:not([data-item="empty"])');
const emptyTiles = (page) => page.locator('.hc-tile[data-item="empty"]');
const progress = (page) => page.locator('.hc-progress');
const continueButton = (page) => page.getByRole('button', { name: 'Continue' });
const praise = (page) => page.locator('.hc-done-text');

const overlaps = (a, b) =>
  !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

function countOf(list) {
  const counts = {};
  for (const x of list) counts[x] = (counts[x] || 0) + 1;
  return counts;
}

// Tiles grouped into rows by their vertical position.
async function rowSizes(page) {
  const tops = await tiles(page).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  return Object.values(countOf(tops));
}

for (const cat of CATEGORIES) {
  const rounds = Object.values(cat.items).reduce((a, b) => a + b, 0);

  test.describe(cat.title, () => {
    async function start(page, testInfo) {
      await openGame(page, cat.title, testInfo);
      await expect(tiles(page)).toHaveCount(12);
    }

    // Find the item of the current round and wait for the "completed" state.
    async function findItem(page, testInfo) {
      await press(itemTile(page), testInfo);
      await expect(continueButton(page)).toBeVisible();
    }

    async function nextRound(page, testInfo) {
      await press(continueButton(page), testInfo);
      await expect(continueButton(page)).toHaveCount(0);
    }

    test('structure: 12 same-size tiles, 2 of each color, 1 hidden item, layout fits the screen', async ({ page }, testInfo) => {
      await expect(page.getByRole('button', { name: cat.title, exact: true })).toBeVisible();
      await start(page, testInfo);
      expect(rounds).toBe(11);
      await expect(progress(page)).toHaveText(`1 / ${rounds}`);
      await expect(page.locator('.prompt-text')).toHaveText(cat.prompt);
      await expect(closedTiles(page)).toHaveCount(12);
      await expect(itemTile(page)).toHaveCount(1);
      await expect(emptyTiles(page)).toHaveCount(11);
      await expect(page.locator('.hc-item')).toHaveCount(0);
      await expect(continueButton(page)).toHaveCount(0);

      const colors = await tiles(page).evaluateAll((els) => els.map((el) => el.dataset.color));
      expect(countOf(colors)).toEqual(Object.fromEntries(COLORS.map((c) => [c, 2])));

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
      // Nothing overlaps: prompt above progress above grid; prompt fits the screen.
      const prompt = await page.locator('.prompt').boundingBox();
      const prog = await progress(page).boundingBox();
      const grid = await page.locator('.hc-grid').boundingBox();
      expect(prompt.x).toBeGreaterThanOrEqual(0);
      expect(prompt.x + prompt.width).toBeLessThanOrEqual(viewport.width);
      expect(prog.y).toBeGreaterThanOrEqual(prompt.y + prompt.height - 1);
      expect(grid.y).toBeGreaterThanOrEqual(prog.y + prog.height - 1);
      expect(grid.y + grid.height).toBeLessThanOrEqual(viewport.height); // every tile visible without scrolling
      await expectNoHorizontalScroll(page);
    });

    test('empty tile disappears, leaves white, no item, no star, no sound', async ({ page }, testInfo) => {
      await start(page, testInfo);
      await expect.poll(() => spoken(page)).toContain(cat.prompt);
      const spokenBefore = (await spoken(page)).length;
      const tonesBefore = await tones(page);

      const empty = emptyTiles(page).first();
      await press(empty, testInfo);
      await expect(empty).toHaveClass(/is-open/);
      await expect(empty.locator('.hc-cover')).toHaveCSS('opacity', '0');
      await expect(empty).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(empty.locator('.hc-item')).toHaveCount(0);
      await expect(page.locator('.feedback')).toHaveCount(0);
      await expect(continueButton(page)).toHaveCount(0);
      await page.waitForTimeout(500);
      expect(await starCount(page)).toBe(0);
      await expect(progress(page)).toHaveText(`1 / ${rounds}`);
      expect((await spoken(page)).length).toBe(spokenBefore);
      expect(await tones(page)).toBe(tonesBefore);

      // Tapping an open tile again does nothing (no sound either).
      await press(empty, testInfo, { force: true });
      await page.waitForTimeout(300);
      expect(await starCount(page)).toBe(0);
      await expect(progress(page)).toHaveText(`1 / ${rounds}`);
      expect((await spoken(page)).length).toBe(spokenBefore);
      expect(await tones(page)).toBe(tonesBefore);

      // Can keep playing.
      await press(emptyTiles(page).nth(1), testInfo);
      await expect(closedTiles(page)).toHaveCount(10);
    });

    test('found item: one star, praise and → button; round waits (no timer) until →', async ({ page }, testInfo) => {
      await start(page, testInfo);
      const index = await tiles(page).evaluateAll((els) => els.findIndex((el) => el.dataset.item !== 'empty'));
      const tile = tiles(page).nth(index);
      const tonesBefore = await tones(page);
      await press(tile, testInfo);

      await expect(tile).toHaveClass(/is-found/);
      await expect(tile.locator('.hc-cover')).toHaveCSS('opacity', '0');
      const item = tile.locator('.hc-item');
      await expect(item).toBeVisible();
      await expect(praise(page)).toHaveText(PRAISE);
      await expect(continueButton(page)).toBeVisible();
      await expect(page.locator('.stars')).toContainText('1');
      await expect(page.locator('.feedback')).toHaveCount(0); // praise is shown in the game, not floating
      await expect.poll(() => tones(page)).toBeGreaterThan(tonesBefore); // positive sound played

      // The item fits inside its tile (not cut).
      const t = await tile.boundingBox();
      const f = await item.boundingBox();
      expect(f.x).toBeGreaterThanOrEqual(t.x - 1);
      expect(f.x + f.width).toBeLessThanOrEqual(t.x + t.width + 1);

      // → button: big, on screen, not covering the item or the praise.
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
      const grid = await page.locator('.hc-grid').boundingBox();
      expect(grid.y + grid.height).toBeLessThanOrEqual(viewport.height);
      await expectNoHorizontalScroll(page);

      // No auto-advance: same round after waiting, item still visible, no repeated sounds.
      await expect.poll(async () => (await spoken(page)).at(-1)).toMatch(PRAISE);
      const spokenAfterFind = (await spoken(page)).length;
      const tonesAfterFind = await tones(page);
      await page.waitForTimeout(2500);
      await expect(progress(page)).toHaveText(`1 / ${rounds}`);
      await expect(item).toBeVisible();
      await expect(continueButton(page)).toBeVisible();
      expect(await starCount(page)).toBe(1);
      expect((await spoken(page)).length).toBe(spokenAfterFind);
      expect(await tones(page)).toBe(tonesAfterFind);

      // Other tiles are locked: they do not open, add stars, sound or change anything.
      const other = closedTiles(page).first();
      await expect(other).toHaveAttribute('aria-disabled', 'true');
      await press(other, testInfo, { force: true });
      await press(closedTiles(page).nth(3), testInfo, { force: true });
      await press(tile, testInfo, { force: true });
      await page.waitForTimeout(500);
      await expect(closedTiles(page)).toHaveCount(11);
      expect(await starCount(page)).toBe(1);
      await expect(progress(page)).toHaveText(`1 / ${rounds}`);
      await expect(continueButton(page)).toBeVisible();
      expect((await spoken(page)).length).toBe(spokenAfterFind);
      expect(await tones(page)).toBe(tonesAfterFind);

      // → starts round 2 with 12 closed tiles and the instruction spoken again.
      await nextRound(page, testInfo);
      await expect(progress(page)).toHaveText(`2 / ${rounds}`);
      await expect(praise(page)).toHaveCount(0);
      await expect(page.locator('.prompt-text')).toHaveText(cat.prompt);
      await expect(closedTiles(page)).toHaveCount(12);
      await expect.poll(async () => (await spoken(page)).at(-1)).toBe(cat.prompt);
      expect(await starCount(page)).toBe(1);

      // Round 2 works normally.
      await press(emptyTiles(page).first(), testInfo);
      await expect(closedTiles(page)).toHaveCount(11);
      await findItem(page, testInfo);
      await expect(page.locator('.stars')).toContainText('2');
      await expect(progress(page)).toHaveText(`2 / ${rounds}`);
    });

    test(`full game: ${rounds} rounds with the exact items, last round waits for →, end screen, Play again, Home`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await start(page, testInfo);
      const played = [];
      for (let round = 1; round <= rounds; round++) {
        await expect(progress(page)).toHaveText(`${round} / ${rounds}`);
        await expect(closedTiles(page)).toHaveCount(12);
        const id = await itemTile(page).getAttribute('data-item');
        played.push(id);
        await findItem(page, testInfo);
        const shown = page.locator('.hc-tile.is-found .hc-item');
        await expect(shown).toBeVisible();
        if (cat.svgItems?.includes(id)) await expect(shown.locator('svg')).toBeVisible();
        else expect((await shown.innerText()).trim().length).toBeGreaterThan(0); // emoji
        await expect(page.locator('.stars')).toContainText(String(round));
        if (round < rounds) await nextRound(page, testInfo);
      }
      // Exact counts (a Set would hide the repeated item).
      expect(played).toHaveLength(rounds);
      expect(countOf(played)).toEqual(cat.items);

      // Last round: the end screen does not appear by itself.
      await page.waitForTimeout(2500);
      await expect(page.locator('.hc-end-card')).toHaveCount(0);
      await expect(progress(page)).toHaveText(`${rounds} / ${rounds}`);
      await expect(page.locator('.hc-item')).toBeVisible();
      await expect(continueButton(page)).toBeVisible();

      // → shows the end screen, no extra round.
      await press(continueButton(page), testInfo);
      await expect(page.getByRole('heading', { name: 'Great job!' })).toBeVisible();
      await expect(page.getByText('You found them all!')).toBeVisible();
      await expect(page.locator('.hc-end-stars')).toContainText(String(rounds));
      await expect(tiles(page)).toHaveCount(0);
      await expect(progress(page)).toHaveCount(0);
      await expect.poll(() => spoken(page)).toContain('Great job! You found them all!');
      await expectNoHorizontalScroll(page);

      // Play again: new game from 1 / 11 with 12 closed tiles; stars keep counting globally.
      await press(page.getByRole('button', { name: 'Play again' }), testInfo);
      await expect(progress(page)).toHaveText(`1 / ${rounds}`);
      await expect(closedTiles(page)).toHaveCount(12);
      await expect(itemTile(page)).toHaveCount(1);
      expect(await starCount(page)).toBe(rounds);
      await findItem(page, testInfo);
      await expect(page.locator('.stars')).toContainText(String(rounds + 1));

      await goHome(page, testInfo);
      await expect(page.locator('.stars')).toContainText(String(rounds + 1));
    });

    test('end screen has a big Home button', async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await start(page, testInfo);
      for (let round = 1; round <= rounds; round++) {
        await expect(progress(page)).toHaveText(`${round} / ${rounds}`);
        await findItem(page, testInfo);
        await nextRound(page, testInfo);
      }
      const home = page.locator('.big-btn-home');
      await expect(home).toBeVisible();
      expect((await home.boundingBox()).height).toBeGreaterThanOrEqual(70);
      await press(home, testInfo);
      await expect(page.locator('.logo')).toBeVisible();
    });

    test(`sound: "${cat.prompt}" spoken, 👂 repeats, Sound Off silences, Sound On restores`, async ({ page }, testInfo) => {
      await start(page, testInfo);
      await expect.poll(() => spoken(page)).toContain(cat.prompt);

      const before = (await spoken(page)).length;
      await press(page.getByRole('button', { name: 'Listen' }), testInfo);
      await expect.poll(async () => (await spoken(page)).length).toBe(before + 1);
      expect((await spoken(page)).at(-1)).toBe(cat.prompt);

      // Sound off: finding the item and going to the next round make no sound at all.
      await press(page.getByRole('button', { name: 'Sound off' }), testInfo);
      await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0);
      const silent = (await spoken(page)).length;
      const silentTones = await tones(page);
      await findItem(page, testInfo);
      await nextRound(page, testInfo);
      await expect(progress(page)).toHaveText(`2 / ${rounds}`);
      await page.waitForTimeout(800); // the new round would speak here
      expect((await spoken(page)).length).toBe(silent);
      expect(await tones(page)).toBe(silentTones);

      // Sound on: 👂 works, praise is spoken once, and → speaks the next instruction.
      await press(page.getByRole('button', { name: 'Sound on' }), testInfo);
      await press(page.getByRole('button', { name: 'Listen' }), testInfo);
      await expect.poll(async () => (await spoken(page)).at(-1)).toBe(cat.prompt);
      expect((await spoken(page)).length).toBe(silent + 1);
      await findItem(page, testInfo);
      await expect.poll(async () => (await spoken(page)).at(-1)).toMatch(PRAISE);
      expect(await tones(page)).toBeGreaterThan(silentTones);
      const afterPraise = (await spoken(page)).length;
      await nextRound(page, testInfo);
      await expect.poll(async () => (await spoken(page)).at(-1)).toBe(cat.prompt);
      expect((await spoken(page)).length).toBe(afterPraise + 1);
    });
  });
}
