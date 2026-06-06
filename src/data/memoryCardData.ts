/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "MEMORY CARD" (Học Viện Trí Nhớ)
 *
 * Lật thẻ tìm cặp giống nhau. 7 chủ đề (động vật, đồ vật, chữ cái, số, màu sắc,
 * hình học, hỗn hợp), lưới lớn dần theo level, có giờ, combo, gợi ý.
 *
 * "Mặt thẻ" (Face) có nhiều KIỂU hiển thị:
 *   - emoji : con vật / đồ vật
 *   - text  : chữ cái / số
 *   - color : ô màu (render bằng CSS, không emoji)
 *   - shape : hình học (render bằng CSS)
 * Hai thẻ KHỚP khi cùng `id` mặt thẻ.
 *
 * File KHÔNG chứa React — chỉ dữ liệu + cấu hình + thành tích + bộ dựng bàn.
 * Dễ mở rộng (thêm chủ đề / mặt thẻ = thêm phần tử mảng).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  SCORE_MATCH: 100, // ghép đúng 1 cặp
  SCORE_FAST_BONUS: 50, // ghép nhanh (lật cặp 2 trong < FAST_SECONDS)
  FAST_SECONDS: 3,
  COMBO_3: 3,
  COMBO_3_BONUS: 200,
  COMBO_5: 5,
  COMBO_5_BONUS: 500,
  LEVEL_BONUS: 300, // thưởng hoàn thành màn
  INITIAL_HINTS: 3,
  HINT_DURATION: 2000, // ms — mở cặp gợi ý
  FLIP_BACK_DELAY: 900, // ms — úp lại khi sai
  PREVIEW_BASE: 1800, // ms — thời gian xem trước (cộng theo số cặp)
  PREVIEW_PER_PAIR: 220,
  PREVIEW_MAX: 5000,
  MAX_COLS: 6, // giới hạn lưới (level cao giữ 6x4)
} as const;

/* ===========================================================================
 * 2. KÍCH THƯỚC LƯỚI THEO LEVEL
 *    L1 2x2 → L7 6x4; level ≥ 8 giữ 6x4 (adaptive endless).
 * ========================================================================= */

export interface Grid {
  cols: number;
  rows: number;
}

const LEVEL_GRIDS: Grid[] = [
  { cols: 2, rows: 2 }, // L1 — 4 thẻ (2 cặp)
  { cols: 3, rows: 2 }, // L2 — 6 thẻ
  { cols: 4, rows: 2 }, // L3 — 8 thẻ
  { cols: 4, rows: 3 }, // L4 — 12 thẻ
  { cols: 4, rows: 4 }, // L5 — 16 thẻ
  { cols: 5, rows: 4 }, // L6 — 20 thẻ
  { cols: 6, rows: 4 }, // L7 — 24 thẻ
];

/** Lưới cho một level (1-based). Level ≥ 8 dùng lưới lớn nhất. */
export function gridForLevel(level: number): Grid {
  return LEVEL_GRIDS[Math.min(level, LEVEL_GRIDS.length) - 1];
}

export const MAX_LEVEL = LEVEL_GRIDS.length;

/* ===========================================================================
 * 3. CHẾ ĐỘ ĐỘ KHÓ (đồng hồ)
 * ========================================================================= */

export interface Difficulty {
  id: string;
  label: string;
  timer: number | null; // giây mỗi màn (null = không giới hạn)
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'easy', label: 'Dễ · Không giờ', timer: null },
  { id: 'normal', label: 'Thường · 120s', timer: 120 },
  { id: 'hard', label: 'Khó · 90s', timer: 90 },
  { id: 'challenge', label: 'Thử thách · 60s', timer: 60 },
];

/* ===========================================================================
 * 4. MẶT THẺ & CHỦ ĐỀ
 * ========================================================================= */

export type FaceKind = 'emoji' | 'text' | 'color' | 'shape';
export type ShapeKind = 'circle' | 'square' | 'triangle' | 'rectangle' | 'diamond' | 'oval';

export interface Face {
  id: string; // định danh duy nhất (2 thẻ cùng id = một cặp)
  kind: FaceKind;
  label: string; // đọc TTS khi ghép đúng
  value?: string; // emoji / chữ / số
  color?: string; // màu (cho 'color' và 'shape')
  shape?: ShapeKind; // hình (cho 'shape')
  /** Ngôn ngữ TTS: 'en' đọc tên chữ cái tiếng Anh; mặc định 'vi'. */
  lang?: 'en' | 'vi';
}

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  faces: Face[];
}

