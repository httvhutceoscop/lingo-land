import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';

type TrashType = 'organic' | 'recyclable' | 'inorganic' | 'hazardous';

type TrashTemplate = {
  emoji: string;
  name: string;
  type: TrashType;
};

const TRASH_ITEMS_POOL: TrashTemplate[] = [
  { emoji: '🍎', name: 'Vỏ táo', type: 'organic' },
  { emoji: '🍌', name: 'Vỏ chuối', type: 'organic' },
  { emoji: '🍃', name: 'Lá cây', type: 'organic' },
  { emoji: '🥦', name: 'Rau thừa', type: 'organic' },
  { emoji: '🍞', name: 'Bánh mì cũ', type: 'organic' },
  { emoji: '🍾', name: 'Chai nhựa', type: 'recyclable' },
  { emoji: '🥫', name: 'Lon nước', type: 'recyclable' },
  { emoji: '📰', name: 'Giấy báo', type: 'recyclable' },
  { emoji: '📦', name: 'Thùng giấy', type: 'recyclable' },
  { emoji: '🥛', name: 'Hộp sữa', type: 'recyclable' },
  { emoji: '👟', name: 'Giày cũ', type: 'inorganic' },
  { emoji: '🧦', name: 'Tất rách', type: 'inorganic' },
  { emoji: '🪞', name: 'Gốm sứ vỡ', type: 'inorganic' },
  { emoji: '🔋', name: 'Pin cũ', type: 'hazardous' },
  { emoji: '💡', name: 'Bóng đèn', type: 'hazardous' },
  { emoji: '🧪', name: 'Hóa chất', type: 'hazardous' },
  { emoji: '🖱️', name: 'Thiết bị điện tử', type: 'hazardous' },
];

type BinSpec = {
  type: TrashType;
  label: string;
  emoji: string;
  fill: string;
  stroke: string;
  text: string;
};

const BIN_SPECS: BinSpec[] = [
  { type: 'organic', label: 'Hữu cơ', emoji: '🍏', fill: '#bbf7d0', stroke: '#16a34a', text: '#166534' },
  { type: 'recyclable', label: 'Tái chế', emoji: '🍾', fill: '#fed7aa', stroke: '#ea580c', text: '#9a3412' },
  { type: 'inorganic', label: 'Vô cơ', emoji: '🪠', fill: '#cbd5e1', stroke: '#475569', text: '#1e293b' },
  { type: 'hazardous', label: 'Nguy hại', emoji: '🔋', fill: '#fecaca', stroke: '#dc2626', text: '#991b1b' },
];

