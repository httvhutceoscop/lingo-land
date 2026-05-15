import { useEffect, useState, type MouseEvent } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';
type Mode = 'find' | 'math';

const TOTAL_ROUNDS = 10;
const ROUND_DELAY_MS = 750;

const BALLOON_COLORS = [
  'from-pink-400 to-rose-500',
  'from-sky-400 to-blue-500',
  'from-amber-300 to-orange-400',
  'from-violet-400 to-purple-500',
];

type Balloon = {
  id: number;
  value: number;
  color: string;
  delay: number;
  popped: boolean;
};

type Round = {
  target: number;
  prompt: string;
  voice: string;
  balloons: Balloon[];
};

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function makeBalloons(values: number[]): Balloon[] {
  return shuffle(values).map((v, i) => ({
    id: i,
    value: v,
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    delay: Math.random() * 0.8,
    popped: false,
  }));
}

function buildFindRound(roundIdx: number): Round {
  const range = roundIdx < 3 ? 5 : roundIdx < 6 ? 9 : 10;
  const target = randInt(1, range);
  const pool = new Set<number>([target]);
  const distractorMax = Math.max(range, 9);
  while (pool.size < 4) pool.add(randInt(1, distractorMax));
  return {
    target,
    prompt: `Tìm số ${target}!`,
    voice: `Find number ${target}!`,
    balloons: makeBalloons(Array.from(pool)),
  };
}

function buildMathRound(roundIdx: number): Round {
  const max = roundIdx < 5 ? 5 : 10;
  const isPlus = roundIdx % 2 === 0;
  let a: number;
  let b: number;
  let result: number;
  let op: string;
  let voiceOp: string;
  if (isPlus) {
    a = randInt(1, max - 1);
    b = randInt(1, max - a);
    result = a + b;
    op = '+';
    voiceOp = 'plus';
  } else {
    a = randInt(2, max);
    b = randInt(1, a - 1);
    result = a - b;
    op = '−';
    voiceOp = 'minus';
  }
  const pool = new Set<number>([result]);
  while (pool.size < 4) pool.add(randInt(0, max));
  return {
    target: result,
    prompt: `${a} ${op} ${b} = ?`,
    voice: `${a} ${voiceOp} ${b}`,
    balloons: makeBalloons(Array.from(pool)),
  };
}

function buildRound(mode: Mode, idx: number): Round {
  return mode === 'find' ? buildFindRound(idx) : buildMathRound(idx);
}

type NumberPopViewProps = {
  onBack: () => void;
};

