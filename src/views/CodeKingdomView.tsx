import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';

type Phase = 'building' | 'running' | 'won' | 'lost';
type Direction = 0 | 1 | 2 | 3; // UP, RIGHT, DOWN, LEFT
type Command = 'forward' | 'left' | 'right';

type LevelDef = {
  id: string;
  name: string;
  hint: string;
  cols: number;
  rows: number;
  layout: string[]; // chars: '.', '#', '*', 'P', 'S' (start marker, treated as '.')
  start: { x: number; y: number; dir: Direction };
};

// Level catalog. Path is constrained so kids must plan turns and walls force
// them through the gems. Keep "rows" and chars in "layout" matching `cols`.
const LEVELS: LevelDef[] = [
  {
    id: 'lv1',
    name: 'Đường thẳng',
    hint: 'Bấm "Đi thẳng" để robot tiến từng ô. Nhặt kim cương và bay vào cổng nhé!',
    cols: 5,
    rows: 5,
    layout: [
      '.....',
      '.....',
      'S*.*P',
      '.....',
      '.....',
    ],
    start: { x: 0, y: 2, dir: 1 },
  },
  {
    id: 'lv2',
    name: 'Khúc cua đầu tiên',
    hint: 'Lần này phải xoay! Dùng Rẽ trái hoặc Rẽ phải để robot xoay 90°.',
    cols: 5,
    rows: 5,
    layout: [
      '*..*P',
      '.....',
      '.....',
      '.....',
      'S....',
    ],
    start: { x: 0, y: 4, dir: 0 },
  },
  {
    id: 'lv3',
    name: 'Mê cung nhỏ',
    hint: 'Có đá cản đường! Hãy đi vòng để nhặt kim cương rồi mới về cổng.',
    cols: 5,
    rows: 5,
    layout: [
      'S#...',
      '.##..',
      '..*..',
      '.....',
      '....P',
    ],
    start: { x: 0, y: 0, dir: 1 },
  },
  {
    id: 'lv4',
    name: 'Hành trình lớn',
    hint: 'Đường dài hơn, có đá lớn — hãy lên kế hoạch trước khi bấm CHẠY!',
    cols: 6,
    rows: 6,
    layout: [
      'S....*',
      '.####.',
      '......',
      '*####.',
      '......',
      '.####P',
    ],
    start: { x: 0, y: 0, dir: 1 },
  },
];

const STEP_DURATION_MS = 500;
const CANVAS_SIZE = 480;
const PASSED_KEY = 'lingoland_codekingdom_passed';
const MAX_COMMANDS = 40;
const SCORE_PER_WIN = 30;

const DIR_DELTA: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // UP
  [1, 0], // RIGHT
  [0, 1], // DOWN
  [-1, 0], // LEFT
];

const COMMAND_META: Record<
  Command,
  { label: string; icon: string; bg: string; ring: string; text: string }
> = {
  forward: {
    label: 'Đi thẳng',
    icon: '⬆️',
    bg: 'from-emerald-400 to-teal-500',
    ring: 'ring-emerald-200',
    text: 'text-emerald-700',
  },
  left: {
    label: 'Rẽ trái',
    icon: '↺',
    bg: 'from-sky-400 to-blue-500',
    ring: 'ring-sky-200',
    text: 'text-sky-700',
  },
  right: {
    label: 'Rẽ phải',
    icon: '↻',
    bg: 'from-fuchsia-400 to-pink-500',
    ring: 'ring-fuchsia-200',
    text: 'text-fuchsia-700',
  },
};

type CellKind = 'empty' | 'wall' | 'gem' | 'portal';

function cellAt(level: LevelDef, x: number, y: number): CellKind {
  if (x < 0 || x >= level.cols || y < 0 || y >= level.rows) return 'wall';
  const ch = level.layout[y]?.[x] ?? '.';
  if (ch === '#') return 'wall';
  if (ch === '*') return 'gem';
  if (ch === 'P') return 'portal';
  return 'empty';
}

