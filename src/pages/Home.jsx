import TopBar from '../components/TopBar.jsx';
import GameCard from '../components/GameCard.jsx';
import { games } from '../games/registry.js';
import { speak } from '../utils/sound.js';

export default function Home({ onSelect }) {
  const select = (id) => {
    speak(games.find((g) => g.id === id).title);
    onSelect(id);
  };
  return (
    <div className="page home">
      <TopBar />
      <div className="hero">
        <h1 className="logo">
          {'MariGames'.split('').map((ch, i) => (
            <span key={i} style={{ '--i': i }}>{ch}</span>
          ))}
        </h1>
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
