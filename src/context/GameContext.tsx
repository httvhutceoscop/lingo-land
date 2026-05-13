import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CATEGORIES, nextSubGroupId } from '../data/gameData';

type GameContextValue = {
  score: number;
  streak: number;
  unlockedSubGroups: string[];
  passedSubGroups: string[];
  isUnlocked: (subGroupId: string) => boolean;
  isPassed: (subGroupId: string) => boolean;
  addScore: (delta: number) => void;
  unlockNext: (currentSubGroupId: string) => void;
  markPassed: (subGroupId: string) => void;
};

const STORAGE_UNLOCKED = 'lingoland_subgroups_v2';
const STORAGE_PASSED = 'lingoland_passed_v2';
const LEGACY_KEY = 'lingoland_levels';

const GameContext = createContext<GameContextValue | null>(null);

const defaultUnlocked = (): string[] =>
  CATEGORIES.map((c) => c.subGroups[0]?.id).filter((id): id is string => Boolean(id));

const loadStringArray = (key: string, fallback: () => string[]): string[] => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return fallback();
};

const loadUnlocked = (): string[] => {
  if (localStorage.getItem(LEGACY_KEY) !== null) {
    localStorage.removeItem(LEGACY_KEY);
  }
  return loadStringArray(STORAGE_UNLOCKED, defaultUnlocked);
};

const loadPassed = (): string[] => loadStringArray(STORAGE_PASSED, () => []);

export function GameProvider({ children }: { children: ReactNode }) {
  const [score, setScore] = useState<number>(
    () => parseInt(localStorage.getItem('lingoland_score') ?? '', 10) || 0
  );
  const [streak] = useState<number>(
    () => parseInt(localStorage.getItem('lingoland_streak') ?? '', 10) || 5
  );
  const [unlockedSubGroups, setUnlockedSubGroups] = useState<string[]>(loadUnlocked);
  const [passedSubGroups, setPassedSubGroups] = useState<string[]>(loadPassed);

  useEffect(() => {
    localStorage.setItem('lingoland_score', String(score));
  }, [score]);

  useEffect(() => {
    localStorage.setItem(STORAGE_UNLOCKED, JSON.stringify(unlockedSubGroups));
  }, [unlockedSubGroups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PASSED, JSON.stringify(passedSubGroups));
  }, [passedSubGroups]);

  const addScore = (delta: number) => setScore((s) => s + delta);

  const isUnlocked = (id: string) => unlockedSubGroups.includes(id);
  const isPassed = (id: string) => passedSubGroups.includes(id);

  const unlockNext = (currentId: string) => {
    const next = nextSubGroupId(currentId);
    if (!next) return;
    setUnlockedSubGroups((arr) => (arr.includes(next) ? arr : [...arr, next]));
  };

  const markPassed = (id: string) => {
    setPassedSubGroups((arr) => (arr.includes(id) ? arr : [...arr, id]));
  };

  return (
    <GameContext.Provider
      value={{
        score,
        streak,
        unlockedSubGroups,
        passedSubGroups,
        isUnlocked,
        isPassed,
        addScore,
        unlockNext,
        markPassed,
      }}
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
