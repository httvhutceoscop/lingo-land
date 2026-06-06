/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "DU LỊCH CÙNG MÈO Ú"
 *
 * Bé cùng Mèo Ú đi khắp thế giới. Mỗi ĐIỂM ĐẾN gồm: nghe giới thiệu → tìm địa
 * danh → tìm đặc sản → quiz văn hoá → đóng DẤU HỘ CHIẾU + thẻ kiến thức.
 *
 * Hành trình tuyến tính (mở khoá điểm đến kế tiếp). Các điểm đến gom theo
 * CHƯƠNG (Việt Nam → Đông Nam Á → Châu Âu → Thế Giới) chỉ để hiển thị.
 *
 * File KHÔNG chứa React — chỉ dữ liệu + cấu hình + thành tích. Dễ mở rộng
 * (thêm điểm đến = thêm phần tử mảng DESTINATIONS).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_ENERGY: 5, // năng lượng ❤️ mỗi điểm đến
  SCORE_QUEST: 100, // hoàn thành 1 nhiệm vụ (1 round)
  SCORE_MINIGAME: 150, // quiz văn hoá đúng
  SCORE_NEW_PLACE: 300, // khám phá điểm đến mới
  SCORE_COUNTRY: 1000, // hoàn thành một quốc gia
  COINS_PER_PLACE: 20, // xu thưởng mỗi điểm đến
  COMBO_N: 5,
  COMBO_BONUS: 500,
  QUICK_ROUNDS: 6, // số câu chế độ "Ôn tập nhanh"
} as const;

/* ===========================================================================
 * 2. ĐIỂM ĐẾN
 * ========================================================================= */

export interface QuizQ {
  q: string; // câu hỏi văn hoá / địa lý
  options: string[]; // 3–4 phương án (chữ)
  answer: string; // đáp án đúng
}

export interface Destination {
  id: string;
  chapter: string; // id chương (để gom nhóm hiển thị)
  country: string; // tên quốc gia
  countryId: string; // id quốc gia (gom thành phố cùng nước)
  flag: string; // cờ → dùng làm dấu hộ chiếu
  city: string;
  landmarkName: string;
  landmark: string; // emoji địa danh
  foodName: string;
  food: string; // emoji đặc sản
  intro: string; // lời Mèo Ú giới thiệu (TTS)
  fact: string; // điều thú vị (thẻ kiến thức)
  quiz: QuizQ;
}

