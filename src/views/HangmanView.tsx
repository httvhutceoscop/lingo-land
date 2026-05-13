import { useEffect, useMemo, useState } from 'react';
import type { Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';
import type { QuizResult } from './ResultView';

const MAX_WRONGS = 6;
const ROUND_END_DELAY = 1800;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function wordLetters(en: string): Set<string> {
  return new Set(en.toUpperCase().replace(/[^A-Z]/g, '').split(''));
}

type Outcome = 'won' | 'lost' | null;

type HangmanViewProps = {
  words: Word[];
  onFinish: (result: QuizResult) => void;
};

export default function HangmanView({ words, onFinish }: HangmanViewProps) {
  const { addScore } = useGame();
  const shuffledWords = useMemo(() => shuffle(words), [words]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrongs, setWrongs] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const word = shuffledWords[currentIdx];
  const required = useMemo(() => wordLetters(word.en), [word]);
  const upper = word.en.toUpperCase();

  const handleTap = (letter: string) => {
    if (outcome || guessed.has(letter)) return;
    const newGuessed = new Set(guessed);
    newGuessed.add(letter);
    setGuessed(newGuessed);

    if (required.has(letter)) {
      const allRevealed = [...required].every((l) => newGuessed.has(l));
      if (allRevealed) {
        playSfx('snd-correct');
        addScore(20);
        setCorrectCount((c) => c + 1);
        setOutcome('won');
        speak(word.en);
      } else {
        playSfx('snd-correct');
      }
    } else {
      playSfx('snd-wrong');
      const newWrongs = wrongs + 1;
      setWrongs(newWrongs);
      if (newWrongs >= MAX_WRONGS) {
        setOutcome('lost');
      }
    }
  };

  useEffect(() => {
    if (!outcome) return;
    const t = window.setTimeout(() => {
      if (currentIdx + 1 < shuffledWords.length) {
        setCurrentIdx((i) => i + 1);
        setGuessed(new Set());
        setWrongs(0);
        setOutcome(null);
      } else {
        onFinish({ correct: correctCount, total: shuffledWords.length });
      }
    }, ROUND_END_DELAY);
    return () => window.clearTimeout(t);
  }, [outcome, currentIdx, shuffledWords.length, correctCount, onFinish]);

  const slots = upper.split('').map((ch, i) => {
    if (!/[A-Z]/.test(ch)) return { ch, revealed: true, key: i };
    return {
      ch,
      revealed: guessed.has(ch) || outcome === 'lost',
      key: i,
    };
  });

  const remainingHearts = MAX_WRONGS - wrongs;

  const slotClass = (revealed: boolean): string => {
    const base =
      'w-9 h-12 sm:w-10 sm:h-14 flex items-center justify-center text-xl font-black border-b-2 transition-all';
    if (outcome === 'lost' && revealed) return `${base} border-red-400 text-red-600`;
    if (outcome === 'won') return `${base} border-emerald-400 text-emerald-600`;
    if (revealed) return `${base} border-emerald-300 text-slate-800`;
    return `${base} border-slate-300 text-slate-300`;
  };

  const keyClass = (letter: string): string => {
    const base =
      'aspect-square rounded-lg border-2 font-black text-sm transition-all active:scale-95 disabled:cursor-default';
    if (!guessed.has(letter)) {
      return `${base} bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50`;
    }
    if (required.has(letter)) {
      return `${base} bg-emerald-100 border-emerald-400 text-emerald-700`;
    }
    return `${base} bg-red-100 border-red-400 text-red-600 opacity-60`;
  };

  return (
    <div className="animate-in slide-in-from-right duration-300 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          ĐOÁN CHỮ
        </span>
        <span className="font-bold text-amber-600">
          {currentIdx + 1}/{shuffledWords.length}
        </span>
      </div>

      <div className="text-center mb-2">
        <div className="text-5xl mb-1">{word.img}</div>
        <p className="text-base font-bold text-slate-700">{word.vi}</p>
      </div>

      <div className="flex justify-center gap-0.5 my-3 text-xl select-none" aria-label={`${remainingHearts} mạng còn lại`}>
        {Array.from({ length: MAX_WRONGS }).map((_, i) => (
          <span key={i} className={i < remainingHearts ? '' : 'grayscale opacity-30'}>
            {i < remainingHearts ? '❤️' : '🤍'}
          </span>
        ))}
      </div>

      <div className="flex justify-center flex-wrap gap-1 mb-4">
        {slots.map((s) => (
          <div key={s.key} className={slotClass(s.revealed)}>
            {s.revealed ? s.ch : '_'}
          </div>
        ))}
      </div>

      {outcome === 'won' && (
        <p className="text-center text-emerald-600 font-black text-sm mb-3 animate-in zoom-in duration-300">
          ✅ Chính xác!
        </p>
      )}
      {outcome === 'lost' && (
        <p className="text-center text-red-600 font-bold text-sm mb-3 animate-in zoom-in duration-300">
          ❌ Đáp án: <span className="font-black">{upper}</span>
        </p>
      )}
      {!outcome && (
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Chạm chữ cái để đoán
        </p>
      )}

      <div className="grid grid-cols-7 md:grid-cols-9 gap-1.5 max-w-lg mx-auto">
        {ALPHABET.map((letter) => (
          <button
            key={letter}
            disabled={!!outcome || guessed.has(letter)}
            onClick={() => handleTap(letter)}
            className={keyClass(letter)}
            aria-label={`Đoán chữ ${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
