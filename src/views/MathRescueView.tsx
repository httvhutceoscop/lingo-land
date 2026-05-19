import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';

const GAME_CONFIG = {
  canvasWidth: 800,
  canvasHeight: 600,
  groundHeight: 22,
  maxLives: 3,
  bubbleRadius: 92,
  scorePerPop: 10,
  spawnEdgeMargin: 110,
  // Each level lifts the fall speed and shortens the spawn interval.
  // Range controls the largest number that can appear (10 or 20).
  levels: [
    { threshold: 0, fallPxPerSec: 55, spawnIntervalMs: 2800, range: 10 },
    { threshold: 60, fallPxPerSec: 75, spawnIntervalMs: 2400, range: 10 },
    { threshold: 150, fallPxPerSec: 95, spawnIntervalMs: 2000, range: 20 },
    { threshold: 280, fallPxPerSec: 115, spawnIntervalMs: 1700, range: 20 },
    { threshold: 450, fallPxPerSec: 140, spawnIntervalMs: 1500, range: 20 },
  ],
};

const ANIMAL_EMOJIS = [
  '🐶', '🐱', '🐰', '🐻', '🦊', '🐼', '🐯', '🐵', '🐸', '🐤', '🦁', '🐷',
];

type Palette = { fill: string; stroke: string; glow: string };

