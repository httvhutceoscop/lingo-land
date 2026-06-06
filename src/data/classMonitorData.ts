/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — GAME "BÉ LÀM LỚP TRƯỞNG"
 *
 * Game GIÁO DỤC KỸ NĂNG MỀM (SEL): bé đóng vai lớp trưởng, xử lý các tình huống
 * lớp học. Mỗi lựa chọn ảnh hưởng tới HỒ SƠ KỸ NĂNG (trách nhiệm, đồng cảm, hợp
 * tác, giao tiếp, lãnh đạo) và MỨC ĐỘ VUI VẺ của lớp.
 *
 * Cốt lõi là TÌNH HUỐNG–LỰA CHỌN (decision); xen kẽ vài nhiệm vụ tương tác nhẹ
 * (điểm danh, dọn dẹp). Đây mới là phần dạy kỹ năng — không phải đồ hoạ phức tạp.
 *
 * File KHÔNG chứa React — chỉ dữ liệu + cấu hình + thành tích. Dễ mở rộng nhiệm
 * vụ / học sinh / tình huống (chỉ cần thêm phần tử vào mảng).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH
 * ========================================================================= */

export const GAME_CONFIG = {
  START_HAPPINESS: 70, // mức vui vẻ đầu mỗi tuần (0–100)
  SCORE_MISSION: 100, // hoàn thành 1 nhiệm vụ
  SCORE_GOOD_CHOICE: 50, // lựa chọn tốt (quality 'best')
  SCORE_HELP: 75, // giúp đỡ bạn bè
  COMBO_N: 5, // hoàn thành liên tiếp 5 nhiệm vụ → thưởng
  COMBO_BONUS: 300,
  QUICK_COUNT: 5, // số tình huống ở chế độ "Tình huống bất ngờ"
} as const;

/* ===========================================================================
 * 2. KỸ NĂNG MỀM (Social Skill Engine)
 * ========================================================================= */

export type SkillKey = 'responsibility' | 'empathy' | 'teamwork' | 'communication' | 'leadership';

export type SkillProfile = Record<SkillKey, number>;

export const SKILL_META: Array<{ key: SkillKey; label: string; emoji: string; color: string }> = [
  { key: 'responsibility', label: 'Trách nhiệm', emoji: '🎯', color: 'bg-sky-400' },
  { key: 'empathy', label: 'Đồng cảm', emoji: '❤️', color: 'bg-rose-400' },
  { key: 'teamwork', label: 'Hợp tác', emoji: '🤝', color: 'bg-emerald-400' },
  { key: 'communication', label: 'Giao tiếp', emoji: '💬', color: 'bg-amber-400' },
  { key: 'leadership', label: 'Lãnh đạo', emoji: '⭐', color: 'bg-violet-400' },
];

/* ===========================================================================
 * 3. HỌC SINH (dùng cho điểm danh + ngữ cảnh)
 * ========================================================================= */

export interface Student {
  id: string;
  name: string;
  avatar: string;
}

export const STUDENTS: Student[] = [
  { id: 'nam', name: 'Nam', avatar: '👦' },
  { id: 'lan', name: 'Lan', avatar: '👧' },
  { id: 'minh', name: 'Minh', avatar: '🧒' },
  { id: 'hoa', name: 'Hoa', avatar: '👧🏻' },
  { id: 'bo', name: 'Bo', avatar: '👦🏻' },
  { id: 'mai', name: 'Mai', avatar: '👧🏽' },
  { id: 'an', name: 'An', avatar: '🧒🏻' },
  { id: 'ti', name: 'Tí', avatar: '👦🏽' },
];

export const studentById = (id: string): Student =>
  STUDENTS.find((s) => s.id === id) ?? STUDENTS[0];

/* ===========================================================================
 * 4. NHIỆM VỤ
 *
 * 3 loại:
 *   - decision  : tình huống + nhiều lựa chọn ứng xử (cốt lõi SEL)
 *   - attendance: điểm danh — tìm bạn vắng mặt
 *   - tidy      : dọn dẹp — chạm để sắp xếp gọn gàng
 * ========================================================================= */

export type MissionType = 'decision' | 'attendance' | 'tidy';

