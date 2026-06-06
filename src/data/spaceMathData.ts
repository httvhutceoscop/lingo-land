/* ──────────────────────────────────────────────────────────────────────────
 * ENGINE & DỮ LIỆU — GAME "BAY VÀO VŨ TRỤ SỐ"
 *
 * Bé là phi hành gia nhí, bay qua 7 hành tinh, mỗi hành tinh là một chủ đề toán
 * (đếm, nhận biết số, cộng, trừ, so sánh, quy luật, thiên tài). Câu hỏi được
 * SINH TỰ ĐỘNG theo chủ đề + độ khó (adaptive) → số câu "vô hạn" (đáp ứng yêu
 * cầu 500 câu / 100 level một cách tự nhiên).
 *
 * File này KHÔNG chứa React — chỉ cấu hình, bộ sinh câu hỏi, dữ liệu hành tinh /
 * tàu / thành tích / sticker. Dễ test, dễ mở rộng.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_ENERGY: 5, // số "năng lượng" ❤️ ban đầu cho mỗi nhiệm vụ
  QUESTIONS_PER_PLANET: 8, // số câu mỗi nhiệm vụ (hành tinh)
  SCORE_CORRECT: 100, // trả lời đúng
  SCORE_FAST_BONUS: 50, // trả lời nhanh (dưới FAST_SECONDS)
  FAST_SECONDS: 4, // ngưỡng "trả lời nhanh"
  COMBO_3: 3,
  COMBO_3_BONUS: 200,
  COMBO_5: 5,
  COMBO_5_BONUS: 500,
  COMBO_10: 10,
  COMBO_10_BONUS: 1000,
  STARS_PER_CORRECT: 1, // sao năng lượng mỗi câu đúng
  STARS_PLANET_BONUS: 5, // sao thưởng khi hoàn thành hành tinh
  SUPPORT_WRONG_STREAK: 3, // sai liên tiếp ≥ ngần này → bật chế độ hỗ trợ (gợi ý)
  ADAPT_UP_STREAK: 3, // đúng liên tiếp ≥ ngần này → tăng độ khó
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 5,
} as const;

/* ===========================================================================
 * 2. KIỂU DỮ LIỆU
 * ========================================================================= */

export type QType = 'count' | 'number' | 'add' | 'subtract' | 'compare' | 'pattern';

export interface Question {
  type: QType;
  prompt: string; // câu hỏi hiển thị
  speak: string; // câu đọc TTS (robot AI giao nhiệm vụ)
  options: string[]; // các phương án
  answer: string; // đáp án đúng
  /** Với câu ĐẾM: vẽ `count` lần emoji để bé đếm. */
  visual?: { emoji: string; count: number };
}

/* ===========================================================================
 * 3. HÀNH TINH (7)
 * ========================================================================= */

export interface Planet {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  gradient: string;
  types: QType[]; // các loại câu hỏi của hành tinh
  baseDiff: number; // độ khó khởi điểm
}

export const PLANETS: Planet[] = [
  {
    id: 'count',
    name: 'Hành Tinh Đếm Số',
    emoji: '🪐',
    desc: 'Đếm số ngôi sao, thiên thạch…',
    gradient: 'from-sky-500 to-indigo-600',
    types: ['count'],
    baseDiff: 1,
  },
  {
    id: 'number',
    name: 'Hành Tinh Số Học',
    emoji: '🔭',
    desc: 'Số liền trước, liền sau',
    gradient: 'from-cyan-500 to-blue-600',
    types: ['number'],
    baseDiff: 1,
  },
  {
    id: 'add',
    name: 'Hành Tinh Cộng',
    emoji: '➕',
    desc: 'Phép cộng trong phạm vi nhỏ',
    gradient: 'from-emerald-500 to-teal-600',
    types: ['add'],
    baseDiff: 1,
  },
  {
    id: 'subtract',
    name: 'Hành Tinh Trừ',
    emoji: '➖',
    desc: 'Phép trừ không âm',
    gradient: 'from-amber-500 to-orange-600',
    types: ['subtract'],
    baseDiff: 1,
  },
  {
    id: 'compare',
    name: 'Hành Tinh So Sánh',
    emoji: '⚖️',
    desc: 'Lớn hơn, nhỏ hơn, bằng nhau',
    gradient: 'from-rose-500 to-pink-600',
    types: ['compare'],
    baseDiff: 2,
  },
  {
    id: 'pattern',
    name: 'Hành Tinh Quy Luật',
    emoji: '🔁',
    desc: 'Tìm số tiếp theo của dãy',
    gradient: 'from-fuchsia-500 to-purple-600',
    types: ['pattern'],
    baseDiff: 2,
  },
  {
    id: 'genius',
    name: 'Hành Tinh Thiên Tài',
    emoji: '🧠',
    desc: 'Tổng hợp tất cả kiến thức',
    gradient: 'from-violet-600 to-indigo-700',
    types: ['count', 'number', 'add', 'subtract', 'compare', 'pattern'],
    baseDiff: 3,
  },
];

