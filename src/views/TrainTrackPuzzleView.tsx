import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';
import {
  playFailHonk,
  playTrainWhistle,
  playWinJingle,
  startChug,
  stopChug,
} from '../lib/trainSounds';

type Dir = 0 | 1 | 2 | 3; // 0 Top, 1 Right, 2 Bottom, 3 Left
type TileType = 'STRAIGHT' | 'CURVE' | 'START' | 'END' | 'EMPTY';
type Rotation = 0 | 90 | 180 | 270;
type Tile = { type: TileType; rotation: Rotation };

type Phase = 'building' | 'simulating' | 'won' | 'lost';

type Placement = { x: number; y: number; type: TileType; rotation: Rotation };

type LevelDef = {
  id: string;
  name: string;
  hint: string;
  cols: number;
  rows: number;
  pieces: Placement[];
  scoreOnPass: number;
};

// Solution rotations are encoded so STRAIGHT/CURVE pieces can be re-rotated at
// build time into a scrambled puzzle. START/END are fixed and ignore rotation.
const LEVELS: LevelDef[] = [
  {
    id: 'tt1',
    name: 'Đường thẳng',
    hint: 'Xoay từng mảnh ray sao cho tàu 🚂 chạy thẳng từ ga 🏪 tới cờ 🏁 nhé!',
    cols: 4,
    rows: 3,
    pieces: [
      { x: 0, y: 1, type: 'START', rotation: 0 },
      { x: 1, y: 1, type: 'STRAIGHT', rotation: 0 },
      { x: 2, y: 1, type: 'STRAIGHT', rotation: 0 },
      { x: 3, y: 1, type: 'END', rotation: 0 },
    ],
    scoreOnPass: 20,
  },
  {
    id: 'tt2',
    name: 'Khúc cua chữ Z',
    hint: 'Bây giờ có cả ray cong nhé! Xoay đúng hướng để tàu đi qua khúc cua.',
    cols: 5,
    rows: 4,
    pieces: [
      { x: 0, y: 1, type: 'START', rotation: 0 },
      { x: 1, y: 1, type: 'STRAIGHT', rotation: 0 },
      { x: 2, y: 1, type: 'CURVE', rotation: 90 }, // Left + Bottom
      { x: 2, y: 2, type: 'CURVE', rotation: 270 }, // Top + Right
      { x: 3, y: 2, type: 'STRAIGHT', rotation: 0 },
      { x: 4, y: 2, type: 'END', rotation: 0 },
    ],
    scoreOnPass: 30,
  },
  {
    id: 'tt3',
    name: 'Mê cung lắt léo',
    hint: 'Bản đồ rộng với nhiều ô trống làm vật cản — xoay đúng từng mảnh nhé!',
    cols: 6,
    rows: 5,
    pieces: [
      { x: 0, y: 1, type: 'START', rotation: 0 },
      { x: 1, y: 1, type: 'STRAIGHT', rotation: 0 },
      { x: 2, y: 1, type: 'CURVE', rotation: 90 }, // Left + Bottom
      { x: 2, y: 2, type: 'STRAIGHT', rotation: 90 }, // Top + Bottom
      { x: 2, y: 3, type: 'CURVE', rotation: 270 }, // Top + Right
      { x: 3, y: 3, type: 'STRAIGHT', rotation: 0 },
      { x: 4, y: 3, type: 'CURVE', rotation: 180 }, // Top + Left
      { x: 4, y: 2, type: 'STRAIGHT', rotation: 90 },
      { x: 4, y: 1, type: 'CURVE', rotation: 0 }, // Right + Bottom
      { x: 5, y: 1, type: 'END', rotation: 0 },
    ],
    scoreOnPass: 50,
  },
];

const BASE_CONNECTIONS: Record<TileType, ReadonlyArray<Dir>> = {
  STRAIGHT: [1, 3],
  CURVE: [1, 2],
  START: [1],
  END: [3],
  EMPTY: [],
};

const DIR_DELTA: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const EDGE_MIDPOINT: Record<Dir, readonly [number, number]> = {
  0: [0.5, 0],
  1: [1, 0.5],
  2: [0.5, 1],
  3: [0, 0.5],
};

const CANVAS_W = 600;
const CANVAS_H = 450;
const STEP_DURATION_MS = 380;
const END_PAUSE_MS = 700;
const SCORE_KEY = 'lingoland_traintrack_passed';

function rotateDir(d: Dir, rotation: Rotation): Dir {
  return ((d + rotation / 90) % 4) as Dir;
}

