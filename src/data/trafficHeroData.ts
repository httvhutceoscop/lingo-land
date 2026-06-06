/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "SIÊU NHÂN GIAO THÔNG"
 *
 * Bé làm Siêu Nhân Giao Thông của "Thành Phố An Toàn": đi qua 5 khu vực, học
 * luật giao thông qua các nhiệm vụ (đèn tín hiệu, sang đường, mũ bảo hiểm, biển
 * báo, tìm lỗi vi phạm). Biển báo VẼ BẰNG CSS (tròn/tam giác/vuông + ký hiệu).
 *
 * 2 loại nhiệm vụ (chạm):
 *   - 'choice' : chọn 1 đáp án đúng (kèm hình minh hoạ: đèn / biển báo / emoji)
 *   - 'order'  : sắp xếp các BƯỚC theo đúng thứ tự (vd 5 bước sang đường)
 *
 * File KHÔNG chứa React — chỉ dữ liệu + cấu hình + thành tích. Dễ mở rộng.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  SCORE_ACTION: 100, // hành động đúng (mỗi câu)
  SCORE_MISSION: 300, // hoàn thành nhiệm vụ
  SCORE_PERFECT: 200, // không mắc lỗi
  COMBO_N: 5, // 5 nhiệm vụ liên tiếp → thưởng
  COMBO_BONUS: 500,
  COINS_PER_MISSION: 15,
  SAFETY_START: 60, // chỉ số an toàn khởi điểm (0–100)
  SAFETY_UP: 8, // đúng → +
  SAFETY_DOWN: 12, // sai (chọn nguy hiểm) → −
  SUPPORT_WRONG_STREAK: 2, // sai liên tiếp → hiện gợi ý
} as const;

/* ===========================================================================
 * 2. BIỂN BÁO GIAO THÔNG
 *    category quyết định HÌNH DẠNG + MÀU khi vẽ (xem RoadSignIcon trong view):
 *      warning     → tam giác vàng (cảnh báo)
 *      prohibition → tròn viền đỏ (cấm)
 *      mandatory   → tròn xanh dương (hiệu lệnh)
 *      instruction → vuông xanh dương (chỉ dẫn)
 *    symbol: emoji/ký tự hiển thị bên trong (đặc biệt 'bar' = vạch trắng — cấm
 *    đi ngược chiều).
 * ========================================================================= */

export type SignCategory = 'warning' | 'prohibition' | 'mandatory' | 'instruction';

export interface RoadSign {
  id: string;
  name: string;
  category: SignCategory;
  symbol: string; // emoji / ký tự / 'bar'
  desc: string; // mô tả (từ điển biển báo)
}

export const ROAD_SIGNS: RoadSign[] = [
  // ── Cảnh báo (tam giác vàng) ──
  { id: 'school', name: 'Trẻ em / Trường học', category: 'warning', symbol: '🧒', desc: 'Báo gần trường học, có nhiều trẻ em — phải đi chậm và quan sát.' },
  { id: 'crossroad', name: 'Giao nhau', category: 'warning', symbol: '✚', desc: 'Phía trước có ngã tư, ngã ba — phải chú ý quan sát.' },
  { id: 'pedestrian', name: 'Người đi bộ', category: 'warning', symbol: '🚶', desc: 'Báo nơi có người đi bộ qua đường — lái xe chậm lại.' },
  { id: 'signal', name: 'Đèn tín hiệu', category: 'warning', symbol: '🚦', desc: 'Phía trước có đèn giao thông — chuẩn bị dừng khi đèn đỏ.' },

  // ── Cấm (tròn viền đỏ) ──
  { id: 'no-entry', name: 'Cấm đi ngược chiều', category: 'prohibition', symbol: 'bar', desc: 'Cấm tất cả các loại xe đi vào theo chiều này.' },
  { id: 'no-bicycle', name: 'Cấm xe đạp', category: 'prohibition', symbol: '🚲', desc: 'Cấm xe đạp đi vào đoạn đường này.' },
  { id: 'no-horn', name: 'Cấm bấm còi', category: 'prohibition', symbol: '📢', desc: 'Cấm bấm còi — thường gần bệnh viện, trường học.' },

  // ── Hiệu lệnh (tròn xanh) ──
  { id: 'go-straight', name: 'Hướng đi thẳng', category: 'mandatory', symbol: '⬆️', desc: 'Các xe chỉ được đi thẳng theo hướng mũi tên.' },
  { id: 'bike-lane', name: 'Đường xe đạp', category: 'mandatory', symbol: '🚲', desc: 'Đường dành riêng cho xe đạp.' },

  // ── Chỉ dẫn (vuông xanh) ──
  { id: 'crosswalk', name: 'Nơi người đi bộ qua đường', category: 'instruction', symbol: '🚶', desc: 'Vạch kẻ đường dành cho người đi bộ qua đường an toàn.' },
  { id: 'bus-stop', name: 'Bến xe buýt', category: 'instruction', symbol: '🚌', desc: 'Nơi xe buýt dừng đón, trả khách.' },
];

