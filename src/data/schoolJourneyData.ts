/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "HÀNH TRÌNH ĐẾN TRƯỜNG"
 *
 * Game chuẩn bị tâm thế vào lớp 1 cho bé 5–7 tuổi: trải qua 5 CHƯƠNG (chuẩn bị
 * đi học → trên đường → trong lớp → kết bạn → kết thúc ngày học), mỗi chương vài
 * NHIỆM VỤ nhỏ. Qua đó bé học tự lập, an toàn giao thông, quy tắc lớp học, giao
 * tiếp — và bớt lo lắng trước khi vào lớp 1.
 *
 * 2 loại nhiệm vụ (chạm, hợp bé nhỏ):
 *   - 'choice' : chọn 1 đáp án đúng (đồng phục, đèn giao thông, chào hỏi…)
 *   - 'pick'   : chọn ĐÚNG TẬP đồ vật (xếp cặp: lấy bút/vở/thước/tẩy, bỏ đồ chơi)
 *
 * File KHÔNG chứa React — chỉ dữ liệu + cấu hình + thành tích. Dễ mở rộng
 * (thêm chương / nhiệm vụ = thêm phần tử mảng).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_HINTS: 3, // gợi ý mỗi nhiệm vụ
  SCORE_PER_MISSION: 100, // hoàn thành 1 nhiệm vụ
  PERFECT_BONUS: 200, // không mắc lỗi
  COMBO_N: 3, // 3 nhiệm vụ đúng liên tiếp → thưởng
  COMBO_BONUS: 300,
  LEVEL_COMPLETE_DELAY: 1500,
} as const;

/* ===========================================================================
 * 2. KIỂU NHIỆM VỤ
 * ========================================================================= */

/** Một lựa chọn (đồ vật / câu trả lời) với emoji + nhãn. */
export interface Option {
  id: string;
  emoji: string;
  label: string;
}

export type MissionType = 'choice' | 'pick';

interface MissionBase {
  id: string;
  title: string;
  prompt: string; // câu hướng dẫn (cô giáo đọc bằng TTS)
}

export type Mission =
  | (MissionBase & {
      type: 'choice';
      options: Option[];
      answerId: string; // id lựa chọn đúng
    })
  | (MissionBase & {
      type: 'pick';
      items: Option[];
      correctIds: string[]; // tập id cần chọn (bỏ những thứ không thuộc tập)
    });

export interface Chapter {
  id: string;
  title: string;
  emoji: string;
  gradient: string;
  /** Nhóm kỹ năng (cho thành tích): 'prep' | 'road' | 'class' | 'friend' | 'end'. */
  skill: string;
  missions: Mission[];
}

/* ===========================================================================
 * 3. 5 CHƯƠNG · NHIỆM VỤ
 * ========================================================================= */