function getConnections(tile: Tile): Dir[] {
  return BASE_CONNECTIONS[tile.type].map((d) => rotateDir(d, tile.rotation));
}

function oppositeDir(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

function cloneGrid(grid: Tile[][]): Tile[][] {
  return grid.map((row) => row.map((t) => ({ ...t })));
}

function makeGrid(level: LevelDef, randomize: boolean): Tile[][] {
  const grid: Tile[][] = Array.from({ length: level.rows }, () =>
    Array.from({ length: level.cols }, () => ({ type: 'EMPTY' as TileType, rotation: 0 as Rotation })),
  );
  for (const p of level.pieces) {
    grid[p.y][p.x] = {
      type: p.type,
      rotation: p.type === 'START' || p.type === 'END' ? 0 : p.rotation,
    };
  }
  if (randomize) {
    for (const p of level.pieces) {
      if (p.type === 'STRAIGHT' || p.type === 'CURVE') {
        grid[p.y][p.x].rotation = ((Math.floor(Math.random() * 4) * 90) as Rotation);
      }
    }
  }
  return grid;
}

// Re-roll initial rotations until the puzzle is NOT already solved.
function makeScrambledGrid(level: LevelDef): Tile[][] {
  for (let attempt = 0; attempt < 30; attempt++) {
    const g = makeGrid(level, true);
    if (!findPath(g).success) return g;
  }
  return makeGrid(level, true);
}

type PathStep = {
  x: number;
  y: number;
  type: TileType;
  enterDir: Dir | null;
  exitDir: Dir | null;
};

type PathResult = {
  steps: PathStep[];
  success: boolean;
  failExitDir?: Dir; // direction the train tried to leave the last step in
};

function findStart(grid: Tile[][]): { x: number; y: number } | null {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x].type === 'START') return { x, y };
    }
  }
  return null;
}

function findPath(grid: Tile[][]): PathResult {
  const start = findStart(grid);
  if (!start) return { steps: [], success: false };

  const cols = grid[0].length;
  const rows = grid.length;
  const steps: PathStep[] = [];

  let cx = start.x;
  let cy = start.y;
  let enterDir: Dir | null = null;
  let exitDir: Dir | null = getConnections(grid[cy][cx])[0] ?? null;

  // Cap iterations to total cell count so a malformed grid can't loop forever.
  let safety = cols * rows + 5;

  while (safety-- > 0) {
    const tile = grid[cy][cx];
    steps.push({ x: cx, y: cy, type: tile.type, enterDir, exitDir });

    if (tile.type === 'END') return { steps, success: true };
    if (exitDir === null) return { steps, success: false, failExitDir: undefined };

    const delta: readonly [number, number] = DIR_DELTA[exitDir];
    const nx: number = cx + delta[0];
    const ny: number = cy + delta[1];
    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
      return { steps, success: false, failExitDir: exitDir };
    }
    const nextTile: Tile = grid[ny][nx];
    const nextEnter: Dir = oppositeDir(exitDir);
    if (nextTile.type === 'EMPTY' || !getConnections(nextTile).includes(nextEnter)) {
      return { steps, success: false, failExitDir: exitDir };
    }

    const conns: Dir[] = getConnections(nextTile);
    const nextExit: Dir | null =
      nextTile.type === 'END' ? null : conns.find((d) => d !== nextEnter) ?? null;

    cx = nx;
    cy = ny;
    enterDir = nextEnter;
    exitDir = nextExit;
  }
  return { steps, success: false };
}

// Position on a quarter-arc inside a unit cell, parametrized by t ∈ [0, 1].
// Angles below use the canvas convention (0° = +x, 90° = +y) since y is down.
function curvePosition(enterDir: Dir, exitDir: Dir, t: number): { x: number; y: number } {
  const s = new Set<Dir>([enterDir, exitDir]);
  let cx = 0;
  let cy = 0;
  let aEnter = 0;
  let aExit = 0;
  if (s.has(1) && s.has(2)) {
    cx = 1;
    cy = 1;
    aEnter = enterDir === 1 ? 270 : 180;
    aExit = exitDir === 1 ? 270 : 180;
  } else if (s.has(2) && s.has(3)) {
    cx = 0;
    cy = 1;
    aEnter = enterDir === 2 ? 0 : 270;
    aExit = exitDir === 2 ? 0 : 270;
  } else if (s.has(0) && s.has(3)) {
    cx = 0;
    cy = 0;
    aEnter = enterDir === 0 ? 0 : 90;
    aExit = exitDir === 0 ? 0 : 90;
  } else {
    cx = 1;
    cy = 0;
    aEnter = enterDir === 0 ? 180 : 90;
    aExit = exitDir === 0 ? 180 : 90;
  }
  let delta = aExit - aEnter;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const angle = aEnter + delta * t;
  const rad = (angle * Math.PI) / 180;
  return { x: cx + 0.5 * Math.cos(rad), y: cy + 0.5 * Math.sin(rad) };
}

