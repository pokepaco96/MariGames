import { useEffect, useState } from 'react';
import ItemIcon from '../../components/ItemIcon.jsx';
import SpeakButton from '../../components/SpeakButton.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { speak } from '../../utils/sound.js';
import { makeGame } from './engine.js';

// Shared Hidden Colors game (see createHiddenColorsGame.js for categories).
// 12 colored tiles, one hides the round's item. Tapped tiles disappear until it is found.
// Then the round waits (no timer) until the child taps the big → button.
// One round per item, then a "Play again" screen.
export default function HiddenColors({ game, onCorrect, onBack }) {
  const { prompt, items } = game;
  const { stars } = useGame();
  const [rounds, setRounds] = useState(() => makeGame(items));
  const [roundIndex, setRoundIndex] = useState(0);
  const [opened, setOpened] = useState([]);
  const [praise, setPraise] = useState(null); // set = round completed, waiting for →
  const [startStars, setStartStars] = useState(stars);

  const finished = roundIndex >= rounds.length;
  const round = rounds[roundIndex];
  const roundCompleted = praise !== null;

  useEffect(() => {
    const text = finished ? 'Great job! You found them all!' : prompt;
    const t = setTimeout(() => speak(text), finished ? 900 : 350);
    return () => clearTimeout(t);
  }, [roundIndex, rounds, finished, prompt]);

  const open = (tile) => {
    if (roundCompleted || opened.includes(tile.id)) return;
    setOpened((ids) => [...ids, tile.id]);
    if (tile.id === round.itemTile) setPraise(onCorrect());
  };

  const next = () => {
    setRoundIndex((i) => i + 1);
    setOpened([]);
    setPraise(null);
  };

  const playAgain = () => {
    setRounds(makeGame(items));
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
          <h1 className="prompt-text">{prompt}</h1>
          <SpeakButton text={prompt} />
        </div>
      )}
      <div className="hc-progress" aria-label={`Round ${roundIndex + 1} of ${rounds.length}`}>
        {roundIndex + 1} / {rounds.length}
      </div>
      <div className={`hc-grid ${roundCompleted ? 'is-locked' : ''}`}>
        {round.tiles.map((tile) => {
          const isOpen = opened.includes(tile.id);
          const hasItem = tile.id === round.itemTile;
          return (
            <button
              key={`${roundIndex}-${tile.id}`}
              type="button"
              className={`hc-tile ${isOpen ? 'is-open' : ''} ${isOpen && hasItem ? 'is-found' : ''}`}
              style={{ '--tile': tile.color.hex }}
              data-color={tile.color.name}
              data-item={hasItem ? round.item.id : 'empty'}
              aria-label={isOpen ? (hasItem ? round.item.name : 'empty') : tile.color.name}
              aria-disabled={isOpen || roundCompleted}
              onClick={() => open(tile)}
            >
              <span className="hc-cover" aria-hidden="true" />
              {isOpen && hasItem && (
                <span className="hc-item" aria-hidden="true">
                  <ItemIcon item={round.item} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