export const CHAPTERS: Chapter[] = [
  // ── CHƯƠNG 1: CHUẨN BỊ ĐI HỌC ──
  {
    id: 'prep',
    title: 'Chương 1 · Chuẩn Bị Đi Học',
    emoji: '🎒',
    gradient: 'from-sky-400 to-blue-500',
    skill: 'prep',
    missions: [
      {
        id: 'prep1',
        type: 'choice',
        title: 'Chọn đồng phục',
        prompt: 'Chọn đúng bộ đồng phục để đi học nào!',
        options: [
          { id: 'uniform', emoji: '👕', label: 'Đồng phục' },
          { id: 'pajama', emoji: '🩳', label: 'Đồ ngủ' },
          { id: 'raincoat', emoji: '🧥', label: 'Áo mưa' },
        ],
        answerId: 'uniform',
      },
      {
        id: 'prep2',
        type: 'pick',
        title: 'Xếp đồ vào cặp',
        prompt: 'Xếp đồ dùng học tập vào cặp nhé — đừng cho đồ chơi vào nha!',
        items: [
          { id: 'pen', emoji: '✏️', label: 'Bút' },
          { id: 'book', emoji: '📓', label: 'Vở' },
          { id: 'ruler', emoji: '📏', label: 'Thước' },
          { id: 'eraser', emoji: '🧽', label: 'Tẩy' },
          { id: 'toy', emoji: '🧸', label: 'Đồ chơi' },
          { id: 'ball', emoji: '⚽', label: 'Bóng' },
        ],
        correctIds: ['pen', 'book', 'ruler', 'eraser'],
      },
      {
        id: 'prep3',
        type: 'pick',
        title: 'Kiểm tra cặp sách',
        prompt: 'Cô dặn mang: hộp màu, sách và bình nước. Hãy chọn đủ nhé!',
        items: [
          { id: 'crayon', emoji: '🖍️', label: 'Hộp màu' },
          { id: 'textbook', emoji: '📚', label: 'Sách' },
          { id: 'bottle', emoji: '🧴', label: 'Bình nước' },
          { id: 'game', emoji: '🎮', label: 'Máy chơi game' },
          { id: 'candy', emoji: '🍬', label: 'Kẹo' },
        ],
        correctIds: ['crayon', 'textbook', 'bottle'],
      },
    ],
  },

  // ── CHƯƠNG 2: TRÊN ĐƯỜNG ĐẾN TRƯỜNG ──
  {
    id: 'road',
    title: 'Chương 2 · Trên Đường Đến Trường',
    emoji: '🚸',
    gradient: 'from-emerald-400 to-teal-500',
    skill: 'road',
    missions: [
      {
        id: 'road1',
        type: 'choice',
        title: 'Qua đường an toàn',
        prompt: 'Khi qua đường, con nên làm thế nào cho an toàn?',
        options: [
          { id: 'cross', emoji: '🚶', label: 'Đi đúng vạch khi đèn xanh' },
          { id: 'run', emoji: '🏃', label: 'Chạy băng qua đường' },
          { id: 'play', emoji: '🤾', label: 'Vừa đi vừa chơi' },
        ],
        answerId: 'cross',
      },
      {
        id: 'road2',
        type: 'choice',
        title: 'Đèn đỏ',
        prompt: 'Đèn giao thông màu ĐỎ thì con phải làm gì?',
        options: [
          { id: 'stop', emoji: '🛑', label: 'Dừng lại' },
          { id: 'go', emoji: '🏃', label: 'Đi tiếp' },
          { id: 'fast', emoji: '💨', label: 'Chạy thật nhanh' },
        ],
        answerId: 'stop',
      },
      {
        id: 'road3',
        type: 'choice',
        title: 'Đèn xanh',
        prompt: 'Đèn giao thông màu XANH thì con được làm gì?',
        options: [
          { id: 'walk', emoji: '🚶', label: 'Được đi qua' },
          { id: 'wait', emoji: '✋', label: 'Đứng yên mãi' },
          { id: 'sit', emoji: '🪑', label: 'Ngồi xuống đường' },
        ],
        answerId: 'walk',
      },
    ],
  },

  // ── CHƯƠNG 3: TRONG LỚP HỌC ──
  {
    id: 'class',
    title: 'Chương 3 · Trong Lớp Học',
    emoji: '🏫',
    gradient: 'from-amber-400 to-orange-500',
    skill: 'class',
    missions: [
      {
        id: 'class1',
        type: 'choice',
        title: 'Tìm chỗ ngồi',
        prompt: 'Bé Nam ngồi ở bàn số 3. Hãy chọn đúng bàn nhé!',
        options: [
          { id: 's1', emoji: '1️⃣', label: 'Bàn 1' },
          { id: 's2', emoji: '2️⃣', label: 'Bàn 2' },
          { id: 's3', emoji: '3️⃣', label: 'Bàn 3' },
          { id: 's4', emoji: '4️⃣', label: 'Bàn 4' },
        ],
        answerId: 's3',
      },
      {
        id: 'class2',
        type: 'choice',
        title: 'Giơ tay phát biểu',
        prompt: 'Cô đặt câu hỏi, con muốn trả lời thì nên làm gì?',
        options: [
          { id: 'raise', emoji: '🙋', label: 'Giơ tay xin phát biểu' },
          { id: 'shout', emoji: '📢', label: 'Nói leo thật to' },
          { id: 'quiet', emoji: '🤐', label: 'Ngồi im không nói' },
        ],
        answerId: 'raise',
      },
      {
        id: 'class3',
        type: 'choice',
        title: 'Lấy đúng đồ dùng',
        prompt: 'Cô dặn: "Các con lấy bút chì". Con chọn đúng nhé!',
        options: [
          { id: 'pencil', emoji: '✏️', label: 'Bút chì' },
          { id: 'crayon', emoji: '🖍️', label: 'Bút màu' },
          { id: 'ruler', emoji: '📏', label: 'Thước kẻ' },
        ],
        answerId: 'pencil',
      },
    ],
  },

  // ── CHƯƠNG 4: KẾT BẠN ──
  {
    id: 'friend',
    title: 'Chương 4 · Kết Bạn',
    emoji: '🤝',
    gradient: 'from-rose-400 to-pink-500',
    skill: 'friend',
    missions: [
      {
        id: 'friend1',
        type: 'choice',
        title: 'Chào bạn mới',
        prompt: 'Con gặp một bạn mới trong lớp. Con sẽ nói gì?',
        options: [
          { id: 'hi', emoji: '👋', label: 'Xin chào, mình tên là...!' },
          { id: 'silent', emoji: '😐', label: 'Không nói gì cả' },
          { id: 'tease', emoji: '😝', label: 'Trêu chọc bạn' },
        ],
        answerId: 'hi',
      },
      {
        id: 'friend2',
        type: 'choice',
        title: 'Chia sẻ đồ dùng',
        prompt: 'Bạn bên cạnh quên mang bút. Con sẽ làm gì?',
        options: [
          { id: 'lend', emoji: '✏️', label: 'Cho bạn mượn bút' },
          { id: 'ignore', emoji: '🙅', label: 'Mặc kệ bạn' },
          { id: 'laugh', emoji: '😆', label: 'Cười nhạo bạn' },
        ],
        answerId: 'lend',
      },
    ],
  },

  // ── CHƯƠNG 5: HOÀN THÀNH NGÀY HỌC ──
  {
    id: 'end',
    title: 'Chương 5 · Hoàn Thành Ngày Học',
    emoji: '🏡',
    gradient: 'from-fuchsia-500 to-purple-600',
    skill: 'end',
    missions: [
      {
        id: 'end1',
        type: 'choice',
        title: 'Thu dọn bàn học',
        prompt: 'Hết giờ học rồi, việc đầu tiên con nên làm là gì?',
        options: [
          { id: 'tidy', emoji: '🧹', label: 'Thu dọn bàn học gọn gàng' },
          { id: 'runout', emoji: '🏃', label: 'Chạy ngay ra ngoài' },
          { id: 'mess', emoji: '🗑️', label: 'Để bừa bộn' },
        ],
        answerId: 'tidy',
      },
      {
        id: 'end2',
        type: 'pick',
        title: 'Xếp đồ ra về',
        prompt: 'Xếp lại đồ dùng vào cặp để ra về nào!',
        items: [
          { id: 'pen', emoji: '✏️', label: 'Bút' },
          { id: 'book', emoji: '📓', label: 'Vở' },
          { id: 'bottle', emoji: '🧴', label: 'Bình nước' },
          { id: 'trash', emoji: '🍌', label: 'Vỏ chuối' },
        ],
        correctIds: ['pen', 'book', 'bottle'],
      },
      {
        id: 'end3',
        type: 'choice',
        title: 'Ra về đúng cách',
        prompt: 'Trước khi ra về, con nên làm gì?',
        options: [
          { id: 'bye', emoji: '👋', label: 'Chào cô và các bạn' },
          { id: 'leave', emoji: '🚪', label: 'Đi luôn không chào' },
          { id: 'push', emoji: '😤', label: 'Chen lấn ra cửa' },
        ],
        answerId: 'bye',
      },
    ],
  },
];

