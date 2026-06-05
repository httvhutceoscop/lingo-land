/* ──────────────────────────────────────────────────────────────────────────
 * ENGINE & DỮ LIỆU — GAME "GHÉP HÌNH ĐỘNG VẬT"
 *
 * Bé ghép các mảnh của một con vật (bức tranh) về đúng vị trí trên khung lưới.
 *
 * VÌ SAO DÙNG EMOJI CẮT LÁT (thay vì cắt file ảnh):
 *   Jigsaw cổ điển cắt 1 ảnh bitmap thành rows×cols mảnh. App này chạy bằng
 *   emoji, không có ảnh. Giải pháp: render con vật bằng MỘT emoji CỠ LỚN bằng
 *   đúng kích thước khung, rồi "cắt" thành các ô bằng kỹ thuật CSS overflow +
 *   transform — mỗi mảnh là một LÁT thật sự của bức tranh. Khi xếp đúng ô, lát
 *   khớp hoàn hảo với silhouette mờ phía sau.
 *
 *   Ưu điểm: dùng được với HÀNG TRĂM con vật (chỉ cần 1 emoji), không asset,
 *   responsive, cảm ứng tốt. Đáp ứng "50 puzzle / 50 động vật" tự nhiên.
 *
 * File này KHÔNG chứa React — chỉ cấu hình, dữ liệu động vật, bộ sinh mảnh ghép,
 * và định nghĩa achievement / sticker. Dễ test, dễ mở rộng.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH CHUNG (theo doc)
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_HINTS: 3, // số gợi ý mỗi màn
  SCORE_PER_PIECE: 50, // điểm mỗi mảnh ghép đúng
  SCORE_PER_PUZZLE: 500, // điểm thưởng khi hoàn thành cả puzzle
  COMBO_X3: 3, // ghép đúng liên tiếp 3 → thưởng
  COMBO_X3_BONUS: 100,
  COMBO_X5: 5, // ghép đúng liên tiếp 5 → thưởng lớn
  COMBO_X5_BONUS: 300,
  HINT_DURATION: 2000, // ms — thời gian highlight gợi ý
  LEVEL_COMPLETE_DELAY: 1500, // ms — dừng chuyển màn
  SPEED_SOLVE_SECONDS: 30, // giải dưới mốc này → thành tích "Giải Siêu Tốc"
} as const;

/* ===========================================================================
 * 2. CHẾ ĐỘ CHƠI (5 mode theo doc)
 *    Mỗi mode khác nhau ở kích thước lưới (độ khó) và đồng hồ.
 * ========================================================================= */

export type ModeId = 'parts' | 'basic' | 'medium' | 'hard' | 'challenge';

export interface ModeDef {
  id: ModeId;
  label: string;
  emoji: string;
  desc: string;
  rows: number;
  cols: number;
  timer: number | null; // giây mỗi puzzle (null = không giới hạn)
  gradient: string;
}

export const MODES: ModeDef[] = [
  {
    id: 'parts',
    label: 'Ghép Bộ Phận',
    emoji: '🧩',
    desc: '4 mảnh lớn · không tính giờ · cho bé 4–5 tuổi',
    rows: 2,
    cols: 2,
    timer: null,
    gradient: 'from-emerald-400 to-sky-500',
  },
  {
    id: 'basic',
    label: 'Cơ Bản 2×2',
    emoji: '🐣',
    desc: '4 mảnh · không tính giờ · cho bé 5–6 tuổi',
    rows: 2,
    cols: 2,
    timer: null,
    gradient: 'from-sky-400 to-indigo-500',
  },
  {
    id: 'medium',
    label: 'Trung Bình 3×3',
    emoji: '🦊',
    desc: '9 mảnh · 180 giây · cho bé 6–7 tuổi',
    rows: 3,
    cols: 3,
    timer: 180,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 'hard',
    label: 'Nâng Cao 4×4',
    emoji: '🦁',
    desc: '16 mảnh · 120 giây · cho bé 7–8 tuổi',
    rows: 4,
    cols: 4,
    timer: 120,
    gradient: 'from-rose-400 to-purple-500',
  },
  {
    id: 'challenge',
    label: 'Thử Thách Thời Gian',
    emoji: '⏱️',
    desc: '9 mảnh · 60 giây · ghép nhanh phá kỷ lục',
    rows: 3,
    cols: 3,
    timer: 60,
    gradient: 'from-fuchsia-500 to-purple-600',
  },
];

/* ===========================================================================
 * 3. ĐỘNG VẬT (50 con, 5 chủ đề × 10) — "bức tranh" của mỗi puzzle
 * ========================================================================= */

export interface Animal {
  id: string;
  name: string; // tên tiếng Việt (đọc TTS khi hoàn thành)
  emoji: string;
  theme: string;
}

