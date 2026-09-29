import { fruits } from '../../data/fruits.js';
import { pickDifferent, pickWithTarget } from '../../utils/random.js';

export default {
  id: 'find-fruit',
  title: 'Fruits',
  icon: '🍎',
  color: '#ffd54f',
  makeRound(previous) {
    const target = pickDifferent(fruits, previous?.target);
    const prompt = `Find the ${target.name}`;
    return {
      target,
      prompt,
      say: prompt,
      options: pickWithTarget(fruits, target, 3).map((f) => ({
        id: f.id,
        content: <span className="emoji-choice">{f.emoji}</span>,
        label: f.name,
        say: f.name,
        correct: f === target,
      })),
    };
  },
};