/* Thứ tự trong mảng = thứ tự hành trình (mở khoá tuần tự). */
export const DESTINATIONS: Destination[] = [
  // ── CHƯƠNG 1: VIỆT NAM ──
  {
    id: 'hanoi',
    chapter: 'vietnam',
    country: 'Việt Nam',
    countryId: 'vn',
    flag: '🇻🇳',
    city: 'Hà Nội',
    landmarkName: 'Hồ Gươm',
    landmark: '🏞️',
    foodName: 'Phở',
    food: '🍜',
    intro: 'Xin chào! Chúng ta đang ở Hà Nội, thủ đô của Việt Nam!',
    fact: 'Hồ Gươm còn gọi là Hồ Hoàn Kiếm, gắn với truyền thuyết Rùa Thần trả gươm.',
    quiz: { q: 'Thủ đô của Việt Nam là thành phố nào?', options: ['Hà Nội', 'Huế', 'Đà Nẵng'], answer: 'Hà Nội' },
  },
  {
    id: 'hue',
    chapter: 'vietnam',
    country: 'Việt Nam',
    countryId: 'vn',
    flag: '🇻🇳',
    city: 'Huế',
    landmarkName: 'Đại Nội',
    landmark: '🏯',
    foodName: 'Bún bò Huế',
    food: '🍲',
    intro: 'Mình tới Huế rồi, nơi có cung điện cổ kính của các vị vua!',
    fact: 'Đại Nội Huế từng là nơi ở của 13 đời vua triều Nguyễn.',
    quiz: { q: 'Áo dài là trang phục truyền thống của nước nào?', options: ['Việt Nam', 'Nhật Bản', 'Thái Lan'], answer: 'Việt Nam' },
  },
  {
    id: 'danang',
    chapter: 'vietnam',
    country: 'Việt Nam',
    countryId: 'vn',
    flag: '🇻🇳',
    city: 'Đà Nẵng',
    landmarkName: 'Cầu Rồng',
    landmark: '🐉',
    foodName: 'Mì Quảng',
    food: '🍜',
    intro: 'Đà Nẵng có cây cầu hình con rồng phun lửa rất đẹp!',
    fact: 'Cầu Rồng ở Đà Nẵng có thể phun lửa và phun nước vào cuối tuần.',
    quiz: { q: 'Bãi biển Mỹ Khê nổi tiếng ở thành phố nào?', options: ['Đà Nẵng', 'Hà Nội', 'Huế'], answer: 'Đà Nẵng' },
  },
  {
    id: 'hcm',
    chapter: 'vietnam',
    country: 'Việt Nam',
    countryId: 'vn',
    flag: '🇻🇳',
    city: 'TP Hồ Chí Minh',
    landmarkName: 'Chợ Bến Thành',
    landmark: '🏬',
    foodName: 'Cơm tấm',
    food: '🍚',
    intro: 'Thành phố Hồ Chí Minh nhộn nhịp với khu chợ Bến Thành nổi tiếng!',
    fact: 'Chợ Bến Thành là khu chợ hơn 100 năm tuổi giữa trung tâm thành phố.',
    quiz: { q: 'Chợ Bến Thành nằm ở thành phố nào?', options: ['TP Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'], answer: 'TP Hồ Chí Minh' },
  },

  // ── CHƯƠNG 2: ĐÔNG NAM Á & NHẬT BẢN ──
  {
    id: 'bangkok',
    chapter: 'asia',
    country: 'Thái Lan',
    countryId: 'th',
    flag: '🇹🇭',
    city: 'Bangkok',
    landmarkName: 'Chùa Vàng',
    landmark: '🛕',
    foodName: 'Pad Thai',
    food: '🍜',
    intro: 'Chào mừng tới Thái Lan, xứ sở của những ngôi chùa vàng lấp lánh!',
    fact: 'Thái Lan được mệnh danh là "xứ sở của những nụ cười".',
    quiz: { q: 'Con vật biểu tượng của Thái Lan là gì?', options: ['Voi', 'Sư tử', 'Gấu trúc'], answer: 'Voi' },
  },
  {
    id: 'singapore',
    chapter: 'asia',
    country: 'Singapore',
    countryId: 'sg',
    flag: '🇸🇬',
    city: 'Singapore',
    landmarkName: 'Tượng Merlion',
    landmark: '🦁',
    foodName: 'Cua sốt ớt',
    food: '🦀',
    intro: 'Singapore nhỏ xinh có tượng sư tử biển phun nước rất nổi tiếng!',
    fact: 'Merlion là sinh vật nửa sư tử nửa cá, biểu tượng của Singapore.',
    quiz: { q: 'Tượng Merlion (sư tử biển) ở quốc gia nào?', options: ['Singapore', 'Thái Lan', 'Nhật Bản'], answer: 'Singapore' },
  },
  {
    id: 'tokyo',
    chapter: 'asia',
    country: 'Nhật Bản',
    countryId: 'jp',
    flag: '🇯🇵',
    city: 'Tokyo',
    landmarkName: 'Núi Phú Sĩ',
    landmark: '🗻',
    foodName: 'Sushi',
    food: '🍣',
    intro: 'Nhật Bản có ngọn núi Phú Sĩ phủ tuyết và hoa anh đào tuyệt đẹp!',
    fact: 'Núi Phú Sĩ là ngọn núi cao nhất Nhật Bản, cao 3.776 mét.',
    quiz: { q: 'Hoa anh đào là biểu tượng của nước nào?', options: ['Nhật Bản', 'Pháp', 'Ý'], answer: 'Nhật Bản' },
  },

  // ── CHƯƠNG 3: CHÂU ÂU ──
  {
    id: 'paris',
    chapter: 'europe',
    country: 'Pháp',
    countryId: 'fr',
    flag: '🇫🇷',
    city: 'Paris',
    landmarkName: 'Tháp Eiffel',
    landmark: '🗼',
    foodName: 'Bánh sừng bò',
    food: '🥐',
    intro: 'Paris hoa lệ có tháp Eiffel cao vút chạm tới bầu trời!',
    fact: 'Tháp Eiffel cao 330 mét, từng là công trình cao nhất thế giới.',
    quiz: { q: 'Tháp Eiffel nằm ở quốc gia nào?', options: ['Pháp', 'Ý', 'Anh'], answer: 'Pháp' },
  },
  {
    id: 'rome',
    chapter: 'europe',
    country: 'Ý',
    countryId: 'it',
    flag: '🇮🇹',
    city: 'Rome',
    landmarkName: 'Đấu trường Colosseum',
    landmark: '🏛️',
    foodName: 'Pizza',
    food: '🍕',
    intro: 'Nước Ý có đấu trường Colosseum cổ xưa và món pizza thơm ngon!',
    fact: 'Đấu trường Colosseum được xây gần 2.000 năm trước ở Rome.',
    quiz: { q: 'Món pizza nổi tiếng có nguồn gốc từ nước nào?', options: ['Ý', 'Pháp', 'Anh'], answer: 'Ý' },
  },
  {
    id: 'london',
    chapter: 'europe',
    country: 'Anh',
    countryId: 'uk',
    flag: '🇬🇧',
    city: 'London',
    landmarkName: 'Tháp đồng hồ Big Ben',
    landmark: '🕰️',
    foodName: 'Cá và khoai chiên',
    food: '🍟',
    intro: 'Thủ đô London của Anh có tháp đồng hồ Big Ben khổng lồ!',
    fact: 'Big Ben thực ra là tên của chiếc chuông lớn bên trong tháp đồng hồ.',
    quiz: { q: 'Tháp đồng hồ Big Ben ở quốc gia nào?', options: ['Anh', 'Pháp', 'Ý'], answer: 'Anh' },
  },

  // ── CHƯƠNG 4: KHÁM PHÁ THẾ GIỚI ──
  {
    id: 'newyork',
    chapter: 'world',
    country: 'Mỹ',
    countryId: 'us',
    flag: '🇺🇸',
    city: 'New York',
    landmarkName: 'Tượng Nữ Thần Tự Do',
    landmark: '🗽',
    foodName: 'Hamburger',
    food: '🍔',
    intro: 'Nước Mỹ có tượng Nữ Thần Tự Do đứng sừng sững bên bờ biển!',
    fact: 'Tượng Nữ Thần Tự Do là món quà nước Pháp tặng nước Mỹ.',
    quiz: { q: 'Tượng Nữ Thần Tự Do ở quốc gia nào?', options: ['Mỹ', 'Anh', 'Pháp'], answer: 'Mỹ' },
  },
  {
    id: 'cairo',
    chapter: 'world',
    country: 'Ai Cập',
    countryId: 'eg',
    flag: '🇪🇬',
    city: 'Cairo',
    landmarkName: 'Kim Tự Tháp',
    landmark: '🔺',
    foodName: 'Bánh mì Ai Cập',
    food: '🥙',
    intro: 'Ai Cập có những Kim Tự Tháp khổng lồ giữa sa mạc mênh mông!',
    fact: 'Kim Tự Tháp Giza được xây hơn 4.500 năm trước mà không có máy móc.',
    quiz: { q: 'Kim Tự Tháp nổi tiếng ở quốc gia nào?', options: ['Ai Cập', 'Mỹ', 'Ý'], answer: 'Ai Cập' },
  },
  {
    id: 'sydney',
    chapter: 'world',
    country: 'Úc',
    countryId: 'au',
    flag: '🇦🇺',
    city: 'Sydney',
    landmarkName: 'Nhà hát Opera Sydney',
    landmark: '🏟️',
    foodName: 'Thịt nướng BBQ',
    food: '🍖',
    intro: 'Nước Úc có nhà hát hình cánh buồm và chú kangaroo nhảy tưng tưng!',
    fact: 'Kangaroo là loài vật chỉ có ở nước Úc, mang con trong túi trước bụng.',
    quiz: { q: 'Con kangaroo là biểu tượng của nước nào?', options: ['Úc', 'Mỹ', 'Ai Cập'], answer: 'Úc' },
  },
];

