import { useMemo, useState } from 'react';
import type { Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';
import TestExitButton from '../components/TestExitButton';
import type { QuizResult } from './ResultView';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type MatchingViewProps = {
  words: Word[];
  onFinish: (result: QuizResult) => void;
  onExit: () => void;
};

type Side = 'en' | 'vi';

export default function MatchingView({ words, onFinish, onExit }: MatchingViewProps) {
  const { addScore } = useGame();

  const enOrder = useMemo(() => shuffle(words.map((w) => w.en)), [words]);
  const viOrder = useMemo(() => shuffle(words.map((w) => w.vi)), [words]);

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedVi, setSelectedVi] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const tryMatch = (en: string, vi: string) => {
    const pair = words.find((w) => w.en === en);
    const isCorrect = pair?.vi === vi;
    setAttempts((a) => a + 1);

    if (isCorrect) {
      playSfx('snd-correct');
      addScore(20);
      setCorrectCount((c) => c + 1);
      const newMatched = new Set(matched);
      newMatched.add(en);
      newMatched.add(vi);
      setMatched(newMatched);
      setSelectedEn(null);
      setSelectedVi(null);

      if (newMatched.size === words.length * 2) {
        setTimeout(() => {
          onFinish({ correct: correctCount + 1, total: words.length });
        }, 600);
      }
    } else {
      playSfx('snd-wrong');
      setWrong(new Set([en, vi]));
      setTimeout(() => {
        setWrong(new Set());
        setSelectedEn(null);
        setSelectedVi(null);
      }, 600);
    }
  };

  const handlePick = (side: Side, value: string) => {
    if (matched.has(value) || wrong.size > 0) return;
    if (side === 'en') {
      if (selectedVi) tryMatch(value, selectedVi);
      else setSelectedEn(selectedEn === value ? null : value);
    } else {
      if (selectedEn) tryMatch(selectedEn, value);
      else setSelectedVi(selectedVi === value ? null : value);
    }
  };

  const cardClass = (value: string, selected: string | null): string => {
    const base =
      'p-3 rounded-2xl border-2 font-bold text-sm transition-all min-h-[60px] flex items-center justify-center text-center active:scale-95';
    if (matched.has(value)) return `${base} bg-emerald-50 border-emerald-200 text-emerald-700 opacity-50`;
    if (wrong.has(value)) return `${base} bg-red-50 border-red-300 text-red-700 animate-pulse`;
    if (selected === value) return `${base} bg-emerald-500 border-emerald-600 text-white shadow-lg`;
    return `${base} bg-white border-slate-100 hover:border-emerald-300`;
  };

  const totalPairs = words.length;
  const matchedPairs = matched.size / 2;

  return (
    <div className="animate-in slide-in-from-right duration-300 max-w-2xl mx-auto">
      <TestExitButton onExit={onExit} />
      <div className="flex justify-between items-center mb-6">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          NỐI TỪ
        </span>
        <span className="font-bold text-emerald-500">
          {matchedPairs}/{totalPairs}
        </span>
      </div>
      <p className="text-center text-slate-500 text-sm mb-6">
        Chạm 1 từ tiếng Anh rồi nối với nghĩa tiếng Việt tương ứng
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {enOrder.map((en) => (
            <button
              key={en}
              disabled={matched.has(en)}
              onClick={() => handlePick('en', en)}
              className={cardClass(en, selectedEn)}
            >
              {en}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {viOrder.map((vi) => (
            <button
              key={vi}
              disabled={matched.has(vi)}
              onClick={() => handlePick('vi', vi)}
              className={cardClass(vi, selectedVi)}
            >
              {vi}
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-400 font-bold uppercase mt-6 tracking-wider">
        Số lần thử: {attempts}
      </p>
    </div>
  );
}
