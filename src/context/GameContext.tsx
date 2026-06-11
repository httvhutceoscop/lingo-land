import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ALL_WORDS, CATEGORIES, nextSubGroupId, type Word } from '../data/gameData';
import { DEFAULT_PET_NAME, PET_NAME_MAX } from '../data/petData';
import { DAILY_CAP, isDue, nextLevel, type WordStats } from '../data/srsData';
import { prevMathLevelId } from '../data/mathData';
import { prevVietLessonId } from '../data/vietData';

type GameContextValue = {
  score: number;
  streak: number;
  unlockedSubGroups: string[];
  passedSubGroups: string[];
  petName: string;
  timeHighScore: number;
  wordStats: WordStats;
  dueDeck: Word[];
  mathPassed: string[];
  vietPassed: string[];
  isUnlocked: (subGroupId: string) => boolean;
  isPassed: (subGroupId: string) => boolean;
  addScore: (delta: number) => void;
  unlockNext: (currentSubGroupId: string) => void;
  markPassed: (subGroupId: string) => void;
  setPetName: (name: string) => void;
  submitTimeScore: (score: number) => boolean;
  addWordsToSRS: (words: Word[]) => void;
  recordReview: (wordEn: string, correct: boolean) => void;
  isMathPassed: (id: string) => boolean;
  isMathUnlocked: (id: string) => boolean;
  markMathPassed: (id: string) => void;
  isVietPassed: (id: string) => boolean;
  isVietUnlocked: (id: string) => boolean;
  markVietPassed: (id: string) => void;
};

const STORAGE_UNLOCKED = 'lingoland_subgroups_v2';
const STORAGE_PASSED = 'lingoland_passed_v2';
const STORAGE_PET_NAME = 'lingoland_pet_name';
const STORAGE_TIME_HS = 'lingoland_time_hs';
const STORAGE_WORD_STATS = 'lingoland_word_stats';
const STORAGE_MATH_PASSED = 'lingoland_math_passed';
const STORAGE_VIET_PASSED = 'lingoland_viet_passed';
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
  const saved = loadStringArray(STORAGE_UNLOCKED, defaultUnlocked);
  const firstOfEach = defaultUnlocked();
  const merged = [...saved];
  for (const id of firstOfEach) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
};

const loadPassed = (): string[] => loadStringArray(STORAGE_PASSED, () => []);

const loadWordStats = (): WordStats => {
  const raw = localStorage.getItem(STORAGE_WORD_STATS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as WordStats;
    }
  } catch {
    // fall through
  }
  return {};
};

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
  const [wordStats, setWordStats] = useState<WordStats>(loadWordStats);
  const [mathPassed, setMathPassed] = useState<string[]>(() =>
    loadStringArray(STORAGE_MATH_PASSED, () => [])
  );
  const [vietPassed, setVietPassed] = useState<string[]>(() =>
    loadStringArray(STORAGE_VIET_PASSED, () => [])
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

  useEffect(() => {
    localStorage.setItem(STORAGE_WORD_STATS, JSON.stringify(wordStats));
  }, [wordStats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_MATH_PASSED, JSON.stringify(mathPassed));
  }, [mathPassed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_VIET_PASSED, JSON.stringify(vietPassed));
  }, [vietPassed]);

  const dueDeck = useMemo<Word[]>(() => {
    const now = Date.now();
    return ALL_WORDS.filter((w) => {
      const stat = wordStats[w.en];
      return stat && isDue(stat, now);
    })
      .sort((a, b) => wordStats[a.en].lastSeen - wordStats[b.en].lastSeen)
      .slice(0, DAILY_CAP);
  }, [wordStats]);

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

  const addWordsToSRS = (words: Word[]) => {
    const now = Date.now();
    setWordStats((stats) => {
      const updated = { ...stats };
      for (const w of words) {
        if (!updated[w.en]) {
          updated[w.en] = { level: 0, lastSeen: now };
        }
      }
      return updated;
    });
  };

  const recordReview = (wordEn: string, correct: boolean) => {
    setWordStats((stats) => {
      const curr = stats[wordEn];
      if (!curr) return stats;
      return {
        ...stats,
        [wordEn]: {
          level: nextLevel(curr.level, correct),
          lastSeen: Date.now(),
        },
      };
    });
  };

  const isMathPassed = (id: string) => mathPassed.includes(id);

  const isMathUnlocked = (id: string) => {
    const prev = prevMathLevelId(id);
    return prev === null || mathPassed.includes(prev);
  };

  const markMathPassed = (id: string) => {
    setMathPassed((arr) => (arr.includes(id) ? arr : [...arr, id]));
  };

  const isVietPassed = (id: string) => vietPassed.includes(id);

  const isVietUnlocked = (id: string) => {
    const prev = prevVietLessonId(id);
    return prev === null || vietPassed.includes(prev);
  };

  const markVietPassed = (id: string) => {
    setVietPassed((arr) => (arr.includes(id) ? arr : [...arr, id]));
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
        wordStats,
        dueDeck,
        mathPassed,
        vietPassed,
        isUnlocked,
        isPassed,
        addScore,
        unlockNext,
        markPassed,
        setPetName,
        submitTimeScore,
        addWordsToSRS,
        recordReview,
        isMathPassed,
        isMathUnlocked,
        markMathPassed,
        isVietPassed,
        isVietUnlocked,
        markVietPassed,
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
