import { foods } from '../../data/foods.js';
import { pickDifferent, shuffle } from '../../utils/random.js';

const MAIN_COLORS = ['#E74C3C', '#F39C12', '#4A90E2', '#E83E8C', '#4CAF50', '#F6C945'];
const SOFT_COLORS = ['#F36A73', '#A4D4C9', '#8AB0D1', '#90B1CD', '#FD8AAB', '#F8A350'];

// Easy: 6 cards for the first rounds, then medium: 8 cards (never more).
const EASY_ROUNDS = 3;
const levels = {
  easy: { cards: 6, decoys: 2 },
  medium: { cards: 8, decoys: 3 },
};

function cardColors(count) {
  return [...shuffle(MAIN_COLORS), ...shuffle(SOFT_COLORS)].slice(0, count);
}

// Returns { target, prompt, cards: [{ id, color, food|null }] }.
// One card hides the target, a few hide other foods, the rest are empty.
export function makeRound(previous, roundsWon) {
  const level = roundsWon < EASY_ROUNDS ? levels.easy : levels.medium;
  const target = pickDifferent(foods, previous?.target);
  const decoys = shuffle(foods.filter((f) => f !== target)).slice(0, level.decoys);
  const hidden = [target, ...decoys];
  while (hidden.length < level.cards) hidden.push(null);

  const colors = cardColors(level.cards);
  return {
    target,
    prompt: `Find the ${target.name}`,
    cards: shuffle(hidden).map((food, i) => ({ id: i, color: colors[i], food })),
  };
}