/** Một lựa chọn ứng xử trong tình huống. */
export interface Choice {
  id: string;
  label: string;
  quality: 'best' | 'ok' | 'poor'; // chất lượng ứng xử → quyết định số sao
  feedback: string; // lời cô giáo phản hồi (TTS)
  happiness: number; // thay đổi mức vui vẻ của lớp
  skills: Partial<SkillProfile>; // cộng/trừ chỉ số kỹ năng
  isHelp?: boolean; // có phải hành động giúp đỡ bạn?
}

interface MissionBase {
  id: string;
  title: string;
  prompt: string; // mô tả tình huống
  emoji: string;
  isTeacherSupport?: boolean; // thuộc nhóm "hỗ trợ cô giáo"?
}

export type Mission =
  | (MissionBase & { type: 'decision'; choices: Choice[] })
  | (MissionBase & { type: 'attendance'; roster: string[]; absentId: string })
  | (MissionBase & { type: 'tidy'; items: number });

export interface Week {
  id: string;
  title: string;
  emoji: string;
  missions: Mission[];
}

/* ===========================================================================
 * 5. CỐT TRUYỆN — 4 TUẦN HỌC
 * ========================================================================= */

export const WEEKS: Week[] = [
  // ── TUẦN 1: NGÀY ĐẦU LÀM LỚP TRƯỞNG ──
  {
    id: 'w1',
    title: 'Tuần 1 · Ngày Đầu Làm Lớp Trưởng',
    emoji: '🏫',
    missions: [
      {
        id: 'w1m1',
        type: 'attendance',
        title: 'Điểm danh lớp',
        prompt: 'Sáng nay bạn nào vắng mặt? Chạm vào chỗ ngồi trống nhé!',
        emoji: '📋',
        roster: ['nam', 'lan', 'minh', 'hoa'],
        absentId: 'minh',
      },
      {
        id: 'w1m2',
        type: 'tidy',
        title: 'Sắp xếp bàn ghế',
        prompt: 'Bàn ghế bị lệch lộn xộn. Chạm để kéo ngay ngắn lại nào!',
        emoji: '🪑',
        items: 4,
      },
      {
        id: 'w1m3',
        type: 'decision',
        title: 'Nhắc bạn giữ trật tự',
        prompt: 'Hai bạn nói chuyện riêng trong giờ học. Con sẽ làm gì?',
        emoji: '🤫',
        choices: [
          {
            id: 'c1',
            label: 'Nhẹ nhàng nhắc bạn giữ trật tự',
            quality: 'best',
            feedback: 'Cô khen con nhắc bạn rất khéo và lịch sự!',
            happiness: 8,
            skills: { leadership: 4, communication: 4 },
          },
          {
            id: 'c2',
            label: 'Ra hiệu “suỵt” im lặng',
            quality: 'ok',
            feedback: 'Cũng được, nhưng con có thể nói nhẹ nhàng với bạn nhé.',
            happiness: 3,
            skills: { communication: 2 },
          },
          {
            id: 'c3',
            label: 'Quát to bảo bạn im đi',
            quality: 'poor',
            feedback: 'Quát to làm bạn buồn. Lần sau mình nhẹ nhàng hơn nha.',
            happiness: -10,
            skills: { communication: -3, leadership: -2 },
          },
        ],
      },
    ],
  },

  // ── TUẦN 2: GIÚP ĐỠ BẠN BÈ ──
  {
    id: 'w2',
    title: 'Tuần 2 · Giúp Đỡ Bạn Bè',
    emoji: '🤝',
    missions: [
      {
        id: 'w2m1',
        type: 'decision',
        title: 'Bạn quên bút',
        prompt: 'Bạn Lan quên mang bút, đang lo lắng. Con làm gì?',
        emoji: '✏️',
        choices: [
          {
            id: 'c1',
            label: 'Cho bạn mượn bút',
            quality: 'best',
            feedback: 'Con tốt bụng quá! Bạn Lan cảm ơn con rất nhiều.',
            happiness: 10,
            skills: { empathy: 5, teamwork: 3 },
            isHelp: true,
          },
          {
            id: 'c2',
            label: 'Mặc kệ bạn',
            quality: 'poor',
            feedback: 'Bạn đang cần giúp đỡ đó. Mình giúp bạn nhé!',
            happiness: -8,
            skills: { empathy: -4 },
          },
        ],
      },
      {
        id: 'w2m2',
        type: 'decision',
        title: 'Bạn bị ngã',
        prompt: 'Giờ ra chơi, bạn Bo bị ngã ở sân trường. Con làm gì?',
        emoji: '🩹',
        choices: [
          {
            id: 'c1',
            label: 'Hỏi thăm và báo cô giáo',
            quality: 'best',
            feedback: 'Đúng rồi! Hỏi thăm bạn và báo cô là rất trách nhiệm.',
            happiness: 10,
            skills: { empathy: 4, responsibility: 4 },
            isHelp: true,
          },
          {
            id: 'c2',
            label: 'Đỡ bạn đứng dậy',
            quality: 'ok',
            feedback: 'Con biết giúp bạn, giỏi lắm! Nhớ báo cô nếu bạn đau nhé.',
            happiness: 6,
            skills: { empathy: 3 },
            isHelp: true,
          },
          {
            id: 'c3',
            label: 'Cười bạn',
            quality: 'poor',
            feedback: 'Cười khi bạn ngã là không tốt. Mình thương bạn nhé.',
            happiness: -12,
            skills: { empathy: -5 },
          },
        ],
      },
    ],
  },

  // ── TUẦN 3: HỖ TRỢ CÔ GIÁO ──
  {
    id: 'w3',
    title: 'Tuần 3 · Hỗ Trợ Cô Giáo',
    emoji: '👩‍🏫',
    missions: [
      {
        id: 'w3m1',
        type: 'decision',
        title: 'Phát vở cho lớp',
        prompt: 'Cô nhờ con phát vở cho cả lớp. Con làm thế nào?',
        emoji: '📒',
        isTeacherSupport: true,
        choices: [
          {
            id: 'c1',
            label: 'Phát lần lượt từng bàn, gọn gàng',
            quality: 'best',
            feedback: 'Con làm việc ngăn nắp quá, cô rất hài lòng!',
            happiness: 8,
            skills: { responsibility: 5, leadership: 3 },
          },
          {
            id: 'c2',
            label: 'Tung vở cho nhanh',
            quality: 'poor',
            feedback: 'Tung vở dễ làm rơi rách. Mình phát nhẹ nhàng nhé.',
            happiness: -8,
            skills: { responsibility: -3 },
          },
        ],
      },
      {
        id: 'w3m2',
        type: 'decision',
        title: 'Thu bài tập',
        prompt: 'Đến giờ nộp bài. Con thu bài của lớp thế nào?',
        emoji: '📝',
        isTeacherSupport: true,
        choices: [
          {
            id: 'c1',
            label: 'Thu theo tổ, xếp ngay ngắn',
            quality: 'best',
            feedback: 'Tuyệt vời! Thu theo tổ giúp cô dễ kiểm tra.',
            happiness: 8,
            skills: { responsibility: 4, leadership: 3 },
          },
          {
            id: 'c2',
            label: 'Thu hết một lượt cho nhanh',
            quality: 'ok',
            feedback: 'Cũng được, nhưng xếp gọn sẽ tốt hơn nhé.',
            happiness: 3,
            skills: { responsibility: 2 },
          },
        ],
      },
      {
        id: 'w3m3',
        type: 'tidy',
        title: 'Sắp xếp giá sách',
        prompt: 'Giá sách trong lớp lộn xộn. Chạm để xếp sách gọn giúp cô!',
        emoji: '📚',
        isTeacherSupport: true,
        items: 5,
      },
    ],
  },

  // ── TUẦN 4: TỔ CHỨC HOẠT ĐỘNG ──
  {
    id: 'w4',
    title: 'Tuần 4 · Tổ Chức Hoạt Động',
    emoji: '🎉',
    missions: [
      {
        id: 'w4m1',
        type: 'decision',
        title: 'Chia nhóm học tập',
        prompt: 'Con được giao chia nhóm học tập cho lớp. Con chia thế nào?',
        emoji: '👥',
        choices: [
          {
            id: 'c1',
            label: 'Chia đều, bạn giỏi giúp bạn còn yếu',
            quality: 'best',
            feedback: 'Ý tưởng tuyệt vời! Cả lớp cùng tiến bộ.',
            happiness: 10,
            skills: { teamwork: 5, leadership: 4 },
          },
          {
            id: 'c2',
            label: 'Chỉ xếp con chơi với bạn thân',
            quality: 'poor',
            feedback: 'Mình nên hoà đồng với tất cả các bạn nhé.',
            happiness: -8,
            skills: { teamwork: -4 },
          },
        ],
      },
      {
        id: 'w4m2',
        type: 'decision',
        title: 'Tổ chức trò chơi',
        prompt: 'Giờ sinh hoạt, con tổ chức trò chơi cho lớp. Con chọn?',
        emoji: '🎲',
        choices: [
          {
            id: 'c1',
            label: 'Trò chơi cả lớp cùng tham gia',
            quality: 'best',
            feedback: 'Cả lớp ai cũng vui vì được chơi cùng nhau!',
            happiness: 10,
            skills: { teamwork: 4, leadership: 4 },
          },
          {
            id: 'c2',
            label: 'Trò chơi chỉ con thích',
            quality: 'ok',
            feedback: 'Lần sau hỏi ý các bạn để ai cũng vui nhé.',
            happiness: 2,
            skills: { leadership: 1 },
          },
        ],
      },
      {
        id: 'w4m3',
        type: 'decision',
        title: 'Giải quyết mâu thuẫn',
        prompt: 'Hai bạn tranh giành một món đồ chơi. Con làm gì?',
        emoji: '🧸',
        choices: [
          {
            id: 'c1',
            label: 'Hoà giải, hướng dẫn chơi luân phiên',
            quality: 'best',
            feedback: 'Con là người hoà giải giỏi! Hai bạn vui vẻ trở lại.',
            happiness: 12,
            skills: { communication: 5, empathy: 3, leadership: 3 },
          },
          {
            id: 'c2',
            label: 'Báo cô giáo nhờ giúp',
            quality: 'ok',
            feedback: 'Nhờ cô cũng tốt, nhưng con thử tự hoà giải trước nhé.',
            happiness: 4,
            skills: { responsibility: 2 },
          },
          {
            id: 'c3',
            label: 'Giành lấy đồ chơi cất đi',
            quality: 'poor',
            feedback: 'Cất đồ chơi làm cả hai bạn buồn. Mình hoà giải nhé.',
            happiness: -10,
            skills: { communication: -3 },
          },
        ],
      },
    ],
  },
];

