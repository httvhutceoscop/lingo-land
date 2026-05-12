import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type GameContextValue = {
  score: number;
  streak: number;
  unlockedLevels: number[];
  addScore: (delta: number) => void;
  unlockLevel: (id: number) => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState<number>(
    () => parseInt(localStorage.getItem('lingoland_score') ?? '', 10) || 0
  );
  const [streak] = useState<number>(
    () => parseInt(localStorage.getItem('lingoland_streak') ?? '', 10) || 5
  );
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>(
    () => JSON.parse(localStorage.getItem('lingoland_levels') ?? 'null') || [1]
  );

  useEffect(() => {
    localStorage.setItem('lingoland_score', String(score));
  }, [score]);

  useEffect(() => {
    localStorage.setItem('lingoland_levels', JSON.stringify(unlockedLevels));
  }, [unlockedLevels]);

  const addScore = (delta: number) => setScore((s) => s + delta);
  const unlockLevel = (id: number) =>
    setUnlockedLevels((arr) => (arr.includes(id) ? arr : [...arr, id]));

  return (
    <GameContext.Provider
      value={{ score, streak, unlockedLevels, addScore, unlockLevel }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};
