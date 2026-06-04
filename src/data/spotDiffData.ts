/* ──────────────────────────────────────────────────────────────────────────
 * ENGINE & DỮ LIỆU — GAME "THÁM TỬ TÌM ĐIỂM KHÁC BIỆT"
 *
 * Bé so sánh hai "bức tranh" gần giống nhau và tìm các điểm khác biệt.
 *
 * VÌ SAO DÙNG LƯỚI EMOJI (thay vì 2 file ảnh):
 *   Spot-the-difference cổ điển cần 2 ảnh bitmap gần giống. App này không có
 *   pipeline ảnh và chạy bằng emoji. Giải pháp: mỗi "bức tranh" là một LƯỚI ô,
 *   mỗi ô chứa 1 emoji (hoặc trống). Bức B là bản sao bức A với N ô bị "biến
 *   đổi" — đổi emoji, xoá đi, thêm vào, phóng to, đổi màu, xoay. Mỗi ô biến đổi
 *   chính là một điểm khác biệt.
 *
 *   Ưu điểm: sinh level VÔ HẠN theo tham số (số ô, số khác biệt), không cần
 *   asset, chạm chính xác (mỗi điểm khác biệt = 1 ô lưới rõ ràng), responsive
 *   bằng CSS grid. Đáp ứng "50 level / 300 điểm khác biệt" một cách tự nhiên.
 *
 * File này KHÔNG chứa React — chỉ kiểu dữ liệu, cấu hình, và hàm sinh bàn chơi
 * + định nghĩa achievement / sticker. Dễ test, dễ mở rộng.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH CHUNG (theo doc)
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_LIVES: 3, // số mạng ban đầu ❤️❤️❤️
  INITIAL_HINTS: 3, // số gợi ý mỗi màn
  SCORE_PER_DIFFERENCE: 100, // điểm mỗi điểm khác biệt tìm đúng
  WRONG_CLICK_PENALTY: 10, // trừ điểm khi chạm sai
  COMBO_X3: 3, // tìm đúng liên tiếp 3 → thưởng
  COMBO_X3_BONUS: 200,
  COMBO_X5: 5, // tìm đúng liên tiếp 5 → thưởng lớn
  COMBO_X5_BONUS: 500,
  LEVEL_COMPLETE_BONUS: 50, // thưởng khi hoàn thành 1 màn
  HINT_DURATION: 2000, // ms — thời gian highlight gợi ý
  LEVEL_COMPLETE_DELAY: 1500, // ms — dừng chuyển màn
} as const;

/* ===========================================================================
 * 2. KIỂU DỮ LIỆU BÀN CHƠI
 * ========================================================================= */

/**
 * Một ô trong lưới tranh.
 *   - emoji: nội dung ô (null = ô trống).
 *   - transform / filter: CSS áp dụng RIÊNG cho bức B để tạo khác biệt trực quan
 *     (phóng to / xoay / đổi màu). Bức A luôn để trống 2 trường này.
 */
export interface Tile {
  emoji: string | null;
  transform?: string;
  filter?: string;
}

/** Một bàn chơi = 2 lưới + danh sách chỉ số ô khác biệt. */
export interface Board {
  cols: number;
  rows: number;
  left: Tile[]; // bức A (gốc)
  right: Tile[]; // bức B (đã biến đổi ở các ô khác biệt)
  diffs: number[]; // chỉ số các ô khác biệt (so với left)
}

/* ===========================================================================
 * 3. CHỦ ĐỀ (5 chủ đề theo doc) — mỗi chủ đề là một pool emoji
 * ========================================================================= */

export interface Theme {
  id: string;
  name: string;
  emoji: string; // biểu tượng đại diện chủ đề
  pool: string[]; // tập emoji dùng để dựng tranh
}

export const THEMES: Theme[] = [
  {
    id: 'animal',
    name: 'Động vật',
    emoji: '🐾',
    pool: ['🐶', '🐱', '🐰', '🐼', '🦁', '🐯', '🐸', '🐵', '🐷', '🐔', '🐤', '🦊', '🐻', '🐨', '🐮', '🐹', '🦄', '🐢', '🐙', '🦓'],
  },
  {
    id: 'home',
    name: 'Gia đình',
    emoji: '🏠',
    pool: ['🛋️', '🪑', '🛏️', '🚪', '🪟', '🖼️', '🕰️', '💡', '🧸', '🪴', '🧺', '🍽️', '🥄', '🫖', '☕', '🛁', '📺', '🧹', '🕯️', '🖼️'],
  },
  {
    id: 'school',
    name: 'Trường học',
    emoji: '🏫',
    pool: ['📚', '✏️', '📏', '📐', '🖍️', '🎒', '🖊️', '📒', '📕', '📗', '🔬', '🌍', '🧮', '🖌️', '📎', '📌', '🔖', '📖', '🗒️', '✂️'],
  },
  {
    id: 'city',
    name: 'Thành phố',
    emoji: '🏙️',
    pool: ['🚗', '🚕', '🚌', '🚓', '🚑', '🏪', '🏫', '🏥', '🚦', '🌳', '🌲', '🏢', '🏬', '🚲', '🛴', '🏠', '⛲', '🚏', '🚒', '🛵'],
  },
  {
    id: 'adventure',
    name: 'Phiêu lưu',
    emoji: '🏴‍☠️',
    pool: ['🏴‍☠️', '⚓', '🦖', '🦕', '🌋', '🚀', '🛸', '👽', '🪐', '🌴', '🦜', '🐊', '🗺️', '💎', '⛵', '🧭', '🏝️', '🐚', '🦈', '⭐'],
  },
];

