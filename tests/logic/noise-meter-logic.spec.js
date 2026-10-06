// Pure noise-meter logic: deterministic, no microphone needed.
import { test, expect } from '@playwright/test';
import {
  rms, levelFromRms, baselineFrom, thresholdsFor, zoneFor, createNoiseMonitor, YELLOW_MARGIN, RED_MARGIN,
} from '../../src/games/noise-meter/engine.js';

const LIMITS = { yellow: 50, red: 70 };

// Feed a constant level for `ms` milliseconds at 50 ms ticks; returns the zones seen.
function feed(monitor, level, ms, clock) {
  const zones = [];
  for (let t = 0; t < ms; t += 50) {
    clock.now += 50;
    zones.push(monitor.update(level, clock.now).zone);
  }
  return zones;
}

test('rms and relative level (0..100, log scale, never NaN)', () => {
  expect(rms([])).toBe(0);
  expect(rms([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5);
  expect(levelFromRms(0)).toBe(0);
  expect(levelFromRms(-1)).toBe(0);
  expect(levelFromRms(NaN)).toBe(0);
  expect(levelFromRms(1)).toBe(100);
  expect(levelFromRms(10 ** (-10 / 20))).toBeCloseTo(100); // -10 dBFS = top of scale
  expect(levelFromRms(10 ** (-80 / 20))).toBeCloseTo(0); // -80 dBFS = bottom
  expect(levelFromRms(10 ** (-45 / 20))).toBeCloseTo(50); // middle
  // 10x louder amplitude (+20 dB) always adds the same amount.
  expect(levelFromRms(0.01) - levelFromRms(0.001)).toBeCloseTo(levelFromRms(0.1) - levelFromRms(0.01));
});

test('calibration baseline is the median (one loud moment does not move it)', () => {
  expect(baselineFrom([])).toBe(0);
  expect(baselineFrom([30, 31, 29, 90, 30])).toBe(30);
  expect(baselineFrom([10, 20, 30, 40])).toBe(25);
});

test('thresholds sit above the baseline and stay reachable in a noisy room', () => {
  expect(thresholdsFor(30)).toEqual({ yellow: 30 + YELLOW_MARGIN, red: 30 + RED_MARGIN });
  const noisy = thresholdsFor(85);
  expect(noisy.red).toBeLessThanOrEqual(92);
  expect(noisy.yellow).toBeLessThan(noisy.red);
  const silent = thresholdsFor(0);
  expect(silent.yellow).toBeGreaterThan(0);
});

test('zoneFor: GREEN / YELLOW / RED with hysteresis when going down', () => {
  // Going up uses the thresholds.
  expect(zoneFor(49, 'green', LIMITS, 4)).toBe('green');
  expect(zoneFor(50, 'green', LIMITS, 4)).toBe('yellow');
  expect(zoneFor(70, 'green', LIMITS, 4)).toBe('red');
  expect(zoneFor(70, 'yellow', LIMITS, 4)).toBe('red');
  // Going down needs to drop 4 points below.
  expect(zoneFor(47, 'yellow', LIMITS, 4)).toBe('yellow');
  expect(zoneFor(45.9, 'yellow', LIMITS, 4)).toBe('green');
  expect(zoneFor(67, 'red', LIMITS, 4)).toBe('red');
  expect(zoneFor(65.9, 'red', LIMITS, 4)).toBe('yellow');
  expect(zoneFor(40, 'red', LIMITS, 4)).toBe('green');
});

test('monitor: steady noise changes the zone after the hold time', () => {
  const clock = { now: 0 };
  const m = createNoiseMonitor(LIMITS);
  expect(feed(m, 30, 1000, clock).at(-1)).toBe('green');
  expect(feed(m, 60, 2000, clock).at(-1)).toBe('yellow');
  expect(feed(m, 85, 2000, clock).at(-1)).toBe('red');
  expect(feed(m, 30, 4000, clock).at(-1)).toBe('green');
});

test('monitor: one short peak (a clap) does not turn the light red', () => {
  const clock = { now: 0 };
  const m = createNoiseMonitor(LIMITS);
  feed(m, 30, 1000, clock);
  const zones = [...feed(m, 95, 150, clock), ...feed(m, 30, 2000, clock)];
  expect(zones).not.toContain('red');
  expect(zones.at(-1)).toBe('green');
});

test('monitor: levels around a threshold do not make the light flicker', () => {
  const clock = { now: 0 };
  const m = createNoiseMonitor(LIMITS);
  feed(m, 60, 2000, clock); // yellow
  // Wobble between 48 and 52 (around the yellow line) for 5 s.
  const zones = [];
  for (let i = 0; i < 100; i++) {
    clock.now += 50;
    zones.push(m.update(i % 2 ? 48 : 52, clock.now).zone);
  }
  expect(new Set(zones)).toEqual(new Set(['yellow']));
});

test('monitor: smoothing follows the level gradually', () => {
  const clock = { now: 0 };
  const m = createNoiseMonitor(LIMITS);
  clock.now += 50;
  expect(m.update(20, clock.now).level).toBe(20); // starts at the first reading
  clock.now += 50;
  const next = m.update(80, clock.now).level;
  expect(next).toBeGreaterThan(20);
  expect(next).toBeLessThan(40); // not jumping straight to 80
  feed(m, 80, 2000, clock);
  clock.now += 50;
  expect(m.update(80, clock.now).level).toBeCloseTo(80, 0);
});

test('monitor: going quieter waits longer than going louder (calm, stable light)', () => {
  const clock = { now: 0 };
  const m = createNoiseMonitor(LIMITS);
  feed(m, 30, 500, clock);
  const up = feed(m, 85, 2000, clock);
  const down = feed(m, 30, 4000, clock);
  const firstRed = up.indexOf('red');
  const firstGreen = down.indexOf('green');
  expect(firstRed).toBeGreaterThan(0);
  expect(firstGreen).toBeGreaterThan(firstRed);
});