export const ANIMALS: Animal[] = [
  // ── Động vật nuôi ──
  { id: 'cat', name: 'Mèo', emoji: '🐱', theme: 'Động vật nuôi' },
  { id: 'dog', name: 'Chó', emoji: '🐶', theme: 'Động vật nuôi' },
  { id: 'rabbit', name: 'Thỏ', emoji: '🐰', theme: 'Động vật nuôi' },
  { id: 'chicken', name: 'Gà', emoji: '🐔', theme: 'Động vật nuôi' },
  { id: 'duck', name: 'Vịt', emoji: '🦆', theme: 'Động vật nuôi' },
  { id: 'hamster', name: 'Chuột lang', emoji: '🐹', theme: 'Động vật nuôi' },
  { id: 'bird', name: 'Chim', emoji: '🐦', theme: 'Động vật nuôi' },
  { id: 'parrot', name: 'Vẹt', emoji: '🦜', theme: 'Động vật nuôi' },
  { id: 'turtle', name: 'Rùa', emoji: '🐢', theme: 'Động vật nuôi' },
  { id: 'goldfish', name: 'Cá vàng', emoji: '🐠', theme: 'Động vật nuôi' },

  // ── Động vật trang trại ──
  { id: 'cow', name: 'Bò', emoji: '🐮', theme: 'Động vật trang trại' },
  { id: 'horse', name: 'Ngựa', emoji: '🐴', theme: 'Động vật trang trại' },
  { id: 'sheep', name: 'Cừu', emoji: '🐑', theme: 'Động vật trang trại' },
  { id: 'pig', name: 'Heo', emoji: '🐷', theme: 'Động vật trang trại' },
  { id: 'goat', name: 'Dê', emoji: '🐐', theme: 'Động vật trang trại' },
  { id: 'rooster', name: 'Gà trống', emoji: '🐓', theme: 'Động vật trang trại' },
  { id: 'turkey', name: 'Gà tây', emoji: '🦃', theme: 'Động vật trang trại' },
  { id: 'swan', name: 'Thiên nga', emoji: '🦢', theme: 'Động vật trang trại' },
  { id: 'donkey', name: 'Lừa', emoji: '🫏', theme: 'Động vật trang trại' },
  { id: 'mouse', name: 'Chuột', emoji: '🐭', theme: 'Động vật trang trại' },

  // ── Động vật rừng ──
  { id: 'tiger', name: 'Hổ', emoji: '🐯', theme: 'Động vật rừng' },
  { id: 'lion', name: 'Sư tử', emoji: '🦁', theme: 'Động vật rừng' },
  { id: 'elephant', name: 'Voi', emoji: '🐘', theme: 'Động vật rừng' },
  { id: 'monkey', name: 'Khỉ', emoji: '🐵', theme: 'Động vật rừng' },
  { id: 'bear', name: 'Gấu', emoji: '🐻', theme: 'Động vật rừng' },
  { id: 'fox', name: 'Cáo', emoji: '🦊', theme: 'Động vật rừng' },
  { id: 'wolf', name: 'Sói', emoji: '🐺', theme: 'Động vật rừng' },
  { id: 'deer', name: 'Nai', emoji: '🦌', theme: 'Động vật rừng' },
  { id: 'panda', name: 'Gấu trúc', emoji: '🐼', theme: 'Động vật rừng' },
  { id: 'hedgehog', name: 'Nhím', emoji: '🦔', theme: 'Động vật rừng' },

  // ── Động vật biển ──
  { id: 'dolphin', name: 'Cá heo', emoji: '🐬', theme: 'Động vật biển' },
  { id: 'shark', name: 'Cá mập', emoji: '🦈', theme: 'Động vật biển' },
  { id: 'octopus', name: 'Bạch tuộc', emoji: '🐙', theme: 'Động vật biển' },
  { id: 'fish', name: 'Cá', emoji: '🐟', theme: 'Động vật biển' },
  { id: 'crab', name: 'Cua', emoji: '🦀', theme: 'Động vật biển' },
  { id: 'lobster', name: 'Tôm hùm', emoji: '🦞', theme: 'Động vật biển' },
  { id: 'squid', name: 'Mực', emoji: '🦑', theme: 'Động vật biển' },
  { id: 'whale', name: 'Cá voi', emoji: '🐳', theme: 'Động vật biển' },
  { id: 'pufferfish', name: 'Cá nóc', emoji: '🐡', theme: 'Động vật biển' },
  { id: 'seal', name: 'Hải cẩu', emoji: '🦭', theme: 'Động vật biển' },

  // ── Động vật đặc biệt ──
  { id: 'trex', name: 'Khủng long', emoji: '🦖', theme: 'Động vật đặc biệt' },
  { id: 'sauropod', name: 'Khủng long cổ dài', emoji: '🦕', theme: 'Động vật đặc biệt' },
  { id: 'unicorn', name: 'Kỳ lân', emoji: '🦄', theme: 'Động vật đặc biệt' },
  { id: 'dragon', name: 'Rồng', emoji: '🐉', theme: 'Động vật đặc biệt' },
  { id: 'dragonface', name: 'Rồng phương Đông', emoji: '🐲', theme: 'Động vật đặc biệt' },
  { id: 'butterfly', name: 'Bướm', emoji: '🦋', theme: 'Động vật đặc biệt' },
  { id: 'crocodile', name: 'Cá sấu', emoji: '🐊', theme: 'Động vật đặc biệt' },
  { id: 'lizard', name: 'Thằn lằn', emoji: '🦎', theme: 'Động vật đặc biệt' },
  { id: 'scorpion', name: 'Bọ cạp', emoji: '🦂', theme: 'Động vật đặc biệt' },
  { id: 'eagle', name: 'Đại bàng', emoji: '🦅', theme: 'Động vật đặc biệt' },
];

