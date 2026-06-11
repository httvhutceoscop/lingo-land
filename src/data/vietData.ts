/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU — ĐẢO TIẾNG VIỆT
 *
 * Lộ trình tiếng Việt sơ cấp cho trẻ 5–10 tuổi (chuẩn bị vào lớp 1), tổ chức
 * thành các BÀI HỌC mở khoá tuần tự — y như Đảo Toán Học (xem mathData.ts).
 * Mỗi bài có 2 phần trong VietLessonView: HỌC (lưới tap-to-speak) → KIỂM TRA
 * (trắc nghiệm 4 lựa chọn), và một game tiếng Việt sẵn có ở Đảo Trò Chơi làm
 * phần "Luyện tập thêm" (practiceGame).
 *
 * File này KHÔNG chứa React. Nó TÁI SỬ DỤNG các kho dữ liệu tiếng Việt đã có:
 *   - writeLetterData : bảng chữ cái 29 chữ + kho từ
 *   - ghepTiengData   : ghép phụ âm + vần (đánh vần đơn giản)
 *   - trainPhonicsData: âm đầu / vần / từ có vần ghép
 *   - toneKingData    : 6 thanh điệu
 * ────────────────────────────────────────────────────────────────────────── */

import type { GameKey } from '../views/GameIslandsView';
import { UPPER_LETTERS, LOWER_LETTERS, LETTER_INFO, WORDS as WRITE_WORDS } from './writeLetterData';
import { GHEP_LEVELS } from './ghepTiengData';
import { WORDS as TRAIN_WORDS, RHYMES } from './trainPhonicsData';
import { SYLLABLES, TONES as TONE_INFO, type Tone } from './toneKingData';

/* ===========================================================================
 * 1. KIỂU & DANH MỤC BÀI HỌC
 * ========================================================================= */

export type VietLessonKind = 'alphabet' | 'blend' | 'rhyme' | 'tone' | 'reading';

export type VietLesson = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  kind: VietLessonKind;
  practiceGame: GameKey; // game ở Đảo Trò Chơi để "Luyện tập thêm"
  questionCount: number;
};

export const VIET_LESSONS: VietLesson[] = [
  {
    id: 'viet.alphabet',
    title: 'Bảng chữ cái',
    subtitle: '29 chữ cái tiếng Việt',
    icon: '🔤',
    kind: 'alphabet',
    practiceGame: 'writeletter',
    questionCount: 8,
  },
  {
    id: 'viet.blend',
    title: 'Ghép âm',
    subtitle: 'Ghép phụ âm với vần thành tiếng',
    icon: '🧩',
    kind: 'blend',
    practiceGame: 'ghepting',
    questionCount: 6,
  },
  {
    id: 'viet.rhyme',
    title: 'Ghép vần',
    subtitle: 'Tìm đúng vần của mỗi tiếng',
    icon: '🎵',
    kind: 'rhyme',
    practiceGame: 'trainphonics',
    questionCount: 6,
  },
  {
    id: 'viet.tone',
    title: 'Thanh điệu',
    subtitle: '6 dấu thanh: ngang, sắc, huyền…',
    icon: '👑',
    kind: 'tone',
    practiceGame: 'toneking',
    questionCount: 8,
  },
  {
    id: 'viet.reading',
    title: 'Tập đọc',
    subtitle: 'Nghe và nhận ra từ',
    icon: '📖',
    kind: 'reading',
    practiceGame: 'writeletter',
    questionCount: 6,
  },
];

export const TOTAL_VIET_LESSONS = VIET_LESSONS.length;

export function findVietLesson(id: string): VietLesson | undefined {
  return VIET_LESSONS.find((l) => l.id === id);
}

export function nextVietLessonId(id: string): string | null {
  const idx = VIET_LESSONS.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  return VIET_LESSONS[idx + 1]?.id ?? null;
}

export function prevVietLessonId(id: string): string | null {
  const idx = VIET_LESSONS.findIndex((l) => l.id === id);
  if (idx <= 0) return null;
  return VIET_LESSONS[idx - 1].id;
}

/* ===========================================================================
 * 2. TIỆN ÍCH NGẪU NHIÊN
 * ========================================================================= */

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const sample = <T,>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n);

const TONE_ORDER: Tone[] = ['ngang', 'sac', 'huyen', 'hoi', 'nga', 'nang'];

/** Gộp toàn bộ tiếng "ghép âm" của cả 2 cấp ghepTieng (loại trùng theo full). */
const GHEP_WORDS = (() => {
  const seen = new Set<string>();
  const out: { onset: string; rime: string; full: string; emoji: string }[] = [];
  for (const lvl of GHEP_LEVELS) {
    for (const w of lvl.words) {
      if (seen.has(w.full)) continue;
      seen.add(w.full);
      out.push(w);
    }
  }
  return out;
})();

/**
 * Dựng 4 lựa chọn: 1 đúng + 3 nhiễu lấy từ `pool` (đã loại đáp án đúng và loại
 * trùng), rồi xáo trộn. Nếu pool quá nhỏ, số lựa chọn có thể < 4 (chấp nhận).
 */
function buildOptions(correct: string, pool: string[]): { label: string; correct: boolean }[] {
  const distractors = sample(
    Array.from(new Set(pool)).filter((x) => x !== correct),
    3,
  );
  return shuffle([
    { label: correct, correct: true },
    ...distractors.map((d) => ({ label: d, correct: false })),
  ]);
}

/* ===========================================================================
 * 3. NỘI DUNG MÀN "HỌC" (lưới tap-to-speak)
 *    Một shape thống nhất để VietLessonView render lưới thẻ học.
 * ========================================================================= */

