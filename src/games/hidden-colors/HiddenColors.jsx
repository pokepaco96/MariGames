import { useEffect, useState } from 'react';
import SpeakButton from '../../components/SpeakButton.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { speak } from '../../utils/sound.js';
import { PROMPT, makeGame } from './game.js';

// 12 colored tiles, one hides a food. Tapped tiles disappear until the food is found.
// Then the round waits (no timer) until the child taps the big → button.
// 11 rounds (one per food), then a "Play again" screen.
export default function HiddenColors({ onCorrect, onBack }) {
  const { stars } = useGame();
  const [rounds, setRounds] = useState(() => makeGame());
  const [roundIndex, setRoundIndex] = useState(0);
  const [opened, setOpened] = useState([]);
  const [praise, setPraise] = useState(null); // set = round completed, waiting for →
  const [startStars, setStartStars] = useState(stars);

  const finished = roundIndex >= rounds.length;
  const round = rounds[roundIndex];
  const roundCompleted = praise !== null;

  useEffect(() => {
    const text = finished ? 'Great job! You found them all!' : PROMPT;
    const t = setTimeout(() => speak(text), finished ? 900 : 350);
    return () => clearTimeout(t);
  }, [roundIndex, rounds, finished]);

  const open = (tile) => {
    if (roundCompleted || opened.includes(tile.id)) return;
    setOpened((ids) => [...ids, tile.id]);
    if (tile.id === round.foodTile) setPraise(onCorrect());
  };

  const next = () => {
    setRoundIndex((i) => i + 1);
    setOpened([]);
    setPraise(null);
  };

  const playAgain = () => {
    setRounds(makeGame());
    setRoundIndex(0);
    setStartStars(stars);
  };

  if (finished) {
    return (
      <div className="round hc-end">
        <div className="hc-end-card">
          <div className="hc-end-emoji" aria-hidden="true">🎉</div>
          <h1 className="hc-end-title">Great job!</h1>
          <p className="hc-end-text">You found them all!</p>
          <div className="hc-end-stars" aria-label={`${stars - startStars} stars`}>
            <span aria-hidden="true">⭐</span> {stars - startStars}
          </div>
          <div className="hc-end-buttons">
            <button type="button" className="big-btn big-btn-play" onClick={playAgain}>
              <span aria-hidden="true">🔄</span> Play again
            </button>
            <button type="button" className="big-btn big-btn-home" onClick={onBack}>
              <span aria-hidden="true">🏠</span> Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="round hc-round">
      {roundCompleted ? (
        <div className="prompt hc-done">
          <div className="hc-done-text" role="status">
            <span aria-hidden="true">⭐</span> {praise}
          </div>
          <button type="button" className="hc-next" aria-label="Continue" onClick={next}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="prompt">
          <h1 className="prompt-text">{PROMPT}</h1>
          <SpeakButton text={PROMPT} />
        </div>
      )}
      <div className="hc-progress" aria-label={`Round ${roundIndex + 1} of ${rounds.length}`}>
        {roundIndex + 1} / {rounds.length}
      </div>
      <div className={`hc-grid ${roundCompleted ? 'is-locked' : ''}`}>
        {round.tiles.map((tile) => {
          const isOpen = opened.includes(tile.id);
          const hasFood = tile.id === round.foodTile;
          return (
            <button
              key={`${roundIndex}-${tile.id}`}
              type="button"
              className={`hc-tile ${isOpen ? 'is-open' : ''} ${isOpen && hasFood ? 'is-found' : ''}`}
              style={{ '--tile': tile.color.hex }}
              data-color={tile.color.name}
              data-food={hasFood ? round.food.id : 'empty'}
              aria-label={isOpen ? (hasFood ? round.food.name : 'empty') : tile.color.name}
              aria-disabled={isOpen || roundCompleted}
              onClick={() => open(tile)}
            >
              <span className="hc-cover" aria-hidden="true" />
              {isOpen && hasFood && (
                <span className="hc-food" aria-hidden="true">
                  {round.food.emoji}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
