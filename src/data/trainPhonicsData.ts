/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "CHUYẾN TÀU ÂM VẦN"
 *
 * Bé là trưởng tàu, ghép các "toa" ÂM ĐẦU + VẦN + THANH ĐIỆU để tạo thành
 * TIẾNG hoàn chỉnh (theo cách đánh vần Tiếng Việt lớp 1).
 *
 * MẸO XỬ LÝ THANH ĐIỆU (tránh ghép dấu bằng Unicode — dễ sai):
 *   Mỗi từ lưu sẵn 2 dạng:
 *     - base : tiếng KHÔNG dấu (âm đầu + vần), vd "MEO"
 *     - word : tiếng CÓ dấu hoàn chỉnh,            vd "MÈO"
 *   Khi bé chọn đúng thanh điệu, ta chỉ việc hiển thị `word` — không cần thuật
 *   toán đặt dấu lên nguyên âm. Thanh điệu hiển thị bằng ký hiệu mẫu trên chữ
 *   'a' (a, à, á, ả, ã, ạ) nên cũng không cần ghép dấu động.
 *
 * File này KHÔNG chứa React — chỉ dữ liệu + cấu hình + thành tích/sticker.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_HINTS: 3, // gợi ý mỗi màn
  SCORE_SEGMENT: 100, // ghép đúng 1 toa (âm đầu / vần / thanh)
  SCORE_WORD: 300, // ghép hoàn chỉnh 1 tiếng
  COMBO_X3: 3, // đúng liên tiếp 3 → thưởng
  COMBO_X3_BONUS: 200,
  COMBO_X5: 5, // đúng liên tiếp 5 → thưởng lớn
  COMBO_X5_BONUS: 500,
  HINT_DURATION: 2000, // ms — thời gian highlight gợi ý
  ROUNDS_PER_STATION: 6, // số ga-con (từ) mỗi trạm thường
  SPEED_SECONDS: 60, // thời gian cho ga "Đọc Thành Thạo"
  STATION_COMPLETE_BONUS: 500,
} as const;

/* ===========================================================================
 * 2. ÂM ĐẦU / VẦN / THANH ĐIỆU
 * ========================================================================= */

/** Bộ âm đầu (dùng làm phương án — gồm cả phụ âm ghép). */
export const INITIALS = [
  'B', 'C', 'D', 'Đ', 'G', 'H', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'X',
  'CH', 'TH', 'TR', 'NH', 'NG', 'PH', 'GI', 'QU', 'KH',
];

/** Bộ vần (dùng làm phương án) — gồm vần đơn & vần ghép. */
export const RHYMES = [
  'A', 'E', 'Ê', 'I', 'O', 'Ô', 'Ơ', 'U', 'Ư',
  'EO', 'AO', 'AI', 'AN', 'AM', 'AT', 'AC', 'ĂN', 'ĂNG', 'ÂU', 'ÂY',
  'OA', 'OI', 'ON', 'UA', 'UÔI', 'ƯA', 'ƯƠM', 'ƠN', 'IT', 'OAN', 'IÊU', 'UÔN', 'OAI',
];

/** 6 thanh điệu tiếng Việt; `symbol` minh hoạ bằng chữ 'a'. */
export interface Tone {
  id: string;
  name: string;
  symbol: string;
}

export const TONES: Tone[] = [
  { id: 'ngang', name: 'Không dấu', symbol: 'a' },
  { id: 'huyen', name: 'Huyền', symbol: 'à' },
  { id: 'sac', name: 'Sắc', symbol: 'á' },
  { id: 'hoi', name: 'Hỏi', symbol: 'ả' },
  { id: 'nga', name: 'Ngã', symbol: 'ã' },
  { id: 'nang', name: 'Nặng', symbol: 'ạ' },
];

export const toneById = (id: string): Tone => TONES.find((t) => t.id === id) ?? TONES[0];

/* ===========================================================================
 * 3. TỪ VỰNG (mỗi từ tách sẵn âm đầu / vần / thanh + 2 dạng base & word)
 * ========================================================================= */

export interface TrainWord {
  emoji: string;
  word: string; // tiếng CÓ dấu hoàn chỉnh (hiển thị kết quả)
  base: string; // tiếng KHÔNG dấu = initial + rhyme
  initial: string; // âm đầu
  rhyme: string; // vần (không dấu)
  tone: string; // id thanh điệu
  read: string; // câu đọc TTS (chữ thường tự nhiên)
}

