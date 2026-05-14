import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import kaboom from 'kaboom';
import type { GameObj, KaboomCtx } from 'kaboom';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';
type Mode = 'find' | 'math';

const TOTAL_ROUNDS = 10;
const ROUND_DELAY_MS = 800;
const CANVAS_W = 400;
const CANVAS_H = 520;

type Round = {
  target: number;
  prompt: string;
  voice: string;
  values: number[];
};

const BALLOON_PALETTES: Array<[number, number, number]> = [
  [236, 72, 153],
  [59, 130, 246],
  [251, 191, 36],
  [168, 85, 247],
];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function buildFindRound(idx: number): Round {
  const range = idx < 3 ? 5 : idx < 6 ? 9 : 10;
  const target = randInt(1, range);
  const pool = new Set<number>([target]);
  const distractorMax = Math.max(range, 9);
  while (pool.size < 4) pool.add(randInt(1, distractorMax));
  return {
    target,
    prompt: `Tìm số ${target}!`,
    voice: `Find number ${target}!`,
    values: shuffle(Array.from(pool)),
  };
}

function buildMathRound(idx: number): Round {
  const max = idx < 5 ? 5 : 10;
  const isPlus = idx % 2 === 0;
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
    values: shuffle(Array.from(pool)),
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef<KaboomCtx | null>(null);
  const lockedRef = useRef(false);
  const roundRef = useRef<Round | null>(null);
  const roundIdxRef = useRef(0);
  const modeRef = useRef<Mode>('find');

  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  useEffect(() => {
    roundIdxRef.current = roundIdx;
  }, [roundIdx]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const startGame = (m: Mode) => {
    setMode(m);
    setRoundIdx(0);
    setCorrectCount(0);
    lockedRef.current = false;
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
  }, [phase, correctCount]);

  useEffect(() => {
    if (phase !== 'playing' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const k = kaboom({
      canvas,
      width: CANVAS_W,
      height: CANVAS_H,
      background: [240, 249, 255],
      global: false,
      touchToMouse: true,
      crisp: true,
    });
    kRef.current = k;

    const cloud = (x: number, y: number, s: number) => {
      const opts = [k.color(255, 255, 255), k.opacity(0.85), k.z(-1)];
      k.add([k.circle(s), k.pos(x, y), k.anchor('center'), ...opts]);
      k.add([
        k.circle(s * 0.78),
        k.pos(x - s * 0.85, y + s * 0.25),
        k.anchor('center'),
        ...opts,
      ]);
      k.add([
        k.circle(s * 0.78),
        k.pos(x + s * 0.85, y + s * 0.25),
        k.anchor('center'),
        ...opts,
      ]);
    };
    cloud(80, 80, 22);
    cloud(320, 130, 26);
    cloud(210, 60, 18);

    return () => {
      try {
        k.quit();
      } catch {
        // ignore — kaboom may already be torn down
      }
      kRef.current = null;
    };
  }, [phase]);

  useEffect(() => {
    const k = kRef.current;
    if (!k || !round || phase !== 'playing') return;

    k.destroyAll('balloon');
    lockedRef.current = false;

    const w = k.width();
    const balloonCount = round.values.length;
    const cellW = w / balloonCount;
    const baseY = 360;

    const handleCorrect = (balloon: GameObj, followers: GameObj[]) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      playSfx('snd-correct');
      addScore(10);
      setCorrectCount((c) => c + 1);

      const px = balloon.pos.x;
      const py = balloon.pos.y;

      for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
        const speed = 90 + Math.random() * 80;
        const piece = k.add([
          k.rect(8, 14),
          k.pos(px, py),
          k.anchor('center'),
          k.color(
            120 + Math.floor(Math.random() * 135),
            120 + Math.floor(Math.random() * 135),
            120 + Math.floor(Math.random() * 135),
          ),
          k.rotate(Math.random() * 360),
          k.opacity(1),
          'balloon',
          {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
          },
        ]);
        piece.onUpdate(() => {
          piece.life += k.dt();
          piece.pos.x += piece.vx * k.dt();
          piece.pos.y += piece.vy * k.dt();
          piece.vy += 220 * k.dt();
          piece.angle += 320 * k.dt();
          piece.opacity = Math.max(0, 1 - piece.life / 0.6);
        });
      }

      followers.forEach((f) => k.destroy(f));
      k.destroy(balloon);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 28,
        origin: {
          x: (rect.left + (px / CANVAS_W) * rect.width) / window.innerWidth,
          y: (rect.top + (py / CANVAS_H) * rect.height) / window.innerHeight,
        },
        colors: ['#fbbf24', '#ec4899', '#a855f7', '#3b82f6'],
      });

      window.setTimeout(() => {
        const next = roundIdxRef.current + 1;
        if (next >= TOTAL_ROUNDS) {
          setPhase('finished');
          return;
        }
        setRoundIdx(next);
        const nr = buildRound(modeRef.current, next);
        setRound(nr);
        window.setTimeout(() => speak(nr.voice), 200);
      }, ROUND_DELAY_MS);
    };

    const handleWrong = (balloon: GameObj) => {
      playSfx('snd-wrong');
      balloon.shakeUntil = k.time() + 0.4;
    };

    round.values.forEach((value, i) => {
      const cx = cellW * (i + 0.5);
      const palette = BALLOON_PALETTES[i % BALLOON_PALETTES.length];
      const darker = palette.map((c) => Math.floor(c * 0.7)) as [
        number,
        number,
        number,
      ];

      const string = k.add([
        k.rect(2, 60),
        k.pos(cx, baseY + 36),
        k.color(180, 180, 200),
        k.anchor('top'),
        'balloon',
      ]);

      const balloon = k.add([
        k.circle(40),
        k.pos(cx, baseY),
        k.color(palette[0], palette[1], palette[2]),
        k.anchor('center'),
        k.area(),
        k.scale(1),
        k.outline(4, k.rgb(darker[0], darker[1], darker[2])),
        'balloon',
        {
          value,
          baseY,
          baseX: cx,
          t: Math.random() * Math.PI * 2,
          shakeUntil: 0,
        },
      ]);

      const highlight = k.add([
        k.circle(9),
        k.pos(cx - 14, baseY - 18),
        k.color(255, 255, 255),
        k.opacity(0.55),
        k.anchor('center'),
        k.follow(balloon, k.vec2(-14, -18)),
        'balloon',
      ]);

      const label = k.add([
        k.text(String(value), { size: 38 }),
        k.pos(cx, baseY),
        k.color(255, 255, 255),
        k.anchor('center'),
        k.follow(balloon, k.vec2(0, 0)),
        'balloon',
      ]);

      const followers = [string, highlight, label];

      balloon.onUpdate(() => {
        balloon.t += k.dt() * 2.4;
        const floatY = Math.sin(balloon.t + i) * 8;
        const time = k.time();
        const shakeDx =
          time < balloon.shakeUntil ? Math.sin(time * 80) * 7 : 0;
        balloon.pos.y = balloon.baseY + floatY;
        balloon.pos.x = balloon.baseX + shakeDx;
        string.pos.x = balloon.pos.x;
        string.pos.y = balloon.pos.y + 36;
      });

      balloon.onClick(() => {
        const cur = roundRef.current;
        if (!cur || lockedRef.current) return;
        if (balloon.value === cur.target) {
          handleCorrect(balloon, followers);
        } else {
          handleWrong(balloon);
        }
      });
    });
  }, [round, phase, addScore]);

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
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-2">
            Chạm vào bong bóng đúng để làm nó nổ tung! Chọn một chế độ chơi nhé.
          </p>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-300 mb-8">
            Engine: Kaboom.js
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
    <div className="animate-in fade-in duration-300 max-w-md mx-auto">
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
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 transition-all duration-500"
          style={{ width: `${(roundIdx / TOTAL_ROUNDS) * 100}%` }}
        />
      </div>

      <div className="text-center mb-3">
        <button
          onClick={() => speak(round.voice)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 rounded-full font-black text-2xl text-slate-700 active:scale-95 transition-all shadow-sm"
        >
          🔊 <span>{round.prompt}</span>
        </button>
      </div>

      <div
        className="relative rounded-3xl overflow-hidden border-2 border-sky-100 shadow-inner bg-sky-50"
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block select-none touch-none"
        />
      </div>

      <button
        onClick={onBack}
        className="mt-5 w-full py-3 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-bold text-sm active:scale-95 transition-all"
      >
        ← Thoát
      </button>
    </div>
  );
}
