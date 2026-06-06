/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "CỨU HỘ ĐỘNG VẬT"
 *
 * Bé là "Siêu Anh Hùng Cứu Hộ": mỗi nhiệm vụ là chuỗi 3 bước —
 *   1) TÌM con vật (hidden object), 2) CHĂM SÓC đúng cách (đói/khát/mệt/thương),
 *   3) ĐƯA VỀ môi trường sống đúng — rồi xem THẺ KIẾN THỨC (Animal Fact).
 *
 * Qua đó bé học: loài vật, thức ăn, môi trường sống, lòng yêu thương & trách
 * nhiệm. File KHÔNG chứa React — chỉ dữ liệu + cấu hình + thành tích. Dễ mở rộng
 * (thêm con vật/khu vực = thêm phần tử mảng).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_HEARTS: 5, // số tim ❤️ mỗi nhiệm vụ
  SCORE_MISSION: 100, // hoàn thành nhiệm vụ
  SCORE_CARE: 150, // chăm sóc đúng
  SCORE_PERFECT: 200, // không mắc lỗi
  COMBO_N: 5, // 5 nhiệm vụ liên tiếp → thưởng
  COMBO_BONUS: 500,
  COINS_BASE: 15, // xu thưởng cơ bản mỗi nhiệm vụ
  COINS_PER_STAR: 5, // xu thưởng thêm theo sao
  EMERGENCY_SECONDS: 60, // thời gian cho chế độ Giải Cứu Khẩn Cấp
} as const;

/* ===========================================================================
 * 2. MÔI TRƯỜNG SỐNG
 * ========================================================================= */

export interface Habitat {
  id: string;
  name: string;
  emoji: string;
}

export const HABITATS: Habitat[] = [
  { id: 'forest', name: 'Rừng', emoji: '🌳' },
  { id: 'farm', name: 'Nông trại', emoji: '🏡' },
  { id: 'ocean', name: 'Đại dương', emoji: '🌊' },
  { id: 'savanna', name: 'Thảo nguyên', emoji: '🌾' },
];

export const habitatById = (id: string): Habitat => HABITATS.find((h) => h.id === id) ?? HABITATS[0];

/* ===========================================================================
 * 3. ĐỘNG VẬT (kèm thức ăn, môi trường, fun fact giáo dục)
 * ========================================================================= */

export interface Animal {
  id: string;
  name: string;
  emoji: string;
  habitat: string; // id môi trường sống
  food: string; // emoji thức ăn ưa thích
  fact: string; // fun fact (hiển thị + đọc TTS)
  rare?: boolean; // động vật quý hiếm (Khu Bảo Tồn)
}

