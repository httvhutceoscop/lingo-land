import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, speak } from '../lib/audio';
import { playEggCrack, playMiss, playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Đảo Trứng Chữ Cái — Tìm Mẹ Cho Khủng Long"
 *
 * Trò chơi ghép CHỮ HOA ↔ CHỮ THƯỜNG cho bé 3-5 tuổi.
 *
 * Cốt truyện: Trên hòn đảo tiền sử, khủng long mẹ 🦖 đứng cạnh bảng đá khắc
 * chữ HOA (vd "B"). Dưới khay có 3 quả trứng mang 3 chữ thường (1 đúng, 2
 * sai/nhiễu). Bé kéo quả trứng MANG CHỮ THƯỜNG TƯƠNG ỨNG vào tổ của mẹ.
 *
 *   - Đúng → trứng nở, khủng long con 🦕 đi bộ TỪNG ĐOẠN theo strokePath,
 *     vẽ nét chữ thường ra phía sau cho bé học cách viết.
 *   - Sai → trứng bay mượt về khay (spring back). KHÔNG phạt.
 *
 * KIẾN TRÚC:
 *   React  : levelIdx, phase, eggs, popup chúc mừng.
 *   Canvas : RAF loop — drag/drop bằng Pointer Events, lerp baby dino dọc
 *            strokePath, vẽ mực dày phía sau dấu chân.
 *
 * TỔ CHỨC FILE:
 *   1. Hằng số.
 *   2. Bộ dữ liệu LEVEL — mỗi level có 1 cặp HOA/thường + 2 nhiễu + strokePath.
 *   3. Kiểu dữ liệu + helpers.
 *   4. React component.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ
 * ========================================================================= */

const CANVAS_W = 800;
const CANVAS_H = 450;

// Vị trí + cỡ KHỦNG LONG MẸ + bảng đá chữ HOA.
const MOM_CX = 280;
const MOM_CY = 200;
const MOM_FONT_PX = 110;

// Bảng đá chữ HOA — đặt bên phải mẹ, có khoảng cách RÕ RỆT với tổ trứng
// để bé thấy đây là 2 thực thể tách biệt (mẹ + tổ ở trái, bảng yêu cầu ở
// phải). Trước đây bảng đè lên rìa phải tổ → khó nhìn.
const STONE_X = 520;
const STONE_Y = 130;
const STONE_W = 170;
const STONE_H = 170;

// Tổ trứng (vùng HITBOX nhận trứng) — bao quanh khu khủng long mẹ.
// NEST_R thu nhỏ 130 → 110 để vành tổ không lấn sang vùng bảng đá.
// Nest x range: NEST_CX ± NEST_R = [220, 440]. Stone x: [520, 690].
// → Gap an toàn 80px giữa nest và stone.
const NEST_CX = 330;
const NEST_CY = 235;
const NEST_R = 110;

// Khay trứng ở đáy canvas — 3 vị trí cố định.
const TRAY_Y = 380;
const TRAY_XS = [180, 400, 620];
const EGG_RX = 42; // bán kính ngang quả trứng
const EGG_RY = 52; // bán kính dọc quả trứng

// Tốc độ khủng long con đi bộ theo path (px/giây).
const BABY_WALK_SPEED = 110;

// Thời lượng animation NỞ TRỨNG (vỏ vỡ ra).
const HATCH_MS = 700;

// Thời lượng pop-up chúc mừng trước khi chuyển level.
const CELEBRATE_MS = 3000;

// Spring physics cho trứng bay về khay khi thả sai vị trí.
const SPRING_STIFFNESS = 0.18;
const SPRING_DAMPING = 0.62;

// ── HIỆU ỨNG DẤU CHÂN KHỦNG LONG ────────────────────────────────────
// Thay vì vẽ 1 đường mực liền, vẽ chuỗi DẤU CHÂN nhỏ rải dọc strokePath
// — bé sẽ thấy khủng long con đang DẪM xuống cát/đất tạo hình chữ cái,
// hoạt hình hơn rất nhiều.
//
//   - FOOT_STRIDE  : khoảng cách giữa 2 dấu chân (px), đo dọc theo path.
//   - FOOT_LATERAL : lệch NGANG ±px so với tâm path, xen kẽ trái/phải mô
//                    phỏng chân trái-chân phải.
//   - FOOT_PAD_LEN : nửa-trục dài của miếng đệm chân (theo hướng đi).
//   - FOOT_PAD_WID : nửa-trục ngắn (vuông góc hướng đi).
const FOOT_STRIDE = 24;
const FOOT_LATERAL = 7;
const FOOT_PAD_LEN = 9;
const FOOT_PAD_WID = 6;

// Cộng điểm cho mỗi cặp ghép đúng.
const SCORE_PER_MATCH = 10;

const STORAGE_KEY = 'lingoland_dinoalphabet_done';

// Font emoji tường minh cho mọi OS.
const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', " +
  "'Twemoji Mozilla', 'EmojiOne Color', sans-serif";

const LETTER_FONT_FAMILY = "'Nunito', 'Segoe UI', Arial, sans-serif";

/* ===========================================================================
 * 2. BỘ DỮ LIỆU LEVEL
 *
 * Mỗi level có:
 *   - uppercase        : chữ HOA hiện trên bảng đá.
 *   - correctLowercase : chữ THƯỜNG đúng (cần đặt trên 1 quả trứng).
 *   - distractors      : 2 chữ thường nhiễu.
 *   - strokePath       : mảng điểm khủng long con đi qua → vẽ ra chữ thường.
 *   - momEmoji / babyEmoji : emoji riêng từng cặp cho đa dạng.
 *
 * strokePath đi NGUYÊN MỘT NÉT (kể cả retrace) — vì baby dino chỉ "1 cây bút"
 * chứ không nhấc lên được. Với các chữ cần 2 nét (vd "t", "i" có dấu), bé
 * sẽ retrace đường vừa vẽ. Mắt nhìn vẫn ra chữ rõ vì mực đã in lên đó rồi.
 *
 * Toạ độ chọn sao cho hình nằm gọn trong vùng giữa canvas (~280→520, ~120→340).
 * ========================================================================= */

type Point = { x: number; y: number };

type Level = {
  id: number;
  uppercase: string;
  correctLowercase: string;
  distractors: [string, string];
  strokePath: Point[];
  momEmoji: string;
  babyEmoji: string;
  /** Màu mực baby vẽ + viền trứng đúng. */
  inkColor: string;
};

const LEVELS: Level[] = [
  // ── O - o (hình tròn) ──────────────────────────────────────────────
  {
    id: 1, uppercase: 'O', correctLowercase: 'o', distractors: ['c', 'e'],
    momEmoji: '🦖', babyEmoji: '🦕', inkColor: '#16a34a',
    strokePath: [
      { x: 400, y: 150 }, { x: 430, y: 160 }, { x: 455, y: 195 },
      { x: 460, y: 245 }, { x: 455, y: 295 }, { x: 430, y: 330 },
      { x: 400, y: 340 }, { x: 370, y: 330 }, { x: 345, y: 295 },
      { x: 340, y: 245 }, { x: 345, y: 195 }, { x: 370, y: 160 },
      { x: 400, y: 150 },
    ],
  },

  // ── C - c (arc mở phải) ────────────────────────────────────────────
  {
    id: 2, uppercase: 'C', correctLowercase: 'c', distractors: ['o', 'a'],
    momEmoji: '🦖', babyEmoji: '🦖', inkColor: '#dc2626',
    strokePath: [
      { x: 460, y: 170 }, { x: 420, y: 145 }, { x: 380, y: 150 },
      { x: 350, y: 180 }, { x: 335, y: 230 }, { x: 350, y: 290 },
      { x: 380, y: 330 }, { x: 420, y: 335 }, { x: 460, y: 320 },
    ],
  },

  // ── L - l (vertical + chân nhỏ) ────────────────────────────────────
  {
    id: 3, uppercase: 'L', correctLowercase: 'l', distractors: ['i', 't'],
    momEmoji: '🦕', babyEmoji: '🦖', inkColor: '#2563eb',
    strokePath: [
      { x: 400, y: 130 }, { x: 400, y: 340 }, { x: 430, y: 345 },
    ],
  },

  // ── V - v (2 chéo) ─────────────────────────────────────────────────
  {
    id: 4, uppercase: 'V', correctLowercase: 'v', distractors: ['w', 'y'],
    momEmoji: '🦖', babyEmoji: '🦕', inkColor: '#a855f7',
    strokePath: [
      { x: 350, y: 170 }, { x: 400, y: 320 }, { x: 450, y: 170 },
    ],
  },

  // ── S - s (đường lượn) ────────────────────────────────────────────
  {
    id: 5, uppercase: 'S', correctLowercase: 's', distractors: ['z', 'e'],
    momEmoji: '🦕', babyEmoji: '🦕', inkColor: '#f59e0b',
    strokePath: [
      { x: 455, y: 175 }, { x: 415, y: 150 }, { x: 365, y: 155 },
      { x: 340, y: 195 }, { x: 360, y: 235 }, { x: 410, y: 250 },
      { x: 450, y: 280 }, { x: 455, y: 315 }, { x: 420, y: 340 },
      { x: 370, y: 340 }, { x: 335, y: 320 },
    ],
  },

  // ── T - t (thân + thanh ngang) ────────────────────────────────────
  // Baby phải retrace vì "t" có 2 nét tự nhiên.
  {
    id: 6, uppercase: 'T', correctLowercase: 't', distractors: ['f', 'i'],
    momEmoji: '🦖', babyEmoji: '🦖', inkColor: '#0ea5e9',
    strokePath: [
      { x: 400, y: 140 }, // 1. đầu thân
      { x: 400, y: 340 }, // 2. cuối thân
      { x: 400, y: 200 }, // 3. retrace lên chỗ thanh ngang
      { x: 350, y: 200 }, // 4. trái thanh ngang
      { x: 450, y: 200 }, // 5. phải thanh ngang (retrace qua giữa)
    ],
  },
];

/* ===========================================================================
 * 3. KIỂU DỮ LIỆU NỘI BỘ + HELPERS
 * ========================================================================= */

/** Một quả trứng trong khay. */
type Egg = {
  id: number;
  /** Vị trí hiện tại (đang vẽ). */
  x: number;
  y: number;
  /** Vị trí khay (nơi spring về khi thả sai). */
  restX: number;
  restY: number;
  vx: number;
  vy: number;
  isDragging: boolean;
  isReturning: boolean;
  /** Đã được dùng (nở) chưa — chỉ trứng đúng mới đi tới đây. */
  consumed: boolean;
  letter: string;
  /** Hue HSL cho hoa văn chấm bi. */
  hue: number;
};

type DragState = {
  eggId: number;
  pointerId: number;
  offX: number;
  offY: number;
};

type Phase =
  | 'playing'      // bé đang kéo trứng vào tổ
  | 'hatching'     // trứng đúng đã thả vào tổ → vỏ vỡ ra
  | 'walking'      // baby dino đi bộ vẽ chữ
  | 'celebrating'; // pop-up chúc mừng, đợi 3s → next level

function dist2(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Math.max(0, Number(raw) || 0) : 0;
  } catch {
    return 0;
  }
}
function saveHighScore(n: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch { /* ignore */ }
}

