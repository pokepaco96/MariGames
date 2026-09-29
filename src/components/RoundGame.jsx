import { useCallback, useEffect, useRef, useState } from 'react';
import ChoiceButton from './ChoiceButton.jsx';
import SpeakButton from './SpeakButton.jsx';
import { speak } from '../utils/sound.js';

const NEXT_ROUND_DELAY = 1600;

// Plays a "question + few big choices" game, one round after another.
// A round (from game.makeRound) looks like:
//   {
//     prompt: 'Find the dog',     // short text shown on screen
//     say: 'Find the dog',        // spoken instruction
//     scene: <div/>,              // optional picture above the choices
//     optionStyle: 'number',      // optional visual style for the choices
//     options: [{ id, content, label, say, correct }],
//   }
export default function RoundGame({ game, onCorrect, onTryAgain }) {
  const [round, setRound] = useState(() => game.makeRound(null));
  const [wrongIds, setWrongIds] = useState([]);
  const [solvedId, setSolvedId] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => speak(round.say), 350);
    return () => clearTimeout(t);
  }, [round]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = useCallback(
    (option) => {
      if (solvedId) return;
      if (option.correct) {
        setSolvedId(option.id);
        onCorrect();
        timer.current = setTimeout(() => {
          setRound((prev) => game.makeRound(prev));
          setWrongIds([]);
          setSolvedId(null);
        }, NEXT_ROUND_DELAY);
      } else {
        setWrongIds((ids) => [...ids, option.id]);
        onTryAgain();
      }
    },
    [game, solvedId, onCorrect, onTryAgain]
  );

  return (
    <div className="round">
      <div className="prompt">
        <h1 className="prompt-text">{round.prompt}</h1>
        <SpeakButton text={round.say} />
      </div>
      {round.scene}
      <div className={`choices choices-${round.options.length}`}>
        {round.options.map((o) => (
          <ChoiceButton
            key={`${round.prompt}-${o.id}`}
            option={o}
            variant={round.optionStyle}
            state={solvedId === o.id ? 'correct' : wrongIds.includes(o.id) ? 'wrong' : solvedId ? 'faded' : 'idle'}
            onChoose={choose}
          />
        ))}
      </div>
    </div>
  );
}
