/* ──────────────────────────────────────────────────────────────────────────
 * ENGINE & DỮ LIỆU — GAME "KHO BÁU TOÁN HỌC"
 *
 * Bé là nhà thám hiểm nhí đi tìm kho báu toán học qua 6 hòn đảo (đếm, so sánh,
 * cộng trừ, hình học, logic, kho báu cuối). Câu hỏi SINH TỰ ĐỘNG theo chủ đề +
 * độ khó (adaptive). Hoàn thành đảo → mở RƯƠNG KHO BÁU (common→legendary).
 *
 * File KHÔNG chứa React — chỉ cấu hình, bộ sinh câu hỏi, dữ liệu đảo / kho báu /
 * thành tích. Dễ test, dễ mở rộng (câu hỏi "vô hạn" nhờ sinh tự động).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_ENERGY: 3, // ❤️❤️❤️ — sai 1 câu mất 1 tim, hết → game over
  QUESTIONS_PER_ISLAND: 6, // số thử thách mỗi đảo
  SCORE_CORRECT: 100,
  SCORE_FAST_BONUS: 50, // trả lời nhanh (< FAST_SECONDS)
  FAST_SECONDS: 4,
  COMBO_3: 3,
  COMBO_3_BONUS: 200,
  COMBO_5: 5,
  COMBO_5_BONUS: 500,
  ADAPT_UP_STREAK: 3, // đúng liên tiếp → tăng độ khó
  SUPPORT_WRONG_STREAK: 3, // sai liên tiếp → giảm độ khó + gợi ý
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 5,
  QUICK_COUNT: 10, // số câu chế độ Thử thách nhanh
} as const;

/* ===========================================================================
 * 2. KIỂU DỮ LIỆU
 * ========================================================================= */

export type QType = 'count' | 'compare' | 'add' | 'subtract' | 'shape' | 'logic';

/** Hình học cơ bản — render bằng CSS (xem view), không dùng emoji. */
export type ShapeKind = 'circle' | 'square' | 'triangle' | 'rectangle';
export const SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'rectangle'];
export const SHAPE_NAMES: Record<ShapeKind, string> = {
  circle: 'Hình tròn',
  square: 'Hình vuông',
  triangle: 'Hình tam giác',
  rectangle: 'Hình chữ nhật',
};

export interface Question {
  type: QType;
  prompt: string;
  speak: string;
  options: string[]; // phương án (số / chữ / id hình)
  answer: string;
  /** Câu ĐẾM: vẽ `count` lần emoji. */
  visual?: { emoji: string; count: number };
  /** Câu HÌNH: phương án là các hình (render shape) thay vì chữ. */
  optionsAreShapes?: boolean;
  /** Câu HÌNH "đoán tên": hiện 1 hình to ở đề bài. */
  shapeVisual?: ShapeKind;
}

/* ===========================================================================
 * 3. ĐẢO (6)
 * ========================================================================= */

export interface Island {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  gradient: string;
  types: QType[];
  baseDiff: number;
}

export const ISLANDS: Island[] = [
  { id: 'count', name: 'Rừng Đếm Số', emoji: '🌴', desc: 'Đếm đồ vật từ 1–10', gradient: 'from-emerald-500 to-green-600', types: ['count'], baseDiff: 1 },
  { id: 'compare', name: 'Hang Động So Sánh', emoji: '🦇', desc: 'Tìm số lớn nhất, nhỏ nhất', gradient: 'from-indigo-500 to-purple-600', types: ['compare'], baseDiff: 1 },
  { id: 'addsub', name: 'Sông Cộng Trừ', emoji: '🌊', desc: 'Cộng trừ trong phạm vi 20', gradient: 'from-sky-500 to-blue-600', types: ['add', 'subtract'], baseDiff: 2 },
  { id: 'shape', name: 'Vùng Đất Hình Học', emoji: '🔷', desc: 'Nhận biết hình cơ bản', gradient: 'from-amber-500 to-orange-600', types: ['shape'], baseDiff: 1 },
  { id: 'logic', name: 'Mê Cung Logic', emoji: '🧩', desc: 'Tìm quy luật, phép tính đúng', gradient: 'from-rose-500 to-pink-600', types: ['logic'], baseDiff: 2 },
  { id: 'final', name: 'Kho Báu Cuối Cùng', emoji: '💰', desc: 'Tổng hợp tất cả kiến thức', gradient: 'from-yellow-500 to-amber-600', types: ['count', 'compare', 'add', 'subtract', 'shape', 'logic'], baseDiff: 3 },
];

export const TOTAL_ISLANDS = ISLANDS.length;

/* ===========================================================================
 * 4. KHO BÁU (rương + độ hiếm)
 * ========================================================================= */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ChestReward {
  rarity: Rarity;
  label: string;
  emoji: string;
  coins: number;
  gems: number;
  skin?: boolean; // legendary mở khoá skin nhân vật
}

