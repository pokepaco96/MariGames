import { test, expect } from '@playwright/test';
import { setupPage, press, starCount, expectNoHorizontalScroll, openGame, goHome } from './helpers.js';

setupPage();

// Fake microphone: a real MediaStream fed by an oscillator whose loudness the test
// controls, so the app's real Web Audio pipeline is exercised without a physical mic.
// mode: 'grant' | 'deny' | 'no-mic' | 'unsupported'. Also records the app's AudioContexts
// and the tracks handed out, to check that everything is released.
async function useMic(page, { mode = 'grant', amplitude = 0.003, delayMs = 0, fullscreen = 'real' } = {}) {
  await page.addInitScript(
    ({ mode, amplitude, delayMs, fullscreen }) => {
      const RealAC = window.AudioContext;
      const mic = (window.__mic = { requests: 0, tracks: [], contexts: [], amplitude, gain: null });
      mic.setAmplitude = (a) => {
        mic.amplitude = a;
        if (mic.gain) mic.gain.gain.value = a;
      };
      window.AudioContext = class extends RealAC {
        constructor(...args) {
          super(...args);
          mic.contexts.push(this);
        }
      };
      if (fullscreen === 'missing') {
        Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true });
        Element.prototype.requestFullscreen = undefined;
      }
      if (mode === 'unsupported') {
        Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
        return;
      }
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        mic.requests++;
        mic.constraints = constraints;
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        if (mode === 'deny') throw new DOMException('Permission denied', 'NotAllowedError');
        if (mode === 'no-mic') throw new DOMException('Requested device not found', 'NotFoundError');
        const ctx = new RealAC();
        await ctx.resume();
        const osc = ctx.createOscillator();
        mic.gain = ctx.createGain();
        mic.gain.gain.value = mic.amplitude;
        const dest = ctx.createMediaStreamDestination();
        osc.connect(mic.gain).connect(dest);
        osc.start();
        mic.tracks.push(...dest.stream.getTracks());
        return dest.stream;
      };
    },
    { mode, amplitude, delayMs, fullscreen }
  );
  await page.reload();
}

const QUIET = 0.003; // calibration baseline
const LOUDER = 0.015; // about +14 dB -> yellow
const LOUDEST = 0.06; // about +26 dB -> red

const light = (page) => page.locator('.nm-light');
const micState = (page) =>
  page.evaluate(() => ({
    requests: window.__mic.requests,
    liveTracks: window.__mic.tracks.filter((t) => t.readyState === 'live').length,
    tracks: window.__mic.tracks.length,
    openContexts: window.__mic.contexts.filter((c) => c.state !== 'closed').length,
  }));
const setAmplitude = (page, a) => page.evaluate((a) => window.__mic.setAmplitude(a), a);

async function openMeter(page, testInfo) {
  await press(page.getByRole('button', { name: 'Noise Meter', exact: true }), testInfo);
  await expect(page.getByRole('heading', { name: 'Classroom Noise Monitor' })).toBeVisible();
}

async function enableAndCalibrate(page, testInfo) {
  await press(page.getByRole('button', { name: 'Enable microphone' }), testInfo);
  await expect(page.getByRole('heading', { name: 'Calibrate the classroom' })).toBeVisible();
  await expect(page.getByText('Calibration complete!')).toBeVisible({ timeout: 8000 });
  await expect(light(page)).toHaveAttribute('data-zone', 'green');
}

