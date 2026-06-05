/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "BÉ VIẾT CHỮ THẦN TỐC" (Học Viện Chữ Cái)
 *
 * Bé luyện viết: chữ cái (hoa/thường) → từ → câu, bằng cách tô theo chữ mờ trên
 * canvas. Hệ thống chấm độ chính xác (accuracy) theo độ phủ + độ bám nét.
 *
 * VÌ SAO KHÔNG LƯU "STROKE TEMPLATE" CHO TỪNG CHỮ:
 *   Đề bài gợi ý template nét cho từng chữ + AI nhận diện chữ viết. Tự tay vẽ
 *   toạ độ nét cho 29 chữ hoa + 29 thường + 200 từ là khổng lồ & dễ sai. Thay
 *   vào đó view dùng "ACCURACY ENGINE theo độ phủ glyph": render chữ đích bằng
 *   font, lấy mẫu pixel "mực" của chữ rồi so với nét bé tô (độ phủ + độ bám).
 *   → Hoạt động với BẤT KỲ chữ/từ/câu nào (không cần template), mở rộng vô hạn,
 *     và để ngỏ đường nâng cấp AI nhận diện trong tương lai (đúng tinh thần doc).
 *
 * File này KHÔNG chứa React — chỉ dữ liệu + cấu hình + định nghĩa thành tích.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH CHUNG
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_HINTS: 3, // số gợi ý mỗi bài
  SCORE_PASS: 100, // viết đạt (accuracy ≥ ngưỡng đậu) → +100
  SCORE_EXCELLENT_BONUS: 200, // accuracy > 90% → +200
  SCORE_LESSON_COMPLETE: 500, // hoàn thành cả một chế độ (hết danh sách)
  COMBO_N: 5, // 5 chữ "đạt" liên tiếp → thưởng combo
  COMBO_BONUS: 300,
  HINT_DURATION: 2000, // ms — highlight gợi ý
  PASS_ACCURACY: 50, // % tối thiểu để tính "đạt" và sang chữ kế
  EXCELLENT_ACCURACY: 90, // % để đạt 3 sao + bonus
  COMBO_ACCURACY: 70, // % tối thiểu để duy trì combo
  AUTO_COMPLETE_COVERAGE: 0.86, // tô phủ ≥ 86% chữ → tự động chấm (khỏi bấm "Xong")
  ADVANCE_DELAY: 1800, // ms — dừng xem kết quả rồi sang chữ kế
} as const;

/** Số sao theo accuracy (%). */
export function starsForAccuracy(acc: number): number {
  if (acc >= GAME_CONFIG.EXCELLENT_ACCURACY) return 3;
  if (acc >= 70) return 2;
  if (acc >= GAME_CONFIG.PASS_ACCURACY) return 1;
  return 0;
}

/* ===========================================================================
 * 2. BẢNG CHỮ CÁI TIẾNG VIỆT (29 chữ) — hoa & thường khớp theo chỉ số
 * ========================================================================= */

export const UPPER_LETTERS = [
  'A', 'Ă', 'Â', 'B', 'C', 'D', 'Đ', 'E', 'Ê', 'G',
  'H', 'I', 'K', 'L', 'M', 'N', 'O', 'Ô', 'Ơ', 'P',
  'Q', 'R', 'S', 'T', 'U', 'Ư', 'V', 'X', 'Y',
];

export const LOWER_LETTERS = [
  'a', 'ă', 'â', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g',
  'h', 'i', 'k', 'l', 'm', 'n', 'o', 'ô', 'ơ', 'p',
  'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y',
];

export const TOTAL_LETTERS = UPPER_LETTERS.length;

/** Thông tin một chữ cái cho chế độ "Học Chữ Cái": cách đọc + ví dụ minh hoạ. */
export interface LetterInfo {
  name: string; // cách đọc tên chữ (TTS) — vd "bê", "xê", "i dài"
  example: string; // từ ví dụ
  emoji: string; // emoji minh hoạ ví dụ
}