export const TOTAL_PLANETS = PLANETS.length;

/* ===========================================================================
 * 4. TÀU VŨ TRỤ (skin) — mở khoá bằng sao năng lượng tích luỹ
 * ========================================================================= */

export interface Ship {
  id: string;
  name: string;
  emoji: string;
  starCost: number; // số sao cần để mở khoá
}

export const SHIPS: Ship[] = [
  { id: 'classic', name: 'Tên Lửa Cổ Điển', emoji: '🚀', starCost: 0 },
  { id: 'ufo', name: 'Đĩa Bay', emoji: '🛸', starCost: 25 },
  { id: 'cat', name: 'Mèo Phi Hành', emoji: '😺', starCost: 60 },
  { id: 'rainbow', name: 'Tàu Cầu Vồng', emoji: '🌈', starCost: 100 },
  { id: 'galaxy', name: 'Tàu Thiên Hà', emoji: '🌌', starCost: 160 },
];

/* ===========================================================================
 * 5. TIỆN ÍCH NGẪU NHIÊN + BỘ SINH CÂU HỎI
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

/** Phạm vi số tối đa theo độ khó (1→5, 2→10, 3→20, 4→50, 5→100). */
function maxForDifficulty(d: number): number {
  return [5, 5, 10, 20, 50, 100][Math.max(1, Math.min(5, d))];
}

/** 4 phương án số (gồm đáp án) — distractor gần đáp án, kẹp trong [0, max]. */
function numberOptions(answer: number, max: number): string[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < 4 && guard < 60) {
    guard++;
    const delta = randInt(1, 3) * (Math.random() < 0.5 ? -1 : 1);
    const cand = answer + delta;
    if (cand >= 0 && cand <= Math.max(max, answer + 3)) set.add(cand);
  }
  for (let n = 0; set.size < 4; n++) set.add(n); // lấp nếu thiếu
  return shuffle([...set]).map(String);
}

// Emoji "vật thể vũ trụ" cho câu ĐẾM.
const SPACE_EMOJIS = ['⭐', '🌟', '🪐', '🌙', '☄️', '🛸', '🚀', '👽', '🌍'];

/**
 * Sinh MỘT câu hỏi theo loại + độ khó. Đây là điểm vào chính được view gọi.
 * (loại 'genius' không tồn tại ở đây — hành tinh thiên tài tự bốc 1 trong 6 loại.)
 */
