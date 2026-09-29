import { useGame } from '../context/GameContext.jsx';

export default function TopBar({ onBack }) {
  const { stars, soundOn, toggleSound } = useGame();
  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="icon-btn back-btn" onClick={onBack} aria-label="Home">
          <span aria-hidden="true">🏠</span>
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <div className="stars" aria-label={`${stars} stars`}>
        <span aria-hidden="true">⭐</span> {stars}
      </div>
      <button
        type="button"
        className={`icon-btn sound-btn ${soundOn ? '' : 'is-off'}`}
        onClick={toggleSound}
        aria-label={soundOn ? 'Sound off' : 'Sound on'}
        aria-pressed={soundOn}
      >
        <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
      </button>
    </header>
  );
}