const GAME_CONFIG = {
  // Kích thước nội tại của canvas (px logic, không phải px CSS). Mọi tọa độ vẽ
  // và va chạm tính theo hệ này; CSS sẽ scale lại cho vừa khung. Tỉ lệ ~16:10.
  canvasWidth: 800,
  canvasHeight: 540,
  // Số mạng (❤️) ban đầu. Mỗi món rác trôi khỏi mép phải băng chuyền trừ 1 mạng;
  // về 0 thì Game Over.
  maxLives: 3,
  // Bán kính hình tròn nền chứa emoji rác. Dùng cho cả vẽ và test bấm:
  // chỉ cần khoảng cách từ con trỏ tới tâm ≤ trashRadius là tính là chạm.
  trashRadius: 40,
  // Băng chuyền (conveyor belt) — món rác lăn dọc theo dải này khi không bị kéo.
  // beltTop / beltBottom là cạnh trên & dưới (px). beltY là đường tâm dọc,
  // tức y mặc định của tâm món rác khi đang lăn; khi bé thả ra ngoài thùng,
  // món rác được kéo về beltY để tiếp tục di chuyển.
  beltTop: 150,
  beltBottom: 240,
  beltY: 195,
  // Hàng 4 thùng rác ở nửa dưới canvas.
  // binTop = cạnh trên (cũng chính là "miệng thùng" để rác rơi vào).
  // binBottom = cạnh dưới. binGap = khoảng cách ngang giữa 2 thùng liền kề.
  // binPadX = lề trái/phải của hàng thùng so với mép canvas; computeBinRects()
  // dùng binPadX + binGap để chia đều 4 thùng vào phần chiều rộng còn lại.
  binTop: 320,
  binBottom: 510,
  binGap: 12,
  binPadX: 18,
  // Điểm cộng khi phân loại ĐÚNG (cũng gọi vào addScore của GameContext để
  // tổng điểm toàn app tăng theo).
  scorePerCorrect: 10,
  // Điểm trừ khi bỏ NHẦM thùng. Có clamp Math.max(0, …) nên điểm không xuống
  // dưới 0.
  penaltyPerWrong: 5,
  // Đường cong khó (level curve) — càng nhiều điểm, băng chuyền chạy nhanh hơn
  // và rác xuất hiện dày hơn. levelIdxFor(score) duyệt ngược từ cuối lên, chọn
  // level cao nhất mà score ≥ threshold.
  //   threshold      — điểm tối thiểu để mở khóa level đó.
  //   beltPxPerSec   — tốc độ băng chuyền (px/giây). Vừa dùng để dịch các sọc
  //                    băng (hiệu ứng "đang chạy"), vừa nhân với dt mỗi frame
  //                    để đẩy món rác sang phải. makeTrash() còn nhân thêm
  //                    (0.9 + Math.random()*0.2), tức ±10%, để các món không
  //                    di chuyển đều tăm tắp.
  //   spawnIntervalMs — khoảng cách (ms) giữa hai lần spawn rác. Càng lên
  //                    level cao, rác xuất hiện càng dày.
  levels: [
    { threshold: 0, beltPxPerSec: 55, spawnIntervalMs: 2400 },
    { threshold: 60, beltPxPerSec: 75, spawnIntervalMs: 2000 },
    { threshold: 150, beltPxPerSec: 95, spawnIntervalMs: 1700 },
    { threshold: 280, beltPxPerSec: 120, spawnIntervalMs: 1400 },
    { threshold: 450, beltPxPerSec: 145, spawnIntervalMs: 1150 },
  ],
};

const HS_KEY = 'lingoland_greenknight_hs';

type Trash = {
  id: number;
  x: number;
  y: number;
  type: TrashType;
  name: string;
  emoji: string;
  speed: number;
  // Drag tracking — pointerId is the source of the drag (mouse or touch).
  isDragging: boolean;
  pointerId: number | null;
  // Optional bounce-back animation when player drops in the wrong bin.
  bounce?: {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    elapsed: number;
    duration: number;
  };
};

type Effect = {
  id: number;
  x: number;
  y: number;
  kind: 'correct' | 'wrong';
  start: number;
};

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function levelIdxFor(score: number): number {
  for (let i = GAME_CONFIG.levels.length - 1; i >= 0; i--) {
    if (score >= GAME_CONFIG.levels[i].threshold) return i;
  }
  return 0;
}

let trashIdSeq = 0;
let effectIdSeq = 0;

function makeTrash(score: number): Trash {
  const tmpl = TRASH_ITEMS_POOL[randInt(0, TRASH_ITEMS_POOL.length - 1)];
  const lv = GAME_CONFIG.levels[levelIdxFor(score)];
  return {
    id: ++trashIdSeq,
    x: -GAME_CONFIG.trashRadius,
    y: GAME_CONFIG.beltY,
    type: tmpl.type,
    name: tmpl.name,
    emoji: tmpl.emoji,
    speed: lv.beltPxPerSec * (0.9 + Math.random() * 0.2),
    isDragging: false,
    pointerId: null,
  };
}

type BinRect = { x: number; y: number; w: number; h: number; spec: BinSpec };