const BUBBLE_PALETTES: Palette[] = [
  { fill: '#ffd6e7', stroke: '#ec4899', glow: 'rgba(236,72,153,0.35)' },
  { fill: '#cce7ff', stroke: '#3b82f6', glow: 'rgba(59,130,246,0.35)' },
  { fill: '#d1fae5', stroke: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  { fill: '#fde68a', stroke: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  { fill: '#e9d5ff', stroke: '#a855f7', glow: 'rgba(168,85,247,0.35)' },
];

const HS_KEY = 'lingoland_mathrescue_hs';

type Bubble = {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  mathString: string;
  answer: number;
  palette: Palette;
  animalIcon: string;
  wobble: number;
  wobbleSpeed: number;
};

type PopEffect = {
  id: number;
  x: number;
  y: number;
  start: number;
  palette: Palette;
};

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function levelIdxFor(score: number): number {
  for (let i = GAME_CONFIG.levels.length - 1; i >= 0; i--) {
    if (score >= GAME_CONFIG.levels[i].threshold) return i;
  }
  return 0;
}

let bubbleIdSeq = 0;
let popIdSeq = 0;

function makeBubble(score: number): Bubble {
  const lv = GAME_CONFIG.levels[levelIdxFor(score)];
  const isPlus = Math.random() < 0.5;
  let a: number;
  let b: number;
  let answer: number;
  let op: string;
  if (isPlus) {
    answer = randInt(1, lv.range);
    a = randInt(0, answer);
    b = answer - a;
    op = '+';
  } else {
    a = randInt(2, lv.range);
    b = randInt(0, a);
    answer = a - b;
    op = '−';
  }
  return {
    id: ++bubbleIdSeq,
    x: randInt(
      GAME_CONFIG.spawnEdgeMargin,
      GAME_CONFIG.canvasWidth - GAME_CONFIG.spawnEdgeMargin,
    ),
    y: -GAME_CONFIG.bubbleRadius,
    radius: GAME_CONFIG.bubbleRadius,
    speed: lv.fallPxPerSec * (0.85 + Math.random() * 0.3),
    mathString: `${a} ${op} ${b}`,
    answer,
    palette: BUBBLE_PALETTES[randInt(0, BUBBLE_PALETTES.length - 1)],
    animalIcon: ANIMAL_EMOJIS[randInt(0, ANIMAL_EMOJIS.length - 1)],
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 1 + Math.random() * 0.8,
  };
}

type Props = { onBack: () => void };

export default function MathRescueView({ onBack }: Props) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(GAME_CONFIG.maxLives);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [bottomFlash, setBottomFlash] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const popsRef = useRef<PopEffect[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(GAME_CONFIG.maxLives);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const wrongTimerRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const stopLoops = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (spawnTimerRef.current !== null) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    if (wrongTimerRef.current !== null) {
      window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  const scheduleNextSpawn = useCallback(() => {
    if (spawnTimerRef.current !== null) {
      window.clearTimeout(spawnTimerRef.current);
    }
    const lv = GAME_CONFIG.levels[levelIdxFor(scoreRef.current)];
    spawnTimerRef.current = window.setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      bubblesRef.current.push(makeBubble(scoreRef.current));
      scheduleNextSpawn();
    }, lv.spawnIntervalMs);
  }, []);

  const drawBubble = useCallback(
    (ctx: CanvasRenderingContext2D, b: Bubble, drawX: number) => {
      const { y, radius, palette } = b;
      ctx.save();
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 22;
      const grad = ctx.createRadialGradient(
        drawX - radius * 0.35,
        y - radius * 0.4,
        radius * 0.1,
        drawX,
        y,
        radius,
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.4, palette.fill);
      grad.addColorStop(1, palette.stroke);
      ctx.beginPath();
      ctx.arc(drawX, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = palette.stroke;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(
        drawX - radius * 0.35,
        y - radius * 0.4,
        radius * 0.22,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${radius * 0.7}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(b.animalIcon, drawX, y - radius * 0.18);

      const maxTextWidth = radius * 1.5;
      let mathFontSize = radius * 0.84;
      ctx.font = `900 ${mathFontSize}px Nunito, sans-serif`;
      const measured = ctx.measureText(b.mathString).width;
      if (measured > maxTextWidth) {
        mathFontSize *= maxTextWidth / measured;
        ctx.font = `900 ${mathFontSize}px Nunito, sans-serif`;
      }
      ctx.fillStyle = '#1e293b';
      ctx.fillText(b.mathString, drawX, y + radius * 0.42);
    },
    [],
  );

  const drawPop = useCallback(
    (ctx: CanvasRenderingContext2D, p: PopEffect, now: number) => {
      const elapsed = now - p.start;
      const duration = 600;
      const t = Math.min(elapsed / duration, 1);
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const r = 24 + (t + i * 0.12) * 110;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = p.palette.stroke;
        ctx.globalAlpha = Math.max(0, (1 - t) * (1 - i * 0.25));
        ctx.lineWidth = 6 * (1 - t * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    },
    [],
  );

  const tick = useCallback(
    (timestamp: number) => {
      if (phaseRef.current !== 'playing') return;
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const prev = lastTimestampRef.current;
      const dt = prev === null ? 0 : Math.min((timestamp - prev) / 1000, 0.05);
      lastTimestampRef.current = timestamp;

      const W = GAME_CONFIG.canvasWidth;
      const H = GAME_CONFIG.canvasHeight;

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#bae6fd');
      sky.addColorStop(1, '#fce7f3');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(140, 90, 70, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(560, 140, 90, 26, 0, 0, Math.PI * 2);
      ctx.ellipse(680, 60, 50, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, H - GAME_CONFIG.groundHeight, W, GAME_CONFIG.groundHeight);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, H - GAME_CONFIG.groundHeight, W, 4);

      const remaining: Bubble[] = [];
      let lostThisFrame = 0;
      for (const b of bubblesRef.current) {
        b.y += b.speed * dt;
        b.wobble += b.wobbleSpeed * dt;
        const drawX = b.x + Math.sin(b.wobble) * 8;
        if (b.y + b.radius * 0.6 >= H - GAME_CONFIG.groundHeight) {
          lostThisFrame += 1;
          popsRef.current.push({
            id: ++popIdSeq,
            x: drawX,
            y: H - GAME_CONFIG.groundHeight - 8,
            start: performance.now(),
            palette: { ...b.palette, stroke: '#ef4444' },
          });
          continue;
        }
        drawBubble(ctx, b, drawX);
        remaining.push(b);
      }
      bubblesRef.current = remaining;

      const now = performance.now();
      popsRef.current = popsRef.current.filter((p) => now - p.start < 600);
      for (const p of popsRef.current) drawPop(ctx, p, now);

      if (lostThisFrame > 0) {
        const newLives = Math.max(0, livesRef.current - lostThisFrame);
        livesRef.current = newLives;
        setLives(newLives);
        setBottomFlash(true);
        if (flashTimerRef.current !== null) {
          window.clearTimeout(flashTimerRef.current);
        }
        flashTimerRef.current = window.setTimeout(() => {
          setBottomFlash(false);
          flashTimerRef.current = null;
        }, 360);
        playSfx('snd-wrong');
        if (newLives <= 0) {
          phaseRef.current = 'finished';
          setPhase('finished');
          stopLoops();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [drawBubble, drawPop, stopLoops],
  );

  const resumeLoops = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    lastTimestampRef.current = null;
    scheduleNextSpawn();
    rafRef.current = requestAnimationFrame(tick);
  }, [scheduleNextSpawn, tick]);

  const requestExit = useCallback(() => {
    stopLoops();
    setShowExitConfirm(true);
  }, [stopLoops]);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
    resumeLoops();
  }, [resumeLoops]);

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    onBack();
  }, [onBack]);

  const startGame = useCallback(() => {
    stopLoops();
    bubblesRef.current = [];
    popsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = GAME_CONFIG.maxLives;
    setScore(0);
    setLives(GAME_CONFIG.maxLives);
    setWrongFlash(null);
    setBottomFlash(false);
    phaseRef.current = 'playing';
    setPhase('playing');
    lastTimestampRef.current = null;
    bubblesRef.current.push(makeBubble(0));
    scheduleNextSpawn();
    rafRef.current = requestAnimationFrame(tick);
  }, [scheduleNextSpawn, stopLoops, tick]);

  useEffect(() => {
    return () => stopLoops();
  }, [stopLoops]);

  useEffect(() => {
    if (phase !== 'playing') stopLoops();
  }, [phase, stopLoops]);

  useEffect(() => {
    if (phase !== 'finished') return;
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(HS_KEY, String(score));
    }
    if (score > 0) {
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.4 },
        colors: ['#ec4899', '#3b82f6', '#a855f7', '#10b981', '#f59e0b'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleKey = (n: number) => {
    if (phaseRef.current !== 'playing' || showExitConfirm) return;
    let match: Bubble | null = null;
    for (const b of bubblesRef.current) {
      if (b.answer !== n) continue;
      if (!match || b.y > match.y) match = b;
    }
    if (match) {
      playSfx('snd-correct');
      const drawX = match.x + Math.sin(match.wobble) * 8;
      popsRef.current.push({
        id: ++popIdSeq,
        x: drawX,
        y: match.y,
        start: performance.now(),
        palette: match.palette,
      });
      const matchId = match.id;
      bubblesRef.current = bubblesRef.current.filter((b) => b.id !== matchId);
      const next = scoreRef.current + GAME_CONFIG.scorePerPop;
      scoreRef.current = next;
      setScore(next);
      addScore(GAME_CONFIG.scorePerPop);
    } else {
      playSfx('snd-wrong');
      setWrongFlash(n);
      if (wrongTimerRef.current !== null) {
        window.clearTimeout(wrongTimerRef.current);
      }
      wrongTimerRef.current = window.setTimeout(() => {
        setWrongFlash((v) => (v === n ? null : v));
        wrongTimerRef.current = null;
      }, 420);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Trò Chơi
        </button>
        <div className="text-center py-6 max-w-md mx-auto">
          <div className="text-7xl mb-4 floating">🚁</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-sky-500 via-pink-500 to-purple-500 bg-clip-text text-transparent leading-tight">
            Biệt Đội Cứu Hộ Toán Học
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Các bạn thú đang mắc kẹt trong bong bóng phép toán! Bấm số đúng để
            giải cứu trước khi bong bóng chạm đất.
          </p>

          <div className="bg-gradient-to-br from-sky-50 to-pink-50 border-2 border-sky-100 rounded-3xl p-5 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">❤️</span> Bé có 3 mạng — bong bóng chạm
              đất sẽ mất 1 mạng.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🔢</span> Bấm số đúng trên bảng số để bong
              bóng nổ tung.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">⚡</span> Càng ghi điểm, bong bóng càng
              rơi nhanh hơn!
            </div>
          </div>

          {highScore > 0 && (
            <div className="mb-4 text-xs font-black text-slate-400 uppercase tracking-widest">
              Kỉ lục:{' '}
              <span className="text-pink-500 text-base ml-1">{highScore}</span>
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full py-5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-sky-500 text-white rounded-3xl shadow-lg shadow-pink-200 active:scale-95 transition-all font-black text-xl"
          >
            🚀 BẮT ĐẦU
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const newRecord = score > 0 && score >= highScore;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{newRecord ? '🏆' : score > 0 ? '🎉' : '💪'}</div>
        <h2 className="text-3xl font-black mb-3">
          {newRecord
            ? 'Kỉ lục mới!'
            : score > 0
              ? 'Chơi hay quá!'
              : 'Ráng thêm nhé!'}
        </h2>
        <div className="bg-slate-50 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-pink-500 to-sky-500 bg-clip-text text-transparent">
            {score}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Điểm vừa đạt
          </div>
          <div className="mt-3 text-xs font-bold text-slate-400">
            Kỉ lục:{' '}
            <span className="text-pink-500">{Math.max(highScore, score)}</span>
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
            onClick={startGame}
            className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  const level = levelIdxFor(score) + 1;
  return (
    <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-0.5 text-xl">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={i < lives ? '' : 'grayscale opacity-25'}
            >
              ❤️
            </span>
          ))}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Điểm{' '}
          <span className="text-pink-500 text-lg ml-1">{score}</span>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Cấp{' '}
          <span className="text-sky-500 text-lg ml-1">{level}</span>
        </div>
      </div>

      <div
        className={`relative rounded-3xl overflow-hidden border-4 transition-colors shadow-lg ${
          bottomFlash ? 'border-red-400' : 'border-sky-200'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.canvasWidth}
          height={GAME_CONFIG.canvasHeight}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {bottomFlash && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-red-500/70 to-transparent pointer-events-none animate-pulse" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: 21 }, (_, n) => {
          const isWrong = wrongFlash === n;
          return (
            <button
              key={n}
              onClick={() => handleKey(n)}
              className={`aspect-square rounded-2xl font-black text-lg sm:text-2xl shadow active:scale-95 transition-all ${
                isWrong
                  ? 'bg-red-200 text-red-700 border-2 border-red-300 shake-x'
                  : 'bg-white text-slate-700 border-2 border-slate-100 hover:border-sky-300'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      <button
        onClick={requestExit}
        className="mt-4 w-full py-3 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-bold text-sm active:scale-95 transition-all"
      >
        ← Thoát
      </button>

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 animate-in fade-in duration-200"
          onClick={cancelExit}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🤔</div>
              <h3 className="text-xl font-black text-slate-800">Thoát game?</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Điểm chơi đang ghi sẽ không được giữ lại nhé.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelExit}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 active:scale-95 transition-all"
              >
                Chơi tiếp
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
