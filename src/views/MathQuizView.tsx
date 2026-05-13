import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  generateQuestions,
  type ComputeQuestion,
  type MathLevel,
  type MathQuestion,
  type SymbolQuestion,
} from '../data/mathData';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';

const FEEDBACK_MS = 1000;

type Phase = 'playing' | 'done';

type MathQuizViewProps = {
  level: MathLevel;
  onBack: () => void;
};

export default function MathQuizView({ level, onBack }: MathQuizViewProps) {
  const { addScore, markMathPassed, isMathPassed } = useGame();

  const [deck, setDeck] = useState<MathQuestion[]>(() => generateQuestions(level));
  const [phase, setPhase] = useState<Phase>('playing');
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<string | number | null>(null);

  const question = deck[idx];

  const restart = () => {
    setDeck(generateQuestions(level));
    setPhase('playing');
    setIdx(0);
    setCorrectCount(0);
    setSelected(null);
  };

  const onAnswer = (correct: boolean) => {
    if (correct) {
      playSfx('snd-correct');
      addScore(10);
      setCorrectCount((c) => c + 1);
    } else {
      playSfx('snd-wrong');
    }
    window.setTimeout(() => {
      setSelected(null);
      if (idx + 1 < deck.length) {
        setIdx((i) => i + 1);
      } else {
        setPhase('done');
      }
    }, FEEDBACK_MS);
  };

  const pass = correctCount >= deck.length * 0.7;
  const alreadyPassedOnEntry = useMemo(() => isMathPassed(level.id), [level.id]);

  useEffect(() => {
    if (phase !== 'done') return;
    if (pass) {
      markMathPassed(level.id);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const accuracy = Math.round((correctCount / deck.length) * 100);
    const justUnlocked = pass && !alreadyPassedOnEntry;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500">
        <div className="text-7xl mb-4">{pass ? '🏆' : '😅'}</div>
        <h2 className="text-3xl font-black mb-2">{pass ? 'Tuyệt vời!' : 'Cố gắng lên!'}</h2>
        <p className="text-slate-400 mb-2">
          {pass
            ? justUnlocked
              ? `Bạn đã mở khóa level tiếp theo!`
              : `Bạn đã hoàn thành ${level.title}.`
            : 'Hãy làm lại để qua level này nhé.'}
        </p>
        {pass && (
          <p className="text-amber-600 text-sm font-bold mb-6">🏅 Pass {level.title}</p>
        )}
        {!pass && <div className="mb-6" />}

        <div className="bg-slate-50 rounded-3xl p-5 mb-6 grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-emerald-500">{correctCount}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Đúng</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-slate-600">{deck.length}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Tổng</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-purple-500">{accuracy}%</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Chuẩn</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={restart}
            className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // PLAYING phase
  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="font-bold text-purple-500">
          {idx + 1}/{deck.length}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      {question.kind === 'symbol' ? (
        <SymbolBody
          question={question}
          selected={selected as string | null}
          onPick={(opt) => {
            if (selected) return;
            setSelected(opt);
            onAnswer(opt === question.name);
          }}
        />
      ) : (
        <ComputeBody
          question={question}
          selected={selected as number | null}
          onPick={(opt) => {
            if (selected !== null) return;
            setSelected(opt);
            onAnswer(opt === question.answer);
          }}
        />
      )}
    </div>
  );
}

function SymbolBody({
  question,
  selected,
  onPick,
}: {
  question: SymbolQuestion;
  selected: string | null;
  onPick: (opt: string) => void;
}) {
  const cls = (opt: string): string => {
    const base =
      'p-4 bg-white border-2 rounded-2xl font-bold text-left transition-all flex justify-between items-center disabled:cursor-default';
    if (!selected) return `${base} border-slate-100 hover:border-indigo-400 hover:bg-indigo-50`;
    if (opt === question.name)
      return `${base} border-emerald-500 bg-emerald-50 text-emerald-700`;
    if (opt === selected) return `${base} border-red-500 bg-red-50 text-red-700`;
    return `${base} border-slate-100 opacity-50`;
  };

  return (
    <>
      <div className="text-center mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Ký hiệu này là gì?
        </p>
        <div className="text-8xl font-black text-slate-800 bg-indigo-50 border-2 border-indigo-100 rounded-3xl py-6 inline-block px-12">
          {question.symbol}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((opt) => (
          <button
            key={opt}
            disabled={!!selected}
            onClick={() => onPick(opt)}
            className={cls(opt)}
          >
            <span className="capitalize">{opt}</span>
            <span>
              {!selected
                ? ''
                : opt === question.name
                  ? '✅'
                  : opt === selected
                    ? '❌'
                    : ''}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function ComputeBody({
  question,
  selected,
  onPick,
}: {
  question: ComputeQuestion;
  selected: number | null;
  onPick: (opt: number) => void;
}) {
  const opSymbol = question.op === '+' ? '+' : '−';

  const cls = (opt: number): string => {
    const base =
      'aspect-square bg-white border-2 rounded-3xl font-black text-3xl flex items-center justify-center transition-all disabled:cursor-default';
    if (selected === null) {
      return `${base} border-slate-100 hover:border-purple-400 hover:bg-purple-50 active:scale-95`;
    }
    if (opt === question.answer)
      return `${base} border-emerald-500 bg-emerald-50 text-emerald-700`;
    if (opt === selected) return `${base} border-red-500 bg-red-50 text-red-700`;
    return `${base} border-slate-100 opacity-50`;
  };

  return (
    <>
      <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
        Đáp án bao nhiêu?
      </p>
      <div className="text-center text-6xl font-black text-slate-800 font-mono bg-purple-50 border-2 border-purple-100 rounded-3xl py-6 mb-6 tracking-wide">
        {question.a} {opSymbol} {question.b} = ?
      </div>
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt) => (
          <button
            key={opt}
            disabled={selected !== null}
            onClick={() => onPick(opt)}
            className={cls(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </>
  );
}