function computeBinRects(): BinRect[] {
  const { canvasWidth, binTop, binBottom, binGap, binPadX } = GAME_CONFIG;
  const usableW = canvasWidth - binPadX * 2;
  const binW = (usableW - binGap * (BIN_SPECS.length - 1)) / BIN_SPECS.length;
  return BIN_SPECS.map((spec, i) => ({
    x: binPadX + i * (binW + binGap),
    y: binTop,
    w: binW,
    h: binBottom - binTop,
    spec,
  }));
}

const BIN_RECTS = computeBinRects();

// Generous hitbox extension around each bin — kids only have to drag *near* the
// mouth and the closest bin "magnets" the item. Sides can overlap a neighbour,
// so `findBinAt` disambiguates by picking the bin whose center is closest.
const HIT_PAD_TOP = 70;
const HIT_PAD_BOTTOM = 30;
const HIT_PAD_X = 28;

type Rect = { x: number; y: number; w: number; h: number };

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function binHitRect(b: BinRect): Rect {
  return {
    x: b.x - HIT_PAD_X,
    y: b.y - HIT_PAD_TOP,
    w: b.w + HIT_PAD_X * 2,
    h: b.h + HIT_PAD_TOP + HIT_PAD_BOTTOM,
  };
}

function findBinAt(x: number, y: number): { bin: BinRect; idx: number } | null {
  let best: { bin: BinRect; idx: number } | null = null;
  let bestDist = Infinity;
  BIN_RECTS.forEach((b, idx) => {
    if (!pointInRect(x, y, binHitRect(b))) return;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d < bestDist) {
      bestDist = d;
      best = { bin: b, idx };
    }
  });
  return best;
}

type Props = { onBack: () => void };

