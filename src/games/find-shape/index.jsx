import { shapes } from '../../data/shapes.js';
import ShapeIcon from '../../components/ShapeIcon.jsx';
import { pickDifferent, pickWithTarget } from '../../utils/random.js';

export default {
  id: 'find-shape',
  title: 'Shapes',
  icon: '⭐',
  color: '#64b5f6',
  makeRound(previous) {
    const target = pickDifferent(shapes, previous?.target);
    const prompt = `Find the ${target.name}`;
    return {
      target,
      prompt,
      say: prompt,
      options: pickWithTarget(shapes, target, 3).map((s) => ({
        id: s.id,
        content: <ShapeIcon shape={s} />,
        label: s.name,
        say: s.name,
        correct: s === target,
      })),
    };
  },
};
