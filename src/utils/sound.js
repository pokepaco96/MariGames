// Tiny sound layer:
// - effects are generated tones (Web Audio API), so there are no audio files or licenses;
// - words and instructions use the browser's built-in Speech Synthesis.
// To use recorded audio later, put files in src/assets/audio and play them from speak().

let enabled = true;
let ctx = null;

export function setSoundEnabled(value) {
  enabled = value;
  if (!value && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, duration, volume = 0.12, type = 'sine') {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export function playSuccess() {
  if (!enabled) return;
  tone(523, 0, 0.18);
  tone(659, 0.12, 0.18);
  tone(784, 0.24, 0.3);
}

export function playTryAgain() {
  if (!enabled) return;
  tone(392, 0, 0.2, 0.07, 'triangle');
  tone(349, 0.15, 0.25, 0.07, 'triangle');
}

function englishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => /^en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
}

export function speak(text) {
  if (!enabled || !text || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  u.pitch = 1.15;
  const voice = englishVoice();
  if (voice) u.voice = voice;
  synth.speak(u);
}