test('home card opens the Noise Meter; the microphone is only used after pressing Enable', async ({ page }, testInfo) => {
  await useMic(page);
  const card = page.getByRole('button', { name: 'Noise Meter', exact: true });
  await expect(card).toBeVisible();
  expect(await micState(page)).toMatchObject({ requests: 0 });

  await openMeter(page, testInfo);
  await expect(page.getByRole('button', { name: 'Enable microphone' })).toBeVisible();
  await expect(page.getByText('Audio stays on this device. Nothing is recorded or uploaded.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
  expect(await micState(page)).toMatchObject({ requests: 0, tracks: 0 });
  await expectNoHorizontalScroll(page);

  await goHome(page, testInfo);
  expect(await micState(page)).toMatchObject({ requests: 0, tracks: 0 });
  expect(await starCount(page)).toBe(0);
});

test('granted: calibrates, then GREEN → YELLOW → RED → GREEN with the noise', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await useMic(page, { amplitude: QUIET });
  await openMeter(page, testInfo);
  await press(page.getByRole('button', { name: 'Enable microphone' }), testInfo);

  // Calibration runs, then a baseline gives the thresholds.
  await expect(page.getByRole('heading', { name: 'Calibrate the classroom' })).toBeVisible();
  await expect(page.getByText('Stay quiet for a few seconds…')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Calibration' })).toBeVisible();
  await expect(page.getByText('Calibration complete!')).toBeVisible({ timeout: 8000 });
  const state = await micState(page);
  expect(state).toMatchObject({ requests: 1, liveTracks: 1 });
  // Browser audio processing is switched off so loudness is not flattened.
  expect(await page.evaluate(() => window.__mic.constraints)).toEqual({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });

  // GREEN at the quiet baseline; the level is a relative %, not dB.
  const meter = page.getByRole('meter', { name: 'Noise level' });
  await expect(light(page)).toHaveAttribute('data-zone', 'green');
  await expect(light(page)).toContainText('Quiet');
  await expect(page.locator('.nm-mark-yellow')).toBeVisible();
  await expect(page.locator('.nm-mark-red')).toBeVisible();
  await expect.poll(async () => Number(await meter.getAttribute('aria-valuenow'))).toBeGreaterThan(20);
  await expect(page.locator('.nm-level-value')).toHaveText(/^\d+%$/);
  await expect(page.getByText(/dB/)).toHaveCount(0); // no fake decibel reading
  await expect(light(page)).toHaveCSS('background-color', 'rgb(67, 160, 71)');
  await expect(page.locator('.nm-lamp-green')).toHaveClass(/is-lit/);

  // YELLOW
  await setAmplitude(page, LOUDER);
  await expect(light(page)).toHaveAttribute('data-zone', 'yellow', { timeout: 5000 });
  await expect(light(page)).toContainText('Getting loud');
  await expect(light(page)).toHaveCSS('background-color', 'rgb(246, 201, 69)');
  await expect(page.locator('.nm-lamp-yellow')).toHaveClass(/is-lit/);
  await expect(page.locator('.nm-lamp-green')).not.toHaveClass(/is-lit/);

  // RED
  await setAmplitude(page, LOUDEST);
  await expect(light(page)).toHaveAttribute('data-zone', 'red', { timeout: 5000 });
  await expect(light(page)).toContainText('Too loud!');
  await expect(light(page)).toHaveCSS('background-color', 'rgb(231, 76, 60)');
  await expect(page.locator('.nm-lamp-red')).toHaveClass(/is-lit/);
  await expectNoHorizontalScroll(page);

  // Back to GREEN when the class is quiet again.
  await setAmplitude(page, QUIET);
  await expect(light(page)).toHaveAttribute('data-zone', 'green', { timeout: 8000 });

  // The noise meter never gives or takes stars.
  expect(await starCount(page)).toBe(0);
});

test('one short burst of noise does not turn the light red', async ({ page }, testInfo) => {
  await useMic(page, { amplitude: QUIET });
  await openMeter(page, testInfo);
  await enableAndCalibrate(page, testInfo);
  await page.waitForTimeout(500);

  await setAmplitude(page, LOUDEST);
  await page.waitForTimeout(120);
  await setAmplitude(page, QUIET);
  const zones = [];
  for (let i = 0; i < 30; i++) {
    zones.push(await light(page).getAttribute('data-zone'));
    await page.waitForTimeout(50);
  }
  expect(zones).not.toContain('red');
});

test('Recalibrate runs the calibration again; Stop and leaving release the microphone', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await useMic(page, { amplitude: QUIET });
  await openMeter(page, testInfo);
  await enableAndCalibrate(page, testInfo);
  await expect(page.getByText('Calibration complete!')).toBeHidden({ timeout: 6000 });

  // Recalibrate (same microphone, no new permission request).
  await press(page.getByRole('button', { name: 'Recalibrate' }), testInfo);
  await expect(page.getByRole('heading', { name: 'Calibrate the classroom' })).toBeVisible();
  await expect(page.getByText('Calibration complete!')).toBeVisible({ timeout: 8000 });
  await expect(light(page)).toHaveAttribute('data-zone', 'green');
  expect(await micState(page)).toMatchObject({ requests: 1, liveTracks: 1 });

  // Stop: all tracks stopped, audio context closed.
  await press(page.getByRole('button', { name: 'Stop microphone' }), testInfo);
  await expect(page.getByText('The microphone is off.')).toBeVisible();
  await expect(light(page)).toHaveCount(0);
  await expect.poll(() => micState(page)).toMatchObject({ liveTracks: 0, openContexts: 0 });

  // Enable again works.
  await enableAndCalibrate(page, testInfo);
  expect(await micState(page)).toMatchObject({ requests: 2, liveTracks: 1 });

  // Leaving with the microphone on releases it.
  await goHome(page, testInfo);
  await expect.poll(() => micState(page)).toMatchObject({ liveTracks: 0, openContexts: 0 });
});

test('leaving while the permission prompt is open does not keep the microphone', async ({ page }, testInfo) => {
  await useMic(page, { delayMs: 1200 });
  await openMeter(page, testInfo);
  await press(page.getByRole('button', { name: 'Enable microphone' }), testInfo);
  await expect(page.getByRole('button', { name: 'Waiting for permission…' })).toBeDisabled();
  await goHome(page, testInfo);
  await page.waitForTimeout(1800);
  expect(await micState(page)).toMatchObject({ requests: 1, liveTracks: 0, openContexts: 0 });
});

test('permission denied shows a friendly message and can try again', async ({ page }, testInfo) => {
  await useMic(page, { mode: 'deny' });
  await openMeter(page, testInfo);
  await press(page.getByRole('button', { name: 'Enable microphone' }), testInfo);
  await expect(page.getByRole('alert')).toContainText('Microphone access is blocked');
  await expect(page.getByRole('alert')).toContainText('allow microphone access');
  await expect(light(page)).toHaveCount(0);
  await press(page.getByRole('button', { name: 'Try again' }), testInfo);
  await expect(page.getByRole('alert')).toContainText('Microphone access is blocked');
  expect(await micState(page)).toMatchObject({ requests: 2, tracks: 0 });
  await expectNoHorizontalScroll(page);
});

test('no microphone shows a friendly message', async ({ page }, testInfo) => {
  await useMic(page, { mode: 'no-mic' });
  await openMeter(page, testInfo);
  await press(page.getByRole('button', { name: 'Enable microphone' }), testInfo);
  await expect(page.getByRole('alert')).toContainText('No microphone found');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('unsupported browser shows a friendly message and no Enable button', async ({ page }, testInfo) => {
  await useMic(page, { mode: 'unsupported' });
  await openMeter(page, testInfo);
  await expect(page.getByRole('alert')).toContainText('Microphone not available');
  await expect(page.getByRole('button', { name: 'Enable microphone' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await goHome(page, testInfo);
});

test('Full screen toggles when available, or says it is not available, without errors', async ({ page }, testInfo) => {
  await useMic(page);
  await openMeter(page, testInfo);
  await press(page.getByRole('button', { name: 'Full screen', exact: true }), testInfo);
  // Real browser API: either we are now in full screen, or a friendly note explains why not.
  await expect(
    page.getByRole('button', { name: 'Exit full screen', exact: true }).or(page.getByText('Full screen is not available on this device.'))
  ).toBeVisible();
  if (await page.getByRole('button', { name: 'Exit full screen', exact: true }).isVisible()) {
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await press(page.getByRole('button', { name: 'Exit full screen', exact: true }), testInfo);
    await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  }
});

test('Full screen when the API is missing shows a note, no errors', async ({ page }, testInfo) => {
  await useMic(page, { fullscreen: 'missing' });
  await openMeter(page, testInfo);
  await press(page.getByRole('button', { name: 'Full screen', exact: true }), testInfo);
  await expect(page.getByText('Full screen is not available on this device.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
});

test('layout: big light that fits the screen, buttons reachable, no horizontal scroll', async ({ page }, testInfo) => {
  await useMic(page, { amplitude: QUIET });
  await openMeter(page, testInfo);
  await enableAndCalibrate(page, testInfo);
  const viewport = page.viewportSize();
  const box = await light(page).boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  // The light takes a good part of the screen (projection).
  expect(box.width).toBeGreaterThanOrEqual(Math.min(viewport.width * 0.7, viewport.height * 0.45));
  if (testInfo.project.name !== 'mobile-small') {
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height); // whole light visible
  }
  for (const name of ['Recalibrate', 'Stop microphone', 'Full screen']) {
    const b = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(60);
    expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
  }
  await expectNoHorizontalScroll(page);
});
