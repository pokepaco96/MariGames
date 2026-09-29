import { animals } from '../../data/animals.js';
import { pickDifferent, randomInt, shuffle } from '../../utils/random.js';

const MAX = 5;

// Three answers around the correct count, all between 1 and 5.
function answerChoices(count) {
  const others = shuffle([1, 2, 3, 4, 5].filter((n) => n !== count))
    .sort((a, b) => Math.abs(a - count) - Math.abs(b - count))
    .slice(0, 2);
  return [count, ...others].sort((a, b) => a - b);
}

export default {
  id: 'count-animals',
  title: 'Count',
  icon: '🐱🐱🐱',
  color: '#ff8a65',
  makeRound(previous) {
    const animal = pickDifferent(animals, previous?.animal);
    const count = randomInt(1, MAX);
    const prompt = `How many ${animal.plural}?`;
    return {
      animal,
      prompt,
      say: prompt,
      scene: (
        <div className="scene" aria-label={`${count} ${count === 1 ? animal.name : animal.plural}`}>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className="scene-item" style={{ animationDelay: `${i * 0.12}s` }}>
              {animal.emoji}
            </span>
          ))}
        </div>
      ),
      optionStyle: 'number',
      options: answerChoices(count).map((n) => ({
        id: String(n),
        content: n,
        label: String(n),
        say: String(n),
        correct: n === count,
      })),
    };
  },
};