function trainPos(step: PathStep, t: number): { x: number; y: number } {
  const { type, enterDir, exitDir } = step;
  if (type === 'START' && exitDir !== null) {
    const [ex, ey] = EDGE_MIDPOINT[exitDir];
    return { x: 0.5 + (ex - 0.5) * t, y: 0.5 + (ey - 0.5) * t };
  }
  if (type === 'END' && enterDir !== null) {
    const [sx, sy] = EDGE_MIDPOINT[enterDir];
    return { x: sx + (0.5 - sx) * t, y: sy + (0.5 - sy) * t };
  }
  if (type === 'STRAIGHT' && enterDir !== null && exitDir !== null) {
    const [sx, sy] = EDGE_MIDPOINT[enterDir];
    const [ex, ey] = EDGE_MIDPOINT[exitDir];
    return { x: sx + (ex - sx) * t, y: sy + (ey - sy) * t };
  }
  if (type === 'CURVE' && enterDir !== null && exitDir !== null) {
    return curvePosition(enterDir, exitDir, t);
  }
  return { x: 0.5, y: 0.5 };
}

function loadPassed(): Set<string> {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === 'string'));
  } catch {
    /* ignore */
  }
  return new Set();
}

function savePassed(set: Set<string>) {
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

// ── Drawing helpers (in tile-local coords, with `cell` = tile size in px) ──

function drawStraightTrack(ctx: CanvasRenderingContext2D, cell: number) {
  // Wooden ties strip
  ctx.fillStyle = '#fde6c1';
  ctx.fillRect(0, cell * 0.28, cell, cell * 0.44);

  ctx.fillStyle = '#92400e';
  const tieCount = 5;
  for (let i = 0; i < tieCount; i++) {
    const tx = ((i + 0.5) / tieCount) * cell;
    ctx.fillRect(tx - cell * 0.045, cell * 0.24, cell * 0.09, cell * 0.52);
  }

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = cell * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, cell * 0.36);
  ctx.lineTo(cell, cell * 0.36);
  ctx.moveTo(0, cell * 0.64);
  ctx.lineTo(cell, cell * 0.64);
  ctx.stroke();
}

function drawCurveTrack(ctx: CanvasRenderingContext2D, cell: number) {
  // Default curve connects Bottom (south) + Right (east) — arc centred at the
  // bottom-right corner of the tile.
  const cx = cell;
  const cy = cell;

  // Ties: radial spokes along the quarter ring.
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = cell * 0.085;
  ctx.lineCap = 'butt';
  const tieCount = 5;
  for (let i = 0; i < tieCount; i++) {
    const t = (i + 0.5) / tieCount;
    const angle = Math.PI + t * (Math.PI / 2);
    const inner = cell * 0.3;
    const outer = cell * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
    ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
    ctx.stroke();
  }

  // Inner + outer rails.
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = cell * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.36, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.64, Math.PI, Math.PI * 1.5);
  ctx.stroke();
}

function drawStationStub(ctx: CanvasRenderingContext2D, cell: number) {
  ctx.fillStyle = '#fde6c1';
  ctx.fillRect(cell * 0.5, cell * 0.28, cell * 0.5, cell * 0.44);
  ctx.fillStyle = '#92400e';
  for (let i = 0; i < 3; i++) {
    const tx = cell * 0.5 + ((i + 0.5) / 3) * (cell * 0.5);
    ctx.fillRect(tx - cell * 0.045, cell * 0.24, cell * 0.09, cell * 0.52);
  }
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = cell * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cell * 0.5, cell * 0.36);
  ctx.lineTo(cell, cell * 0.36);
  ctx.moveTo(cell * 0.5, cell * 0.64);
  ctx.lineTo(cell, cell * 0.64);
  ctx.stroke();
}

