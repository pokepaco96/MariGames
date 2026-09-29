export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