export const TOTAL_WEEKS = WEEKS.length;

/* ===========================================================================
 * 6. TÌNH HUỐNG BẤT NGỜ (cho chế độ "Thử thách")
 *    Đều là decision; gộp với decision trong các tuần để bốc ngẫu nhiên.
 * ========================================================================= */

export const RANDOM_EVENTS: Mission[] = [
  {
    id: 'e1',
    type: 'decision',
    title: 'Bạn làm rơi hộp bút',
    prompt: 'Bạn Mai làm rơi hộp bút, bút lăn khắp sàn. Con làm gì?',
    emoji: '🖊️',
    choices: [
      {
        id: 'c1',
        label: 'Giúp bạn nhặt bút',
        quality: 'best',
        feedback: 'Con thật tốt bụng! Bạn Mai cảm ơn con.',
        happiness: 9,
        skills: { empathy: 4, teamwork: 3 },
        isHelp: true,
      },
      {
        id: 'c2',
        label: 'Mặc kệ, đi chỗ khác',
        quality: 'poor',
        feedback: 'Bạn đang cần giúp đó. Mình giúp bạn nhé!',
        happiness: -6,
        skills: { empathy: -3 },
      },
    ],
  },
  {
    id: 'e2',
    type: 'decision',
    title: 'Bạn mới chuyển trường',
    prompt: 'Lớp có bạn mới chuyển đến, bạn còn rụt rè. Con làm gì?',
    emoji: '🙋',
    choices: [
      {
        id: 'c1',
        label: 'Chào đón và giới thiệu với lớp',
        quality: 'best',
        feedback: 'Bạn mới rất vui vì được con chào đón!',
        happiness: 10,
        skills: { communication: 4, empathy: 3, leadership: 3 },
        isHelp: true,
      },
      {
        id: 'c2',
        label: 'Để bạn tự làm quen',
        quality: 'ok',
        feedback: 'Con thử chủ động làm quen để bạn bớt ngại nhé.',
        happiness: 2,
        skills: { communication: 1 },
      },
    ],
  },
  {
    id: 'e3',
    type: 'decision',
    title: 'Bạn buồn vì điểm kém',
    prompt: 'Bạn An buồn vì bài kiểm tra điểm thấp. Con làm gì?',
    emoji: '😢',
    choices: [
      {
        id: 'c1',
        label: 'An ủi và rủ bạn cùng học',
        quality: 'best',
        feedback: 'Con biết động viên bạn, giỏi quá!',
        happiness: 10,
        skills: { empathy: 5, teamwork: 3 },
        isHelp: true,
      },
      {
        id: 'c2',
        label: 'Trêu bạn “học dốt”',
        quality: 'poor',
        feedback: 'Trêu bạn làm bạn buồn hơn. Mình động viên bạn nhé.',
        happiness: -12,
        skills: { empathy: -5 },
      },
    ],
  },
];

