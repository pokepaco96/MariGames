import { test, expect } from '@playwright/test';

// Every browser test: record speech instead of speaking, collect JS errors,
// console.error and unhandled promise rejections, and fail if any appear.
export function setupPage() {
  test.beforeEach(async ({ page }) => {
    page.__errors = [];
    page.on('pageerror', (e) => page.__errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && page.__errors.push(`console.error: ${m.text()}`));
    await page.addInitScript(() => {
      window.addEventListener('unhandledrejection', (e) => console.error(`unhandledrejection: ${e.reason}`));
      window.__spoken = [];
      if ('speechSynthesis' in window) {
        window.speechSynthesis.speak = (u) => window.__spoken.push(u.text);
        window.speechSynthesis.cancel = () => {};
      }
    });
    await page.goto('/');
  });
  test.afterEach(async ({ page }) => {
    expect(page.__errors, 'browser errors').toEqual([]);
  });
}

export const spoken = (page) => page.evaluate(() => window.__spoken);

// force: tap even if the element says it is disabled (to check that nothing happens).
export function press(locator, testInfo, options = {}) {
  return testInfo.project.use.hasTouch ? locator.tap(options) : locator.click(options);
}

export async function starCount(page) {
  const text = await page.locator('.stars').innerText();
  return Number(text.replace(/\D/g, ''));
}

export async function expectNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function openGame(page, title, testInfo) {
  await press(page.getByRole('button', { name: title, exact: true }), testInfo);
  await expect(page.locator('.prompt-text')).toBeVisible();
  // The game starts at the top: Home button and instruction are on screen.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('button', { name: 'Home' })).toBeInViewport();
  await expect(page.locator('.prompt-text')).toBeInViewport();
}

export async function goHome(page, testInfo) {
  await press(page.getByRole('button', { name: 'Home' }).first(), testInfo);
  await expect(page.locator('.logo')).toBeVisible();
}
