import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CATEGORIES, nextSubGroupId } from '../data/gameData';
import { DEFAULT_PET_NAME, PET_NAME_MAX } from '../data/petData';

type GameContextValue = {
  score: number;
  streak: number;
  unlockedSubGroups: string[];
  passedSubGroups: string[];
  petName: string;
  timeHighScore: number;
  isUnlocked: (subGroupId: string) => boolean;
  isPassed: (subGroupId: string) => boolean;
  addScore: (delta: number) => void;
  unlockNext: (currentSubGroupId: string) => void;
  markPassed: (subGroupId: string) => void;
  setPetName: (name: string) => void;
  submitTimeScore: (score: number) => boolean;
};

const STORAGE_UNLOCKED = 'lingoland_subgroups_v2';
const STORAGE_PASSED = 'lingoland_passed_v2';
const STORAGE_PET_NAME = 'lingoland_pet_name';
const STORAGE_TIME_HS = 'lingoland_time_hs';
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
  const [petName, setPetNameState] = useState<string>(
    () => localStorage.getItem(STORAGE_PET_NAME) || DEFAULT_PET_NAME
  );
  const [timeHighScore, setTimeHighScore] = useState<number>(
    () => parseInt(localStorage.getItem(STORAGE_TIME_HS) ?? '', 10) || 0
  );

  useEffect(() => {
    localStorage.setItem('lingoland_score', String(score));
  }, [score]);

  useEffect(() => {
    localStorage.setItem(STORAGE_UNLOCKED, JSON.stringify(unlockedSubGroups));
  }, [unlockedSubGroups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PASSED, JSON.stringify(passedSubGroups));
  }, [passedSubGroups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PET_NAME, petName);
  }, [petName]);

  useEffect(() => {
    localStorage.setItem(STORAGE_TIME_HS, String(timeHighScore));
  }, [timeHighScore]);

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

  const setPetName = (name: string) => {
    const cleaned = name.trim().slice(0, PET_NAME_MAX);
    setPetNameState(cleaned || DEFAULT_PET_NAME);
  };

  const submitTimeScore = (newScore: number): boolean => {
    if (newScore > timeHighScore) {
      setTimeHighScore(newScore);
      return true;
    }
    return false;
  };

  return (
    <GameContext.Provider
      value={{
        score,
        streak,
        unlockedSubGroups,
        passedSubGroups,
        petName,
        timeHighScore,
        isUnlocked,
        isPassed,
        addScore,
        unlockNext,
        markPassed,
        setPetName,
        submitTimeScore,
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