/** Lerp giữa 2 điểm. */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Sinh 3 trứng cho 1 level: 1 đúng + 2 nhiễu, ngẫu nhiên thứ tự. */
function spawnEggs(level: Level): Egg[] {
  // Hue khác nhau cho mỗi quả để bé phân biệt — chọn 3 màu rực rỡ.
  const hues = shuffle([10, 50, 170, 220, 290, 340]).slice(0, 3);
  const letters = shuffle([level.correctLowercase, ...level.distractors]);
  return letters.map((letter, idx) => ({
    id: idx,
    x: TRAY_XS[idx],
    y: TRAY_Y,
    restX: TRAY_XS[idx],
    restY: TRAY_Y,
    vx: 0,
    vy: 0,
    isDragging: false,
    isReturning: false,
    consumed: false,
    letter,
    hue: hues[idx],
  }));
}

/* ===========================================================================
 * 4. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function DinoAlphabetView({ onBack }: Props) {
  const { addScore } = useGame();

  /* ─── React state ──────────────────────────────────────────────────── */

  const [levelIdx, setLevelIdx] = useState(() => randInt(0, LEVELS.length - 1));
  const [phase, setPhase] = useState<Phase>('playing');
  /** Số cặp đã ghép đúng từ lúc mở game (cho HUD kỷ lục). */
  const [matched, setMatched] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => loadHighScore());
  const [showCongrats, setShowCongrats] = useState(false);

  /* ─── Refs — gameplay state tốc độ cao ────────────────────────────── */

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eggsRef = useRef<Egg[]>([]);
  const dragRef = useRef<DragState | null>(null);

  // Trứng đúng vừa thả vào tổ → cần biết để vẽ animation nở tại vị trí đó.
  const hatchEggRef = useRef<Egg | null>(null);
  const hatchStartRef = useRef(0);

  // Walking animation state — baby dino đi bộ theo strokePath, vẽ mực sau lưng.
  /** Index của ĐOẠN strokePath hiện tại (0 = từ điểm 0 → 1). */
  const walkSegRef = useRef(0);
  /** Tiến độ trong đoạn hiện tại (0 → 1). */
  const walkTRef = useRef(0);
  /** Vị trí baby hiện tại (cuối breadcrumb để vẽ mực). */
  const babyPosRef = useRef<Point>({ x: 0, y: 0 });
  /** Thời điểm frame cuối — tính dt cho lerp. */
  const lastWalkFrameRef = useRef(0);

  // Mirror state vào refs cho RAF + pointer handlers đọc nhanh.
  const levelRef = useRef<Level>(LEVELS[0]);
  useEffect(() => { levelRef.current = LEVELS[levelIdx]; }, [levelIdx]);
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* ─── Khởi tạo / reset level ──────────────────────────────────────── */

  const initLevel = useCallback((idx: number) => {
    const lvl = LEVELS[idx];
    eggsRef.current = spawnEggs(lvl);
    dragRef.current = null;
    hatchEggRef.current = null;
    hatchStartRef.current = 0;
    walkSegRef.current = 0;
    walkTRef.current = 0;
    babyPosRef.current = { ...lvl.strokePath[0] };
    setShowCongrats(false);
    setPhase('playing');
    window.setTimeout(() => {
      speak(`Tìm chữ thường của chữ ${lvl.uppercase} đem cho khủng long mẹ nhé`, LANG_SPEAK_DEFAULT);
    }, 300);
  }, []);

  // Lúc mount: khởi level đầu tiên.
  useEffect(() => {
    initLevel(levelIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Chuyển level tiếp theo ──────────────────────────────────────── */

  const goNextLevel = useCallback(() => {
    // Chọn level mới ngẫu nhiên KHÁC level vừa rồi.
    let next = randInt(0, LEVELS.length - 1);
    if (LEVELS.length > 1) {
      while (next === levelIdx) next = randInt(0, LEVELS.length - 1);
    }
    setLevelIdx(next);
    initLevel(next);
  }, [levelIdx, initLevel]);

  /* ─── Khi thả trứng ĐÚNG vào tổ → kích hoạt nở + đi bộ ───────────── */

  const startHatching = useCallback((egg: Egg) => {
    // Đặt trứng đúng tại tâm tổ — animation sẽ vỡ vỏ ngay đây.
    egg.x = NEST_CX;
    egg.y = NEST_CY;
    egg.isDragging = false;
    egg.isReturning = false;
    egg.consumed = true;
    hatchEggRef.current = egg;
    hatchStartRef.current = performance.now();
    setPhase('hatching');

    addScore(SCORE_PER_MATCH);
    // playTing → khen "đúng rồi" (chuông trong trẻo). Sau 250ms phát chuỗi
    // playEggCrack → "Rắc... POP! Chíp chíp" mô phỏng vỏ nứt + chim non chào
    // đời, kéo dài ~700ms khớp với HATCH_MS của animation vỏ vỡ.
    playTing();
    window.setTimeout(() => playEggCrack(), 250);
    speak('Đúng rồi!', LANG_SPEAK_DEFAULT);

    // Sau HATCH_MS chuyển sang walking.
    window.setTimeout(() => {
      const lvl = levelRef.current;
      walkSegRef.current = 0;
      walkTRef.current = 0;
      babyPosRef.current = { ...lvl.strokePath[0] };
      lastWalkFrameRef.current = performance.now();
      setPhase('walking');
    }, HATCH_MS);
  }, [addScore]);

  /** Hoàn thành đi bộ vẽ chữ → pop-up chúc mừng + auto next level. */
  const finishWalking = useCallback(() => {
    setPhase('celebrating');
    setShowCongrats(true);
    setMatched((m) => {
      const next = m + 1;
      setHighScore((prev) => {
        if (next > prev) {
          saveHighScore(next);
          return next;
        }
        return prev;
      });
      return next;
    });
    confetti({
      particleCount: 220,
      spread: 110,
      origin: { y: 0.45 },
      colors: ['#facc15', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#f97316'],
    });
    window.setTimeout(
      () => speak('Bé giỏi quá! Khủng long con tìm được mẹ rồi!', LANG_SPEAK_DEFAULT),
      300,
    );
    // Sau 3 giây → tự chuyển level (theo doc).
    window.setTimeout(() => goNextLevel(), CELEBRATE_MS);
  }, [goNextLevel]);

  /* ─── Pointer handlers (drag/drop trứng) ──────────────────────────── */

  const toCanvasPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
      };
    },
    [],
  );

  /** Tìm trứng "sống" (chưa nở) tại vị trí pointer. */
  const findEggAt = useCallback((x: number, y: number): Egg | null => {
    // Quét ngược — trứng đặt sau (vẽ trên) ưu tiên.
    const arr = eggsRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const e = arr[i];
      if (e.consumed) continue;
      // Hitbox dạng ellipse — bình thường hoá theo bán kính riêng x/y.
      const nx = (x - e.x) / (EGG_RX + 6);
      const ny = (y - e.y) / (EGG_RY + 6);
      if (nx * nx + ny * ny <= 1) return e;
    }
    return null;
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const p = toCanvasPoint(e);
    const egg = findEggAt(p.x, p.y);
    if (!egg) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    egg.isDragging = true;
    egg.isReturning = false;
    egg.vx = 0;
    egg.vy = 0;
    dragRef.current = {
      eggId: egg.id,
      pointerId: e.pointerId,
      offX: p.x - egg.x,
      offY: p.y - egg.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toCanvasPoint(e);
    const egg = eggsRef.current.find((eg) => eg.id === d.eggId);
    if (!egg) return;
    egg.x = p.x - d.offX;
    egg.y = p.y - d.offY;
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const egg = eggsRef.current.find((eg) => eg.id === d.eggId);
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!egg) return;

    // Trong vùng HITBOX tổ?
    const inNest = dist2(egg.x, egg.y, NEST_CX, NEST_CY) <= NEST_R * NEST_R;

    if (inNest && egg.letter === levelRef.current.correctLowercase) {
      // ĐÚNG cả vị trí + chữ → hatch.
      startHatching(egg);
    } else {
      // Sai (chữ sai HOẶC ngoài tổ) → spring về khay. Không phạt.
      egg.isDragging = false;
      egg.isReturning = true;
      if (inNest && egg.letter !== levelRef.current.correctLowercase) {
        // Trứng SAI thả vào tổ — feedback nhẹ.
        playMiss();
      }
    }
  };

  /* ─── RAF LOOP (physics + draw) ───────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let rafId = 0;

    const step = () => {
      const now = performance.now();

      // (1) Physics — spring trứng về khay nếu đang isReturning.
      for (const egg of eggsRef.current) {
        if (egg.consumed) continue;
        if (egg.isReturning && !egg.isDragging) {
          const ax = (egg.restX - egg.x) * SPRING_STIFFNESS;
          const ay = (egg.restY - egg.y) * SPRING_STIFFNESS;
          egg.vx = (egg.vx + ax) * SPRING_DAMPING;
          egg.vy = (egg.vy + ay) * SPRING_DAMPING;
          egg.x += egg.vx;
          egg.y += egg.vy;
          if (
            Math.abs(egg.x - egg.restX) < 0.5 && Math.abs(egg.y - egg.restY) < 0.5 &&
            Math.abs(egg.vx) < 0.3 && Math.abs(egg.vy) < 0.3
          ) {
            egg.x = egg.restX;
            egg.y = egg.restY;
            egg.vx = 0;
            egg.vy = 0;
            egg.isReturning = false;
          }
        }
      }

      // (2) Walking animation — baby dino đi theo strokePath via lerp.
      if (phaseRef.current === 'walking') {
        const dt = (now - lastWalkFrameRef.current) / 1000; // giây
        lastWalkFrameRef.current = now;

        const path = levelRef.current.strokePath;
        let segIdx = walkSegRef.current;
        let t = walkTRef.current;

        while (segIdx < path.length - 1) {
          const a = path[segIdx];
          const b = path[segIdx + 1];
          const segLen = Math.hypot(b.x - a.x, b.y - a.y);
          const segDur = segLen / BABY_WALK_SPEED; // giây để đi hết đoạn
          if (segDur < 1e-6) {
            // Đoạn rỗng → bỏ qua.
            segIdx++;
            t = 0;
            continue;
          }
          const advance = dt / segDur;
          t += advance;
          if (t < 1) {
            babyPosRef.current = {
              x: lerp(a.x, b.x, t),
              y: lerp(a.y, b.y, t),
            };
            break;
          }
          // Vượt đoạn → bám đầu đoạn tiếp.
          //
          // Lưu ý kỹ thuật: trên lý thuyết nếu dt quá lớn (frame drop) thì
          // bé sẽ "lerp" qua nhiều đoạn liên tiếp trong 1 frame; ở đây ta
          // đơn giản hoá: snap tới đầu đoạn kế và CHỜ frame sau xử lý tiếp.
          // Với BABY_WALK_SPEED ~110 px/s và 60 FPS, mỗi frame chỉ đi
          // ~1.8px → cực hiếm khi vượt 1 đoạn/frame. Jitter không đáng kể.
          babyPosRef.current = { x: b.x, y: b.y };
          segIdx++;
          t = 0;
          break;
        }

        walkSegRef.current = segIdx;
        walkTRef.current = t;

        if (segIdx >= path.length - 1) {
          // Đã đi đến điểm cuối → snap + finish.
          const last = path[path.length - 1];
          babyPosRef.current = { x: last.x, y: last.y };
          finishWalking();
        }
      }

      // (3) Vẽ.
      drawFrame(ctx, now);

      rafId = requestAnimationFrame(step);
    };

    lastWalkFrameRef.current = performance.now();
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  // RAF tạo 1 lần lúc mount; mọi state mới đọc qua refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Hàm vẽ ──────────────────────────────────────────────────────── */

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    const w = CANVAS_W;
    const h = CANVAS_H;
    const lvl = levelRef.current;
    const ph = phaseRef.current;

    // (a) NỀN — đảo tiền sử: trời xanh-cam, núi/rừng xa, đất xanh lá.
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#fde68a'); // amber-200 (bình minh)
    sky.addColorStop(1, '#fed7aa'); // orange-200
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // (b) NÚI XA — 2 tam giác mờ phía sau cho cảm giác chiều sâu.
    ctx.fillStyle = 'rgba(101, 163, 13, 0.5)'; // lime-600/50
    ctx.beginPath();
    ctx.moveTo(0, 280);
    ctx.lineTo(180, 130);
    ctx.lineTo(360, 280);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(132, 204, 22, 0.55)'; // lime-500/55
    ctx.beginPath();
    ctx.moveTo(320, 280);
    ctx.lineTo(520, 110);
    ctx.lineTo(720, 280);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(74, 222, 128, 0.55)'; // green-400/55
    ctx.beginPath();
    ctx.moveTo(600, 280);
    ctx.lineTo(720, 170);
    ctx.lineTo(820, 280);
    ctx.closePath();
    ctx.fill();

    // (c) ĐẤT — dải xanh lá rộng phía dưới.
    const ground = ctx.createLinearGradient(0, 270, 0, h);
    ground.addColorStop(0, '#4ade80'); // green-400
    ground.addColorStop(1, '#16a34a'); // green-600
    ctx.fillStyle = ground;
    ctx.fillRect(0, 270, w, h - 270);

    // (d) Vài cây dừa/rừng rậm trang trí.
    drawPalm(ctx, 80, 270);
    drawPalm(ctx, 720, 270);

    // (e) TỔ — vẽ vùng hitbox quanh khủng long mẹ dạng vòng cỏ.
    ctx.save();
    // Vòng cỏ lốm đốm — vẽ nhiều ellipse nhỏ xếp vòng tròn.
    ctx.fillStyle = 'rgba(120, 53, 15, 0.32)'; // amber-900/32
    ctx.beginPath();
    ctx.ellipse(NEST_CX, NEST_CY + 30, NEST_R, NEST_R * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.5)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.ellipse(NEST_CX, NEST_CY + 30, NEST_R, NEST_R * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // (f) BẢNG ĐÁ + chữ HOA.
    ctx.save();
    // Thân bảng
    ctx.fillStyle = '#a8a29e'; // stone-400
    ctx.strokeStyle = '#44403c'; // stone-700
    ctx.lineWidth = 4;
    roundRect(ctx, STONE_X, STONE_Y, STONE_W, STONE_H, 16);
    ctx.fill();
    ctx.stroke();
    // Highlight nhẹ trên đỉnh
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, STONE_X + 6, STONE_Y + 6, STONE_W - 12, 18, 8);
    ctx.fill();
    // Chữ HOA siêu to — font 120px hợp với bảng đá đã thu nhỏ.
    ctx.fillStyle = '#1c1917'; // stone-900
    ctx.font = `900 120px ${LETTER_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lvl.uppercase, STONE_X + STONE_W / 2, STONE_Y + STONE_H / 2 + 4);
    ctx.restore();

    // (g) KHỦNG LONG MẸ — bob nhẹ, lật ngang sang phải nhìn về bảng đá.
    const t = now / 1000;
    const momBob = Math.sin(t * 1.6) * 3;
    // Bóng đất
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(MOM_CX, MOM_CY + MOM_FONT_PX * 0.45, 60, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(MOM_CX, MOM_CY + momBob);
    ctx.font = `${MOM_FONT_PX}px ${EMOJI_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lvl.momEmoji, 0, 0);
    ctx.restore();

    // (h) DẤU CHÂN — chuỗi miếng đệm nâu + ngón vàng dọc strokePath, từ
    // điểm 0 tới vị trí baby hiện tại. Mô phỏng khủng long con dẫm cát.
    if (ph === 'walking' || ph === 'celebrating') {
      drawFootprintTrail(
        ctx,
        lvl.strokePath,
        walkSegRef.current,
        babyPosRef.current,
      );
    }

    // (i) TRỨNG đang Idle / Drag / Returning.
    for (const egg of eggsRef.current) {
      if (egg.consumed) continue;
      drawEgg(ctx, egg, lvl.correctLowercase);
    }

    // (j) HATCHING — vỏ trứng vỡ ra + baby dino fade in.
    if (ph === 'hatching' && hatchEggRef.current) {
      const elapsed = now - hatchStartRef.current;
      const hT = Math.min(1, elapsed / HATCH_MS); // 0→1
      const egg = hatchEggRef.current;
      // 2 vỏ nửa trứng tách ra trái-phải.
      ctx.save();
      ctx.translate(egg.x, egg.y);
      const offsetX = hT * 18;
      const offsetY = hT * 6;
      const tilt = hT * 0.35;
      // Vỏ trái
      ctx.save();
      ctx.translate(-offsetX, offsetY);
      ctx.rotate(-tilt);
      drawEggHalf(ctx, egg.hue, 'left');
      ctx.restore();
      // Vỏ phải
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.rotate(tilt);
      drawEggHalf(ctx, egg.hue, 'right');
      ctx.restore();
      ctx.restore();
      // Baby dino dần hiện ra từ tâm — scale lên.
      const babyScale = hT;
      ctx.save();
      ctx.translate(egg.x, egg.y - 5);
      ctx.scale(babyScale, babyScale);
      ctx.font = `64px ${EMOJI_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lvl.babyEmoji, 0, 0);
      ctx.restore();
    }

    // (k) BABY DINO đang đi bộ — vẽ tại babyPos.
    if (ph === 'walking' || ph === 'celebrating') {
      const pos = babyPosRef.current;
      // Bob nhẹ khi đi.
      const bob = Math.sin(now / 90) * 3;
      ctx.save();
      ctx.translate(pos.x, pos.y - 28 + bob);
      ctx.font = `52px ${EMOJI_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lvl.babyEmoji, 0, 0);
      ctx.restore();
    }
  }, []);

  /* ─── JSX ─────────────────────────────────────────────────────────── */

  const lvl = LEVELS[levelIdx];

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          🦕 Đảo Trứng Chữ Cái
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          🏆 {highScore}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Chữ HOA</div>
          <div className="text-3xl font-black leading-none">{lvl.uppercase}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Đáp án</div>
          <div className="text-3xl font-black leading-none">
            {phase === 'playing' ? '?' : lvl.correctLowercase}
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Đã ghép</div>
          <div className="text-2xl font-black">{matched}</div>
        </div>
      </div>

      <div className="relative rounded-3xl overflow-hidden border-4 border-emerald-300 shadow-lg shadow-emerald-100 bg-emerald-50">
        <canvas
          ref={canvasRef}
          className="block w-full aspect-[16/9] touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        />
        {showCongrats && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 border-4 border-yellow-300 rounded-3xl px-6 py-4 shadow-2xl animate-in zoom-in duration-300 max-w-sm mx-4">
              <div className="text-xl font-black bg-gradient-to-r from-pink-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent text-center leading-tight">
                Bé giỏi quá!<br/>Khủng long con tìm được mẹ rồi! 🦖❤️👶
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Kéo quả trứng có chữ thường <b>tương ứng</b> vào tổ khủng long mẹ nhé!
      </p>
    </div>
  );
}