export const TOTAL_SIGNS = ROAD_SIGNS.length;
export const signById = (id: string): RoadSign => ROAD_SIGNS.find((s) => s.id === id) ?? ROAD_SIGNS[0];

/* ===========================================================================
 * 3. NHIỆM VỤ
 * ========================================================================= */

/** Nhóm kiến thức (cho Learning Engine + bảng phụ huynh). */
export type Knowledge = 'lights' | 'signs' | 'crossing' | 'driving';

export interface ChoiceOption {
  id: string;
  label: string;
  emoji?: string;
  signId?: string; // nếu là phương án biển báo → render biển báo
}

interface MissionBase {
  id: string;
  title: string;
  prompt: string;
  knowledge: Knowledge;
}

export type Mission =
  | (MissionBase & {
      type: 'choice';
      /** Hình minh hoạ ở đề bài: đèn giao thông / một biển báo / emoji. */
      visual?: { kind: 'light'; color: 'red' | 'yellow' | 'green' } | { kind: 'sign'; signId: string };
      optionKind: 'text' | 'sign'; // phương án là chữ+emoji hay biển báo
      options: ChoiceOption[];
      answerId: string;
    })
  | (MissionBase & {
      type: 'order';
      steps: string[]; // các bước theo ĐÚNG thứ tự (view sẽ xáo trộn để bé sắp lại)
    });

export interface Zone {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  missions: Mission[];
}

/* ===========================================================================
 * 4. 5 KHU VỰC · NHIỆM VỤ
 * ========================================================================= */

