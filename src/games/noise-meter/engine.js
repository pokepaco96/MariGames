// Pure noise-meter logic (no browser APIs, easy to test).
//
// The microphone gives an RMS amplitude (0..1). We turn it into a RELATIVE
// noise level 0..100 (a log scale, so it follows how loud things feel).
// It is not a calibrated decibel meter: the same room reads differently on
// different devices, so zones are always set relative to a calibrated baseline.

export const ZONES = ['green', 'yellow', 'red'];

// Level scale: -80 dBFS (near silence) .. -10 dBFS (very loud) -> 0..100.
const MIN_DBFS = -80;
const MAX_DBFS = -10;
const POINTS_PER_DB = 100 / (MAX_DBFS - MIN_DBFS);

// Above the quiet baseline: "getting loud" at +12 dB, "too loud" at +22 dB.
export const YELLOW_MARGIN = 12 * POINTS_PER_DB;
export const RED_MARGIN = 22 * POINTS_PER_DB;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Root mean square of time-domain samples (-1..1).
export function rms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / samples.length);
}

// RMS amplitude -> relative level 0..100.
export function levelFromRms(value) {
  if (!(value > 0)) return 0;
  const dbfs = 20 * Math.log10(value);
  return clamp((dbfs - MIN_DBFS) * POINTS_PER_DB, 0, 100);
}

// Quiet baseline from calibration levels: the median ignores a cough or a door.
export function baselineFrom(levels) {
  if (!levels.length) return 0;
  const sorted = [...levels].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Zone thresholds for a baseline. Capped so red is always reachable,
// even if calibration happened in a noisy room.
export function thresholdsFor(baseline) {
  const red = Math.min(baseline + RED_MARGIN, 92);
  const yellow = Math.min(baseline + YELLOW_MARGIN, red - 8);
  return { yellow, red };
}

// Zone for a smoothed level, with hysteresis: going up needs the threshold,
// going down needs to drop `hysteresis` points below it (no flicker at the edge).
export function zoneFor(level, current, { yellow, red }, hysteresis) {
  const redLine = current === 'red' ? red - hysteresis : red;
  const yellowLine = current === 'green' ? yellow : yellow - hysteresis;
  if (level >= redLine) return 'red';
  if (level >= yellowLine) return 'yellow';
  return 'green';
}

// Stateful monitor: exponential smoothing + hysteresis + hold times.
// A new zone must last `upHoldMs` (louder) or `downHoldMs` (quieter) before it shows,
// so one clap does not turn the light red and it does not blink back and forth.
// `update(rawLevel, timeMs)` returns { level, zone }.
export function createNoiseMonitor(
  thresholds,
  { alpha = 0.2, hysteresis = 4, upHoldMs = 400, downHoldMs = 1200 } = {}
) {
  let level = null;
  let zone = 'green';
  let candidate = null;
  let candidateSince = 0;

  return {
    update(raw, time) {
      level = level === null ? raw : level + alpha * (raw - level);
      const target = zoneFor(level, zone, thresholds, hysteresis);
      if (target === zone) {
        candidate = null;
      } else {
        if (target !== candidate) {
          candidate = target;
          candidateSince = time;
        }
        const louder = ZONES.indexOf(target) > ZONES.indexOf(zone);
        if (time - candidateSince >= (louder ? upHoldMs : downHoldMs)) {
          zone = target;
          candidate = null;
        }
      }
      return { level, zone };
    },
  };
}