/** Tra theo CHỮ HOA (chữ thường dùng chung thông tin với chữ hoa cùng chỉ số). */
export const LETTER_INFO: Record<string, LetterInfo> = {
  A: { name: 'a', example: 'Áo', emoji: '👕' },
  Ă: { name: 'á', example: 'Ăn', emoji: '🍚' },
  Â: { name: 'ớ', example: 'Ấm', emoji: '🫖' },
  B: { name: 'bê', example: 'Bé', emoji: '👶' },
  C: { name: 'xê', example: 'Cá', emoji: '🐟' },
  D: { name: 'dê', example: 'Dê', emoji: '🐐' },
  Đ: { name: 'đê', example: 'Đèn', emoji: '💡' },
  E: { name: 'e', example: 'Em', emoji: '👧' },
  Ê: { name: 'ê', example: 'Ếch', emoji: '🐸' },
  G: { name: 'giê', example: 'Gà', emoji: '🐔' },
  H: { name: 'hát', example: 'Hoa', emoji: '🌸' },
  I: { name: 'i', example: 'Ti vi', emoji: '📺' },
  K: { name: 'ca', example: 'Kẹo', emoji: '🍬' },
  L: { name: 'lờ', example: 'Lá', emoji: '🍃' },
  M: { name: 'mờ', example: 'Mèo', emoji: '🐱' },
  N: { name: 'nờ', example: 'Nho', emoji: '🍇' },
  O: { name: 'o', example: 'Ong', emoji: '🐝' },
  Ô: { name: 'ô', example: 'Ô', emoji: '🌂' },
  Ơ: { name: 'ơ', example: 'Ớt', emoji: '🌶️' },
  P: { name: 'pê', example: 'Pin', emoji: '🔋' },
  Q: { name: 'quy', example: 'Quà', emoji: '🎁' },
  R: { name: 'rờ', example: 'Rùa', emoji: '🐢' },
  S: { name: 'sờ', example: 'Sao', emoji: '⭐' },
  T: { name: 'tê', example: 'Táo', emoji: '🍎' },
  U: { name: 'u', example: 'Cú', emoji: '🦉' },
  Ư: { name: 'ư', example: 'Sư tử', emoji: '🦁' },
  V: { name: 'vê', example: 'Voi', emoji: '🐘' },
  X: { name: 'ích', example: 'Xe', emoji: '🚗' },
  Y: { name: 'i dài', example: 'Yo-yo', emoji: '🪀' },
};

/* ===========================================================================
 * 3. TỪ & CÂU LUYỆN VIẾT
 * ========================================================================= */

export interface WordItem {
  text: string; // hiển thị (CHỮ HOA cho dễ tô)
  read: string; // câu đọc TTS (chữ thường tự nhiên)
  emoji: string;
}

export const WORDS: WordItem[] = [
  { text: 'MÈO', read: 'mèo', emoji: '🐱' },
  { text: 'CHÓ', read: 'chó', emoji: '🐶' },
  { text: 'GÀ', read: 'gà', emoji: '🐔' },
  { text: 'CÁ', read: 'cá', emoji: '🐟' },
  { text: 'BÒ', read: 'bò', emoji: '🐮' },
  { text: 'VOI', read: 'voi', emoji: '🐘' },
  { text: 'GẤU', read: 'gấu', emoji: '🐻' },
  { text: 'HỔ', read: 'hổ', emoji: '🐯' },
  { text: 'THỎ', read: 'thỏ', emoji: '🐰' },
  { text: 'VỊT', read: 'vịt', emoji: '🦆' },
  { text: 'BÚT', read: 'bút', emoji: '✏️' },
  { text: 'BÀN', read: 'bàn', emoji: '🪑' },
  { text: 'GHẾ', read: 'ghế', emoji: '🪑' },
  { text: 'SÁCH', read: 'sách', emoji: '📚' },
  { text: 'CẶP', read: 'cặp', emoji: '🎒' },
  { text: 'ĐÈN', read: 'đèn', emoji: '💡' },
  { text: 'NHÀ', read: 'nhà', emoji: '🏠' },
  { text: 'CÂY', read: 'cây', emoji: '🌳' },
  { text: 'HOA', read: 'hoa', emoji: '🌸' },
  { text: 'LÁ', read: 'lá', emoji: '🍃' },
  { text: 'MƯA', read: 'mưa', emoji: '🌧️' },
  { text: 'NẮNG', read: 'nắng', emoji: '☀️' },
  { text: 'TRĂNG', read: 'trăng', emoji: '🌙' },
  { text: 'SAO', read: 'sao', emoji: '⭐' },
  { text: 'BIỂN', read: 'biển', emoji: '🌊' },
  { text: 'NÚI', read: 'núi', emoji: '⛰️' },
  { text: 'CƠM', read: 'cơm', emoji: '🍚' },
  { text: 'PHỞ', read: 'phở', emoji: '🍜' },
  { text: 'BÁNH', read: 'bánh', emoji: '🍞' },
  { text: 'SỮA', read: 'sữa', emoji: '🥛' },
  { text: 'TÁO', read: 'táo', emoji: '🍎' },
  { text: 'CAM', read: 'cam', emoji: '🍊' },
  { text: 'BỐ', read: 'bố', emoji: '👨' },
  { text: 'MẸ', read: 'mẹ', emoji: '👩' },
  { text: 'BÀ', read: 'bà', emoji: '👵' },
  { text: 'ÔNG', read: 'ông', emoji: '👴' },
  { text: 'EM', read: 'em', emoji: '👧' },
  { text: 'BÉ', read: 'bé', emoji: '👶' },
];

export interface SentenceItem {
  text: string; // hiển thị
  read: string; // TTS
}

