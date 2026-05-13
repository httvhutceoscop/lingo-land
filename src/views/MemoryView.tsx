import { useEffect, useMemo, useState } from 'react';
import type { Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';
import type { QuizResult } from './ResultView';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type Card = {
  id: string;
  pairKey: string;
  face: 'en' | 'vi';
  text: string;
  emoji?: string;
};

type MemoryViewProps = {
  words: Word[];
  onFinish: (result: QuizResult) => void;
};

export default function MemoryView({ words, onFinish }: MemoryViewProps) {
  const { addScore } = useGame();

  const cards = useMemo<Card[]>(
    () =>
      shuffle(
        words.flatMap((w) => [
          { id: `${w.en}-en`, pairKey: w.en, face: 'en' as const, text: w.en, emoji: w.img },
          { id: `${w.en}-vi`, pairKey: w.en, face: 'vi' as const, text: w.vi },
        ])
      ),
    [words]
  );

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const handleTap = (cardId: string) => {
    if (locked) return;
    if (flipped.includes(cardId) || matched.has(cardId)) return;

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);
    if (newFlipped.length < 2) return;

    setLocked(true);
    setAttempts((a) => a + 1);
    const [aId, bId] = newFlipped;
    const a = cards.find((c) => c.id === aId)!;
    const b = cards.find((c) => c.id === bId)!;
    const isMatch = a.pairKey === b.pairKey && a.face !== b.face;

    if (isMatch) {
      playSfx('snd-correct');
      addScore(20);
      window.setTimeout(() => {
        setMatched((prev) => new Set([...prev, aId, bId]));
        setFlipped([]);
        setLocked(false);
      }, 500);
    } else {
      playSfx('snd-wrong');
      window.setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 900);
    }
  };

  useEffect(() => {
    if (matched.size === cards.length && cards.length > 0) {
      const t = window.setTimeout(
        () => onFinish({ correct: words.length, total: words.length }),
        500
      );
      return () => window.clearTimeout(t);
    }
  }, [matched, cards.length, words.length, onFinish]);

  const cardClass = (c: Card): string => {
    const base =
      'aspect-square rounded-2xl border-2 font-bold flex flex-col items-center justify-center text-center transition-all p-2 select-none';
    if (matched.has(c.id)) {
      return `${base} bg-emerald-50 border-emerald-200 opacity-40`;
    }
    if (flipped.includes(c.id)) {
      return `${base} bg-white border-emerald-400 shadow-lg`;
    }
    return `${base} bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-700 text-white active:scale-95 shadow-md`;
  };

  return (
    <div className="animate-in slide-in-from-right duration-300 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          TRÒ CHƠI TRÍ NHỚ
        </span>
        <span className="font-bold text-emerald-500">
          {matched.size / 2}/{words.length}
        </span>
      </div>

      <p className="text-center text-slate-500 text-sm mb-4">
        Lật 2 thẻ để tìm cặp tiếng Anh ↔ tiếng Việt
      </p>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
        {cards.map((c) => {
          const isShown = flipped.includes(c.id) || matched.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => handleTap(c.id)}
              disabled={isShown || locked}
              className={cardClass(c)}
              aria-label={isShown ? c.text : 'Lá bài úp'}
            >
              {!isShown && <span className="text-4xl">✨</span>}
              {isShown && c.face === 'en' && (
                <>
                  <div className="text-3xl mb-1 leading-none">{c.emoji}</div>
                  <div className="text-xs font-black text-slate-800">{c.text}</div>
                </>
              )}
              {isShown && c.face === 'vi' && (
                <div className="text-sm font-bold leading-tight text-slate-800">
                  {c.text}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-slate-400 font-bold uppercase mt-6 tracking-wider">
        Số lần lật: {attempts}
      </p>
    </div>
  );
}
