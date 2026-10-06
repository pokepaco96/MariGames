import { test, expect } from '@playwright/test';
import { setupPage, spoken, press, starCount, expectNoHorizontalScroll, openGame, goHome } from './helpers.js';

setupPage();

// Target word from the on-screen instruction, per game.
const targets = {
  Count: async (page) => {
    const label = await page.locator('.scene').getAttribute('aria-label');
    return String(parseInt(label, 10));
  },
  Colors: async (page) => (await page.locator('.prompt-text').innerText()).replace('Find ', '').trim(),
  Animals: async (page) =>
    (await page.locator('.prompt-text').innerText()).replace(/^(Find the|Where is the)\s+/, '').replace('?', '').trim(),
  Shapes: async (page) => (await page.locator('.prompt-text').innerText()).replace('Find the ', '').trim(),
  Fruits: async (page) => (await page.locator('.prompt-text').innerText()).replace('Find the ', '').trim(),
};

const GAMES = ['Count', 'Colors', 'Animals', 'Shapes', 'Fruits', 'Hidden Colors (Food)', 'Hidden Colors (School)', 'Hidden Colors (Toys)'];

test('home shows Teacher Maria, Teacher Tools (Noise Meter) above the eight games', async ({ page }, testInfo) => {
  await expect(page).toHaveTitle('Teacher Maria');
  await expect(page.locator('.logo')).toHaveText('Teacher Maria');
  await expect(page.getByText('MariGames')).toHaveCount(0);
  await expect(page.getByText("Let's play!")).toBeVisible();
  await expect(page.locator('.stars')).toContainText('0');

  // Teacher Tools: one wide tool card, named just "Noise Meter", with a short description.
  const toolsTitle = page.getByRole('heading', { name: 'Teacher Tools' });
  const gamesTitle = page.getByRole('heading', { name: 'Games', exact: true });
  await expect(toolsTitle).toBeVisible();
  await expect(gamesTitle).toBeVisible();
  const tool = page.getByRole('button', { name: 'Noise Meter', exact: true });
  await expect(tool).toBeVisible();
  await expect(tool).toHaveAccessibleDescription('Check your classroom noise level');
  await expect(page.locator('.tool-card')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Teacher Tools' }).locator('.tool-card')).toHaveCount(1);

  // Games: the same eight cards, in the same order, and no tool among them.
  const cards = page.locator('.game-card');
  await expect(cards).toHaveCount(GAMES.length);
  await expect(page.getByRole('region', { name: 'Games' }).locator('.game-card')).toHaveCount(GAMES.length);
  expect(await cards.locator('.game-card-title').allInnerTexts()).toEqual(GAMES);
  for (const title of GAMES) {
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
  }
  expect((await page.locator('.tool-card, .game-card').count())).toBe(9);

  // Order on screen: Teacher Tools title < Noise Meter < Games title < first game.
  const y = async (l) => (await l.boundingBox()).y;
  expect(await y(toolsTitle)).toBeLessThan(await y(tool));
  expect(await y(tool)).toBeLessThan(await y(gamesTitle));
  expect(await y(gamesTitle)).toBeLessThan(await y(cards.first()));

  // The tool card stands out: wider than a game card on tablet/desktop, and not too tall on phones.
  const toolBox = await tool.boundingBox();
  const box = await cards.first().boundingBox();
  if (testInfo.project.name === 'mobile-small') {
    expect(toolBox.height).toBeLessThanOrEqual(170);
  } else {
    expect(toolBox.width).toBeGreaterThan(box.width * 1.5);
  }
  expect(toolBox.x).toBeGreaterThanOrEqual(0);
  expect(toolBox.x + toolBox.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(box.height).toBeGreaterThanOrEqual(150);
  // Icons and texts must fit inside their card; the logo must fit the screen.
  const toolOverflow = await page.$$eval('.tool-card', (els) =>
    els.filter((el) =>
      ['.tool-card-icon', '.tool-card-title', '.tool-card-text', '.tool-card-go'].some((s) => {
        const r = el.querySelector(s).getBoundingClientRect();
        const c = el.getBoundingClientRect();
        if (!r.width && !r.height) return false; // hidden on purpose (the arrow on tiny phones)
        return r.left < c.left || r.right > c.right || r.top < c.top || r.bottom > c.bottom;
      })
    ).length
  );
  expect(toolOverflow).toBe(0);
  const overflowing = await page.$$eval('.game-card', (els) =>
    els.filter((el) =>
      ['.game-card-icon', '.game-card-title'].some((s) => {
        const r = el.querySelector(s).getBoundingClientRect();
        const c = el.getBoundingClientRect();
        return r.left < c.left || r.right > c.right || el.querySelector(s).scrollWidth > el.clientWidth;
      })
    ).length
  );
  expect(overflowing).toBe(0);
  const logo = await page.locator('.logo').evaluate((el) => {
    const letters = [...el.querySelectorAll('.logo-letter')].map((s) => s.getBoundingClientRect());
    return { left: Math.min(...letters.map((r) => r.left)), right: Math.max(...letters.map((r) => r.right)) };
  });
  expect(logo.left).toBeGreaterThanOrEqual(0);
  expect(logo.right).toBeLessThanOrEqual(page.viewportSize().width);
  await expectNoHorizontalScroll(page);
});

test('Noise Meter tool opens from Home with the keyboard and Home comes back', async ({ page }) => {
  const tool = page.getByRole('button', { name: 'Noise Meter', exact: true });
  await tool.focus();
  await expect(tool).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Classroom Noise Monitor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable microphone' })).toBeVisible();
  await page.getByRole('button', { name: 'Home' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Teacher Tools' })).toBeVisible();
  await expect(page.locator('.game-card')).toHaveCount(GAMES.length);
  await expectNoHorizontalScroll(page);
});

for (const title of Object.keys(targets)) {
  test(`${title}: wrong answer keeps stars, right answer adds a star, next round, back home`, async ({ page }, testInfo) => {
    await openGame(page, title, testInfo);
    await expectNoHorizontalScroll(page);

    const choices = page.locator('.choice');
    const n = await choices.count();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(4);
    const box = await choices.first().boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(80);

    const firstPrompt = await page.locator('.prompt-text').innerText();
    const target = await targets[title](page);
    const right = page.locator(`.choice[aria-label="${target}"]`);
    const wrong = page.locator(`.choice:not([aria-label="${target}"])`).first();
    await expect(right).toHaveCount(1);

    // Wrong answer: gentle feedback, no star lost, can keep trying.
    await press(wrong, testInfo);
    await expect(page.locator('.feedback-retry')).toBeVisible();
    await expect(page.locator('.feedback-retry')).toHaveText(/Try again|Almost!/);
    expect(await starCount(page)).toBe(0);

    // Right answer: positive feedback and one star.
    await press(right, testInfo);
    await expect(page.locator('.feedback-success')).toHaveText(/Great!|Good job!|Yes!|Well done!/);
    await expect(page.locator('.stars')).toContainText('1');

    // A new round starts automatically.
    await expect(page.locator('.choice.is-correct')).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator('.choice.is-wrong')).toHaveCount(0);
    const nextTarget = await targets[title](page);
    if (title !== 'Count') expect(await page.locator('.prompt-text').innerText()).not.toBe(firstPrompt);
    await press(page.locator(`.choice[aria-label="${nextTarget}"]`), testInfo);
    await expect(page.locator('.stars')).toContainText('2');

    // Stars survive going home.
    await goHome(page, testInfo);
    await expect(page.locator('.stars')).toContainText('2');
  });
}

test('sound: instruction is spoken, 👂 repeats it, Sound Off silences everything', async ({ page }, testInfo) => {
  await openGame(page, 'Animals', testInfo);
  const prompt = await page.locator('.prompt-text').innerText();
  await expect.poll(() => spoken(page)).toContain(prompt);

  const before = (await spoken(page)).length;
  await press(page.getByRole('button', { name: 'Listen' }), testInfo);
  await expect.poll(async () => (await spoken(page)).length).toBe(before + 1);
  expect((await spoken(page)).at(-1)).toBe(prompt);

  // Sound off: 👂 disappears and nothing more is spoken.
  await press(page.getByRole('button', { name: 'Sound off' }), testInfo);
  await expect(page.getByRole('button', { name: 'Sound on' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0);
  const silent = (await spoken(page)).length;
  const target = await targets.Animals(page);
  await press(page.locator(`.choice:not([aria-label="${target}"])`).first(), testInfo);
  await press(page.locator(`.choice[aria-label="${target}"]`), testInfo);
  await expect(page.locator('.stars')).toContainText('1');
  await page.waitForTimeout(2500); // next round would speak its prompt
  expect((await spoken(page)).length).toBe(silent);

  // Sound back on: 👂 is back and works.
  await press(page.getByRole('button', { name: 'Sound on' }), testInfo);
  await press(page.getByRole('button', { name: 'Listen' }), testInfo);
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(silent);
});
