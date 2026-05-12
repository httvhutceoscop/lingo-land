import { useMemo, useRef, useState, useEffect, type FormEvent } from 'react';
import type { Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';
import type { QuizResult } from './ResultView';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const normalize = (s: string) => s.trim().toLowerCase();

type TypingViewProps = {
  words: Word[];
  onFinish: (result: QuizResult) => void;
};

export default function TypingView({ words, onFinish }: TypingViewProps) {
  const { addScore } = useGame();
  const shuffledWords = useMemo(() => shuffle(words), [words]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const word = shuffledWords[currentIdx];

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIdx]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (feedback) return;
    const isCorrect = normalize(input) === normalize(word.en);
    if (isCorrect) {
      playSfx('snd-correct');
      addScore(20);
      setCorrectCount((c) => c + 1);
      setFeedback('correct');
    } else {
      playSfx('snd-wrong');
      setFeedback('wrong');
    }
    setTimeout(
      () => {
        setFeedback(null);
        setInput('');
        if (currentIdx + 1 < shuffledWords.length) {
          setCurrentIdx(currentIdx + 1);
        } else {
          onFinish({
            correct: correctCount + (isCorrect ? 1 : 0),
            total: shuffledWords.length,
          });
        }
      },
      isCorrect ? 700 : 1600
    );
  };

  const inputBorder =
    feedback === 'correct'
      ? 'border-emerald-500 bg-emerald-50'
      : feedback === 'wrong'
        ? 'border-red-500 bg-red-50'
        : 'border-slate-200 bg-white focus:border-orange-500';

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center mb-8">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          GÕ CHÍNH TẢ
        </span>
        <span className="font-bold text-emerald-500">
          {currentIdx + 1}/{shuffledWords.length}
        </span>
      </div>

      <div className="text-7xl text-center mb-4">{word.img}</div>
      <h2 className="text-2xl font-black text-center mb-2">{word.vi}</h2>
      <p className="text-slate-400 font-mono italic text-center mb-8">{word.ipa}</p>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!feedback}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Gõ từ tiếng Anh..."
          className={`w-full p-4 border-2 rounded-2xl font-bold text-center text-lg outline-none transition-all ${inputBorder}`}
        />

        {feedback === 'wrong' && (
          <p className="text-center text-red-600 font-bold mt-3">
            Đáp án đúng: <span className="font-black">{word.en}</span>
          </p>
        )}
        {feedback === 'correct' && (
          <p className="text-center text-emerald-600 font-bold mt-3">✅ Chính xác!</p>
        )}

        <button
          type="submit"
          disabled={!input.trim() || !!feedback}
          className="w-full py-4 mt-6 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:bg-slate-200 disabled:shadow-none disabled:text-slate-400"
        >
          Kiểm tra
        </button>
      </form>
    </div>
  );
}