/** Chọn chủ đề theo level: 1–10 động vật, 11–20 gia đình… 41+ phiêu lưu. */
export function themeForLevel(level: number): Theme {
  const idx = Math.min(THEMES.length - 1, Math.floor((level - 1) / 10));
  return THEMES[idx];
}

/* ===========================================================================
 * 4. CHẾ ĐỘ CHƠI (4 mode theo doc)
 * ========================================================================= */

export type ModeId = 'easy' | 'normal' | 'hard' | 'challenge';

export interface ModeDef {
  id: ModeId;
  label: string;
  emoji: string;
  desc: string;
  diffs: number; // số điểm khác biệt mỗi màn
  cols: number;
  rows: number;
  timer: number | null; // giây mỗi màn (null = không giới hạn)
  gradient: string; // tailwind gradient cho card chọn mode
}

export const MODES: ModeDef[] = [
  {
    id: 'easy',
    label: 'Dễ',
    emoji: '🧸',
    desc: '3 điểm khác biệt · hình lớn · không tính giờ',
    diffs: 3,
    cols: 4,
    rows: 3,
    timer: null,
    gradient: 'from-emerald-400 to-sky-500',
  },
  {
    id: 'normal',
    label: 'Thường',
    emoji: '🔍',
    desc: '5 điểm khác biệt · 120 giây',
    diffs: 5,
    cols: 4,
    rows: 4,
    timer: 120,
    gradient: 'from-sky-400 to-indigo-500',
  },
  {
    id: 'hard',
    label: 'Khó',
    emoji: '🕵️',
    desc: '8 điểm khác biệt · 90 giây',
    diffs: 8,
    cols: 5,
    rows: 4,
    timer: 90,
    gradient: 'from-amber-400 to-rose-500',
  },
  {
    id: 'challenge',
    label: 'Thử thách',
    emoji: '🏆',
    desc: '10 điểm khác biệt · 60 giây · phá kỷ lục',
    diffs: 10,
    cols: 5,
    rows: 5,
    timer: 60,
    gradient: 'from-fuchsia-500 to-purple-600',
  },
];

/* ===========================================================================
 * 5. TIỆN ÍCH NGẪU NHIÊN
 * ========================================================================= */

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

/* ===========================================================================
 * 6. SINH BÀN CHƠI
 * ========================================================================= */

/** Các kiểu biến đổi áp lên một ô ĐÃ CÓ emoji (để tạo khác biệt). */
type FilledDiffKind = 'emoji' | 'remove' | 'big' | 'hue' | 'rotate';

/**
 * Chọn kiểu biến đổi cho ô có emoji — ưu tiên các kiểu DỄ THẤY (đổi emoji, xoá,
 * phóng to, đổi màu) và để xoay (đôi khi khó thấy) ở tỉ lệ thấp.
 */
function weightedFilledKind(): FilledDiffKind {
  const r = Math.random();
  if (r < 0.4) return 'emoji';
  if (r < 0.62) return 'remove';
  if (r < 0.82) return 'big';
  if (r < 0.95) return 'hue';
  return 'rotate';
}

/** Áp một biến đổi lên ô `idx` của bức B (right). Đảm bảo có khác biệt thực sự. */
function applyFilledDiff(right: Tile[], left: Tile[], idx: number, pool: string[]) {
  const kind = weightedFilledKind();
  switch (kind) {
    case 'emoji': {
      // Đổi sang emoji KHÁC với bức A.
      let e = pick(pool);
      let guard = 0;
      while (e === left[idx].emoji && guard < 20) {
        e = pick(pool);
        guard++;
      }
      right[idx] = { emoji: e };
      break;
    }
    case 'remove':
      // Bức B mất món đồ này.
      right[idx] = { emoji: null };
      break;
    case 'big':
      // Cùng emoji nhưng to hơn hẳn.
      right[idx] = { ...right[idx], transform: 'scale(1.45)' };
      break;
    case 'hue':
      // Cùng emoji nhưng đổi màu.
      right[idx] = { ...right[idx], filter: 'hue-rotate(140deg) saturate(2.2)' };
      break;
    case 'rotate':
      // Cùng emoji nhưng bị xoay ngược.
      right[idx] = { ...right[idx], transform: 'rotate(180deg)' };
      break;
  }
}