export const WORDS: TrainWord[] = [
  { emoji: '🐱', word: 'MÈO', base: 'MEO', initial: 'M', rhyme: 'EO', tone: 'huyen', read: 'mèo' },
  { emoji: '🐶', word: 'CHÓ', base: 'CHO', initial: 'CH', rhyme: 'O', tone: 'sac', read: 'chó' },
  { emoji: '🐔', word: 'GÀ', base: 'GA', initial: 'G', rhyme: 'A', tone: 'huyen', read: 'gà' },
  { emoji: '🐟', word: 'CÁ', base: 'CA', initial: 'C', rhyme: 'A', tone: 'sac', read: 'cá' },
  { emoji: '🐰', word: 'THỎ', base: 'THO', initial: 'TH', rhyme: 'O', tone: 'hoi', read: 'thỏ' },
  { emoji: '🦆', word: 'VỊT', base: 'VIT', initial: 'V', rhyme: 'IT', tone: 'nang', read: 'vịt' },
  { emoji: '🐻', word: 'GẤU', base: 'GÂU', initial: 'G', rhyme: 'ÂU', tone: 'sac', read: 'gấu' },
  { emoji: '🐮', word: 'BÒ', base: 'BO', initial: 'B', rhyme: 'O', tone: 'huyen', read: 'bò' },
  { emoji: '🐢', word: 'RÙA', base: 'RUA', initial: 'R', rhyme: 'UA', tone: 'huyen', read: 'rùa' },
  { emoji: '🌸', word: 'HOA', base: 'HOA', initial: 'H', rhyme: 'OA', tone: 'ngang', read: 'hoa' },
  { emoji: '🍃', word: 'LÁ', base: 'LA', initial: 'L', rhyme: 'A', tone: 'sac', read: 'lá' },
  { emoji: '🌙', word: 'TRĂNG', base: 'TRĂNG', initial: 'TR', rhyme: 'ĂNG', tone: 'ngang', read: 'trăng' },
  { emoji: '⭐', word: 'SAO', base: 'SAO', initial: 'S', rhyme: 'AO', tone: 'ngang', read: 'sao' },
  { emoji: '🚗', word: 'XE', base: 'XE', initial: 'X', rhyme: 'E', tone: 'ngang', read: 'xe' },
  { emoji: '🏠', word: 'NHÀ', base: 'NHA', initial: 'NH', rhyme: 'A', tone: 'huyen', read: 'nhà' },
  { emoji: '🍌', word: 'CHUỐI', base: 'CHUÔI', initial: 'CH', rhyme: 'UÔI', tone: 'sac', read: 'chuối' },
  { emoji: '🐎', word: 'NGỰA', base: 'NGƯA', initial: 'NG', rhyme: 'ƯA', tone: 'nang', read: 'ngựa' },
  { emoji: '🐍', word: 'RẮN', base: 'RĂN', initial: 'R', rhyme: 'ĂN', tone: 'sac', read: 'rắn' },
  { emoji: '🦋', word: 'BƯỚM', base: 'BƯƠM', initial: 'B', rhyme: 'ƯƠM', tone: 'sac', read: 'bướm' },
  { emoji: '🌳', word: 'CÂY', base: 'CÂY', initial: 'C', rhyme: 'ÂY', tone: 'ngang', read: 'cây' },
  { emoji: '☀️', word: 'NẮNG', base: 'NĂNG', initial: 'N', rhyme: 'ĂNG', tone: 'sac', read: 'nắng' },
  { emoji: '🌧️', word: 'MƯA', base: 'MƯA', initial: 'M', rhyme: 'ƯA', tone: 'ngang', read: 'mưa' },
  { emoji: '🍎', word: 'TÁO', base: 'TAO', initial: 'T', rhyme: 'AO', tone: 'sac', read: 'táo' },
  { emoji: '🍊', word: 'CAM', base: 'CAM', initial: 'C', rhyme: 'AM', tone: 'ngang', read: 'cam' },
  { emoji: '🥛', word: 'SỮA', base: 'SƯA', initial: 'S', rhyme: 'ƯA', tone: 'nga', read: 'sữa' },
  { emoji: '👶', word: 'BÉ', base: 'BE', initial: 'B', rhyme: 'E', tone: 'sac', read: 'bé' },
  { emoji: '🐷', word: 'LỢN', base: 'LƠN', initial: 'L', rhyme: 'ƠN', tone: 'nang', read: 'lợn' },
  { emoji: '🐯', word: 'HỔ', base: 'HO', initial: 'H', rhyme: 'O', tone: 'hoi', read: 'hổ' },
  { emoji: '🐘', word: 'VOI', base: 'VOI', initial: 'V', rhyme: 'OI', tone: 'ngang', read: 'voi' },
  { emoji: '🐐', word: 'DÊ', base: 'DÊ', initial: 'D', rhyme: 'Ê', tone: 'ngang', read: 'dê' },
];