export const ZONES: Zone[] = [
  // ── KHU 1: TRƯỜNG HỌC ──
  {
    id: 'school',
    name: 'Khu Trường Học',
    emoji: '🏫',
    gradient: 'from-amber-400 to-orange-500',
    missions: [
      {
        id: 'z1m1',
        type: 'choice',
        title: 'Đi bộ an toàn',
        prompt: 'Khi đi bộ, con nên đi ở đâu cho an toàn?',
        knowledge: 'crossing',
        optionKind: 'text',
        options: [
          { id: 'sidewalk', label: 'Trên vỉa hè', emoji: '🚶' },
          { id: 'road', label: 'Dưới lòng đường', emoji: '🛣️' },
          { id: 'middle', label: 'Giữa đường', emoji: '⚠️' },
        ],
        answerId: 'sidewalk',
      },
      {
        id: 'z1m2',
        type: 'order',
        title: 'Các bước sang đường',
        prompt: 'Sắp xếp đúng thứ tự các bước sang đường an toàn!',
        knowledge: 'crossing',
        steps: ['Dừng lại', 'Quan sát bên trái', 'Quan sát bên phải', 'Nhìn trái lần nữa', 'Sang đường'],
      },
      {
        id: 'z1m3',
        type: 'choice',
        title: 'Đèn cho người đi bộ',
        prompt: 'Đèn dành cho người đi bộ màu ĐỎ thì con làm gì?',
        knowledge: 'lights',
        visual: { kind: 'light', color: 'red' },
        optionKind: 'text',
        options: [
          { id: 'stop', label: 'Dừng lại, chờ đèn xanh', emoji: '🛑' },
          { id: 'go', label: 'Đi qua thật nhanh', emoji: '🏃' },
          { id: 'run', label: 'Vừa đi vừa chơi', emoji: '🤹' },
        ],
        answerId: 'stop',
      },
    ],
  },

  // ── KHU 2: KHU DÂN CƯ ──
  {
    id: 'residential',
    name: 'Khu Dân Cư',
    emoji: '🏘️',
    gradient: 'from-emerald-400 to-teal-500',
    missions: [
      {
        id: 'z2m1',
        type: 'choice',
        title: 'Tìm biển báo',
        prompt: 'Tìm biển báo "Cấm xe đạp" nào!',
        knowledge: 'signs',
        optionKind: 'sign',
        options: [
          { id: 'o1', label: 'Cấm xe đạp', signId: 'no-bicycle' },
          { id: 'o2', label: 'Đường xe đạp', signId: 'bike-lane' },
          { id: 'o3', label: 'Bến xe buýt', signId: 'bus-stop' },
        ],
        answerId: 'o1',
      },
      {
        id: 'z2m2',
        type: 'choice',
        title: 'Đây là biển gì?',
        prompt: 'Biển báo này có ý nghĩa gì?',
        knowledge: 'signs',
        visual: { kind: 'sign', signId: 'crosswalk' },
        optionKind: 'text',
        options: [
          { id: 'cw', label: 'Nơi người đi bộ qua đường', emoji: '🚶' },
          { id: 'no', label: 'Cấm người đi bộ', emoji: '🚫' },
          { id: 'park', label: 'Bãi đỗ xe', emoji: '🅿️' },
        ],
        answerId: 'cw',
      },
      {
        id: 'z2m3',
        type: 'choice',
        title: 'Đi xe đạp an toàn',
        prompt: 'Khi đi xe đạp, con cần làm gì để an toàn?',
        knowledge: 'driving',
        optionKind: 'text',
        options: [
          { id: 'helmet', label: 'Đội mũ bảo hiểm', emoji: '🪖' },
          { id: 'fast', label: 'Đạp thật nhanh', emoji: '💨' },
          { id: 'nohand', label: 'Buông cả hai tay', emoji: '🙌' },
        ],
        answerId: 'helmet',
      },
    ],
  },

  // ── KHU 3: CÔNG VIÊN ──
  {
    id: 'park',
    name: 'Công Viên',
    emoji: '🌳',
    gradient: 'from-green-400 to-lime-500',
    missions: [
      {
        id: 'z3m1',
        type: 'choice',
        title: 'Đèn xanh',
        prompt: 'Đèn giao thông màu XANH thì được làm gì?',
        knowledge: 'lights',
        visual: { kind: 'light', color: 'green' },
        optionKind: 'text',
        options: [
          { id: 'go', label: 'Được đi', emoji: '✅' },
          { id: 'stop', label: 'Phải dừng lại', emoji: '🛑' },
          { id: 'wait', label: 'Đứng yên mãi', emoji: '🧍' },
        ],
        answerId: 'go',
      },
      {
        id: 'z3m2',
        type: 'choice',
        title: 'Đèn vàng',
        prompt: 'Đèn giao thông màu VÀNG nghĩa là gì?',
        knowledge: 'lights',
        visual: { kind: 'light', color: 'yellow' },
        optionKind: 'text',
        options: [
          { id: 'slow', label: 'Đi chậm lại, chuẩn bị dừng', emoji: '🟡' },
          { id: 'fast', label: 'Tăng tốc vượt qua', emoji: '🏎️' },
          { id: 'turn', label: 'Quay đầu lại', emoji: '↩️' },
        ],
        answerId: 'slow',
      },
      {
        id: 'z3m3',
        type: 'choice',
        title: 'Đội mũ bảo hiểm',
        prompt: 'Ai đội mũ bảo hiểm đúng cách khi đi xe máy?',
        knowledge: 'driving',
        optionKind: 'text',
        options: [
          { id: 'helmet', label: 'Đội mũ bảo hiểm, cài quai', emoji: '🪖' },
          { id: 'cap', label: 'Đội mũ lưỡi trai', emoji: '🧢' },
          { id: 'none', label: 'Không đội mũ gì cả', emoji: '🙅' },
        ],
        answerId: 'helmet',
      },
    ],
  },

  // ── KHU 4: TRUNG TÂM THÀNH PHỐ ──
  {
    id: 'downtown',
    name: 'Trung Tâm Thành Phố',
    emoji: '🏙️',
    gradient: 'from-sky-400 to-indigo-500',
    missions: [
      {
        id: 'z4m1',
        type: 'choice',
        title: 'Ai đang vi phạm?',
        prompt: 'Đèn đang ĐỎ. Ai đang vi phạm luật giao thông?',
        knowledge: 'driving',
        optionKind: 'text',
        options: [
          { id: 'run', label: 'Bạn chạy qua đường khi đèn đỏ', emoji: '🏃' },
          { id: 'wait', label: 'Bạn đứng chờ trên vỉa hè', emoji: '🧍' },
          { id: 'helmet', label: 'Chú đội mũ bảo hiểm dừng xe', emoji: '🪖' },
        ],
        answerId: 'run',
      },
      {
        id: 'z4m2',
        type: 'choice',
        title: 'Biển cấm ngược chiều',
        prompt: 'Tìm biển "Cấm đi ngược chiều"!',
        knowledge: 'signs',
        optionKind: 'sign',
        options: [
          { id: 'o1', label: 'Cấm đi ngược chiều', signId: 'no-entry' },
          { id: 'o2', label: 'Giao nhau', signId: 'crossroad' },
          { id: 'o3', label: 'Hướng đi thẳng', signId: 'go-straight' },
        ],
        answerId: 'o1',
      },
      {
        id: 'z4m3',
        type: 'choice',
        title: 'Xử lý tình huống',
        prompt: 'Đang đi xe đạp thấy đèn chuyển ĐỎ, con nên làm gì?',
        knowledge: 'lights',
        visual: { kind: 'light', color: 'red' },
        optionKind: 'text',
        options: [
          { id: 'stop', label: 'Dừng lại trước vạch', emoji: '🛑' },
          { id: 'go', label: 'Cố vượt cho nhanh', emoji: '💨' },
          { id: 'turn', label: 'Lách sang làn khác', emoji: '↪️' },
        ],
        answerId: 'stop',
      },
    ],
  },

  // ── KHU 5: THÀNH PHỐ THÔNG MINH (tổng hợp) ──
  {
    id: 'smart',
    name: 'Thành Phố Thông Minh',
    emoji: '✨',
    gradient: 'from-fuchsia-500 to-purple-600',
    missions: [
      {
        id: 'z5m1',
        type: 'order',
        title: 'Ôn lại các bước sang đường',
        prompt: 'Sắp xếp lại đúng thứ tự sang đường an toàn!',
        knowledge: 'crossing',
        steps: ['Dừng lại', 'Quan sát bên trái', 'Quan sát bên phải', 'Nhìn trái lần nữa', 'Sang đường'],
      },
      {
        id: 'z5m2',
        type: 'choice',
        title: 'Biển trường học',
        prompt: 'Tìm biển báo "Trẻ em / Trường học"!',
        knowledge: 'signs',
        optionKind: 'sign',
        options: [
          { id: 'o1', label: 'Trẻ em', signId: 'school' },
          { id: 'o2', label: 'Người đi bộ', signId: 'pedestrian' },
          { id: 'o3', label: 'Đèn tín hiệu', signId: 'signal' },
        ],
        answerId: 'o1',
      },
      {
        id: 'z5m3',
        type: 'choice',
        title: 'Ý thức giao thông',
        prompt: 'Trên xe buýt / xe máy, con nên làm gì?',
        knowledge: 'driving',
        optionKind: 'text',
        options: [
          { id: 'belt', label: 'Ngồi yên, bám chắc / cài dây', emoji: '🪑' },
          { id: 'lean', label: 'Thò đầu, thò tay ra ngoài', emoji: '🙆' },
          { id: 'stand', label: 'Đứng nhảy trên ghế', emoji: '🤸' },
        ],
        answerId: 'belt',
      },
    ],
  },
];

