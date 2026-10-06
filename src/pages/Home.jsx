import TopBar from '../components/TopBar.jsx';
import GameCard from '../components/GameCard.jsx';
import ToolCard from '../components/ToolCard.jsx';
import { games, getGame, tools } from '../games/registry.js';
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
    speak(getGame(id).title);
    onSelect(id);
  };
  return (
    <div className="page home">
      <TopBar />
      <div className="hero">
        <Logo />
        <p className="tagline">Let's play!</p>
      </div>
      <main>
        {tools.length > 0 && (
          <section className="home-section tools-section" aria-labelledby="tools-title">
            <h2 className="section-title" id="tools-title">
              <span aria-hidden="true">🍎</span> Teacher Tools
            </h2>
            <div className="tools-grid">
              {tools.map((t) => (
                <ToolCard key={t.id} tool={t} onSelect={select} />
              ))}
            </div>
          </section>
        )}
        <section className="home-section games-section" aria-labelledby="games-title">
          <h2 className="section-title" id="games-title">
            <span aria-hidden="true">🎈</span> Games
          </h2>
          <div className="game-grid">
            {games.map((g) => (
              <GameCard key={g.id} game={g} onSelect={select} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