export const TOTAL_DESTINATIONS = DESTINATIONS.length;

/** Số quốc gia khác nhau trong hành trình. */
export const TOTAL_COUNTRIES = new Set(DESTINATIONS.map((d) => d.countryId)).size;

/** Số điểm đến của một quốc gia (để biết khi nào "hoàn thành quốc gia"). */
export const destinationsOfCountry = (countryId: string): Destination[] =>
  DESTINATIONS.filter((d) => d.countryId === countryId);

/* ===========================================================================
 * 3. CHƯƠNG (gom nhóm hiển thị)
 * ========================================================================= */

export interface Chapter {
  id: string;
  title: string;
  emoji: string;
  gradient: string;
}

export const CHAPTERS: Chapter[] = [
  { id: 'vietnam', title: 'Chương 1 · Khám Phá Việt Nam', emoji: '🇻🇳', gradient: 'from-red-400 to-rose-500' },
  { id: 'asia', title: 'Chương 2 · Đông Nam Á & Nhật Bản', emoji: '🏯', gradient: 'from-amber-400 to-orange-500' },
  { id: 'europe', title: 'Chương 3 · Châu Âu', emoji: '🗼', gradient: 'from-sky-400 to-indigo-500' },
  { id: 'world', title: 'Chương 4 · Khám Phá Thế Giới', emoji: '🌍', gradient: 'from-emerald-400 to-cyan-500' },
];