// ── Pool mặt thẻ từng chủ đề (mỗi pool ≥ 12 mặt để đủ cho lưới 24 thẻ) ──

const ANIMAL_FACES: Face[] = [
  ['cat', '🐱', 'Mèo'], ['dog', '🐶', 'Chó'], ['rabbit', '🐰', 'Thỏ'], ['bear', '🐻', 'Gấu'],
  ['elephant', '🐘', 'Voi'], ['lion', '🦁', 'Sư tử'], ['tiger', '🐯', 'Hổ'], ['frog', '🐸', 'Ếch'],
  ['monkey', '🐵', 'Khỉ'], ['penguin', '🐧', 'Chim cánh cụt'], ['turtle', '🐢', 'Rùa'], ['fox', '🦊', 'Cáo'],
].map(([id, value, label]) => ({ id, kind: 'emoji' as const, value, label }));

const OBJECT_FACES: Face[] = [
  ['pen', '✏️', 'Bút'], ['book', '📚', 'Sách'], ['chair', '🪑', 'Ghế'], ['bed', '🛏️', 'Giường'],
  ['key', '🔑', 'Chìa khoá'], ['teddy', '🧸', 'Gấu bông'], ['clock', '⏰', 'Đồng hồ'], ['bag', '🎒', 'Cặp'],
  ['cup', '🍵', 'Cốc'], ['yoyo', '🪀', 'Con quay'], ['balloon', '🎈', 'Bóng bay'], ['sock', '🧦', 'Tất'],
].map(([id, value, label]) => ({ id, kind: 'emoji' as const, value, label }));

const LETTER_FACES: Face[] = ['A', 'B', 'C', 'D', 'E', 'G', 'H', 'I', 'K', 'L', 'M', 'N'].map((ch) => ({
  id: `letter-${ch}`,
  kind: 'text' as const,
  value: ch,
  label: ch,
  lang: 'en' as const, // đọc tên chữ cái tiếng Anh
}));

const NUMBER_FACES: Face[] = Array.from({ length: 12 }, (_, i) => i + 1).map((n) => ({
  id: `num-${n}`,
  kind: 'text' as const,
  value: String(n),
  label: String(n),
  lang: 'vi' as const, // đọc số tiếng Việt
}));

const COLOR_FACES: Face[] = [
  ['red', '#ef4444', 'Đỏ'], ['orange', '#f97316', 'Cam'], ['yellow', '#eab308', 'Vàng'], ['green', '#22c55e', 'Xanh lá'],
  ['blue', '#3b82f6', 'Xanh dương'], ['purple', '#a855f7', 'Tím'], ['pink', '#ec4899', 'Hồng'], ['brown', '#92400e', 'Nâu'],
  ['teal', '#14b8a6', 'Xanh ngọc'], ['gray', '#9ca3af', 'Xám'], ['indigo', '#6366f1', 'Chàm'], ['lime', '#84cc16', 'Xanh nõn'],
].map(([id, color, label]) => ({ id: `color-${id}`, kind: 'color' as const, color, label }));

const SHAPE_FACES: Face[] = [
  ['circle', 'circle', '#38bdf8', 'Hình tròn'], ['square', 'square', '#22c55e', 'Hình vuông'],
  ['triangle', 'triangle', '#fbbf24', 'Hình tam giác'], ['rectangle', 'rectangle', '#f472b6', 'Hình chữ nhật'],
  ['diamond', 'diamond', '#a855f7', 'Hình thoi'], ['oval', 'oval', '#fb7185', 'Hình bầu dục'],
  ['circle2', 'circle', '#f97316', 'Hình tròn cam'], ['square2', 'square', '#6366f1', 'Hình vuông chàm'],
  ['triangle2', 'triangle', '#14b8a6', 'Hình tam giác ngọc'], ['rectangle2', 'rectangle', '#84cc16', 'Hình chữ nhật xanh'],
  ['diamond2', 'diamond', '#ef4444', 'Hình thoi đỏ'], ['oval2', 'oval', '#3b82f6', 'Hình bầu dục xanh'],
].map(([id, shape, color, label]) => ({ id: `shape-${id}`, kind: 'shape' as const, shape: shape as ShapeKind, color, label }));

