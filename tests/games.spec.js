import { test, expect } from '@playwright/test';

// ---------- helpers ----------

// Record spoken text instead of really speaking (headless has no voices).
async function spySpeech(page) {
  await page.addInitScript(() => {
    window.__spoken = [];
    if ('speechSynthesis' in window) {
      window.speechSynthesis.speak = (u) => window.__spoken.push(u.text);
      window.speechSynthesis.cancel = () => {};
    }
  });
}

const spoken = (page) => page.evaluate(() => window.__spoken);

function press(locator, testInfo) {
  return testInfo.project.use.hasTouch ? locator.tap() : locator.click();
}

async function starCount(page) {
  const text = await page.locator('.stars').innerText();
  return Number(text.replace(/\D/g, ''));
}

async function expectNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function openGame(page, title, testInfo) {
  await press(page.getByRole('button', { name: title, exact: true }), testInfo);
  await expect(page.locator('.prompt-text')).toBeVisible();
}

async function goHome(page, testInfo) {
  await press(page.getByRole('button', { name: 'Home' }), testInfo);
  await expect(page.locator('.logo')).toBeVisible();
}

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

const errors = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await spySpeech(page);
  await page.goto('/');
});
test.afterEach(() => {
  expect(errors, 'console errors').toEqual([]);
});

// ---------- tests ----------

test('home shows logo, stars and six big game cards', async ({ page }) => {
  await expect(page.locator('.logo')).toHaveText('MariGames');
  await expect(page.getByText("Let's play!")).toBeVisible();
  await expect(page.locator('.stars')).toContainText('0');
  const cards = page.locator('.game-card');
  await expect(cards).toHaveCount(6);
  for (const title of ['Count', 'Colors', 'Animals', 'Shapes', 'Fruits', 'Hidden Colors']) {
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
  }
  const box = await cards.first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(150);
  // Icons must fit inside their card.
  const overflowing = await page.$$eval('.game-card', (els) =>
    els.filter((el) => el.querySelector('.game-card-icon').scrollWidth > el.clientWidth).length
  );
  expect(overflowing).toBe(0);
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

test('Hidden Colors: cards flip, wrong keeps stars, found adds a star, 6 then 8 cards', async ({ page }, testInfo) => {
  await openGame(page, 'Hidden Colors', testInfo);
  await expectNoHorizontalScroll(page);

  const cards = page.locator('.hidden-card');
  await expect(cards).toHaveCount(6);
  const box = await cards.first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(90);

  const targetId = async () =>
    (await page.locator('.prompt-text').innerText()).replace('Find the ', '').trim().replace(' ', '-');

  // Wrong card opens and shows gentle feedback, no star change.
  let id = await targetId();
  const wrong = page.locator(`.hidden-card:not([data-item="${id}"])`).first();
  await press(wrong, testInfo);
  await expect(wrong).toHaveClass(/is-open/);
  await expect(page.locator('.feedback-retry')).toBeVisible();
  expect(await starCount(page)).toBe(0);

  // Tapping an open card again does nothing.
  await press(wrong, testInfo);
  expect(await starCount(page)).toBe(0);

  // Win three easy rounds, then the grid grows to 8 cards (never more).
  for (let round = 1; round <= 3; round++) {
    id = await targetId();
    await press(page.locator(`.hidden-card[data-item="${id}"]`), testInfo);
    await expect(page.locator('.feedback-success')).toBeVisible();
    await expect(page.locator('.stars')).toContainText(String(round));
    await expect(page.locator('.hidden-card.is-open')).toHaveCount(0, { timeout: 5000 });
  }
  await expect(cards).toHaveCount(8);
  await expectNoHorizontalScroll(page);

  await goHome(page, testInfo);
  await expect(page.locator('.stars')).toContainText('3');
});

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

test('Hidden Colors: 👂 repeats the instruction', async ({ page }, testInfo) => {
  await openGame(page, 'Hidden Colors', testInfo);
  const prompt = await page.locator('.prompt-text').innerText();
  await expect.poll(() => spoken(page)).toContain(prompt);
  const before = (await spoken(page)).length;
  await press(page.getByRole('button', { name: 'Listen' }), testInfo);
  await expect.poll(async () => (await spoken(page)).length).toBe(before + 1);
});