/** Mở rương theo số lỗi trong đảo: càng ít lỗi → rương càng quý. */
export function openChest(mistakes: number): ChestReward {
  if (mistakes === 0) {
    // Hoàn hảo → epic hoặc (đôi khi) legendary.
    if (Math.random() < 0.35) return { rarity: 'legendary', label: 'Rương Huyền Thoại', emoji: '👑', coins: 40, gems: 3, skin: true };
    return { rarity: 'epic', label: 'Rương Sử Thi', emoji: '💠', coins: 25, gems: 2 };
  }
  if (mistakes <= 1) return { rarity: 'rare', label: 'Rương Hiếm', emoji: '💎', coins: 15, gems: 1 };
  return { rarity: 'common', label: 'Rương Thường', emoji: '🪙', coins: 10, gems: 0 };
}

/** Skin nhân vật thám hiểm — mở khoá bằng rương huyền thoại. */
export const SKINS = ['🧭', '🏴‍☠️', '👒', '🦜', '🗺️'];

/* ===========================================================================
 * 5. TIỆN ÍCH + BỘ SINH CÂU HỎI
 * ========================================================================= */

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Phạm vi số tối đa theo độ khó (cap 20 — theo mục tiêu "phạm vi 20"). */
function maxForDifficulty(d: number): number {
  return [5, 5, 10, 15, 20, 20][Math.max(1, Math.min(5, d))];
}

/** 4 phương án số (gồm đáp án), distractor gần đáp án. */
function numberOptions(answer: number, max: number): string[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < 4 && guard < 60) {
    guard++;
    const delta = randInt(1, 3) * (Math.random() < 0.5 ? -1 : 1);
    const cand = answer + delta;
    if (cand >= 0 && cand <= Math.max(max, answer + 3)) set.add(cand);
  }
  for (let n = 0; set.size < 4; n++) set.add(n);
  return shuffle([...set]).map(String);
}

// Emoji "kho báu" cho câu đếm.
const TREASURE_EMOJIS = ['🍎', '⭐', '💎', '🪙', '🐚', '🍄', '🌸', '🥥'];

/** Sinh MỘT câu hỏi theo loại + độ khó. */
export function generateQuestion(type: QType, difficulty: number): Question {
  const d = Math.max(1, Math.min(5, difficulty));

  switch (type) {
    /* ── ĐẾM ─────────────────────────────────────────────────────────── */
    case 'count': {
      const max = d <= 1 ? 5 : 10;
      const n = randInt(1, max);
      return {
        type,
        prompt: 'Có bao nhiêu kho báu?',
        speak: 'Có bao nhiêu kho báu?',
        options: numberOptions(n, max),
        answer: String(n),
        visual: { emoji: pick(TREASURE_EMOJIS), count: n },
      };
    }

    /* ── SO SÁNH: tìm số lớn nhất / nhỏ nhất trong 4 số ──────────────── */
    case 'compare': {
      const max = maxForDifficulty(d);
      const nums = new Set<number>();
      while (nums.size < 4) nums.add(randInt(0, max));
      const arr = [...nums];
      const wantMax = Math.random() < 0.5;
      const answer = wantMax ? Math.max(...arr) : Math.min(...arr);
      return {
        type,
        prompt: wantMax ? 'Số nào LỚN NHẤT?' : 'Số nào NHỎ NHẤT?',
        speak: wantMax ? 'Số nào lớn nhất?' : 'Số nào nhỏ nhất?',
        options: shuffle(arr).map(String),
        answer: String(answer),
      };
    }

    /* ── CỘNG ────────────────────────────────────────────────────────── */
    case 'add': {
      const maxSum = maxForDifficulty(d);
      const a = randInt(0, maxSum);
      const b = randInt(0, maxSum - a);
      return {
        type,
        prompt: `${a} + ${b} = ?`,
        speak: `${a} cộng ${b} bằng mấy?`,
        options: numberOptions(a + b, maxSum),
        answer: String(a + b),
      };
    }

    /* ── TRỪ ─────────────────────────────────────────────────────────── */
    case 'subtract': {
      const max = maxForDifficulty(d);
      const a = randInt(0, max);
      const b = randInt(0, a);
      return {
        type,
        prompt: `${a} - ${b} = ?`,
        speak: `${a} trừ ${b} bằng mấy?`,
        options: numberOptions(a - b, max),
        answer: String(a - b),
      };
    }

    /* ── HÌNH HỌC: "tìm hình X" hoặc "đây là hình gì?" ──────────────── */
    case 'shape': {
      if (Math.random() < 0.5) {
        // Tìm hình theo tên → phương án là các HÌNH.
        const answer = pick(SHAPES);
        return {
          type,
          prompt: `Tìm ${SHAPE_NAMES[answer]}!`,
          speak: `Tìm ${SHAPE_NAMES[answer]}`,
          options: shuffle([...SHAPES]),
          answer,
          optionsAreShapes: true,
        };
      }
      // Đoán tên hình → đề hiện 1 hình, phương án là TÊN.
      const shapeVisual = pick(SHAPES);
      return {
        type,
        prompt: 'Đây là hình gì?',
        speak: 'Đây là hình gì?',
        options: shuffle(SHAPES.map((s) => SHAPE_NAMES[s])),
        answer: SHAPE_NAMES[shapeVisual],
        shapeVisual,
      };
    }

    /* ── LOGIC: "phép tính nào bằng N" hoặc "số tiếp theo của dãy" ───── */
    case 'logic': {
      if (Math.random() < 0.5) {
        // Phép tính nào bằng N?
        const max = maxForDifficulty(d);
        const target = randInt(2, max);
        const expr = (sum: number) => {
          const a = randInt(0, sum);
          return `${a} + ${sum - a}`;
        };
        const distractors = new Set<string>();
        let guard = 0;
        while (distractors.size < 3 && guard < 40) {
          guard++;
          const s = randInt(0, max);
          if (s !== target) distractors.add(expr(s));
        }
        return {
          type,
          prompt: `Phép tính nào bằng ${target}?`,
          speak: `Phép tính nào bằng ${target}?`,
          options: shuffle([expr(target), ...distractors]),
          answer: '', // sẽ gán bên dưới (đáp án là biểu thức = target)
          // Lưu ý: đáp án xác định bằng cách tính lại trong view? Không — gán ngay:
        } as Question;
      }
      // Số tiếp theo của dãy cấp số cộng.
      const step = randInt(1, d >= 3 ? 4 : 2);
      const start = randInt(0, d >= 3 ? 8 : 4);
      const seq = [start, start + step, start + 2 * step];
      const answer = start + 3 * step;
      return {
        type,
        prompt: `${seq.join(', ')}, ?`,
        speak: `Dãy số ${seq.join(', ')}. Số tiếp theo là mấy?`,
        options: numberOptions(answer, answer + 3),
        answer: String(answer),
      };
    }
  }
}

