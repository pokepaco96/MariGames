import { animals } from '../../data/animals.js';
import { pick, pickDifferent, pickWithTarget, randomInt } from '../../utils/random.js';

const questions = [(a) => `Find the ${a}`, (a) => `Where is the ${a}?`];

export default {
  id: 'find-animal',
  title: 'Animals',
  icon: '🐶',
  color: '#81c784',
  makeRound(previous) {
    const target = pickDifferent(animals, previous?.target);
    const prompt = pick(questions)(target.name);
    return {
      target,
      prompt,
      say: prompt,
      options: pickWithTarget(animals, target, randomInt(3, 4)).map((a) => ({
        id: a.id,
        content: <span className="emoji-choice">{a.emoji}</span>,
        label: a.name,
        say: a.name,
        correct: a === target,
      })),
    };
  },
};
