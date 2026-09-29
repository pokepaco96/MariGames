import { useState } from 'react';
import { GameProvider } from './context/GameContext.jsx';
import Home from './pages/Home.jsx';
import GamePage from './pages/GamePage.jsx';
import { getGame } from './games/registry.js';

export default function App() {
  const [gameId, setGameId] = useState(null);
  const game = gameId ? getGame(gameId) : null;

  return (
    <GameProvider>
      {game ? (
        <GamePage key={game.id} game={game} onBack={() => setGameId(null)} />
      ) : (
        <Home onSelect={setGameId} />
      )}
    </GameProvider>
  );
}
