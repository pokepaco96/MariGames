import { useCallback, useEffect, useRef, useState } from 'react';
import SpeakButton from '../../components/SpeakButton.jsx';
import { speak } from '../../utils/sound.js';
import { makeRound } from './round.js';

const NEXT_ROUND_DELAY = 1800;

// Colored cards hide foods. Tap cards to open them until you find the target.
export default function HiddenColors({ onCorrect, onTryAgain }) {
  const [roundsWon, setRoundsWon] = useState(0);
  const [round, setRound] = useState(() => makeRound(null, 0));
  const [opened, setOpened] = useState([]);
  const [solved, setSolved] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => speak(round.prompt), 350);
    return () => clearTimeout(t);
  }, [round]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const open = useCallback(
    (card) => {
      if (solved || opened.includes(card.id)) return;
      setOpened((ids) => [...ids, card.id]);
      if (card.food === round.target) {
        setSolved(true);
        onCorrect();
        timer.current = setTimeout(() => {
          const won = roundsWon + 1;
          setRoundsWon(won);
          setRound(makeRound(round, won));
          setOpened([]);
          setSolved(false);
        }, NEXT_ROUND_DELAY);
      } else {
        onTryAgain();
      }
    },
    [solved, opened, round, roundsWon, onCorrect, onTryAgain]
  );

  return (
    <div className="round">
      <div className="prompt">
        <h1 className="prompt-text">{round.prompt}</h1>
        <SpeakButton text={round.prompt} />
      </div>
      <div className={`hidden-grid hidden-grid-${round.cards.length}`}>
        {round.cards.map((card) => {
          const isOpen = opened.includes(card.id);
          const isTarget = card.food === round.target;
          return (
            <button
              key={`${round.prompt}-${card.id}`}
              type="button"
              className={`hidden-card ${isOpen ? 'is-open' : ''} ${isOpen && isTarget ? 'is-found' : ''}`}
              style={{ '--card-color': card.color }}
              data-item={card.food ? card.food.id : 'empty'}
              aria-label={isOpen ? card.food?.name || 'empty' : 'card'}
              onClick={() => open(card)}
            >
              <span className="hidden-card-inner">
                <span className="hidden-card-front" aria-hidden="true" />
                <span className="hidden-card-back" aria-hidden="true">
                  {card.food?.emoji || ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
