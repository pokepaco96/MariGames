import TopBar from '../components/TopBar.jsx';
import GameCard from '../components/GameCard.jsx';
import { games } from '../games/registry.js';
import { speak } from '../utils/sound.js';
import { APP_NAME } from '../config.js';

// Colorful logo: one span per letter (for the colors), words kept together so it wraps nicely.
function Logo() {
  let i = 0;
  const words = APP_NAME.split(' ');
  return (
    <h1 className="logo">
      {words.map((word, w) => (
        <span key={w}>
          {w > 0 && ' '}
          <span className="logo-word">
            {word.split('').map((ch) => (
              <span key={i} className="logo-letter" style={{ '--i': i++ }}>
                {ch}
              </span>
            ))}
          </span>
        </span>
      ))}
    </h1>
  );
}

export default function Home({ onSelect }) {
  const select = (id) => {
    speak(games.find((g) => g.id === id).title);
    onSelect(id);
  };
  return (
    <div className="page home">
      <TopBar />
      <div className="hero">
        <Logo />
        <p className="tagline">Let's play!</p>
      </div>
      <main className="game-grid">
        {games.map((g) => (
          <GameCard key={g.id} game={g} onSelect={select} />
        ))}
      </main>
    </div>
  );
}