function gemCoords(level: LevelDef): string[] {
  const out: string[] = [];
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      if (cellAt(level, x, y) === 'gem') out.push(`${x},${y}`);
    }
  }
  return out;
}

type Outcome = 'ok' | 'wall' | 'edge';

type StepPlan = {
  command: Command;
  fromX: number;
  fromY: number;
  fromAngle: number;
  toX: number;
  toY: number;
  toAngle: number;
  bumpAt?: { x: number; y: number }; // For wall/edge: visual target before bouncing back
  outcome: Outcome;
};

function dirToAngle(d: Direction): number {
  // 0° = UP (north). Robot faces "up" in canvas coords.
  return d * 90;
}

function planStep(
  state: { gx: number; gy: number; dir: Direction; angle: number },
  cmd: Command,
  level: LevelDef,
): StepPlan {
  if (cmd === 'left' || cmd === 'right') {
    const delta = cmd === 'right' ? 90 : -90;
    return {
      command: cmd,
      fromX: state.gx,
      fromY: state.gy,
      fromAngle: state.angle,
      toX: state.gx,
      toY: state.gy,
      toAngle: state.angle + delta,
      outcome: 'ok',
    };
  }
  const [dx, dy] = DIR_DELTA[state.dir];
  const nx = state.gx + dx;
  const ny = state.gy + dy;
  if (nx < 0 || nx >= level.cols || ny < 0 || ny >= level.rows) {
    return {
      command: cmd,
      fromX: state.gx,
      fromY: state.gy,
      fromAngle: state.angle,
      toX: state.gx,
      toY: state.gy,
      toAngle: state.angle,
      bumpAt: { x: nx, y: ny },
      outcome: 'edge',
    };
  }
  if (cellAt(level, nx, ny) === 'wall') {
    return {
      command: cmd,
      fromX: state.gx,
      fromY: state.gy,
      fromAngle: state.angle,
      toX: state.gx,
      toY: state.gy,
      toAngle: state.angle,
      bumpAt: { x: nx, y: ny },
      outcome: 'wall',
    };
  }
  return {
    command: cmd,
    fromX: state.gx,
    fromY: state.gy,
    fromAngle: state.angle,
    toX: nx,
    toY: ny,
    toAngle: state.angle,
    outcome: 'ok',
  };
}

function loadPassed(): Set<string> {
  try {
    const raw = localStorage.getItem(PASSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === 'string'));
  } catch {
    // ignore
  }
  return new Set();
}