export default function NumberPopView({ onBack }: NumberPopViewProps) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('find');
  const [roundIdx, setRoundIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const startGame = (m: Mode) => {
    setMode(m);
    setRoundIdx(0);
    setCorrectCount(0);
    setLocked(false);
    const r = buildRound(m, 0);
    setRound(r);
    setPhase('playing');
    window.setTimeout(() => speak(r.voice), 250);
  };

  useEffect(() => {
    if (phase !== 'finished') return;
    if (correctCount >= 7) {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#ec4899', '#3b82f6', '#f59e0b', '#a855f7'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handlePop = (e: MouseEvent<HTMLButtonElement>, balloon: Balloon) => {
    if (!round || locked || balloon.popped) return;
    if (balloon.value === round.target) {
      playSfx('snd-correct');
      addScore(10);
      setCorrectCount((c) => c + 1);
      setRound({
        ...round,
        balloons: round.balloons.map((b) =>
          b.id === balloon.id ? { ...b, popped: true } : b
        ),
      });
      const rect = e.currentTarget.getBoundingClientRect();
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 28,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ['#fbbf24', '#ec4899', '#a855f7', '#3b82f6'],
      });
      setLocked(true);
      window.setTimeout(() => {
        const next = roundIdx + 1;
        if (next >= TOTAL_ROUNDS) {
          setPhase('finished');
          return;
        }
        setRoundIdx(next);
        const nr = buildRound(mode, next);
        setRound(nr);
        setLocked(false);
        window.setTimeout(() => speak(nr.voice), 200);
      }, ROUND_DELAY_MS);
    } else {
      playSfx('snd-wrong');
      setWrongId(balloon.id);
      window.setTimeout(() => setWrongId((id) => (id === balloon.id ? null : id)), 450);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>
        <div className="text-center py-6 max-w-md mx-auto">
          <div className="text-7xl mb-4 floating">🎈</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Number Pop
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-8">
            Chạm vào bong bóng đúng để làm nó nổ tung! Chọn một chế độ chơi nhé.
          </p>

          <div className="space-y-3 mb-4">
            <button
              onClick={() => startGame('find')}
              className="w-full p-5 bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-3xl shadow-lg shadow-pink-200 active:scale-95 transition-all flex items-center gap-4 text-left"
            >
              <div className="text-4xl">🔢</div>
              <div className="flex-1">
                <div className="font-black text-lg leading-tight">Tìm con số</div>
                <div className="text-xs opacity-90 font-bold mt-0.5">
                  Nghe và chạm vào số đúng
                </div>
              </div>
              <span className="text-xl">▶️</span>
            </button>

            <button
              onClick={() => startGame('math')}
              className="w-full p-5 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-4 text-left"
            >
              <div className="text-4xl">➕</div>
              <div className="flex-1">
                <div className="font-black text-lg leading-tight">Phép tính nhỏ</div>
                <div className="text-xs opacity-90 font-bold mt-0.5">
                  Cộng và trừ trong 10
                </div>
              </div>
              <span className="text-xl">▶️</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const stars =
      correctCount >= 8 ? 3 : correctCount >= 5 ? 2 : correctCount >= 3 ? 1 : 0;
    const label =
      stars === 3
        ? 'Xuất sắc!'
        : stars === 2
          ? 'Tuyệt vời!'
          : stars === 1
            ? 'Khá lắm!'
            : 'Hãy thử lại!';
    const emoji =
      stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '😅';
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{emoji}</div>
        <h2 className="text-3xl font-black mb-3">{label}</h2>
        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`text-3xl ${s <= stars ? '' : 'grayscale opacity-20'}`}
            >
              ⭐
            </span>
          ))}
        </div>
        <div className="bg-slate-50 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{TOTAL_ROUNDS}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Bong bóng đã nổ đúng
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
            onClick={() => setPhase('idle')}
            className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  if (!round) return null;
  return (
    <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          ĐIỂM:
          <span className="text-pink-500 text-base ml-1">{correctCount}</span>
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Vòng
          <span className="text-blue-500 text-base ml-1">
            {roundIdx + 1}/{TOTAL_ROUNDS}
          </span>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 transition-all duration-500"
          style={{ width: `${(roundIdx / TOTAL_ROUNDS) * 100}%` }}
        />
      </div>

      <div className="text-center mb-5">
        <button
          onClick={() => speak(round.voice)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 rounded-full font-black text-2xl text-slate-700 active:scale-95 transition-all shadow-sm"
        >
          🔊 <span>{round.prompt}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 px-2 py-2">
        {round.balloons.map((b) => {
          const isWrong = wrongId === b.id;
          return (
            <div key={b.id} className="relative flex justify-center">
              <button
                onClick={(e) => handlePop(e, b)}
                disabled={b.popped || locked}
                className={`balloon-btn aspect-square w-full max-w-[150px] rounded-full bg-gradient-to-br ${b.color} text-white font-black text-5xl shadow-xl flex items-center justify-center active:scale-95 disabled:cursor-default ${b.popped ? 'balloon-pop' : isWrong ? 'shake-x' : 'balloon-float'
                  }`}
                style={{ animationDelay: `${b.delay}s` }}
              >
                <span className="drop-shadow-md">{b.value}</span>
              </button>
              {!b.popped && (
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 text-slate-300 text-xs select-none pointer-events-none">
                  │
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="mt-6 w-full py-3 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-bold text-sm active:scale-95 transition-all"
      >
        ← Thoát
      </button>
    </div>
  );
}