export type VietStudyItem = {
  big: string; // glyph/emoji chính (text-4xl)
  sub?: string; // dòng phụ
  example?: string; // gợi ý/ví dụ nhỏ
  speakText: string; // chạm để nghe (đọc bằng vi-VN)
};

export function getStudyItems(lesson: VietLesson): VietStudyItem[] {
  switch (lesson.kind) {
    case 'alphabet':
      return UPPER_LETTERS.map((u, i) => {
        const info = LETTER_INFO[u];
        return {
          big: `${u} ${LOWER_LETTERS[i]}`,
          sub: info?.name,
          example: info ? `${info.emoji} ${info.example}` : undefined,
          speakText: info?.name ?? u,
        };
      });
    case 'blend':
      return GHEP_WORDS.map((w) => ({
        big: w.full,
        sub: `${w.onset} + ${w.rime}`,
        example: w.emoji,
        speakText: w.full,
      }));
    case 'rhyme':
      return TRAIN_WORDS.map((w) => ({
        big: w.emoji,
        sub: w.word,
        example: `vần: ${w.rhyme}`,
        speakText: w.read,
      }));
    case 'tone':
      return TONE_ORDER.map((t) => {
        const info = TONE_INFO[t];
        return {
          big: SYLLABLES.ma[t],
          sub: info.name,
          example: info.mark,
          speakText: SYLLABLES.ma[t],
        };
      });
    case 'reading':
      return WRITE_WORDS.map((w) => ({
        big: w.emoji,
        sub: w.text,
        speakText: w.read,
      }));
  }
}

/* ===========================================================================
 * 4. CÂU HỎI KIỂM TRA (trắc nghiệm 4 lựa chọn)
 * ========================================================================= */

export type VietQuestion = {
  kind: VietLessonKind;
  question: string; // câu hỏi hiển thị
  display: string; // glyph/emoji/tiếng lớn ở giữa
  sub?: string; // dòng phụ dưới display
  speakText: string; // đọc khi vào câu hỏi / khi chạm loa (vi-VN)
  options: { label: string; correct: boolean }[];
};

function genAlphabet(count: number): VietQuestion[] {
  // Nhìn chữ → chọn từ ví dụ (emoji) bắt đầu bằng chữ đó.
  const examplePool = UPPER_LETTERS.map((u) => `${LETTER_INFO[u].emoji} ${LETTER_INFO[u].example}`);
  const letters = sample(UPPER_LETTERS, Math.min(count, UPPER_LETTERS.length));
  return letters.map((u) => {
    const info = LETTER_INFO[u];
    const correct = `${info.emoji} ${info.example}`;
    return {
      kind: 'alphabet',
      question: 'Từ nào bắt đầu bằng chữ này?',
      display: `${u} ${LOWER_LETTERS[UPPER_LETTERS.indexOf(u)]}`,
      sub: info.name,
      speakText: info.name,
      options: buildOptions(correct, examplePool),
    };
  });
}

function genBlend(count: number): VietQuestion[] {
  // Nhìn "phụ âm + vần" → chọn tiếng ghép đúng.
  const fullPool = GHEP_WORDS.map((w) => `${w.emoji} ${w.full}`);
  const words = sample(GHEP_WORDS, Math.min(count, GHEP_WORDS.length));
  return words.map((w) => ({
    kind: 'blend',
    question: 'Ghép lại thành tiếng gì?',
    display: `${w.onset} + ${w.rime}`,
    sub: 'ghép phụ âm với vần',
    speakText: w.full,
    options: buildOptions(`${w.emoji} ${w.full}`, fullPool),
  }));
}

function genRhyme(count: number): VietQuestion[] {
  // Nhìn hình + tiếng → chọn VẦN đúng.
  const words = sample(TRAIN_WORDS, Math.min(count, TRAIN_WORDS.length));
  return words.map((w) => ({
    kind: 'rhyme',
    question: 'Tiếng này có vần gì?',
    display: w.emoji,
    sub: w.word,
    speakText: w.read,
    options: buildOptions(w.rhyme, RHYMES),
  }));
}

function genTone(count: number): VietQuestion[] {
  // Nhìn/nghe tiếng có dấu → chọn TÊN dấu thanh.
  const nameOf = (t: Tone) => TONE_INFO[t].name;
  const namePool = TONE_ORDER.map(nameOf);
  const bases = Object.keys(SYLLABLES);
  return Array.from({ length: count }, () => {
    const base = bases[Math.floor(Math.random() * bases.length)];
    const tone = TONE_ORDER[Math.floor(Math.random() * TONE_ORDER.length)];
    const syllable = SYLLABLES[base][tone];
    return {
      kind: 'tone',
      question: 'Tiếng này mang dấu gì?',
      display: syllable,
      sub: 'chọn tên dấu thanh',
      speakText: syllable,
      options: buildOptions(nameOf(tone), namePool),
    };
  });
}

function genReading(count: number): VietQuestion[] {
  // Nghe + nhìn hình → chọn TỪ viết đúng.
  const textPool = WRITE_WORDS.map((w) => w.text);
  const words = sample(WRITE_WORDS, Math.min(count, WRITE_WORDS.length));
  return words.map((w) => ({
    kind: 'reading',
    question: 'Đây là từ nào?',
    display: w.emoji,
    sub: 'nghe rồi chọn từ đúng',
    speakText: w.read,
    options: buildOptions(w.text, textPool),
  }));
}

export function generateVietQuestions(lesson: VietLesson): VietQuestion[] {
  switch (lesson.kind) {
    case 'alphabet':
      return genAlphabet(lesson.questionCount);
    case 'blend':
      return genBlend(lesson.questionCount);
    case 'rhyme':
      return genRhyme(lesson.questionCount);
    case 'tone':
      return genTone(lesson.questionCount);
    case 'reading':
      return genReading(lesson.questionCount);
  }
}