/* ===========================================================================
 * 5. CÁC HÀM VẼ PHỤ
 * ========================================================================= */

/**
 * Vẽ CHUỖI DẤU CHÂN khủng long con dọc theo phần strokePath đã đi qua.
 *
 * Thuật toán:
 *   1. Dựng polyline đầy đủ: path[0..segIdx] + babyPos hiện tại.
 *   2. Đi dọc polyline, cộng dồn quãng đường. Cứ mỗi FOOT_STRIDE pixel,
 *      emit 1 dấu chân tại vị trí đó.
 *   3. Mỗi dấu chân:
 *      - Lệch NGANG ±FOOT_LATERAL so với tâm path (xen kẽ trái/phải) →
 *        2 hàng dấu chân song song y hệt khi đi thật.
 *      - Xoay theo hướng đi (tangent của path tại điểm đó).
 *      - Vẽ ellipse nâu làm "miếng đệm" + 3 đốm vàng nhỏ làm 3 ngón chân
 *        nhô ra phía trước miếng đệm.
 */
function drawFootprintTrail(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  segIdx: number,
  currentPos: Point,
) {
  // (1) Xây danh sách điểm thực tế baby đã đi: gồm tất cả các điểm chốt
  // đã qua + vị trí hiện tại nếu chưa tới điểm cuối.
  const points: Point[] = [];
  for (let i = 0; i <= segIdx && i < path.length; i++) points.push(path[i]);
  if (segIdx < path.length - 1) {
    points.push(currentPos);
  }
  if (points.length < 2) return;

  // (2) Quét polyline, emit dấu chân mỗi FOOT_STRIDE pixel.
  // `remainder` = quãng "dư" chưa đủ FOOT_STRIDE từ frame trước, để
  // bước chân liên tục mượt qua biên giới giữa các đoạn.
  let footIdx = 0;
  let remainder = FOOT_STRIDE * 0.4; // dấu chân đầu tiên ngay sau điểm 0

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 1e-6) continue;
    const ndx = dx / segLen; // tangent đơn vị x
    const ndy = dy / segLen; // tangent đơn vị y
    const nx = -ndy;          // normal đơn vị x (vuông góc trái)
    const ny = ndx;           // normal đơn vị y

    // `cursor` = vị trí (px) tính từ A trên đoạn AB nơi sẽ emit dấu kế.
    let cursor = FOOT_STRIDE - remainder;

    while (cursor <= segLen) {
      const fx = a.x + ndx * cursor;
      const fy = a.y + ndy * cursor;
      // Lệch ngang trái/phải xen kẽ.
      const side = footIdx % 2 === 0 ? 1 : -1;
      const cx = fx + nx * FOOT_LATERAL * side;
      const cy = fy + ny * FOOT_LATERAL * side;
      const angle = Math.atan2(ndy, ndx);
      drawSingleFootprint(ctx, cx, cy, angle);
      footIdx++;
      cursor += FOOT_STRIDE;
    }

    // Cập nhật remainder cho đoạn kế.
    // remainder mới = phần dư khi vẫn còn quãng < FOOT_STRIDE chưa "tiêu".
    remainder = segLen - (cursor - FOOT_STRIDE);
  }
}