function drawFlagStub(ctx: CanvasRenderingContext2D, cell: number) {
  ctx.fillStyle = '#fde6c1';
  ctx.fillRect(0, cell * 0.28, cell * 0.5, cell * 0.44);
  ctx.fillStyle = '#92400e';
  for (let i = 0; i < 3; i++) {
    const tx = ((i + 0.5) / 3) * (cell * 0.5);
    ctx.fillRect(tx - cell * 0.045, cell * 0.24, cell * 0.09, cell * 0.52);
  }
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = cell * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, cell * 0.36);
  ctx.lineTo(cell * 0.5, cell * 0.36);
  ctx.moveTo(0, cell * 0.64);
  ctx.lineTo(cell * 0.5, cell * 0.64);
  ctx.stroke();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  cell: number,
  isFixed: boolean,
) {
  // Tile background — different shade for fixed (START/END) vs rotatable.
  ctx.fillStyle = isFixed
    ? '#fef3c7'
    : tile.type === 'EMPTY'
      ? '#d1fae5'
      : '#ecfeff';
  ctx.fillRect(2, 2, cell - 4, cell - 4);

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cell - 1, cell - 1);

  if (tile.type === 'EMPTY') {
    // Soft hatched look for obstacle cells
    ctx.font = `${Math.floor(cell * 0.35)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.55;
    ctx.fillText('🌳', cell / 2, cell / 2);
    ctx.globalAlpha = 1;
    return;
  }

  ctx.save();
  ctx.translate(cell / 2, cell / 2);
  ctx.rotate((tile.rotation * Math.PI) / 180);
  ctx.translate(-cell / 2, -cell / 2);
  if (tile.type === 'STRAIGHT') drawStraightTrack(ctx, cell);
  else if (tile.type === 'CURVE') drawCurveTrack(ctx, cell);
  else if (tile.type === 'START') drawStationStub(ctx, cell);
  else if (tile.type === 'END') drawFlagStub(ctx, cell);
  ctx.restore();

  if (tile.type === 'START' || tile.type === 'END') {
    ctx.font = `${Math.floor(cell * 0.55)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const emoji = tile.type === 'START' ? '🏪' : '🏁';
    // For START: emoji on left half. For END: on right half.
    const ex = tile.type === 'START' ? cell * 0.3 : cell * 0.7;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ex, cell * 0.5, cell * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tile.type === 'START' ? '#f97316' : '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillText(emoji, ex, cell * 0.5);
  }
}

// ── Component ───────────────────────────────────────────────────────────────

type Props = { onBack: () => void };

