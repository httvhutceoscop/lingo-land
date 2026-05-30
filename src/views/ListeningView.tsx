import { useEffect, useMemo, useState } from 'react';
import { ALL_WORDS, type Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx, pronounce } from '../lib/audio';
import TestExitButton from '../components/TestExitButton';
import type { QuizResult } from './ResultView';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function buildOptions(word: Word): string[] {
  const opts = [word.vi];
  while (opts.length < 4) {
    const r = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)].vi;
    if (!opts.includes(r)) opts.push(r);
  }
  return shuffle(opts);
}

type ListeningViewProps = {
  words: Word[];
  onFinish: (result: QuizResult) => void;
  onExit: () => void;
};

export default function ListeningView({ words, onFinish, onExit }: ListeningViewProps) {
  const { addScore } = useGame();
  const shuffledWords = useMemo(() => shuffle(words), [words]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const word = shuffledWords[currentIdx];
  const options = useMemo(() => buildOptions(word), [word]);

  useEffect(() => {
    const t = setTimeout(() => pronounce(word.en), 300);
    return () => clearTimeout(t);
  }, [word]);

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === word.vi;
    if (isCorrect) {
      playSfx('snd-correct');
      addScore(20);
      setCorrectCount((c) => c + 1);
    } else {
      playSfx('snd-wrong');
    }
    setTimeout(() => {
      setSelected(null);
      if (currentIdx + 1 < shuffledWords.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        onFinish({
          correct: correctCount + (isCorrect ? 1 : 0),
          total: shuffledWords.length,
        });
      }
    }, 1200);
  };

  const optClass = (opt: string): string => {
    const base =
      'p-5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-left transition-all flex justify-between items-center disabled:cursor-default';
    if (!selected) return `${base} hover:border-blue-500 hover:bg-blue-50`;
    if (opt === word.vi) return `${base} border-emerald-500 bg-emerald-50 text-emerald-700`;
    if (opt === selected) return `${base} border-red-500 bg-red-50 text-red-700`;
    return base;
  };

  const optIcon = (opt: string): string => {
    if (!selected) return '';
    if (opt === word.vi) return '✅';
    if (opt === selected) return '❌';
    return '';
  };

  return (
    <div className="animate-in slide-in-from-right duration-300 max-w-2xl mx-auto">
      <TestExitButton onExit={onExit} />
      <div className="flex justify-between items-center mb-8">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          NGHE ĐOÁN
        </span>
        <span className="font-bold text-emerald-500">
          {currentIdx + 1}/{shuffledWords.length}
        </span>
      </div>

      <div className="flex flex-col items-center my-8">
        <button
          onClick={() => pronounce(word.en)}
          className="w-28 h-28 rounded-full bg-blue-500 text-white text-5xl shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center"
        >
          🔊
        </button>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
          Chạm để nghe lại
        </p>
      </div>

      <h2 className="text-base font-bold text-center mb-6 text-slate-600">
        Từ vừa nghe có nghĩa là gì?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            disabled={!!selected}
            onClick={() => handleSelect(opt)}
            className={optClass(opt)}
          >
            <span>{opt}</span>
            <span>{optIcon(opt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