export const TOTAL_CHAPTERS = CHAPTERS.length;
export const TOTAL_MISSIONS = CHAPTERS.reduce((n, c) => n + c.missions.length, 0);

/** Tất cả id nhiệm vụ của một chương (cho thành tích "hoàn thành hết chương X"). */
export const missionIdsOfChapter = (chapterId: string): string[] =>
  CHAPTERS.find((c) => c.id === chapterId)?.missions.map((m) => m.id) ?? [];

/* ===========================================================================
 * 4. TẠO NHÂN VẬT (Story Mode)
 * ========================================================================= */

/** Các avatar bé có thể chọn làm nhân vật của mình. */
export const AVATARS = ['🧒', '👦', '👧', '🧒🏻', '👦🏽', '👧🏾'];

/** Màu chủ đề (balo / điểm nhấn) — tailwind class nền. */
export const BAG_COLORS: Array<{ id: string; name: string; class: string }> = [
  { id: 'blue', name: 'Xanh dương', class: 'bg-sky-400' },
  { id: 'green', name: 'Xanh lá', class: 'bg-emerald-400' },
  { id: 'pink', name: 'Hồng', class: 'bg-pink-400' },
  { id: 'orange', name: 'Cam', class: 'bg-orange-400' },
  { id: 'purple', name: 'Tím', class: 'bg-violet-400' },
];