export const TOTAL_ZONES = ZONES.length;

/* ===========================================================================
 * 5. SKIN SIÊU NHÂN (mở khoá theo khu vực hoàn thành)
 * ========================================================================= */

export interface HeroSkin {
  id: string;
  emoji: string;
  name: string;
  zonesNeeded: number;
}

export const HERO_SKINS: HeroSkin[] = [
  { id: 'hero', emoji: '🦸', name: 'Siêu Nhân', zonesNeeded: 0 },
  { id: 'police', emoji: '👮', name: 'Cảnh Sát', zonesNeeded: 2 },
  { id: 'worker', emoji: '👷', name: 'Kỹ Sư', zonesNeeded: 3 },
  { id: 'robot', emoji: '🤖', name: 'Robot', zonesNeeded: 5 },
];

/* ===========================================================================
 * 6. THÀNH TÍCH & STICKER
 * ========================================================================= */

export interface TrafficStats {
  missions: number; // tổng nhiệm vụ hoàn thành
  correct: number; // tổng câu đúng
  attempts: number; // tổng câu đã làm
  crossing: number; // số nhiệm vụ sang đường hoàn thành
  coins: number;
  timeMs: number;
}

export interface AchievementCtx extends TrafficStats {
  zonesCount: number; // số khu vực hoàn thành
  signsCount: number; // số biển báo đã học
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'safe-pedestrian', emoji: '🚶', name: 'Người Đi Bộ An Toàn', desc: 'Hoàn thành 10 nhiệm vụ sang đường', unlocked: (c) => c.crossing >= 10 },
  { id: 'sign-expert', emoji: '🚸', name: 'Chuyên Gia Biển Báo', desc: 'Học hết các biển báo', unlocked: (c) => c.signsCount >= TOTAL_SIGNS },
  { id: 'super-traffic', emoji: '🦸', name: 'Siêu Nhân Giao Thông', desc: 'Hoàn thành 30 nhiệm vụ', unlocked: (c) => c.missions >= 30 },
  { id: 'ambassador', emoji: '🏅', name: 'Đại Sứ Giao Thông', desc: 'Chinh phục tất cả khu vực', unlocked: (c) => c.zonesCount >= TOTAL_ZONES },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'light', emoji: '🚦', name: 'Đèn giao thông', unlocked: (c) => c.missions >= 1 },
  { id: 'bike', emoji: '🚲', name: 'Xe đạp', unlocked: (c) => c.signsCount >= 3 },
  { id: 'moto', emoji: '🛵', name: 'Xe máy', unlocked: (c) => c.zonesCount >= 2 },
  { id: 'school', emoji: '🚸', name: 'Biển trường học', unlocked: (c) => c.signsCount >= 6 },
  { id: 'police', emoji: '👮', name: 'Cảnh sát giao thông', unlocked: (c) => c.zonesCount >= 4 },
  { id: 'hero', emoji: '🦸', name: 'Siêu nhân giao thông', unlocked: (c) => c.zonesCount >= TOTAL_ZONES },
];