/** Vẽ 1 dấu chân tại (cx, cy) xoay theo `angle` (radian). */
function drawSingleFootprint(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Miếng đệm bàn chân — ellipse nâu (đất ướt in dấu).
  ctx.fillStyle = 'rgba(120, 53, 15, 0.78)'; // amber-900/78
  ctx.beginPath();
  ctx.ellipse(0, 0, FOOT_PAD_LEN, FOOT_PAD_WID, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3 ngón chân nhỏ — đốm vàng nhạt nhô ra trước miếng đệm.
  ctx.fillStyle = 'rgba(253, 224, 71, 0.92)'; // yellow-300/92
  const toeOffset = FOOT_PAD_LEN + 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(toeOffset, i * 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Vẽ cây dừa decor (lá + thân). */
function drawPalm(ctx: CanvasRenderingContext2D, x: number, baseY: number) {
  // Thân cây — đường cong nâu.
  ctx.save();
  ctx.strokeStyle = '#78350f'; // amber-900
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x - 8, baseY - 60, x + 4, baseY - 120);
  ctx.stroke();
  // Lá — 5 hình bầu dục xanh đậm xếp toả ra.
  const fronds = [
    { ang: -1.6, len: 50 },
    { ang: -1.0, len: 55 },
    { ang: -0.3, len: 45 },
    { ang: -2.2, len: 50 },
    { ang: -2.7, len: 40 },
  ];
  ctx.fillStyle = '#15803d'; // green-700
  for (const f of fronds) {
    ctx.save();
    ctx.translate(x + 4, baseY - 120);
    ctx.rotate(f.ang);
    ctx.beginPath();
    ctx.ellipse(f.len * 0.5, 0, f.len * 0.5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Vẽ 1 quả trứng nguyên — bầu dục pastel có chấm bi + chữ thường ở giữa. */
function drawEgg(
  ctx: CanvasRenderingContext2D,
  egg: Egg,
  correctLetter: string,
) {
  ctx.save();
  ctx.translate(egg.x, egg.y);
  // Khi cầm: phóng to 1.1x + bóng đậm hơn.
  if (egg.isDragging) {
    ctx.scale(1.1, 1.1);
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 3;
  }

  // Thân trứng — gradient hue → trắng sáng.
  const grad = ctx.createRadialGradient(-12, -16, 6, 0, 0, EGG_RY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, `hsl(${egg.hue}, 70%, 75%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, EGG_RX, EGG_RY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Viền trứng.
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = `hsl(${egg.hue}, 65%, 45%)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, EGG_RX, EGG_RY, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Chấm bi — 5 đốm nhỏ rải mặt trứng (deterministic theo hue cho cố định).
  const dots = [
    { dx: -18, dy: -20, r: 5 },
    { dx: 14, dy: -10, r: 6 },
    { dx: -6, dy: 12, r: 5 },
    { dx: 20, dy: 18, r: 4 },
    { dx: -22, dy: 6, r: 4 },
  ];
  ctx.fillStyle = `hsl(${(egg.hue + 60) % 360}, 70%, 55%)`;
  for (const d of dots) {
    ctx.beginPath();
    ctx.arc(d.dx, d.dy, d.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chữ thường ở giữa.
  // Lưu ý: KHÔNG hint cho bé đâu là đúng — `correctLetter` truyền vào chỉ
  // để future-expansion nếu muốn highlight. Hiện tại để trung tính.
  void correctLetter;
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 38px ${LETTER_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(egg.letter, 0, 2);
  ctx.fillText(egg.letter, 0, 2);

  ctx.restore();
}

/** Vẽ 1 NỬA vỏ trứng — dùng khi animation nở. */
function drawEggHalf(
  ctx: CanvasRenderingContext2D,
  hue: number,
  side: 'left' | 'right',
) {
  ctx.save();
  ctx.fillStyle = `hsl(${hue}, 70%, 80%)`;
  ctx.strokeStyle = `hsl(${hue}, 65%, 45%)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Vẽ 1/2 ellipse — phần dưới với mép trên zigzag (giả lập vỡ).
  if (side === 'left') {
    ctx.moveTo(0, -EGG_RY);
    // Mép zigzag từ trên xuống tâm
    const zig = [
      { x: -6, y: -30 }, { x: -3, y: -22 }, { x: -8, y: -10 },
      { x: -4, y: 0 }, { x: -10, y: 12 }, { x: -2, y: 22 },
      { x: -8, y: 36 },
    ];
    for (const p of zig) ctx.lineTo(p.x, p.y);
    ctx.lineTo(0, EGG_RY);
    // Cung tròn quanh nửa trái
    ctx.ellipse(0, 0, EGG_RX, EGG_RY, 0, Math.PI / 2, -Math.PI / 2, false);
  } else {
    ctx.moveTo(0, -EGG_RY);
    const zig = [
      { x: 6, y: -30 }, { x: 3, y: -22 }, { x: 8, y: -10 },
      { x: 4, y: 0 }, { x: 10, y: 12 }, { x: 2, y: 22 },
      { x: 8, y: 36 },
    ];
    for (const p of zig) ctx.lineTo(p.x, p.y);
    ctx.lineTo(0, EGG_RY);
    ctx.ellipse(0, 0, EGG_RX, EGG_RY, 0, -Math.PI / 2, Math.PI / 2, false);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Vẽ rounded rect — Safari cũ chưa có ctx.roundRect tự nhiên. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
