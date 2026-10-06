import { test, expect } from '@playwright/test';
import { setupPage, press, goHome } from './helpers.js';

// No mocks here: Chromium's built-in fake microphone (a beeping test device) goes
// through the real getUserMedia + Web Audio path, with the permission granted.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

setupPage();

test('real getUserMedia: permission granted, calibrates, shows a live level, stops cleanly', async ({ page }, testInfo) => {
  await press(page.getByRole('button', { name: 'Noise Meter', exact: true }), testInfo);
  await press(page.getByRole('button', { name: 'Enable microphone' }), testInfo);
  await expect(page.getByRole('heading', { name: 'Calibrate the classroom' })).toBeVisible();
  await expect(page.getByText('Calibration complete!')).toBeVisible({ timeout: 8000 });

  const light = page.locator('.nm-light');
  await expect(light).toHaveAttribute('data-zone', /^(green|yellow|red)$/);
  // The fake device beeps, so the level moves above zero at some point.
  await expect
    .poll(async () => Number(await page.getByRole('meter', { name: 'Noise level' }).getAttribute('aria-valuenow')), {
      timeout: 5000,
    })
    .toBeGreaterThan(0);

  await press(page.getByRole('button', { name: 'Recalibrate' }), testInfo);
  await expect(page.getByText('Calibration complete!')).toBeVisible({ timeout: 8000 });
  await press(page.getByRole('button', { name: 'Stop microphone' }), testInfo);
  await expect(page.getByText('The microphone is off.')).toBeVisible();
  await goHome(page, testInfo);
});