function savePassed(set: Set<string>) {
  try {
    localStorage.setItem(PASSED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

type Props = { onBack: () => void };

export default function CodeKingdomView({ onBack }: Props) {
  const { addScore } = useGame();
  const [passed, setPassed] = useState<Set<string>>(() => loadPassed());
  const [levelIdx, setLevelIdx] = useState<number | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [phase, setPhase] = useState<Phase>('building');
  const [collectedCount, setCollectedCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const level = levelIdx !== null ? LEVELS[levelIdx] : null;
  const gemTotal = useMemo(() => (level ? gemCoords(level).length : 0), [level]);

  // Animation refs — kept out of React state so RAF doesn't churn the tree.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const robotRef = useRef<{ gx: number; gy: number; dir: Direction; angle: number }>({
    gx: 0,
    gy: 0,
    dir: 0,
    angle: 0,
  });
  const queueRef = useRef<Command[]>([]);
  const stepRef = useRef<{ plan: StepPlan; startedAt: number } | null>(null);
  const collectedRef = useRef<Set<string>>(new Set());

  const resetRobotForLevel = useCallback((lv: LevelDef) => {
    robotRef.current = {
      gx: lv.start.x,
      gy: lv.start.y,
      dir: lv.start.dir,
      angle: dirToAngle(lv.start.dir),
    };
    collectedRef.current = new Set();
    setCollectedCount(0);
    stepRef.current = null;
    queueRef.current = [];
  }, []);

  const pickLevel = useCallback(
    (idx: number) => {
      const lv = LEVELS[idx];
      if (!lv) return;
      // Only allow unlocked levels: first + any after a passed level.
      const unlocked = idx === 0 || passed.has(LEVELS[idx - 1].id);
      if (!unlocked) return;
      setLevelIdx(idx);
      setCommands([]);
      setPhase('building');
      resetRobotForLevel(lv);
    },
    [passed, resetRobotForLevel],
  );

  const exitToMenu = useCallback(() => {
    setLevelIdx(null);
    setCommands([]);
    setPhase('building');
  }, []);

  const addCommand = useCallback(
    (cmd: Command) => {
      if (phase !== 'building') return;
      setCommands((cs) => (cs.length >= MAX_COMMANDS ? cs : [...cs, cmd]));
    },
    [phase],
  );

  const popCommand = useCallback(() => {
    if (phase !== 'building') return;
    setCommands((cs) => cs.slice(0, -1));
  }, [phase]);

  const clearCommands = useCallback(() => {
    if (phase !== 'building') return;
    setCommands([]);
  }, [phase]);

  const tryRunCommands = useCallback(() => {
    if (!level || phase !== 'building' || commands.length === 0) return;
    resetRobotForLevel(level);
    queueRef.current = [...commands];
    stepRef.current = null;
    setPhase('running');
  }, [commands, level, phase, resetRobotForLevel]);

  // Reset the puzzle back to building, keeping commands so the kid can edit them.
  const tryAgain = useCallback(() => {
    if (!level) return;
    resetRobotForLevel(level);
    setPhase('building');
  }, [level, resetRobotForLevel]);

  // Persist passed when set changes.
  useEffect(() => {
    savePassed(passed);
  }, [passed]);

  // Initialise robot when level changes.
  useEffect(() => {
    if (level) resetRobotForLevel(level);
  }, [level, resetRobotForLevel]);

  // ─── Animation / step driver ───────────────────────────────────────────
  const finishStep = useCallback(
    (plan: StepPlan) => {
      if (!level) return;
      // Apply turn/move to logical state.
      const r = robotRef.current;
      r.gx = plan.toX;
      r.gy = plan.toY;
      r.angle = plan.toAngle;
      r.dir = ((((Math.round(plan.toAngle / 90) % 4) + 4) % 4) as Direction);

      if (plan.outcome === 'wall' || plan.outcome === 'edge') {
        // Crash. Bail out — animation loop will pick it up via phase change.
        setPhase('lost');
        playSfx('snd-wrong');
        stepRef.current = null;
        queueRef.current = [];
        return;
      }

      // Collect gem if on one.
      const key = `${r.gx},${r.gy}`;
      const onGem = cellAt(level, r.gx, r.gy) === 'gem';
      if (onGem && !collectedRef.current.has(key)) {
        collectedRef.current.add(key);
        setCollectedCount(collectedRef.current.size);
        playSfx('snd-correct');
      }

      stepRef.current = null;
      // Pop next, or end run.
      if (queueRef.current.length === 0) {
        // Check win condition.
        const allGems = collectedRef.current.size === gemTotal;
        const atPortal = cellAt(level, r.gx, r.gy) === 'portal';
        if (allGems && atPortal) {
          setPhase('won');
          playSfx('snd-correct');
          confetti({
            particleCount: 130,
            spread: 80,
            origin: { y: 0.4 },
            colors: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'],
          });
          addScore(SCORE_PER_WIN);
          if (level && !passed.has(level.id)) {
            const next = new Set(passed);
            next.add(level.id);
            setPassed(next);
          }
        } else {
          setPhase('lost');
          playSfx('snd-wrong');
        }
        return;
      }
      // Start next step in next frame.
    },
    [addScore, gemTotal, level, passed],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, now: number) => {
      const lv = level;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Backdrop
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
      bg.addColorStop(0, '#dbeafe');
      bg.addColorStop(1, '#ede9fe');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (!lv) return;

      const cell = Math.floor(CANVAS_SIZE / Math.max(lv.cols, lv.rows));
      const gridW = cell * lv.cols;
      const gridH = cell * lv.rows;
      const offX = Math.floor((CANVAS_SIZE - gridW) / 2);
      const offY = Math.floor((CANVAS_SIZE - gridH) / 2);

      // Grid cells
      for (let y = 0; y < lv.rows; y++) {
        for (let x = 0; x < lv.cols; x++) {
          const px = offX + x * cell;
          const py = offY + y * cell;
          const kind = cellAt(lv, x, y);
          // Checkered ground for visibility
          ctx.fillStyle = (x + y) % 2 === 0 ? '#ecfeff' : '#f0f9ff';
          ctx.fillRect(px, py, cell, cell);
          ctx.strokeStyle = 'rgba(148,163,184,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const cx = px + cell / 2;
          const cy = py + cell / 2;

          if (kind === 'wall') {
            ctx.fillStyle = '#475569';
            ctx.fillRect(px + 4, py + 4, cell - 8, cell - 8);
            ctx.font = `${Math.floor(cell * 0.7)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            ctx.fillText('🧱', cx, cy);
          } else if (kind === 'portal') {
            ctx.font = `${Math.floor(cell * 0.7)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            // Soft pulsing glow
            const glow = 0.5 + 0.5 * Math.sin(now / 350);
            ctx.save();
            ctx.shadowColor = `rgba(168, 85, 247, ${0.4 + glow * 0.4})`;
            ctx.shadowBlur = 18;
            ctx.fillText('🌀', cx, cy);
            ctx.restore();
          } else if (kind === 'gem') {
            const collected = collectedRef.current.has(`${x},${y}`);
            if (!collected) {
              const bob = Math.sin(now / 300 + x + y) * 2;
              ctx.font = `${Math.floor(cell * 0.6)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
              ctx.fillText('💎', cx, cy + bob);
            }
          }
        }
      }

      // Compute robot draw position.
      const step = stepRef.current;
      let vx = robotRef.current.gx;
      let vy = robotRef.current.gy;
      let angle = robotRef.current.angle;
      if (step) {
        const elapsed = now - step.startedAt;
        const t = Math.min(1, Math.max(0, elapsed / STEP_DURATION_MS));
        // Easing — ease-out cubic for movement feels snappy yet smooth.
        const ease = 1 - Math.pow(1 - t, 3);
        if (step.plan.outcome === 'ok') {
          vx = step.plan.fromX + (step.plan.toX - step.plan.fromX) * ease;
          vy = step.plan.fromY + (step.plan.toY - step.plan.fromY) * ease;
          angle = step.plan.fromAngle + (step.plan.toAngle - step.plan.fromAngle) * ease;
        } else if (step.plan.bumpAt) {
          // Bump: go halfway towards bumpAt then back. Forward only — turns
          // can't crash, so we won't hit this branch for them.
          const k = t < 0.5 ? t * 2 : (1 - t) * 2;
          const bumpEase = 1 - Math.pow(1 - k, 2);
          vx = step.plan.fromX + (step.plan.bumpAt.x - step.plan.fromX) * 0.45 * bumpEase;
          vy = step.plan.fromY + (step.plan.bumpAt.y - step.plan.fromY) * 0.45 * bumpEase;
          angle = step.plan.fromAngle;
        }
      }

      const rx = offX + (vx + 0.5) * cell;
      const ry = offY + (vy + 0.5) * cell;

      ctx.save();
      ctx.translate(rx, ry);
      // Body shadow
      ctx.fillStyle = 'rgba(15,23,42,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, cell * 0.35, cell * 0.32, cell * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Direction nose (rotates with angle)
      ctx.save();
      ctx.rotate((angle * Math.PI) / 180);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -cell * 0.42);
      ctx.lineTo(-cell * 0.14, -cell * 0.22);
      ctx.lineTo(cell * 0.14, -cell * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Robot body
      const grad = ctx.createRadialGradient(
        -cell * 0.15,
        -cell * 0.2,
        cell * 0.05,
        0,
        0,
        cell * 0.38,
      );
      grad.addColorStop(0, '#bfdbfe');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, cell * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1d4ed8';
      ctx.stroke();

      // Robot emoji (upright, indicates "the robot")
      ctx.font = `${Math.floor(cell * 0.42)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤖', 0, 0);

      ctx.restore();
    },
    [level],
  );

  // Single RAF loop — always running while a level is selected.
  useEffect(() => {
    if (level === null) return;

    const tick = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Drive step state machine when running.
      if (phase === 'running') {
        if (stepRef.current === null) {
          // Start next step if queue has one.
          const next = queueRef.current.shift();
          if (next !== undefined) {
            const plan = planStep(robotRef.current, next, level);
            stepRef.current = { plan, startedAt: now };
          }
        } else {
          const elapsed = now - stepRef.current.startedAt;
          if (elapsed >= STEP_DURATION_MS) {
            finishStep(stepRef.current.plan);
          }
        }
      }

      draw(ctx, now);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draw, finishStep, level, phase]);

  // ─── UI ─────────────────────────────────────────────────────────────────

  if (level === null) {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Trò Chơi
        </button>

        <div className="text-center mb-6">
          <div className="text-6xl mb-2 floating">🤖</div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent leading-tight">
            Vương Quốc Code Nhí
          </h2>
          <p className="text-slate-500 text-sm font-bold mt-2 max-w-md mx-auto">
            Lập trình cho chú robot 🤖 nhặt kim cương 💎 và đến cổng 🌀 bằng các
            khối lệnh nhé!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LEVELS.map((lv, idx) => {
            const isPassed = passed.has(lv.id);
            const isUnlocked = idx === 0 || passed.has(LEVELS[idx - 1].id);
            return (
              <button
                key={lv.id}
                onClick={() => pickLevel(idx)}
                disabled={!isUnlocked}
                className={`relative p-5 rounded-3xl shadow-lg text-left active:scale-95 transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 text-white shadow-purple-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${
                      isUnlocked ? 'bg-white/25' : 'bg-slate-200'
                    }`}
                  >
                    {isUnlocked ? idx + 1 : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-lg leading-tight">{lv.name}</div>
                    <div
                      className={`text-xs font-bold mt-0.5 ${
                        isUnlocked ? 'opacity-90' : 'opacity-100'
                      }`}
                    >
                      {isUnlocked ? lv.hint : 'Hoàn thành màn trước để mở khoá'}
                    </div>
                  </div>
                  {isPassed && <span className="text-2xl">⭐</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const isLast = levelIdx !== null && levelIdx >= LEVELS.length - 1;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
        >
          ← Chọn màn
        </button>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
          Màn{' '}
          <span className="text-indigo-500 text-lg ml-1">{(levelIdx ?? 0) + 1}</span>
          <span className="mx-2 text-slate-300">·</span>
          💎{' '}
          <span className="text-pink-500 text-lg ml-1">
            {collectedCount}/{gemTotal}
          </span>
        </div>
      </div>

      <div className="mb-2 text-center">
        <div className="font-black text-slate-700 text-lg">{level.name}</div>
        <div className="text-xs font-bold text-slate-500 max-w-sm mx-auto">{level.hint}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        {/* Canvas */}
        <div className="relative rounded-3xl overflow-hidden border-4 border-indigo-200 shadow-lg bg-slate-50">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          {phase === 'won' && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl shadow-2xl p-5 mx-4 text-center max-w-xs animate-in zoom-in duration-300">
                <div className="text-5xl mb-2">🎉</div>
                <div className="font-black text-xl text-emerald-600">Tuyệt vời!</div>
                <div className="text-xs font-bold text-slate-500 mt-1">
                  +{SCORE_PER_WIN} điểm
                </div>
              </div>
            </div>
          )}
          {phase === 'lost' && (
            <div className="absolute inset-0 flex items-center justify-center bg-rose-500/25 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl shadow-2xl p-5 mx-4 text-center max-w-xs animate-in zoom-in duration-300">
                <div className="text-5xl mb-2">🛠️</div>
                <div className="font-black text-lg text-rose-600 leading-tight">
                  Lập trình chưa đúng rồi
                </div>
                <div className="text-xs font-bold text-slate-500 mt-1">
                  Hãy sửa lại code nhé!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Commands & workspace */}
        <div className="space-y-3">
          {/* Command palette */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Khối lệnh
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(COMMAND_META) as Command[]).map((c) => {
                const m = COMMAND_META[c];
                return (
                  <button
                    key={c}
                    disabled={phase !== 'building'}
                    onClick={() => addCommand(c)}
                    className={`py-3 rounded-2xl text-white font-black shadow-lg active:scale-95 transition-all bg-gradient-to-br ${m.bg} ${m.ring} ring-2 ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div className="text-2xl leading-none mb-0.5">{m.icon}</div>
                    <div className="text-[11px] leading-none">{m.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workspace */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Bảng lập trình
              </div>
              <div className="text-[10px] font-bold text-slate-400">
                {commands.length}/{MAX_COMMANDS}
              </div>
            </div>
            <div className="min-h-[88px] max-h-[160px] overflow-y-auto p-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
              {commands.length === 0 ? (
                <div className="h-[72px] flex items-center justify-center text-xs font-bold text-slate-400 text-center">
                  Bấm khối lệnh phía trên để thêm vào đây ✨
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commands.map((c, i) => {
                    const m = COMMAND_META[c];
                    return (
                      <div
                        key={i}
                        className={`px-2.5 py-1.5 rounded-xl bg-gradient-to-br ${m.bg} text-white font-black shadow flex items-center gap-1 text-sm`}
                      >
                        <span className="text-[10px] opacity-70">{i + 1}</span>
                        <span className="text-lg leading-none">{m.icon}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {phase === 'building' && (
            <div className="space-y-2">
              <button
                onClick={tryRunCommands}
                disabled={commands.length === 0}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ▶️ CHẠY LỆNH
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={popCommand}
                  disabled={commands.length === 0}
                  className="py-3 bg-white border-2 border-amber-200 text-amber-600 rounded-2xl font-black active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ↩️ Xoá lệnh cuối
                </button>
                <button
                  onClick={clearCommands}
                  disabled={commands.length === 0}
                  className="py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-black active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🗑️ Xoá tất cả
                </button>
              </div>
            </div>
          )}

          {phase === 'running' && (
            <div className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-center animate-pulse">
              🤖 Robot đang chạy lệnh…
            </div>
          )}

          {phase === 'won' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={tryAgain}
                className="py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black active:scale-95 transition-all"
              >
                🔄 Chơi lại
              </button>
              {isLast ? (
                <button
                  onClick={exitToMenu}
                  className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                >
                  🏁 Hoàn tất
                </button>
              ) : (
                <button
                  onClick={() => pickLevel((levelIdx ?? 0) + 1)}
                  className="py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-lg shadow-pink-200 active:scale-95 transition-all"
                >
                  Tiếp ▶️
                </button>
              )}
            </div>
          )}

          {phase === 'lost' && (
            <button
              onClick={tryAgain}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-rose-200 active:scale-95 transition-all"
            >
              🔁 Sửa lại code
            </button>
          )}
        </div>
      </div>

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 animate-in fade-in duration-200"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🤔</div>
              <h3 className="text-xl font-black text-slate-800">Thoát màn này?</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Các lệnh đang xếp sẽ không được lưu lại nhé.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all"
              >
                Chơi tiếp
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  exitToMenu();
                }}
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