/* ===========================================================================
 * 4. MÈO Ú — biểu cảm theo ngữ cảnh
 * ========================================================================= */

export const CAT_MOODS = {
  happy: '😺',
  curious: '😸',
  proud: '😻',
  surprised: '🙀',
} as const;

/* ===========================================================================
 * 5. THÀNH TÍCH & STICKER
 * ========================================================================= */

export interface TravelStats {
  coins: number;
  timeMs: number;
}

export interface AchievementCtx extends TravelStats {
  destCount: number; // số điểm đến đã khám phá
  countryCount: number; // số quốc gia đã hoàn thành
  visited: Set<string>; // id điểm đến đã thăm (cho sticker theo địa danh)
  countries: Set<string>; // id quốc gia đã hoàn thành
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
    id: 'young-traveler',
    emoji: '🎒',
    name: 'Nhà Du Hành Nhí',
    desc: 'Khám phá 10 địa điểm',
    unlocked: (c) => c.destCount >= 10,
  },
  {
    id: 'vietnam-expert',
    emoji: '🇻🇳',
    name: 'Chuyên Gia Việt Nam',
    desc: 'Khám phá hết Việt Nam',
    unlocked: (c) => c.countries.has('vn'),
  },
  {
    id: 'world-explorer',
    emoji: '🧭',
    name: 'Nhà Thám Hiểm Thế Giới',
    desc: 'Hoàn thành 8 quốc gia',
    unlocked: (c) => c.countryCount >= 8, // doc gợi ý 20 — rút còn 8 cho khả thi
  },
  {
    id: 'super-cat',
    emoji: '🐱',
    name: 'Mèo Ú Siêu Cấp',
    desc: 'Khám phá toàn bộ thế giới',
    unlocked: (c) => c.destCount >= TOTAL_DESTINATIONS,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'cat', emoji: '🐱', name: 'Mèo Ú', unlocked: (c) => c.destCount >= 1 },
  { id: 'vn', emoji: '🇻🇳', name: 'Việt Nam', unlocked: (c) => c.countries.has('vn') },
  { id: 'eiffel', emoji: '🗼', name: 'Eiffel', unlocked: (c) => c.visited.has('paris') },
  { id: 'fuji', emoji: '🗻', name: 'Phú Sĩ', unlocked: (c) => c.visited.has('tokyo') },
  { id: 'merlion', emoji: '🦁', name: 'Merlion', unlocked: (c) => c.visited.has('singapore') },
  { id: 'japan', emoji: '🎌', name: 'Nhật Bản', unlocked: (c) => c.countries.has('jp') },
  { id: 'earth', emoji: '🌍', name: 'Trái Đất', unlocked: (c) => c.destCount >= TOTAL_DESTINATIONS },
];
