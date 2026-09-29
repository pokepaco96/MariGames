import { useCallback, useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Feedback from '../components/Feedback.jsx';
import RoundGame from '../components/RoundGame.jsx';
import { useGame } from '../context/GameContext.jsx';
import { successMessages, tryAgainMessages } from '../data/feedback.js';
import { pick } from '../utils/random.js';
import { playSuccess, playTryAgain, speak } from '../utils/sound.js';

export default function GamePage({ game, onBack }) {
  const { addStar } = useGame();
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  const show = useCallback((type, text) => {
    clearTimeout(timer.current);
    setMessage({ type, text, id: Date.now() });
    timer.current = setTimeout(() => setMessage(null), 1400);
  }, []);

  // Returns the praise text. Games with `inlineFeedback` show it themselves
  // instead of the floating message.
  const onCorrect = useCallback(() => {
    const text = pick(successMessages);
    addStar();
    playSuccess();
    setTimeout(() => speak(text), 450);
    if (!game.inlineFeedback) show('success', text);
    return text;
  }, [game, addStar, show]);

  const onTryAgain = useCallback(() => {
    const text = pick(tryAgainMessages);
    playTryAgain();
    setTimeout(() => speak(text), 300);
    show('retry', text);
  }, [show]);

  const Game = game.Component || RoundGame;

  return (
    <div className="page game-page" style={{ '--game': game.color }}>
      <TopBar onBack={onBack} />
      <main className="game-area">
        <Game game={game} onCorrect={onCorrect} onTryAgain={onTryAgain} onBack={onBack} />
      </main>
      <Feedback message={message} />
    </div>
  );
}
