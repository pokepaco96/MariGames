import { useGame } from '../context/GameContext.jsx';
import { speak } from '../utils/sound.js';

// Big "listen again" button next to each instruction.
export default function SpeakButton({ text }) {
  const { soundOn } = useGame();
  if (!soundOn) return null;
  return (
    <button type="button" className="speak-btn" aria-label="Listen" onClick={() => speak(text)}>
      👂
    </button>
  );
}