export const TOTAL_ANIMALS = ANIMALS.length;

/** Lấy con vật cho một level (1-based). Vượt quá danh sách thì quay vòng. */
export function animalForLevel(level: number): Animal {
  return ANIMALS[(level - 1) % ANIMALS.length];
}

/* ===========================================================================
 * 4. BỘ SINH MẢNH GHÉP (Puzzle Generator)
 *
 *    Input: số hàng/cột. Output: danh sách mảnh, mỗi mảnh biết ô đúng (r,c) của
 *    mình và một "ô khay" (trayIndex) ngẫu nhiên để xuất hiện ban đầu (xáo trộn).
 *    Vị trí pixel thực tế được view tính từ trayIndex/(r,c) theo kích thước đo
 *    được — nhờ vậy puzzle tự co giãn responsive.
 * ========================================================================= */

export interface PuzzlePiece {
  id: string;
  r: number; // hàng đúng
  c: number; // cột đúng
  trayIndex: number; // ô trong khay khi bắt đầu (đã xáo trộn)
  locked: boolean; // đã ghép đúng & khoá?
}

/** Xáo trộn mảng (Fisher–Yates) — trả về mảng MỚI. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sinh danh sách mảnh ghép cho lưới rows×cols. */
export function generatePieces(rows: number, cols: number): PuzzlePiece[] {
  const n = rows * cols;
  // Hoán vị ngẫu nhiên các chỉ số khay 0..n-1 để mảnh xuất hiện lộn xộn.
  const trayOrder = shuffle(Array.from({ length: n }, (_, i) => i));

  const pieces: PuzzlePiece[] = [];
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pieces.push({
        id: `p-${r}-${c}`,
        r,
        c,
        trayIndex: trayOrder[k],
        locked: false,
      });
      k++;
    }
  }
  return pieces;
}

/* ===========================================================================
 * 5. THÀNH TÍCH & STICKER
 * ========================================================================= */

/** Thống kê tích luỹ qua nhiều phiên (lưu localStorage). */
export interface PuzzleStats {
  puzzles: number; // tổng puzzle đã hoàn thành
  totalScore: number; // tổng điểm tích luỹ
  fastSolve: boolean; // đã từng giải < SPEED_SOLVE_SECONDS giây?
}

/** Gộp thống kê + số động vật đã mở khoá để xét điều kiện thành tích. */
export interface AchievementCtx extends PuzzleStats {
  animalsUnlocked: number;
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
    id: 'puzzle-master',
    emoji: '🧩',
    name: 'Bậc Thầy Ghép Hình',
    desc: 'Hoàn thành 10 puzzle',
    unlocked: (c) => c.puzzles >= 10,
  },
  {
    id: 'animal-explorer',
    emoji: '🔭',
    name: 'Nhà Thám Hiểm',
    desc: 'Mở khoá 20 động vật',
    unlocked: (c) => c.animalsUnlocked >= 20,
  },
  {
    id: 'speed-solver',
    emoji: '⚡',
    name: 'Giải Siêu Tốc',
    desc: 'Hoàn thành puzzle dưới 30 giây',
    unlocked: (c) => c.fastSolve,
  },
  {
    id: 'genius-kid',
    emoji: '🧠',
    name: 'Thiên Tài Nhí',
    desc: 'Đạt 10.000 điểm',
    unlocked: (c) => c.totalScore >= 10000,
  },
];

/** Sticker = các con vật tiêu biểu; mở khoá khi hoàn thành puzzle con đó. */
export interface StickerDef {
  animalId: string;
  emoji: string;
  name: string;
}

export const STICKERS: StickerDef[] = [
  { animalId: 'cat', emoji: '🐱', name: 'Mèo' },
  { animalId: 'dog', emoji: '🐶', name: 'Chó' },
  { animalId: 'rabbit', emoji: '🐰', name: 'Thỏ' },
  { animalId: 'lion', emoji: '🦁', name: 'Sư tử' },
  { animalId: 'panda', emoji: '🐼', name: 'Gấu trúc' },
  { animalId: 'dolphin', emoji: '🐬', name: 'Cá heo' },
  { animalId: 'trex', emoji: '🦖', name: 'Khủng long' },
];
