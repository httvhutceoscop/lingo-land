// Dữ liệu cho game "Ghép Tiếng". Bé ghép 1 phụ âm đầu (onset) + 1 vần (rime
// đã có dấu thanh sẵn) thành tiếng có nghĩa. Đây là cơ chế "đánh vần" lớp 1
// dạng simplified: c + á = cá, b + à = bà.
//
// MVP có 2 vương quốc thợ xây — Lv 1 dùng vần đơn giản + 3 thanh phổ biến,
// Lv 2 mở rộng tới đủ 6 thanh. Mỗi level pool 12 tiếng có emoji concrete.

export type GhepWord = {
  onset: string;   // 'c'
  rime: string;    // 'á'  (đã bao gồm dấu thanh nếu có)
  full: string;    // 'cá'
  emoji: string;   // '🐟'
};

export type GhepLevel = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  words: GhepWord[];
  // Pool đầy đủ để sinh distractor — đảm bảo distractor cùng "tầm" với target.
  onsetPool: string[];
  rimePool: string[];
};

// Tên đọc khi đánh vần — "cờ" cho c, "bờ" cho b, v.v.
// Trẻ Việt 4-5 đã nghe quen cách đọc "cờ a ca" này từ ông bà.
export const ONSET_READ: Record<string, string> = {
  b: 'bờ',
  c: 'cờ',
  d: 'dờ',
  đ: 'đờ',
  g: 'gờ',
  h: 'hờ',
  k: 'ca',
  l: 'lờ',
  m: 'mờ',
  n: 'nờ',
  p: 'pờ',
  q: 'cu',
  r: 'rờ',
  s: 'sờ',
  t: 'tờ',
  v: 'vờ',
  x: 'xờ',
};

const LV1_WORDS: GhepWord[] = [
  { onset: 'b', rime: 'a', full: 'ba', emoji: '👨' },
  { onset: 'b', rime: 'à', full: 'bà', emoji: '👵' },
  { onset: 'b', rime: 'é', full: 'bé', emoji: '👶' },
  { onset: 'b', rime: 'ò', full: 'bò', emoji: '🐄' },
  { onset: 'c', rime: 'á', full: 'cá', emoji: '🐟' },
  { onset: 'c', rime: 'ò', full: 'cò', emoji: '🦢' },
  { onset: 'd', rime: 'ê', full: 'dê', emoji: '🐐' },
  { onset: 'g', rime: 'à', full: 'gà', emoji: '🐔' },
  { onset: 'l', rime: 'á', full: 'lá', emoji: '🍃' },
  { onset: 'l', rime: 'ê', full: 'lê', emoji: '🍐' },
  { onset: 'm', rime: 'á', full: 'má', emoji: '👩' },
  { onset: 't', rime: 'ô', full: 'tô', emoji: '🍜' },
];

const LV2_WORDS: GhepWord[] = [
  { onset: 'h', rime: 'ổ', full: 'hổ', emoji: '🐯' },
  { onset: 'n', rime: 'ơ', full: 'nơ', emoji: '🎀' },
  { onset: 'd', rime: 'ù', full: 'dù', emoji: '☂️' },
  { onset: 'm', rime: 'ũ', full: 'mũ', emoji: '🎩' },
  { onset: 'x', rime: 'à', full: 'xà', emoji: '🐍' },
  { onset: 'd', rime: 'ế', full: 'dế', emoji: '🦗' },
  { onset: 'b', rime: 'ố', full: 'bố', emoji: '👨' },
  { onset: 'c', rime: 'ỏ', full: 'cỏ', emoji: '🌿' },
  { onset: 'm', rime: 'ỡ', full: 'mỡ', emoji: '🥓' },
  { onset: 'l', rime: 'ò', full: 'lò', emoji: '🍳' },
  { onset: 'c', rime: 'ô', full: 'cô', emoji: '👩‍🏫' },
  { onset: 'm', rime: 'è', full: 'mè', emoji: '🌰' },
];

const uniqueSorted = (arr: string[]): string[] => Array.from(new Set(arr)).sort();

export const GHEP_LEVELS: GhepLevel[] = [
  {
    id: 'gt_l1',
    name: 'Lv 1 — Vỡ Lòng',
    emoji: '🏗️',
    desc: 'Tiếng đơn: ba, má, cá, lá…',
    words: LV1_WORDS,
    onsetPool: uniqueSorted(LV1_WORDS.map((w) => w.onset)),
    rimePool: uniqueSorted(LV1_WORDS.map((w) => w.rime)),
  },
  {
    id: 'gt_l2',
    name: 'Lv 2 — Tập Đọc',
    emoji: '🏚️',
    desc: 'Thêm thanh điệu: hổ, dù, mũ, nơ…',
    words: LV2_WORDS,
    onsetPool: uniqueSorted([...LV1_WORDS, ...LV2_WORDS].map((w) => w.onset)),
    rimePool: uniqueSorted([...LV1_WORDS, ...LV2_WORDS].map((w) => w.rime)),
  },
];

export const QUESTIONS_PER_GHEP_LEVEL = 5;
export const GHEP_PASS_THRESHOLD = 4; // ≥4/5 không cần hint reveal

export type GhepQuestion = {
  word: GhepWord;
  onsetChoices: string[]; // 3 lựa chọn (đã shuffle)
  rimeChoices: string[];  // 3 lựa chọn (đã shuffle)
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const pickN = <T,>(pool: T[], n: number, exclude: T): T[] => {
  const filtered = pool.filter((x) => x !== exclude);
  return shuffleArray(filtered).slice(0, n);
};

// Sinh deck N câu hỏi cho 1 level.
// - Tránh lặp word trong cùng deck (mỗi tiếng chỉ xuất hiện 1 lần).
// - Distractor onset/rime lấy từ pool của level (cùng tầm độ phức tạp).
export function generateGhepDeck(
  level: GhepLevel,
  count: number = QUESTIONS_PER_GHEP_LEVEL,
): GhepQuestion[] {
  const wordPool = shuffleArray(level.words).slice(0, count);
  return wordPool.map((word) => {
    const onsetDistractors = pickN(level.onsetPool, 2, word.onset);
    const rimeDistractors = pickN(level.rimePool, 2, word.rime);
    return {
      word,
      onsetChoices: shuffleArray([word.onset, ...onsetDistractors]),
      rimeChoices: shuffleArray([word.rime, ...rimeDistractors]),
    };
  });
}

export const findGhepLevel = (id: string): GhepLevel | undefined =>
  GHEP_LEVELS.find((l) => l.id === id);

export const isGhepLevelUnlocked = (id: string, passed: Set<string>): boolean => {
  const idx = GHEP_LEVELS.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return passed.has(GHEP_LEVELS[idx - 1].id);
};