export const ANIMALS: Animal[] = [
  // ── Khu Rừng Xanh ──
  { id: 'rabbit', name: 'Thỏ', emoji: '🐰', habitat: 'forest', food: '🥕', fact: 'Thỏ có thể nhảy xa gấp 10 lần chiều dài thân mình!' },
  { id: 'squirrel', name: 'Sóc', emoji: '🐿️', habitat: 'forest', food: '🌰', fact: 'Sóc giấu hạt khắp nơi và nhớ được rất nhiều chỗ giấu.' },
  { id: 'deer', name: 'Nai', emoji: '🦌', habitat: 'forest', food: '🌿', fact: 'Nai con có thể đứng dậy đi lại chỉ vài giờ sau khi sinh.' },
  { id: 'bear', name: 'Gấu', emoji: '🐻', habitat: 'forest', food: '🍯', fact: 'Gấu ngủ đông suốt mùa lạnh để tiết kiệm năng lượng.' },

  // ── Nông Trại Vui Vẻ ──
  { id: 'chicken', name: 'Gà', emoji: '🐔', habitat: 'farm', food: '🌽', fact: 'Gà có thể nhớ mặt hơn 100 con gà và người khác nhau.' },
  { id: 'duck', name: 'Vịt', emoji: '🦆', habitat: 'farm', food: '🍞', fact: 'Lông vịt không thấm nước nhờ một lớp dầu đặc biệt.' },
  { id: 'cow', name: 'Bò', emoji: '🐮', habitat: 'farm', food: '🌿', fact: 'Bò có những người bạn thân và buồn khi bị tách khỏi nhau.' },
  { id: 'sheep', name: 'Cừu', emoji: '🐑', habitat: 'farm', food: '🌿', fact: 'Cừu nhận ra nhau qua khuôn mặt, giống như con người.' },

  // ── Đại Dương Xanh ──
  { id: 'dolphin', name: 'Cá heo', emoji: '🐬', habitat: 'ocean', food: '🐟', fact: 'Cá heo gọi nhau bằng "tên riêng" là những tiếng huýt đặc biệt.' },
  { id: 'seaturtle', name: 'Rùa biển', emoji: '🐢', habitat: 'ocean', food: '🪼', fact: 'Rùa biển có thể sống hơn 100 năm!' },
  { id: 'seal', name: 'Hải cẩu', emoji: '🦭', habitat: 'ocean', food: '🐟', fact: 'Hải cẩu có thể nín thở dưới nước tới 30 phút.' },

  // ── Thảo Nguyên ──
  { id: 'lion', name: 'Sư tử', emoji: '🦁', habitat: 'savanna', food: '🍖', fact: 'Tiếng gầm của sư tử vang xa tới 8 km!' },
  { id: 'giraffe', name: 'Hươu cao cổ', emoji: '🦒', habitat: 'savanna', food: '🌿', fact: 'Hươu cao cổ chỉ ngủ khoảng 30 phút mỗi ngày.' },
  { id: 'zebra', name: 'Ngựa vằn', emoji: '🦓', habitat: 'savanna', food: '🌿', fact: 'Mỗi con ngựa vằn có hoa văn sọc riêng, không con nào giống con nào.' },

  // ── Khu Bảo Tồn Đặc Biệt (quý hiếm) ──
  { id: 'elephant', name: 'Voi', emoji: '🐘', habitat: 'savanna', food: '🌿', fact: 'Voi là động vật trên cạn lớn nhất và rất giàu tình cảm.', rare: true },
  { id: 'tiger', name: 'Hổ', emoji: '🐯', habitat: 'forest', food: '🍖', fact: 'Hổ bơi rất giỏi và thích ngâm mình trong nước.', rare: true },
  { id: 'panda', name: 'Gấu trúc', emoji: '🐼', habitat: 'forest', food: '🎋', fact: 'Gấu trúc ăn tre tới 12 tiếng mỗi ngày!', rare: true },
  { id: 'rhino', name: 'Tê giác', emoji: '🦏', habitat: 'savanna', food: '🌿', fact: 'Sừng tê giác được làm từ chất giống như móng tay của chúng ta.', rare: true },
];

export const TOTAL_ANIMALS = ANIMALS.length;
export const animalById = (id: string): Animal => ANIMALS.find((a) => a.id === id) ?? ANIMALS[0];

/* ===========================================================================
 * 4. KHU VỰC CỨU HỘ (gom nhóm động vật, mở khoá tuần tự)
 * ========================================================================= */

export interface Area {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  foliage: string; // emoji nền dùng cho bước "tìm động vật"
  animalIds: string[];
}

export const AREAS: Area[] = [
  {
    id: 'forest',
    name: 'Khu Rừng Xanh',
    emoji: '🌲',
    gradient: 'from-emerald-400 to-green-600',
    foliage: '🌿',
    animalIds: ['rabbit', 'squirrel', 'deer', 'bear'],
  },
  {
    id: 'farm',
    name: 'Nông Trại Vui Vẻ',
    emoji: '🚜',
    gradient: 'from-amber-400 to-yellow-600',
    foliage: '🌾',
    animalIds: ['chicken', 'duck', 'cow', 'sheep'],
  },
  {
    id: 'ocean',
    name: 'Đại Dương Xanh',
    emoji: '🌊',
    gradient: 'from-cyan-400 to-blue-600',
    foliage: '🫧',
    animalIds: ['dolphin', 'seaturtle', 'seal'],
  },
  {
    id: 'savanna',
    name: 'Thảo Nguyên',
    emoji: '🦁',
    gradient: 'from-orange-400 to-amber-600',
    foliage: '🌾',
    animalIds: ['lion', 'giraffe', 'zebra'],
  },
  {
    id: 'sanctuary',
    name: 'Khu Bảo Tồn Đặc Biệt',
    emoji: '✨',
    gradient: 'from-fuchsia-500 to-purple-600',
    foliage: '🍃',
    animalIds: ['elephant', 'tiger', 'panda', 'rhino'],
  },
];