/**
 * Sinh một bàn chơi ngẫu nhiên.
 *
 * @param pool      tập emoji của chủ đề
 * @param cols/rows kích thước lưới
 * @param diffCount số điểm khác biệt mong muốn
 *
 * Bức A được lấp ~82% ô bằng emoji ngẫu nhiên (chừa ô trống cho khác biệt kiểu
 * "thêm vào"). Bức B sao chép A rồi biến đổi `diffCount` ô:
 *   - Ô trống  → "thêm" một emoji (xuất hiện trên B mà A không có).
 *   - Ô có đồ → đổi/xoá/phóng to/đổi màu/xoay.
 */
export function generateBoard(pool: string[], cols: number, rows: number, diffCount: number): Board {
  const total = cols * rows;

  // Bức A — lấp emoji thưa.
  const left: Tile[] = [];
  for (let i = 0; i < total; i++) {
    left.push({ emoji: Math.random() < 0.82 ? pick(pool) : null });
  }
  // Bức B — bản sao (mỗi tile là object mới để biến đổi độc lập).
  const right: Tile[] = left.map((t) => ({ ...t }));

  // Pool chỉ số ô có/không có đồ (đã xáo trộn để chọn ngẫu nhiên).
  const filledPool = shuffle(left.map((t, i) => (t.emoji ? i : -1)).filter((i) => i >= 0));
  const emptyPool = shuffle(left.map((t, i) => (t.emoji ? -1 : i)).filter((i) => i >= 0));

  const diffs: number[] = [];
  let fp = 0;
  let ep = 0;

  for (let d = 0; d < diffCount; d++) {
    // ~22% là khác biệt kiểu "thêm vào" (nếu còn ô trống) cho đa dạng.
    const useAdd = ep < emptyPool.length && Math.random() < 0.22;

    if (useAdd) {
      const idx = emptyPool[ep++];
      right[idx] = { emoji: pick(pool) }; // B có thêm 1 món
      diffs.push(idx);
    } else if (fp < filledPool.length) {
      const idx = filledPool[fp++];
      applyFilledDiff(right, left, idx, pool);
      diffs.push(idx);
    } else if (ep < emptyPool.length) {
      // Hết ô có đồ → buộc dùng ô trống.
      const idx = emptyPool[ep++];
      right[idx] = { emoji: pick(pool) };
      diffs.push(idx);
    }
    // Nếu hết cả 2 pool (lưới quá nhỏ) thì dừng — số khác biệt thực tế < yêu cầu.
  }

  return { cols, rows, left, right, diffs };
}

/* ===========================================================================
 * 7. THÀNH TÍCH (ACHIEVEMENT) & STICKER
 *    Tất cả được SUY RA từ thống kê tích luỹ {found, levels} → không cần lưu
 *    riêng danh sách đã mở khoá.
 * ========================================================================= */

/** Thống kê tích luỹ qua nhiều phiên chơi (lưu localStorage). */
export interface DetectiveStats {
  found: number; // tổng số điểm khác biệt đã tìm đúng
  levels: number; // tổng số màn đã hoàn thành
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  /** Trả về true nếu thống kê đủ điều kiện mở khoá. */
  unlocked: (s: DetectiveStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'owl-eye',
    emoji: '🦉',
    name: 'Mắt Cú Mèo',
    desc: 'Tìm đúng 50 điểm khác biệt',
    unlocked: (s) => s.found >= 50,
  },
  {
    id: 'super-observer',
    emoji: '👀',
    name: 'Siêu Quan Sát',
    desc: 'Tìm đúng 100 điểm khác biệt',
    unlocked: (s) => s.found >= 100,
  },
  {
    id: 'junior-detective',
    emoji: '🕵️',
    name: 'Thám Tử Tập Sự',
    desc: 'Hoàn thành 10 màn',
    unlocked: (s) => s.levels >= 10,
  },
  {
    id: 'sherlock',
    emoji: '🎩',
    name: 'Sherlock Nhí',
    desc: 'Hoàn thành 50 màn',
    unlocked: (s) => s.levels >= 50,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (s: DetectiveStats) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'magnifier', emoji: '🔍', name: 'Kính lúp', unlocked: (s) => s.levels >= 1 },
  { id: 'detective', emoji: '🕵️', name: 'Thám tử', unlocked: (s) => s.levels >= 5 },
  { id: 'trophy', emoji: '🏆', name: 'Cúp vàng', unlocked: (s) => s.levels >= 20 },
  { id: 'star', emoji: '⭐', name: 'Siêu sao quan sát', unlocked: (s) => s.found >= 75 },
  { id: 'medal', emoji: '🎖️', name: 'Huy chương vàng', unlocked: (s) => s.found >= 150 },
];
