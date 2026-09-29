import { colors } from '../../data/colors.js';
import { pickDifferent, pickWithTarget, randomInt } from '../../utils/random.js';

export default {
  id: 'find-color',
  title: 'Colors',
  icon: '🎨',
  color: '#ba68c8',
  makeRound(previous) {
    const target = pickDifferent(colors, previous?.target);
    const prompt = `Find ${target.name}`;
    return {
      target,
      prompt,
      say: prompt,
      options: pickWithTarget(colors, target, randomInt(3, 4)).map((c) => ({
        id: c.id,
        content: <span className="color-blob" style={{ background: c.hex }} />,
        label: c.name,
        say: c.name,
        correct: c === target,
      })),
    };
  },
};