export default function GreenKnightRecycleView({ onBack }: Props) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(GAME_CONFIG.maxLives);
  const [savedCount, setSavedCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trashRef = useRef<Trash[]>([]);
  const effectsRef = useRef<Effect[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(GAME_CONFIG.maxLives);
  const savedRef = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const beltOffsetRef = useRef(0);
  const hoverBinIdxRef = useRef<number | null>(null);

  const stopLoops = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (spawnTimerRef.current !== null) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
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
      trashRef.current.push(makeTrash(scoreRef.current));
      scheduleNextSpawn();
    }, lv.spawnIntervalMs);
  }, []);

  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const W = GAME_CONFIG.canvasWidth;
      const H = GAME_CONFIG.canvasHeight;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#bae6fd');
      sky.addColorStop(0.6, '#dcfce7');
      sky.addColorStop(1, '#bbf7d0');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(140, 60, 60, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(560, 90, 80, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(700, 40, 40, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    [],
  );

  const drawBelt = useCallback(
    (ctx: CanvasRenderingContext2D, beltOffset: number) => {
      const W = GAME_CONFIG.canvasWidth;
      const top = GAME_CONFIG.beltTop;
      const bottom = GAME_CONFIG.beltBottom;
      const h = bottom - top;

      ctx.fillStyle = '#475569';
      ctx.fillRect(0, top, W, h);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, top, W, 6);
      ctx.fillRect(0, bottom - 6, W, 6);

      const stripeW = 28;
      const offset = ((beltOffset % stripeW) + stripeW) % stripeW;
      ctx.fillStyle = '#334155';
      for (let x = -stripeW + offset; x < W + stripeW; x += stripeW * 2) {
        ctx.fillRect(x, top + 8, stripeW, h - 16);
      }

      ctx.fillStyle = '#0f172a';
      const wheelY = bottom + 4;
      for (let cx = 30; cx < W; cx += 80) {
        ctx.beginPath();
        ctx.arc(cx, wheelY, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [],
  );

  const drawBins = useCallback((ctx: CanvasRenderingContext2D) => {
    BIN_RECTS.forEach((rect, idx) => {
      const { x, y, w, h, spec } = rect;
      const hovered = hoverBinIdxRef.current === idx;
      ctx.save();
      ctx.lineWidth = hovered ? 6 : 4;
      ctx.strokeStyle = spec.stroke;
      ctx.fillStyle = spec.fill;

      // Bin body with rounded corners
      const r = 18;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (hovered) {
        ctx.shadowColor = spec.stroke;
        ctx.shadowBlur = 22;
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Lid
      ctx.save();
      ctx.fillStyle = spec.stroke;
      ctx.fillRect(x - 6, y - 10, w + 12, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x - 6, y - 10, w + 12, 4);
      ctx.restore();

      // Emoji
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${w * 0.32}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(spec.emoji, x + w / 2, y + h * 0.42);

      // Label
      ctx.font = `900 ${Math.min(w * 0.16, 22)}px Nunito, sans-serif`;
      ctx.fillStyle = spec.text;
      ctx.fillText(spec.label, x + w / 2, y + h * 0.82);
    });
  }, []);

  const drawTrash = useCallback((ctx: CanvasRenderingContext2D, t: Trash) => {
    const r = GAME_CONFIG.trashRadius;
    ctx.save();
    if (t.isDragging) {
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
    }
    const grad = ctx.createRadialGradient(
      t.x - r * 0.3,
      t.y - r * 0.4,
      r * 0.1,
      t.x,
      t.y,
      r,
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, '#f1f5f9');
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${r * 1.2}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.fillText(t.emoji, t.x, t.y);
  }, []);

  const drawEffect = useCallback(
    (ctx: CanvasRenderingContext2D, e: Effect, now: number) => {
      const elapsed = now - e.start;
      const duration = 700;
      const t = Math.min(elapsed / duration, 1);
      const alpha = 1 - t;
      const lift = -60 * t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 44px "Apple Color Emoji", "Segoe UI Emoji", Nunito, sans-serif`;
      ctx.fillText(e.kind === 'correct' ? '✅' : '❌', e.x, e.y + lift);
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
      const lv = GAME_CONFIG.levels[levelIdxFor(scoreRef.current)];

      beltOffsetRef.current -= lv.beltPxPerSec * dt;

      drawBackground(ctx);
      drawBelt(ctx, beltOffsetRef.current);
      drawBins(ctx);

      const remaining: Trash[] = [];
      let lostThisFrame = 0;
      for (const t of trashRef.current) {
        if (t.bounce) {
          t.bounce.elapsed += dt * 1000;
          const k = Math.min(t.bounce.elapsed / t.bounce.duration, 1);
          // Ease-out cubic
          const ease = 1 - Math.pow(1 - k, 3);
          t.x = t.bounce.startX + (t.bounce.targetX - t.bounce.startX) * ease;
          t.y = t.bounce.startY + (t.bounce.targetY - t.bounce.startY) * ease;
          if (k >= 1) {
            t.bounce = undefined;
            t.y = GAME_CONFIG.beltY;
          }
        } else if (!t.isDragging) {
          t.x += t.speed * dt;
          t.y = GAME_CONFIG.beltY;
          if (t.x - GAME_CONFIG.trashRadius > W) {
            lostThisFrame += 1;
            continue;
          }
        }
        drawTrash(ctx, t);
        remaining.push(t);
      }
      trashRef.current = remaining;

      const now = performance.now();
      effectsRef.current = effectsRef.current.filter((e) => now - e.start < 700);
      for (const e of effectsRef.current) drawEffect(ctx, e, now);

      if (lostThisFrame > 0) {
        const newLives = Math.max(0, livesRef.current - lostThisFrame);
        livesRef.current = newLives;
        setLives(newLives);
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
    [drawBackground, drawBelt, drawBins, drawTrash, drawEffect, stopLoops],
  );

  const resumeLoops = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    lastTimestampRef.current = null;
    scheduleNextSpawn();
    rafRef.current = requestAnimationFrame(tick);
  }, [scheduleNextSpawn, tick]);

  const startGame = useCallback(() => {
    stopLoops();
    trashRef.current = [];
    effectsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = GAME_CONFIG.maxLives;
    savedRef.current = 0;
    hoverBinIdxRef.current = null;
    beltOffsetRef.current = 0;
    setScore(0);
    setLives(GAME_CONFIG.maxLives);
    setSavedCount(0);
    phaseRef.current = 'playing';
    setPhase('playing');
    lastTimestampRef.current = null;
    trashRef.current.push(makeTrash(0));
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
        colors: ['#22c55e', '#16a34a', '#f59e0b', '#ef4444', '#3b82f6'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const eventToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_CONFIG.canvasWidth / rect.width;
    const scaleY = GAME_CONFIG.canvasHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const findTrashAt = (x: number, y: number): Trash | null => {
    const r = GAME_CONFIG.trashRadius;
    // Iterate in reverse so the topmost (later-spawned) is picked first.
    for (let i = trashRef.current.length - 1; i >= 0; i--) {
      const t = trashRef.current[i];
      if (t.bounce) continue;
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy <= r * r) return t;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const { x, y } = eventToCanvas(e.clientX, e.clientY);
    const target = findTrashAt(x, y);
    if (!target) return;
    target.isDragging = true;
    target.pointerId = e.pointerId;
    target.x = x;
    target.y = y;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const { x, y } = eventToCanvas(e.clientX, e.clientY);
    const dragged = trashRef.current.find(
      (t) => t.isDragging && t.pointerId === e.pointerId,
    );
    if (!dragged) {
      hoverBinIdxRef.current = null;
      return;
    }
    dragged.x = x;
    dragged.y = y;
    const hit = findBinAt(x, y);
    hoverBinIdxRef.current = hit ? hit.idx : null;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') {
      hoverBinIdxRef.current = null;
      return;
    }
    const dragged = trashRef.current.find(
      (t) => t.isDragging && t.pointerId === e.pointerId,
    );
    if (!dragged) {
      hoverBinIdxRef.current = null;
      return;
    }
    const { x, y } = eventToCanvas(e.clientX, e.clientY);
    dragged.isDragging = false;
    dragged.pointerId = null;
    hoverBinIdxRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore — pointer may have already been released
    }

    const hit = findBinAt(x, y);
    const droppedBin = hit ? hit.bin : null;

    if (!droppedBin) {
      // Released outside any bin — slot the item back onto the belt at its x.
      dragged.y = GAME_CONFIG.beltY;
      return;
    }

    if (droppedBin.spec.type === dragged.type) {
      // Correct — remove the item and award score.
      effectsRef.current.push({
        id: ++effectIdSeq,
        x: dragged.x,
        y: dragged.y,
        kind: 'correct',
        start: performance.now(),
      });
      trashRef.current = trashRef.current.filter((t) => t.id !== dragged.id);
      const next = scoreRef.current + GAME_CONFIG.scorePerCorrect;
      scoreRef.current = next;
      setScore(next);
      savedRef.current += 1;
      setSavedCount(savedRef.current);
      addScore(GAME_CONFIG.scorePerCorrect);
      playSfx('snd-correct');
    } else {
      // Wrong bin — penalty + bounce back onto the belt.
      effectsRef.current.push({
        id: ++effectIdSeq,
        x: dragged.x,
        y: dragged.y,
        kind: 'wrong',
        start: performance.now(),
      });
      const newScore = Math.max(0, scoreRef.current - GAME_CONFIG.penaltyPerWrong);
      if (newScore !== scoreRef.current) {
        const delta = newScore - scoreRef.current;
        addScore(delta);
        scoreRef.current = newScore;
        setScore(newScore);
      }
      dragged.bounce = {
        startX: dragged.x,
        startY: dragged.y,
        targetX: Math.max(
          GAME_CONFIG.trashRadius,
          Math.min(GAME_CONFIG.canvasWidth - GAME_CONFIG.trashRadius, dragged.x),
        ),
        targetY: GAME_CONFIG.beltY,
        elapsed: 0,
        duration: 350,
      };
      playSfx('snd-wrong');
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const dragged = trashRef.current.find(
      (t) => t.isDragging && t.pointerId === e.pointerId,
    );
    if (dragged) {
      dragged.isDragging = false;
      dragged.pointerId = null;
      dragged.y = GAME_CONFIG.beltY;
    }
    hoverBinIdxRef.current = null;
  };

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

  if (phase === 'idle') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Trò Chơi
        </button>
        <div className="text-center py-4 max-w-md mx-auto">
          <div className="text-7xl mb-4 floating">🛡️</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 bg-clip-text text-transparent leading-tight">
            Hiệp Sĩ Xanh
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Trên băng chuyền có nhiều món rác cần phân loại. Hãy kéo từng món vào đúng thùng để cứu Trái Đất nhé!
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5 text-left">
            {BIN_SPECS.map((b) => (
              <div
                key={b.type}
                className="rounded-2xl border-2 p-3 flex items-center gap-2"
                style={{ borderColor: b.stroke, background: b.fill }}
              >
                <div className="text-3xl">{b.emoji}</div>
                <div>
                  <div className="font-black text-sm" style={{ color: b.text }}>
                    {b.label}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600">
                    {b.type === 'organic' && 'Vỏ trái cây, lá cây…'}
                    {b.type === 'recyclable' && 'Chai nhựa, lon, giấy…'}
                    {b.type === 'inorganic' && 'Giày cũ, gốm vỡ…'}
                    {b.type === 'hazardous' && 'Pin, bóng đèn, hóa chất…'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-lime-50 border-2 border-emerald-100 rounded-3xl p-4 mb-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">❤️</span> Bé có 3 mạng — để rác trôi khỏi băng chuyền sẽ mất 1 mạng.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">✅</span> Phân loại đúng được +10 điểm.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">❌</span> Bỏ nhầm thùng sẽ bị trừ 5 điểm.
            </div>
          </div>

          {highScore > 0 && (
            <div className="mb-4 text-xs font-black text-slate-400 uppercase tracking-widest">
              Kỉ lục:{' '}
              <span className="text-emerald-500 text-base ml-1">{highScore}</span>
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full py-5 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white rounded-3xl shadow-lg shadow-emerald-200 active:scale-95 transition-all font-black text-xl"
          >
            🌱 VÀO CHƠI
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const newRecord = score > 0 && score >= highScore;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{newRecord ? '🏆' : score > 0 ? '🌍' : '💪'}</div>
        <h2 className="text-3xl font-black mb-3 bg-gradient-to-r from-emerald-500 to-lime-500 bg-clip-text text-transparent">
          {newRecord ? 'Hiệp sĩ huyền thoại!' : score > 0 ? 'Hiệp sĩ giỏi quá!' : 'Cố lên hiệp sĩ nhí!'}
        </h2>
        <p className="text-slate-500 text-sm font-bold mb-4">
          Bé đã cứu Trái Đất bằng cách phân loại đúng{' '}
          <span className="text-emerald-600">{savedCount}</span> món rác.
        </p>
        <div className="bg-slate-50 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-lime-500 bg-clip-text text-transparent">
            {score}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Điểm vừa đạt
          </div>
          <div className="mt-3 text-xs font-bold text-slate-400">
            Kỉ lục:{' '}
            <span className="text-emerald-500">{Math.max(highScore, score)}</span>
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
            className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-lime-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
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
            <span key={i} className={i < lives ? '' : 'grayscale opacity-25'}>
              ❤️
            </span>
          ))}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Điểm <span className="text-emerald-500 text-lg ml-1">{score}</span>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Cấp <span className="text-lime-500 text-lg ml-1">{level}</span>
        </div>
      </div>

      <div className="relative rounded-3xl overflow-hidden border-4 border-emerald-200 shadow-lg">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.canvasWidth}
          height={GAME_CONFIG.canvasHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none',
          }}
        />
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
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-lime-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
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