export default function TrainTrackPuzzleView({ onBack }: Props) {
  const { addScore } = useGame();
  const [passed, setPassed] = useState<Set<string>>(() => loadPassed());
  const [levelIdx, setLevelIdx] = useState<number | null>(null);
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [phase, setPhase] = useState<Phase>('building');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const level = levelIdx !== null ? LEVELS[levelIdx] : null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const simStartRef = useRef<number | null>(null);
  const simPathRef = useRef<PathResult | null>(null);
  // Mirror phase/grid in refs so the RAF tick reads the latest values without
  // re-creating the loop on every change.
  const phaseRef = useRef<Phase>('building');
  const gridRef = useRef<Tile[][]>([]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const tileMetrics = useMemo(() => {
    if (!level) return { cell: 100, offX: 0, offY: 0 };
    const cell = Math.floor(Math.min(CANVAS_W / level.cols, CANVAS_H / level.rows));
    const gridW = cell * level.cols;
    const gridH = cell * level.rows;
    return {
      cell,
      offX: Math.floor((CANVAS_W - gridW) / 2),
      offY: Math.floor((CANVAS_H - gridH) / 2),
    };
  }, [level]);

  const pickLevel = useCallback(
    (idx: number) => {
      const lv = LEVELS[idx];
      if (!lv) return;
      const unlocked = idx === 0 || passed.has(LEVELS[idx - 1].id);
      if (!unlocked) return;
      setLevelIdx(idx);
      setGrid(makeScrambledGrid(lv));
      setPhase('building');
      simStartRef.current = null;
      simPathRef.current = null;
    },
    [passed],
  );

  const exitToMenu = useCallback(() => {
    setLevelIdx(null);
    setPhase('building');
    simStartRef.current = null;
    simPathRef.current = null;
  }, []);

  const shuffleAgain = useCallback(() => {
    if (!level) return;
    setGrid(makeScrambledGrid(level));
    setPhase('building');
    simStartRef.current = null;
    simPathRef.current = null;
  }, [level]);

  const tryRunTrain = useCallback(() => {
    if (!level || phaseRef.current !== 'building') return;
    const path = findPath(gridRef.current);
    simPathRef.current = path;
    simStartRef.current = performance.now();
    setPhase('simulating');
    playTrainWhistle();
    startChug();
  }, [level]);

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== 'building') return;
      const canvas = canvasRef.current;
      if (!canvas || !level) return;
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * sx;
      const py = (e.clientY - rect.top) * sy;
      const { cell, offX, offY } = tileMetrics;
      const gx = Math.floor((px - offX) / cell);
      const gy = Math.floor((py - offY) / cell);
      if (gx < 0 || gx >= level.cols || gy < 0 || gy >= level.rows) return;
      const tile = gridRef.current[gy][gx];
      if (tile.type !== 'STRAIGHT' && tile.type !== 'CURVE') return;
      setGrid((g) => {
        const ng = cloneGrid(g);
        ng[gy][gx].rotation = ((ng[gy][gx].rotation + 90) % 360) as Rotation;
        return ng;
      });
      playSfx('snd-correct');
    },
    [level, tileMetrics],
  );

  // Mount / unmount RAF loop while a level is active.
  useEffect(() => {
    if (level === null) return;

    const draw = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Sky/grass background.
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, '#dbeafe');
      bg.addColorStop(1, '#bbf7d0');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const { cell, offX, offY } = tileMetrics;
      const lv = level;
      const g = gridRef.current;

      // Tiles
      for (let y = 0; y < lv.rows; y++) {
        for (let x = 0; x < lv.cols; x++) {
          const tile = g[y][x];
          const isFixed = tile.type === 'START' || tile.type === 'END';
          ctx.save();
          ctx.translate(offX + x * cell, offY + y * cell);
          drawTile(ctx, tile, cell, isFixed);
          ctx.restore();
        }
      }

      // Train animation overlay.
      const sim = simPathRef.current;
      const simStart = simStartRef.current;
      if (sim && simStart !== null && phaseRef.current === 'simulating') {
        const elapsed = now - simStart;
        const totalRun = sim.steps.length * STEP_DURATION_MS;
        let trainStep: PathStep | null = null;
        let trainT = 0;
        let showSmoke = false;
        let showCheckered = false;

        if (elapsed < totalRun) {
          const idx = Math.floor(elapsed / STEP_DURATION_MS);
          trainStep = sim.steps[idx];
          trainT = (elapsed % STEP_DURATION_MS) / STEP_DURATION_MS;
        } else if (elapsed < totalRun + END_PAUSE_MS) {
          // Linger at end-of-run.
          trainStep = sim.steps[sim.steps.length - 1];
          trainT = 1;
          if (!sim.success) showSmoke = true;
          else showCheckered = true;
        } else {
          // Resolve.
          stopChug();
          if (sim.success) {
            setPhase('won');
            confetti({
              particleCount: 130,
              spread: 80,
              origin: { y: 0.5 },
              colors: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'],
            });
            playSfx('snd-correct');
            playWinJingle();
            addScore(lv.scoreOnPass);
            if (!passed.has(lv.id)) {
              const next = new Set(passed);
              next.add(lv.id);
              setPassed(next);
              savePassed(next);
            }
          } else {
            setPhase('lost');
            playSfx('snd-wrong');
            playFailHonk();
          }
          // Reset sim so we don't double-fire.
          simPathRef.current = null;
          simStartRef.current = null;
        }

        if (trainStep) {
          const local = trainPos(trainStep, trainT);
          const tx = offX + trainStep.x * cell + local.x * cell;
          const ty = offY + trainStep.y * cell + local.y * cell;

          // Tiny vertical bob to suggest motion.
          const bob = phaseRef.current === 'simulating' && elapsed < totalRun
            ? Math.sin(elapsed / 60) * cell * 0.03
            : 0;

          // Drop shadow on the ground (kept below the bob so it stays still).
          ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
          ctx.beginPath();
          ctx.ellipse(tx, ty + cell * 0.32, cell * 0.32, cell * 0.09, 0, 0, Math.PI * 2);
          ctx.fill();

          // Solid disk backing so the train emoji never blends into the rails.
          const r = cell * 0.36;
          const disk = ctx.createRadialGradient(tx - r * 0.3, ty - r * 0.3 + bob, r * 0.1, tx, ty + bob, r);
          disk.addColorStop(0, '#fff7ed');
          disk.addColorStop(1, '#fdba74');
          ctx.fillStyle = disk;
          ctx.beginPath();
          ctx.arc(tx, ty + bob, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = Math.max(2, cell * 0.05);
          ctx.strokeStyle = '#c2410c';
          ctx.stroke();

          // Train emoji on top — slightly larger to fill the disk.
          ctx.font = `${Math.floor(cell * 0.55)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚂', tx, ty + bob);

          if (showSmoke) {
            const pulse = 0.6 + 0.4 * Math.sin(now / 180);
            ctx.font = `${Math.floor(cell * 0.55)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            ctx.globalAlpha = pulse;
            ctx.fillText('💨', tx - cell * 0.35, ty - cell * 0.45);
            ctx.fillText('❓', tx + cell * 0.4, ty - cell * 0.4);
            ctx.globalAlpha = 1;
          }
          if (showCheckered) {
            const pulse = 0.6 + 0.4 * Math.sin(now / 200);
            ctx.font = `${Math.floor(cell * 0.45)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            ctx.globalAlpha = pulse;
            ctx.fillText('🎉', tx - cell * 0.45, ty - cell * 0.45);
            ctx.fillText('✨', tx + cell * 0.45, ty - cell * 0.45);
            ctx.globalAlpha = 1;
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      stopChug();
    };
  }, [addScore, level, passed, tileMetrics]);

  // ── Level select screen ───────────────────────────────────────────────────
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
          <div className="text-6xl mb-2 floating">🚂</div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent leading-tight">
            Đường Ray Mê Cung
          </h2>
          <p className="text-slate-500 text-sm font-bold mt-2 max-w-md mx-auto">
            Xoay các mảnh ray để tàu 🚂 chạy từ ga 🏪 đến cờ 🏁. Chạm vào mảnh ray
            để xoay nhé!
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
                    ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-orange-200'
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
          ← Đổi màn
        </button>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
          Màn{' '}
          <span className="text-orange-500 text-lg ml-1">{(levelIdx ?? 0) + 1}</span>
          /{LEVELS.length}
        </div>
      </div>

      <div className="mb-2 text-center">
        <div className="font-black text-slate-700 text-lg">{level.name}</div>
        <div className="text-xs font-bold text-slate-500 max-w-md mx-auto px-2">
          {level.hint}
        </div>
      </div>

      <div className="relative rounded-3xl overflow-hidden border-4 border-orange-200 shadow-lg bg-slate-50 mb-3">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={onCanvasClick}
          style={{ width: '100%', height: 'auto', display: 'block', cursor: phase === 'building' ? 'pointer' : 'default' }}
        />
        {phase === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-5 mx-4 text-center max-w-xs animate-in zoom-in duration-300">
              <div className="text-5xl mb-2">🎉</div>
              <div className="font-black text-xl text-emerald-600">Tàu đã tới đích!</div>
              <div className="text-xs font-bold text-slate-500 mt-1">
                +{level.scoreOnPass} điểm
              </div>
            </div>
          </div>
        )}
        {phase === 'lost' && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-500/25 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-5 mx-4 text-center max-w-xs animate-in zoom-in duration-300">
              <div className="text-5xl mb-2">💨❓</div>
              <div className="font-black text-lg text-rose-600 leading-tight">
                Đường ray bị đứt rồi!
              </div>
              <div className="text-xs font-bold text-slate-500 mt-1">
                Xoay lại các mảnh ray nhé.
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === 'building' && (
        <div className="space-y-2">
          <button
            onClick={tryRunTrain}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            ▶️ CHẠY TÀU
          </button>
          <button
            onClick={shuffleAgain}
            className="w-full py-3 bg-white border-2 border-amber-200 text-amber-600 rounded-2xl font-black active:scale-95 transition-all"
          >
            🔀 Xáo lại
          </button>
        </div>
      )}

      {phase === 'simulating' && (
        <div className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-center animate-pulse">
          🚂 Tàu đang chạy…
        </div>
      )}

      {phase === 'lost' && (
        <button
          onClick={() => setPhase('building')}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-rose-200 active:scale-95 transition-all"
        >
          🔁 Xoay tiếp
        </button>
      )}

      {phase === 'won' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={shuffleAgain}
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
              className="py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all"
            >
              Tiếp ▶️
            </button>
          )}
        </div>
      )}

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
              <div className="text-5xl mb-2">🚂</div>
              <h3 className="text-xl font-black text-slate-800">Đổi màn khác?</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Tiến trình xoay ray ở màn này sẽ không lưu lại nhé.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all"
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
                Đổi màn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