export const TOTAL_AREAS = AREAS.length;

/* ===========================================================================
 * 5. TÌNH TRẠNG & CHĂM SÓC
 * ========================================================================= */

export interface Condition {
  id: string;
  label: string; // mô tả tình trạng
  clue: string; // câu gợi ý (kèm emoji)
  /** Vật phẩm chăm sóc đúng. Nếu null → dùng THỨC ĂN của con vật (đói). */
  careItem: string | null;
}

export const CONDITIONS: Condition[] = [
  { id: 'hungry', label: 'đang đói', clue: '🍽️ Bụng đói meo, cần được cho ăn!', careItem: null },
  { id: 'thirsty', label: 'đang khát', clue: '💦 Khát nước quá, cần uống nước!', careItem: '💧' },
  { id: 'tired', label: 'đang mệt', clue: '😴 Mệt lả rồi, cần nghỉ ngơi!', careItem: '🛏️' },
  { id: 'injured', label: 'bị thương nhẹ', clue: '🤕 Bị thương, cần băng bó!', careItem: '🩹' },
];

/** Kho vật phẩm chăm sóc (để tạo phương án nhiễu). */
export const CARE_POOL = ['💧', '🛏️', '🩹', '🥕', '🌿', '🐟', '🍖', '🍯', '🌰', '🌽', '🍞', '🪼', '🎋'];

/* ===========================================================================
 * 6. THÀNH TÍCH & STICKER
 * ========================================================================= */

export interface RescueStats {
  missions: number; // tổng nhiệm vụ hoàn thành
  treats: number; // số lần chăm sóc đúng (≈ ca chữa trị)
  coins: number; // xu (nâng cấp trung tâm)
  timeMs: number; // thời gian chơi
}

export interface AchievementCtx extends RescueStats {
  animalsCount: number; // số loài đã cứu (khác nhau)
  areasCount: number; // số khu vực đã hoàn thành
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
    id: 'animal-friend',
    emoji: '🐾',
    name: 'Người Bạn Của Động Vật',
    desc: 'Cứu hộ 20 lượt động vật',
    unlocked: (c) => c.missions >= 20,
  },
  {
    id: 'young-doctor',
    emoji: '🩺',
    name: 'Bác Sĩ Nhí',
    desc: 'Chăm sóc đúng 20 lần',
    unlocked: (c) => c.treats >= 20, // doc gợi ý 50 — rút còn 20 cho khả thi
  },
  {
    id: 'conservationist',
    emoji: '🌍',
    name: 'Nhà Bảo Tồn',
    desc: 'Hoàn thành tất cả khu vực',
    unlocked: (c) => c.areasCount >= TOTAL_AREAS,
  },
  {
    id: 'super-hero',
    emoji: '🦸',
    name: 'Siêu Anh Hùng Cứu Hộ',
    desc: 'Cứu hết tất cả loài động vật',
    unlocked: (c) => c.animalsCount >= TOTAL_ANIMALS,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'rabbit', emoji: '🐰', name: 'Thỏ', unlocked: (c) => c.missions >= 1 },
  { id: 'dolphin', emoji: '🐬', name: 'Cá heo', unlocked: (c) => c.animalsCount >= 4 },
  { id: 'lion', emoji: '🦁', name: 'Sư tử', unlocked: (c) => c.animalsCount >= 8 },
  { id: 'elephant', emoji: '🐘', name: 'Voi', unlocked: (c) => c.animalsCount >= 12 },
  { id: 'turtle', emoji: '🐢', name: 'Rùa biển', unlocked: (c) => c.areasCount >= 3 },
  { id: 'heart', emoji: '❤️', name: 'Trái tim cứu hộ', unlocked: (c) => c.treats >= 10 },
];

/* ===========================================================================
 * 7. TRUNG TÂM CỨU HỘ (nâng cấp bằng xu)
 * ========================================================================= */

export interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  cost: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'cage', name: 'Chuồng động vật', emoji: '🏠', cost: 50 },
  { id: 'pond', name: 'Hồ nước', emoji: '⛲', cost: 80 },
  { id: 'clinic', name: 'Khu chữa bệnh', emoji: '🏥', cost: 120 },
  { id: 'playground', name: 'Khu vui chơi', emoji: '🎡', cost: 160 },
];