/**
 * Sinh câu hỏi cho một đảo. Với câu logic "phép tính nào bằng N", ta cần tính
 * lại đáp án (biểu thức = N) nên xử lý hậu kỳ ở đây cho chắc chắn.
 */
export function generateForIsland(island: Island, difficulty: number): Question {
  const type = pick(island.types);
  const q = generateQuestion(type, difficulty);

  // Hậu kỳ cho logic "phép tính nào bằng N": tìm option có tổng đúng = N.
  if (q.type === 'logic' && q.answer === '' && q.prompt.startsWith('Phép tính nào bằng')) {
    const target = parseInt(q.prompt.match(/\d+/)?.[0] ?? '0', 10);
    const sumOf = (expr: string) => expr.split('+').reduce((s, x) => s + parseInt(x.trim(), 10), 0);
    q.answer = q.options.find((o) => sumOf(o) === target) ?? q.options[0];
  }
  return q;
}

/* ===========================================================================
 * 6. THÀNH TÍCH & STICKER
 * ========================================================================= */

export interface TreasureStats {
  missions: number; // số câu trả lời đúng (≈ nhiệm vụ)
  correct: number; // tổng câu đúng
  attempts: number; // tổng câu đã làm
  chests: number; // số rương đã mở
  coins: number;
  gems: number;
  timeMs: number;
}

export interface AchievementCtx extends TreasureStats {
  islandsCount: number; // số đảo đã hoàn thành
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'explorer', emoji: '🧭', name: 'Nhà Thám Hiểm', desc: 'Hoàn thành 20 nhiệm vụ', unlocked: (c) => c.missions >= 20 },
  { id: 'treasure-hunter', emoji: '🗝️', name: 'Thợ Săn Kho Báu', desc: 'Mở 20 rương kho báu', unlocked: (c) => c.chests >= 20 },
  { id: 'super-calc', emoji: '🧮', name: 'Siêu Tính Toán', desc: 'Trả lời đúng 100 câu', unlocked: (c) => c.correct >= 100 },
  { id: 'math-king', emoji: '👑', name: 'Vua Toán Học', desc: 'Chinh phục tất cả các đảo', unlocked: (c) => c.islandsCount >= TOTAL_ISLANDS },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'pirate', emoji: '🏴‍☠️', name: 'Cướp biển nhí', unlocked: (c) => c.missions >= 1 },
  { id: 'map', emoji: '🗺️', name: 'Bản đồ kho báu', unlocked: (c) => c.islandsCount >= 1 },
  { id: 'diamond', emoji: '💎', name: 'Kim cương', unlocked: (c) => c.gems >= 5 },
  { id: 'cup', emoji: '🏆', name: 'Cúp vàng', unlocked: (c) => c.islandsCount >= 3 },
  { id: 'star', emoji: '⭐', name: 'Siêu toán học', unlocked: (c) => c.correct >= 50 },
];