/** Tổng số nhiệm vụ "hỗ trợ cô giáo" — cho thành tích Trợ Thủ Của Cô. */
export const TOTAL_TEACHER_SUPPORT = WEEKS.flatMap((w) => w.missions).filter(
  (m) => m.isTeacherSupport,
).length;

/* ===========================================================================
 * 7. THÀNH TÍCH & STICKER
 * ========================================================================= */

export interface MonitorStats {
  missionsDone: number; // tổng nhiệm vụ hoàn thành
  helps: number; // số lần giúp đỡ bạn
  teacherSupportDone: number; // số nhiệm vụ hỗ trợ cô giáo hoàn thành
  timeMs: number; // thời gian chơi
}

export interface AchievementCtx extends MonitorStats {
  weeksCount: number; // số tuần đã hoàn thành
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
    id: 'exemplary',
    emoji: '🎖️',
    name: 'Lớp Trưởng Gương Mẫu',
    desc: 'Hoàn thành 20 nhiệm vụ',
    unlocked: (c) => c.missionsDone >= 20,
  },
  {
    id: 'good-friend',
    emoji: '❤️',
    name: 'Người Bạn Tốt',
    desc: 'Giúp đỡ 15 bạn học',
    unlocked: (c) => c.helps >= 15, // doc gợi ý 50 — rút còn 15 cho khả thi
  },
  {
    id: 'teacher-helper',
    emoji: '👩‍🏫',
    name: 'Trợ Thủ Của Cô Giáo',
    desc: 'Hoàn thành mọi nhiệm vụ hỗ trợ cô',
    unlocked: (c) => c.teacherSupportDone >= TOTAL_TEACHER_SUPPORT,
  },
  {
    id: 'excellent',
    emoji: '🏆',
    name: 'Lớp Trưởng Xuất Sắc',
    desc: 'Hoàn thành cả 4 tuần học',
    unlocked: (c) => c.weeksCount >= TOTAL_WEEKS,
  },
];

export interface StickerDef {
  id: string;
  emoji: string;
  name: string;
  unlocked: (c: AchievementCtx) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'badge', emoji: '🎓', name: 'Huy hiệu lớp trưởng', unlocked: (c) => c.missionsDone >= 1 },
  { id: 'star', emoji: '⭐', name: 'Ngôi sao trách nhiệm', unlocked: (c) => c.missionsDone >= 5 },
  { id: 'book', emoji: '📚', name: 'Sổ đầu bài vàng', unlocked: (c) => c.teacherSupportDone >= 2 },
  { id: 'heart', emoji: '💛', name: 'Trái tim bạn bè', unlocked: (c) => c.helps >= 8 },
  { id: 'trophy', emoji: '🏆', name: 'Cúp lớp trưởng xuất sắc', unlocked: (c) => c.weeksCount >= TOTAL_WEEKS },
];