export const SENTENCES: SentenceItem[] = [
  { text: 'EM ĐI HỌC', read: 'Em đi học' },
  { text: 'BÉ YÊU MẸ', read: 'Bé yêu mẹ' },
  { text: 'CON MÈO CON', read: 'Con mèo con' },
  { text: 'TRỜI MƯA TO', read: 'Trời mưa to' },
  { text: 'EM CHÀO CÔ', read: 'Em chào cô' },
  { text: 'MẸ NẤU CƠM', read: 'Mẹ nấu cơm' },
  { text: 'BÉ TÔ MÀU', read: 'Bé tô màu' },
  { text: 'EM ĐỌC SÁCH', read: 'Em đọc sách' },
  { text: 'BÀ KỂ CHUYỆN', read: 'Bà kể chuyện' },
  { text: 'TRĂNG TRÒN SÁNG', read: 'Trăng tròn sáng' },
];

/* ===========================================================================
 * 4. CHẾ ĐỘ HỌC (5 mode theo doc)
 *    `kind` quyết định lấy danh sách item từ đâu (view xử lý).
 * ========================================================================= */

export type ModeKind = 'learn' | 'lower' | 'upper' | 'word' | 'sentence';

export interface ModeDef {
  id: ModeKind;
  label: string;
  emoji: string;
  desc: string;
  gradient: string;
}

export const MODES: ModeDef[] = [
  {
    id: 'learn',
    label: 'Học Chữ Cái',
    emoji: '🔤',
    desc: '29 chữ cái · nghe đọc + ví dụ + tập viết',
    gradient: 'from-sky-400 to-indigo-500',
  },
  {
    id: 'lower',
    label: 'Chữ Thường',
    emoji: 'a',
    desc: 'Viết chữ thường a → y',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'upper',
    label: 'Chữ Hoa',
    emoji: 'A',
    desc: 'Viết chữ hoa A → Y',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 'word',
    label: 'Viết Từ',
    emoji: '📝',
    desc: 'Tập viết từ: MÈO, CHÓ, BÚT…',
    gradient: 'from-rose-400 to-pink-500',
  },
  {
    id: 'sentence',
    label: 'Viết Câu',
    emoji: '📖',
    desc: 'Tập viết câu ngắn: EM ĐI HỌC…',
    gradient: 'from-fuchsia-500 to-purple-600',
  },
];

/* ===========================================================================
 * 5. THÀNH TÍCH & STICKER
 * ========================================================================= */

/** Thống kê tích luỹ (lưu localStorage) phục vụ thành tích + bảng phụ huynh. */
export interface WriteStats {
  lessonsDone: number; // tổng lượt viết "đạt"
  wordsDone: number; // tổng lượt viết TỪ/CÂU đạt
  excellentCount: number; // số lần accuracy ≥ 95%
  accSum: number; // tổng accuracy (để tính trung bình)
  accCount: number; // số lần chấm
  timeMs: number; // tổng thời gian luyện (ms)
}

/** Ngữ cảnh xét mở khoá thành tích. */
export interface AchievementCtx extends WriteStats {
  alphabetSize: number; // số chữ hoa khác nhau đã viết đạt
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
    id: 'diligent',
    emoji: '📚',
    name: 'Bé Chăm Học',
    desc: 'Hoàn thành 10 bài viết',
    unlocked: (c) => c.lessonsDone >= 10,
  },
  {
    id: 'alphabet-expert',
    emoji: '🔠',
    name: 'Chuyên Gia Chữ Cái',
    desc: 'Viết đủ 29 chữ cái',
    unlocked: (c) => c.alphabetSize >= TOTAL_LETTERS,
  },
  {
    id: 'beautiful',
    emoji: '✨',
    name: 'Siêu Nét Đẹp',
    desc: 'Đạt 95% chính xác 20 lần',
    unlocked: (c) => c.excellentCount >= 20,
  },
  {
    id: 'writer',
    emoji: '🖋️',
    name: 'Nhà Văn Nhí',
    desc: 'Viết đạt 50 từ',
    unlocked: (c) => c.wordsDone >= 50,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'gold-letter', emoji: '🔤', name: 'Chữ cái vàng', unlocked: (c) => c.lessonsDone >= 1 },
  { id: 'magic-pen', emoji: '✏️', name: 'Bút thần kỳ', unlocked: (c) => c.lessonsDone >= 10 },
  { id: 'nice-book', emoji: '📒', name: 'Quyển tập đẹp', unlocked: (c) => c.wordsDone >= 10 },
  { id: 'study-star', emoji: '⭐', name: 'Ngôi sao học tập', unlocked: (c) => c.excellentCount >= 10 },
  { id: 'top-student', emoji: '🎓', name: 'Học sinh xuất sắc', unlocked: (c) => c.lessonsDone >= 30 },
];
