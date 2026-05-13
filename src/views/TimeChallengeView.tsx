import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { ALL_WORDS, type Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';

const TIME_LIMIT = 60;
const FEEDBACK_MS = 350;

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function buildOptions(word: Word): string[] {
  const opts = [word.vi];
  while (opts.length < 4) {
    const r = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)].vi;
    if (!opts.includes(r)) opts.push(r);
  }
  return shuffle(opts);
}

function pickRandomWord(prev: Word | null): Word {
  if (ALL_WORDS.length < 2) return ALL_WORDS[0];
  let w: Word;
  do {
    w = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
  } while (w === prev);
  return w;
}

type Phase = 'idle' | 'playing' | 'finished';

type TimeChallengeViewProps = {
  onBack: () => void;
};

function ratingFor(correct: number): { stars: number; label: string; emoji: string } {
  if (correct >= 15) return { stars: 3, label: 'Xuất sắc!', emoji: '🏆' };
  if (correct >= 10) return { stars: 2, label: 'Tuyệt vời!', emoji: '🥈' };
  if (correct >= 5) return { stars: 1, label: 'Khá tốt!', emoji: '🥉' };
  return { stars: 0, label: 'Hãy thử lại!', emoji: '😅' };
}

export default function TimeChallengeView({ onBack }: TimeChallengeViewProps) {
  const { addScore, timeHighScore, submitTimeScore } = useGame();

  const [phase, setPhase] = useState<Phase>('idle');
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const options = useMemo(
    () => (currentWord ? buildOptions(currentWord) : []),
    [currentWord]
  );

  const startGame = () => {
    setTimeLeft(TIME_LIMIT);
    setCorrectCount(0);
    setTotalAnswered(0);
    setSelected(null);
    setIsNewRecord(false);
    setCurrentWord(pickRandomWord(null));
    setPhase('playing');
  };

  // countdown
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // end when timer hits 0
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      setPhase('finished');
    }
  }, [phase, timeLeft]);

  // submit high score once on transition to finished
  useEffect(() => {
    if (phase !== 'finished') return;
    const beat = submitTimeScore(correctCount);
    if (beat && correctCount > 0) {
      setIsNewRecord(true);
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f97316', '#ef4444', '#ec4899', '#facc15'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleSelect = (opt: string) => {
    if (selected || !currentWord || phase !== 'playing') return;
    setSelected(opt);
    const isCorrect = opt === currentWord.vi;
    setTotalAnswered((t) => t + 1);
    if (isCorrect) {
      playSfx('snd-correct');
      addScore(20);
      setCorrectCount((c) => c + 1);
    } else {
      playSfx('snd-wrong');
    }
    window.setTimeout(() => {
      setSelected(null);
      setCurrentWord((prev) => pickRandomWord(prev));
    }, FEEDBACK_MS);
  };

  // ─────────────────────────────────────────────────────────────────────
  // IDLE phase
  if (phase === 'idle') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>

        <div className="text-center py-6">
          <div className="text-7xl mb-4 floating">🔥</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Thử thách 60 giây
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-8">
            Trả lời càng nhiều câu càng tốt trong 60 giây! Từ vựng lấy ngẫu nhiên từ
            tất cả chủ đề.
          </p>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-3xl p-5 mb-8">
            <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">
              Kỷ Lục Cá Nhân
            </div>
            <div className="text-4xl font-black text-orange-600">
              {timeHighScore} <span className="text-sm font-bold text-orange-400">câu</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-200 active:scale-95 transition-all"
          >
            🚀 Bắt đầu
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // FINISHED phase
  if (phase === 'finished') {
    const rating = ratingFor(correctCount);
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <div className="text-center py-8 animate-in zoom-in duration-500">
        <div className="text-7xl mb-4">{rating.emoji}</div>
        <h2 className="text-3xl font-black mb-1">{rating.label}</h2>
        {isNewRecord && (
          <p className="text-orange-600 font-black text-sm uppercase tracking-widest animate-pulse mb-4">
            ✨ Kỷ lục mới! ✨
          </p>
        )}
        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <span key={s} className={`text-3xl ${s <= rating.stars ? '' : 'grayscale opacity-20'}`}>
              ⭐
            </span>
          ))}
        </div>

        <div className="bg-slate-50 rounded-3xl p-5 mb-6 grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-emerald-500">{correctCount}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Đúng</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-slate-600">{totalAnswered}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Câu</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-orange-500">{accuracy}%</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Chuẩn</div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 mb-6">
          <div className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
            Kỷ Lục
          </div>
          <div className="text-xl font-black text-orange-700">{timeHighScore} câu</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={startGame}
            className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // PLAYING phase
  const lowTime = timeLeft <= 10;
  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          ĐIỂM:{' '}
          <span className="text-emerald-500 text-base ml-1">{correctCount}</span>
        </div>
        <div
          className={`text-3xl font-black ${
            lowTime ? 'text-red-500 animate-pulse' : 'text-orange-500'
          }`}
        >
          {timeLeft}s
        </div>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className={`h-full ease-linear transition-all duration-1000 ${
            lowTime
              ? 'bg-gradient-to-r from-red-500 to-pink-500'
              : 'bg-gradient-to-r from-orange-400 to-red-500'
          }`}
          style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
        />
      </div>

      {currentWord && (
        <>
          <div className="text-6xl text-center mb-3">{currentWord.img}</div>
          <h2 className="text-xl font-black text-center mb-6 italic">
            "{currentWord.en}" có nghĩa là gì?
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            {options.map((opt) => {
              const isCorrect = opt === currentWord.vi;
              const isWrong = selected === opt && !isCorrect;
              const showCorrect = selected && isCorrect;
              const base =
                'p-4 bg-white border-2 rounded-2xl font-bold text-left transition-all flex justify-between items-center disabled:cursor-default';
              const cls = !selected
                ? `${base} border-slate-100 hover:border-orange-400 hover:bg-orange-50`
                : showCorrect
                  ? `${base} border-emerald-500 bg-emerald-50 text-emerald-700`
                  : isWrong
                    ? `${base} border-red-500 bg-red-50 text-red-700`
                    : `${base} border-slate-100 opacity-50`;
              return (
                <button
                  key={opt}
                  disabled={!!selected}
                  onClick={() => handleSelect(opt)}
                  className={cls}
                >
                  <span>{opt}</span>
                  <span>{!selected ? '' : showCorrect ? '✅' : isWrong ? '❌' : ''}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
