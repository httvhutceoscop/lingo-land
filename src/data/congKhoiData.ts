// Dữ liệu cho game "Cộng Khối" (Stack & Combine).
//
// Triết lý: dạy phép CỘNG qua hành động GỘP visual — 2 tháp khối nhỏ trượt
// vào nhau biến thành 1 tháp lớn. Composition counterpart của "Khối Số"
// (decomposition). Cả 2 dùng chung BLOCK_STYLES để giữ visual identity.

export type CongKhoiLevel = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  // Cặp số (a, b) hợp lệ trong level — đảm bảo a+b nằm trong giới hạn tổng.
  // Cả a và b ≥ 1 để mỗi tháp luôn có ít nhất 1 ô (CPA cần khối visible).
  pairs: Array<[number, number]>;
  // Tổng tối đa của level — dùng để clamp distractor không vượt ngoài range.
  maxSum: number;
};

// Helper: sinh mọi cặp (a, b) với a, b ≥ minBlock, a+b ≤ maxSum.
// Loại trừ cặp (a, b) trùng (a, a) lặp quá nhiều — giữ pool đa dạng.
const buildPairs = (
  minBlock: number,
  maxBlock: number,
  minSum: number,
  maxSum: number,
): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let a = minBlock; a <= maxBlock; a++) {
    for (let b = minBlock; b <= maxBlock; b++) {
      const s = a + b;
      if (s < minSum || s > maxSum) continue;
      out.push([a, b]);
    }
  }
  return out;
};

export const CONGKHOI_LEVELS: CongKhoiLevel[] = [
  {
    id: 'ck_l1',
    name: 'Lv 1 — Cộng Nhỏ',
    emoji: '🐣',
    desc: 'Tổng trong vòng 5 — gộp tháp nhỏ',
    pairs: buildPairs(1, 4, 2, 5),
    maxSum: 5,
  },
  {
    id: 'ck_l2',
    name: 'Lv 2 — Cộng Trong Mười',
    emoji: '🐥',
    desc: 'Tổng tới 10 — gộp tháp vừa',
    pairs: buildPairs(1, 9, 3, 10),
    maxSum: 10,
  },
];

export const QUESTIONS_PER_CONGKHOI_LEVEL = 5;
export const CONGKHOI_PASS_THRESHOLD = 4;

export type CongKhoiQuestion = {
  a: number;
  b: number;
  correct: number; // = a + b
  options: number[]; // 3 lựa chọn đã shuffle, include correct
};

const shuffle = <T,>(arr: T[]): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Sinh 2 distractor gần đáp đúng (±1, ±2) — buộc bé đếm chứ không đoán mò.
// Clamp trong [1, maxSum+2] để hợp lý visual.
const buildDistractors = (correct: number, maxSum: number): [number, number] => {
  const candidates = [correct - 2, correct - 1, correct + 1, correct + 2].filter(
    (n) => n >= 1 && n <= maxSum + 2 && n !== correct,
  );
  const picked = shuffle(candidates).slice(0, 2);
  // Nếu chưa đủ 2 (case edge cực hiếm) — bù bằng giá trị xa hơn.
  while (picked.length < 2) {
    const fallback = correct + (picked.length + 3);
    if (!picked.includes(fallback)) picked.push(fallback);
  }
  return [picked[0], picked[1]];
};

export function generateCongKhoiDeck(
  level: CongKhoiLevel,
  count: number = QUESTIONS_PER_CONGKHOI_LEVEL,
): CongKhoiQuestion[] {
  const pairs = shuffle(level.pairs).slice(0, count);
  return pairs.map(([a, b]) => {
    const correct = a + b;
    const [d1, d2] = buildDistractors(correct, level.maxSum);
    return {
      a,
      b,
      correct,
      options: shuffle([correct, d1, d2]),
    };
  });
}

export const findCongKhoiLevel = (id: string): CongKhoiLevel | undefined =>
  CONGKHOI_LEVELS.find((l) => l.id === id);

export const isCongKhoiLevelUnlocked = (
  id: string,
  passed: Set<string>,
): boolean => {
  const idx = CONGKHOI_LEVELS.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return passed.has(CONGKHOI_LEVELS[idx - 1].id);
};