export const THEMES: Theme[] = [
  { id: 'animals', name: 'Động Vật', emoji: '🐱', gradient: 'from-amber-400 to-rose-500', faces: ANIMAL_FACES },
  { id: 'objects', name: 'Đồ Vật', emoji: '✏️', gradient: 'from-sky-400 to-indigo-500', faces: OBJECT_FACES },
  { id: 'letters', name: 'Chữ Cái', emoji: '🔤', gradient: 'from-emerald-400 to-teal-500', faces: LETTER_FACES },
  { id: 'numbers', name: 'Số Đếm', emoji: '🔢', gradient: 'from-fuchsia-400 to-purple-500', faces: NUMBER_FACES },
  { id: 'colors', name: 'Màu Sắc', emoji: '🌈', gradient: 'from-pink-400 to-orange-400', faces: COLOR_FACES },
  { id: 'shapes', name: 'Hình Học', emoji: '🔷', gradient: 'from-cyan-400 to-blue-500', faces: SHAPE_FACES },
  {
    id: 'mixed',
    name: 'Hỗn Hợp',
    emoji: '🎲',
    gradient: 'from-violet-500 to-pink-500',
    // Trộn tất cả → pool lớn, bộ dựng bàn sẽ bốc ngẫu nhiên.
    faces: [...ANIMAL_FACES, ...OBJECT_FACES, ...LETTER_FACES, ...NUMBER_FACES, ...COLOR_FACES, ...SHAPE_FACES],
  },
];

export const themeById = (id: string): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];

/* ===========================================================================
 * 5. BỘ DỰNG BÀN
 * ========================================================================= */

export interface BoardCard {
  cardId: string; // duy nhất mỗi thẻ
  face: Face;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Dựng bàn cho 1 level + chủ đề: chọn `pairs` mặt thẻ, nhân đôi rồi xáo trộn.
 * Trả về danh sách thẻ đã xáo + kích thước lưới.
 */
export function buildBoard(theme: Theme, level: number): { cards: BoardCard[]; grid: Grid } {
  const grid = gridForLevel(level);
  const pairs = (grid.cols * grid.rows) / 2;
  const faces = shuffle(theme.faces).slice(0, pairs);
  const cards: BoardCard[] = [];
  faces.forEach((face, i) => {
    cards.push({ cardId: `c${i}a`, face });
    cards.push({ cardId: `c${i}b`, face });
  });
  return { cards: shuffle(cards), grid };
}

/* ===========================================================================
 * 6. THÀNH TÍCH & STICKER
 * ========================================================================= */

export interface MemoryStats {
  pairs: number; // tổng cặp đã ghép đúng
  attempts: number; // tổng lượt lật cặp (để tính tỷ lệ ghi nhớ)
  levels: number; // tổng màn hoàn thành
  bestCombo: number; // combo cao nhất
  bestScore: number; // điểm 1 màn cao nhất
  fastClear: boolean; // từng hoàn thành màn < 30s?
  timeMs: number; // tổng thời gian chơi
}

export interface AchievementCtx extends MemoryStats {}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'good-memory', emoji: '🧠', name: 'Trí Nhớ Tốt', desc: 'Ghép đúng 50 cặp', unlocked: (c) => c.pairs >= 50 },
  { id: 'speedster', emoji: '⚡', name: 'Siêu Tốc', desc: 'Hoàn thành màn dưới 30 giây', unlocked: (c) => c.fastClear },
  { id: 'combo-master', emoji: '🔥', name: 'Combo Master', desc: 'Đạt combo 10', unlocked: (c) => c.bestCombo >= 10 },
  { id: 'memory-master', emoji: '🏆', name: 'Bậc Thầy Trí Nhớ', desc: 'Hoàn thành 20 màn', unlocked: (c) => c.levels >= 20 },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'cat', emoji: '🐱', name: 'Mèo vàng', unlocked: (c) => c.levels >= 1 },
  { id: 'dog', emoji: '🐶', name: 'Chó vàng', unlocked: (c) => c.pairs >= 20 },
  { id: 'star', emoji: '⭐', name: 'Ngôi sao trí nhớ', unlocked: (c) => c.bestCombo >= 5 },
  { id: 'cup', emoji: '🏆', name: 'Cúp vàng', unlocked: (c) => c.levels >= 10 },
  { id: 'brain', emoji: '🧠', name: 'Bộ não siêu cấp', unlocked: (c) => c.pairs >= 80 },
];