/* ===========================================================================
 * 4. GA (STATION) = CHẾ ĐỘ CHƠI
 *    `kind` quyết định bé phải ghép những toa nào.
 *      initial : chỉ chọn âm đầu
 *      rhyme   : chỉ chọn vần (âm đầu cho sẵn)
 *      blend   : chọn âm đầu + vần
 *      tone    : chọn thanh điệu (tiếng không dấu cho sẵn)
 *      full    : âm đầu + vần + thanh điệu
 *      speed   : như full nhưng giới hạn thời gian
 * ========================================================================= */

export type StationKind = 'initial' | 'rhyme' | 'blend' | 'tone' | 'full' | 'speed';

export interface Station {
  id: StationKind;
  name: string; // tên ga
  emoji: string;
  desc: string;
  sticker: string; // sticker thưởng khi hoàn thành ga
  gradient: string;
}

export const STATIONS: Station[] = [
  {
    id: 'initial',
    name: 'Ga Âm Đầu',
    emoji: '🚂',
    desc: 'Nhìn hình, chọn ÂM ĐẦU đúng',
    sticker: '🚂',
    gradient: 'from-sky-400 to-blue-500',
  },
  {
    id: 'rhyme',
    name: 'Ga Vần',
    emoji: '🚃',
    desc: 'Nhìn hình, chọn VẦN đúng',
    sticker: '🚃',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'blend',
    name: 'Ga Ghép Âm',
    emoji: '🔗',
    desc: 'Ghép ÂM ĐẦU + VẦN thành tiếng',
    sticker: '⭐',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 'tone',
    name: 'Ga Thanh Điệu',
    emoji: '🎵',
    desc: 'Chọn THANH ĐIỆU đúng cho tiếng',
    sticker: '🎓',
    gradient: 'from-rose-400 to-pink-500',
  },
  {
    id: 'full',
    name: 'Ga Từ Vựng',
    emoji: '📖',
    desc: 'Đánh vần hoàn chỉnh: âm + vần + thanh',
    gradient: 'from-fuchsia-500 to-purple-600',
    sticker: '📖',
  },
  {
    id: 'speed',
    name: 'Ga Đọc Thành Thạo',
    emoji: '⚡',
    desc: 'Đánh vần thật nhanh trong 60 giây',
    gradient: 'from-indigo-500 to-purple-600',
    sticker: '🎓',
  },
];

/** Các bước (toa) cần ghép theo loại ga. */
export function stepsForStation(kind: StationKind): Array<'initial' | 'rhyme' | 'tone'> {
  switch (kind) {
    case 'initial':
      return ['initial'];
    case 'rhyme':
      return ['rhyme'];
    case 'blend':
      return ['initial', 'rhyme'];
    case 'tone':
      return ['tone'];
    case 'full':
    case 'speed':
      return ['initial', 'rhyme', 'tone'];
  }
}

/* ===========================================================================
 * 5. THÀNH TÍCH & STICKER
 * ========================================================================= */

/** Thống kê tích luỹ (lưu localStorage) cho thành tích + bảng phụ huynh. */
export interface TrainStats {
  wordsLearned: number; // số tiếng ghép hoàn chỉnh
  correct: number; // số lượt chọn đúng
  attempts: number; // tổng số lượt chọn
  timeMs: number; // thời gian học
}

export interface AchievementCtx extends TrainStats {
  stations: Set<string>; // id ga đã hoàn thành
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
    id: 'vowel-station',
    emoji: '🚉',
    name: 'Nhà Ga Nguyên Âm',
    desc: 'Hoàn thành Ga Vần',
    unlocked: (c) => c.stations.has('rhyme'),
  },
  {
    id: 'initial-master',
    emoji: '🎯',
    name: 'Bậc Thầy Âm Đầu',
    desc: 'Hoàn thành Ga Âm Đầu',
    unlocked: (c) => c.stations.has('initial'),
  },
  {
    id: 'rhyme-expert',
    emoji: '🧠',
    name: 'Chuyên Gia Âm Vần',
    desc: 'Ghép đúng 30 tiếng',
    unlocked: (c) => c.wordsLearned >= 30, // doc gợi ý 100 — rút còn 30 cho khả thi
  },
  {
    id: 'super-train',
    emoji: '🚄',
    name: 'Siêu Đầu Tàu',
    desc: 'Hoàn thành tất cả các ga',
    unlocked: (c) => c.stations.size >= STATIONS.length,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'engine', emoji: '🚂', name: 'Đầu tàu', unlocked: (c) => c.stations.size >= 1 },
  { id: 'car', emoji: '🚃', name: 'Toa tàu', unlocked: (c) => c.stations.size >= 2 },
  { id: 'star', emoji: '⭐', name: 'Ngôi sao', unlocked: (c) => c.wordsLearned >= 10 },
  { id: 'student', emoji: '🎓', name: 'Học sinh giỏi', unlocked: (c) => c.stations.size >= 4 },
  { id: 'book', emoji: '📖', name: 'Quyển sách thần kỳ', unlocked: (c) => c.wordsLearned >= 20 },
];