export function generateQuestion(type: QType, difficulty: number): Question {
  const d = Math.max(1, Math.min(5, difficulty));

  switch (type) {
    /* ── ĐẾM: hiện N vật thể, hỏi số lượng ───────────────────────────── */
    case 'count': {
      const max = d <= 1 ? 5 : 10; // không đếm quá 10 vật cho đỡ rối
      const n = randInt(1, max);
      const emoji = pick(SPACE_EMOJIS);
      return {
        type,
        prompt: 'Có bao nhiêu vật thể?',
        speak: 'Có bao nhiêu vật thể trong vũ trụ?',
        options: numberOptions(n, max),
        answer: String(n),
        visual: { emoji, count: n },
      };
    }

    /* ── SỐ HỌC: số liền trước / liền sau ────────────────────────────── */
    case 'number': {
      const max = maxForDifficulty(d);
      const successor = Math.random() < 0.5;
      const n = successor ? randInt(0, max - 1) : randInt(1, max);
      const answer = successor ? n + 1 : n - 1;
      return {
        type,
        prompt: successor ? `Số liền sau ${n} là số nào?` : `Số liền trước ${n} là số nào?`,
        speak: successor ? `Số liền sau ${n} là số mấy?` : `Số liền trước ${n} là số mấy?`,
        options: numberOptions(answer, max + 1),
        answer: String(answer),
      };
    }

    /* ── CỘNG ────────────────────────────────────────────────────────── */
    case 'add': {
      const maxSum = d <= 1 ? 5 : d <= 2 ? 10 : d <= 3 ? 20 : 30;
      const a = randInt(0, maxSum);
      const b = randInt(0, maxSum - a);
      const answer = a + b;
      return {
        type,
        prompt: `${a} + ${b} = ?`,
        speak: `${a} cộng ${b} bằng mấy?`,
        options: numberOptions(answer, maxSum),
        answer: String(answer),
      };
    }

    /* ── TRỪ ─────────────────────────────────────────────────────────── */
    case 'subtract': {
      const max = d <= 1 ? 5 : d <= 2 ? 10 : d <= 3 ? 20 : 30;
      const a = randInt(0, max);
      const b = randInt(0, a);
      const answer = a - b;
      return {
        type,
        prompt: `${a} - ${b} = ?`,
        speak: `${a} trừ ${b} bằng mấy?`,
        options: numberOptions(answer, max),
        answer: String(answer),
      };
    }

    /* ── SO SÁNH: chọn >, <, = ───────────────────────────────────────── */
    case 'compare': {
      const max = maxForDifficulty(d);
      const a = randInt(0, max);
      // 1/4 cơ hội cho hai số bằng nhau (dạy dấu =).
      const b = Math.random() < 0.25 ? a : randInt(0, max);
      const answer = a > b ? '>' : a < b ? '<' : '=';
      return {
        type,
        prompt: `${a}  ?  ${b}`,
        speak: `${a} và ${b}, chọn dấu lớn hơn, nhỏ hơn hay bằng?`,
        options: ['>', '<', '='],
        answer,
      };
    }

    /* ── QUY LUẬT: dãy cấp số cộng, tìm số tiếp theo ─────────────────── */
    case 'pattern': {
      const step = randInt(1, d >= 3 ? 5 : 3);
      const start = randInt(0, d >= 3 ? 12 : 6);
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

/** Hành tinh thiên tài: bốc ngẫu nhiên 1 loại trong danh sách types của nó. */
export function generateForPlanet(planet: Planet, difficulty: number): Question {
  const type = pick(planet.types);
  return generateQuestion(type, difficulty);
}

/* ===========================================================================
 * 6. THÀNH TÍCH & STICKER
 * ========================================================================= */

/** Thống kê tích luỹ (lưu localStorage). */
export interface SpaceStats {
  missions: number; // số nhiệm vụ (hành tinh-lượt) hoàn thành
  stars: number; // tổng sao năng lượng tích luỹ
  correct: number; // tổng câu đúng
  attempts: number; // tổng câu đã trả lời
  timeMs: number; // thời gian học
}

export interface AchievementCtx extends SpaceStats {
  planetsCount: number; // số hành tinh đã hoàn thành (khác nhau)
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'new-astronaut',
    emoji: '👨‍🚀',
    name: 'Phi Hành Gia Mới',
    desc: 'Hoàn thành 10 nhiệm vụ',
    unlocked: (c) => c.missions >= 10,
  },
  {
    id: 'galaxy-hunter',
    emoji: '🌟',
    name: 'Thợ Săn Thiên Hà',
    desc: 'Thu thập 100 ngôi sao',
    unlocked: (c) => c.stars >= 100,
  },
  {
    id: 'math-master',
    emoji: '🧠',
    name: 'Bậc Thầy Toán Học',
    desc: 'Trả lời đúng 200 câu',
    unlocked: (c) => c.correct >= 200,
  },
  {
    id: 'cosmic-legend',
    emoji: '🏆',
    name: 'Huyền Thoại Vũ Trụ',
    desc: 'Chinh phục toàn bộ hành tinh',
    unlocked: (c) => c.planetsCount >= TOTAL_PLANETS,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'rocket', emoji: '🚀', name: 'Tên lửa', unlocked: (c) => c.missions >= 1 },
  { id: 'earth', emoji: '🌎', name: 'Trái Đất', unlocked: (c) => c.planetsCount >= 1 },
  { id: 'saturn', emoji: '🪐', name: 'Sao Thổ', unlocked: (c) => c.planetsCount >= 3 },
  { id: 'star', emoji: '⭐', name: 'Siêu Sao', unlocked: (c) => c.stars >= 50 },
  { id: 'astronaut', emoji: '👨‍🚀', name: 'Phi Hành Gia', unlocked: (c) => c.missions >= 5 },
  { id: 'robot', emoji: '🤖', name: 'Robot AI', unlocked: (c) => c.correct >= 100 },
];
