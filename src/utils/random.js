export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// `rng` returns a number in [0, 1); pass seededRandom(seed) for repeatable results (tests).
export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick `count` distinct items that always include `target`, in random order.
export function pickWithTarget(list, target, count) {
  const others = shuffle(list.filter((x) => x !== target)).slice(0, count - 1);
  return shuffle([target, ...others]);
}

// Pick a random item, avoiding `previous` so rounds don't repeat.
export function pickDifferent(list, previous) {
  const options = list.filter((x) => x !== previous);
  return pick(options.length ? options : list);
}

// Small deterministic random generator (mulberry32), same interface as Math.random.
export function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