/* ===========================================================================
 * 5. THÀNH TÍCH & STICKER
 * ========================================================================= */

export interface SchoolStats {
  completions: number; // tổng lượt hoàn thành nhiệm vụ (tính cả chơi lại)
  timeMs: number;
}

export interface AchievementCtx extends SchoolStats {
  missionsDone: Set<string>; // id nhiệm vụ đã hoàn thành (khác nhau)
  chapters: Set<string>; // id chương đã hoàn thành
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: (c: AchievementCtx) => boolean;
}

/** Kiểm tra đã hoàn thành HẾT nhiệm vụ của một chương chưa. */
const chapterCleared = (ctx: AchievementCtx, chapterId: string): boolean =>
  missionIdsOfChapter(chapterId).every((id) => ctx.missionsDone.has(id));

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'model-student',
    emoji: '🎖️',
    name: 'Học Sinh Gương Mẫu',
    desc: 'Hoàn thành 20 lượt nhiệm vụ',
    unlocked: (c) => c.completions >= 20,
  },
  {
    id: 'prep-expert',
    emoji: '🎒',
    name: 'Chuyên Gia Chuẩn Bị',
    desc: 'Hoàn thành hết phần chuẩn bị đi học',
    unlocked: (c) => chapterCleared(c, 'prep'),
  },
  {
    id: 'good-friend',
    emoji: '🤝',
    name: 'Bạn Tốt',
    desc: 'Hoàn thành hết phần kết bạn',
    unlocked: (c) => chapterCleared(c, 'friend'),
  },
  {
    id: 'grade1-star',
    emoji: '⭐',
    name: 'Ngôi Sao Lớp 1',
    desc: 'Hoàn thành toàn bộ hành trình',
    unlocked: (c) => c.chapters.size >= TOTAL_CHAPTERS,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'bag', emoji: '🎒', name: 'Balo', unlocked: (c) => c.completions >= 1 },
  { id: 'pencil', emoji: '✏️', name: 'Bút chì', unlocked: (c) => c.completions >= 5 },
  { id: 'book', emoji: '📚', name: 'Sách', unlocked: (c) => c.chapters.size >= 2 },
  { id: 'school', emoji: '🏫', name: 'Trường học', unlocked: (c) => c.chapters.size >= 4 },
  { id: 'star', emoji: '⭐', name: 'Học sinh giỏi', unlocked: (c) => c.chapters.size >= TOTAL_CHAPTERS },
];
