import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CATEGORIES, nextSubGroupId } from '../data/gameData';

type GameContextValue = {
  score: number;
  streak: number;
  unlockedSubGroups: string[];
  isUnlocked: (subGroupId: string) => boolean;
  addScore: (delta: number) => void;
  unlockNext: (currentSubGroupId: string) => void;
};

const STORAGE_KEY = 'lingoland_subgroups_v2';
const LEGACY_KEY = 'lingoland_levels';

const GameContext = createContext<GameContextValue | null>(null);

const defaultUnlocked = (): string[] =>
  CATEGORIES.map((c) => c.subGroups[0]?.id).filter((id): id is string => Boolean(id));

const loadUnlocked = (): string[] => {
  if (localStorage.getItem(LEGACY_KEY) !== null) {
    localStorage.removeItem(LEGACY_KEY);
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultUnlocked();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return defaultUnlocked();
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState<number>(
    () => parseInt(localStorage.getItem('lingoland_score') ?? '', 10) || 0
  );
  const [streak] = useState<number>(
    () => parseInt(localStorage.getItem('lingoland_streak') ?? '', 10) || 5
  );
  const [unlockedSubGroups, setUnlockedSubGroups] = useState<string[]>(loadUnlocked);

  useEffect(() => {
    localStorage.setItem('lingoland_score', String(score));
  }, [score]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedSubGroups));
  }, [unlockedSubGroups]);

  const addScore = (delta: number) => setScore((s) => s + delta);

  const isUnlocked = (id: string) => unlockedSubGroups.includes(id);

  const unlockNext = (currentId: string) => {
    const next = nextSubGroupId(currentId);
    if (!next) return;
    setUnlockedSubGroups((arr) => (arr.includes(next) ? arr : [...arr, next]));
  };

  return (
    <GameContext.Provider
      value={{ score, streak, unlockedSubGroups, isUnlocked, addScore, unlockNext }}
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
