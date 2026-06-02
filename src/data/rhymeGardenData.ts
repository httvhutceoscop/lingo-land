// Dữ liệu cho game "Vần Vần Đồng Dao" — bé điền từ còn thiếu trong câu đồng dao
// quen thuộc. Mỗi đồng dao có 2 câu hỏi. Mỗi câu hỏi cho 3 lựa chọn (1 đúng + 2
// sai). Các lựa chọn sai được chọn tay cho mỗi câu hỏi: cùng kiểu danh từ với
// đáp án (con vật / hiện tượng / đồ vật) nhưng KHÔNG khớp ngữ cảnh đồng dao —
// để bé phải dựa vào trí nhớ + ngữ cảnh chứ không phải đoán mò bằng "loại từ".

export type RhymeOption = {
  label: string; // Từ tiếng Việt, vd "lửa"
  emoji: string; // Emoji minh hoạ
};

export type RhymeQuestion = {
  // Câu đồng dao có placeholder "___" tại chỗ điền. Hiển thị cho bé đọc/nghe.
  prompt: string;
  // Câu đầy đủ (đã điền) — đọc lại sau khi bé chọn đúng để củng cố trí nhớ.
  full: string;
  correct: RhymeOption;
  // Đúng 2 distractor để tổng 3 lựa chọn. UI sẽ xáo trộn vị trí.
  distractors: [RhymeOption, RhymeOption];
};

export type DongDao = {
  id: string;
  title: string;
  emoji: string; // Icon cho card chọn đồng dao
  // Câu mở đầu / gợi nhớ — hiển thị trên màn intro của level.
  intro: string;
  questions: RhymeQuestion[];
};

export const DONG_DAO_LIST: DongDao[] = [
  {
    id: 'chichichanhchanh',
    title: 'Chi chi chành chành',
    emoji: '🖐️',
    intro: 'Trò chơi gõ tay quen thuộc — bé có nhớ câu hát không?',
    questions: [
      {
        prompt: 'Chi chi chành chành, cái đanh thổi ___',
        full: 'Chi chi chành chành, cái đanh thổi lửa',
        correct: { label: 'lửa', emoji: '🔥' },
        distractors: [
          { label: 'nước', emoji: '💧' },
          { label: 'mưa', emoji: '🌧️' },
        ],
      },
      {
        prompt: 'Cái đanh thổi lửa, con ___ chết trương',
        full: 'Cái đanh thổi lửa, con ngựa chết trương',
        correct: { label: 'ngựa', emoji: '🐴' },
        distractors: [
          { label: 'gà', emoji: '🐔' },
          { label: 'cá', emoji: '🐟' },
        ],
      },
    ],
  },
  {
    id: 'concomadiandem',
    title: 'Con cò mà đi ăn đêm',
    emoji: '🦢',
    intro: 'Bài ca dao về chú cò chăm chỉ kiếm ăn ban đêm.',
    questions: [
      {
        prompt: 'Con ___ mà đi ăn đêm',
        full: 'Con cò mà đi ăn đêm',
        correct: { label: 'cò', emoji: '🦢' },
        distractors: [
          { label: 'gà', emoji: '🐔' },
          { label: 'cá', emoji: '🐟' },
        ],
      },
      {
        prompt: 'Đậu phải cành mềm lộn cổ xuống ___',
        full: 'Đậu phải cành mềm lộn cổ xuống ao',
        correct: { label: 'ao', emoji: '🏞️' },
        distractors: [
          { label: 'cây', emoji: '🌳' },
          { label: 'nhà', emoji: '🏠' },
        ],
      },
    ],
  },
  {
    id: 'keocualuaxe',
    title: 'Kéo cưa lừa xẻ',
    emoji: '🪚',
    intro: 'Bài đồng dao hai bé nắm tay nhau kéo qua kéo lại như cưa.',
    questions: [
      {
        prompt: 'Ông thợ nào khoẻ, về ăn cơm ___',
        full: 'Ông thợ nào khoẻ, về ăn cơm vua',
        correct: { label: 'vua', emoji: '👑' },
        distractors: [
          { label: 'nhà', emoji: '🏠' },
          { label: 'bà', emoji: '👵' },
        ],
      },
      {
        prompt: 'Ông thợ nào thua, về bú tí ___',
        full: 'Ông thợ nào thua, về bú tí mẹ',
        correct: { label: 'mẹ', emoji: '👩' },
        distractors: [
          { label: 'bố', emoji: '👨' },
          { label: 'bà', emoji: '👵' },
        ],
      },
    ],
  },
  {
    id: 'bacongdicho',
    title: 'Bà còng đi chợ',
    emoji: '👵',
    intro: 'Bà còng đi chợ trời mưa — ai đưa bà về nhỉ?',
    questions: [
      {
        prompt: 'Bà còng đi chợ trời ___',
        full: 'Bà còng đi chợ trời mưa',
        correct: { label: 'mưa', emoji: '🌧️' },
        distractors: [
          { label: 'nắng', emoji: '☀️' },
          { label: 'gió', emoji: '🌬️' },
        ],
      },
      {
        prompt: 'Cái ___ cái tép đi đưa bà còng',
        full: 'Cái tôm cái tép đi đưa bà còng',
        correct: { label: 'tôm', emoji: '🦐' },
        distractors: [
          { label: 'cua', emoji: '🦀' },
          { label: 'cá', emoji: '🐟' },
        ],
      },
    ],
  },
  {
    id: 'rongranlenmay',
    title: 'Rồng rắn lên mây',
    emoji: '🐉',
    intro: 'Trò chơi đuổi bắt vui nhộn — đoàn rắn bò lên mây.',
    questions: [
      {
        prompt: 'Rồng rắn lên ___',
        full: 'Rồng rắn lên mây',
        correct: { label: 'mây', emoji: '☁️' },
        distractors: [
          { label: 'núi', emoji: '⛰️' },
          { label: 'biển', emoji: '🌊' },
        ],
      },
      {
        prompt: 'Có cái ___ lúc lắc',
        full: 'Có cái cây lúc lắc',
        correct: { label: 'cây', emoji: '🌳' },
        distractors: [
          { label: 'nhà', emoji: '🏠' },
          { label: 'thuyền', emoji: '⛵' },
        ],
      },
    ],
  },
];

export const TOTAL_DONG_DAO = DONG_DAO_LIST.length;

export const findDongDao = (id: string): DongDao | undefined =>
  DONG_DAO_LIST.find((d) => d.id === id);
