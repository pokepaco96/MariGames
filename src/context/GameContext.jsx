import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setSoundEnabled } from '../utils/sound.js';

// Shared state for all games: stars and sound on/off.
// Stars live in memory only (they reset on reload) in this first version.
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [stars, setStars] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  const addStar = useCallback(() => setStars((s) => s + 1), []);
  const toggleSound = useCallback(() => setSoundOn((s) => !s), []);

  const value = useMemo(
    () => ({ stars, addStar, soundOn, toggleSound }),
    [stars, addStar, soundOn, toggleSound]
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  return useContext(GameContext);
}
