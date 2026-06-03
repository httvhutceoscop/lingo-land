// Dữ liệu cho game "Bẻ Khối" (Block Splitter).
//
// Triết lý: dạy phép TRỪ qua hành động BẺ TÁCH visual — tháp N "vỡ" thành
// 2 phần: phần lấy đi (K) bay ra ngoài, phần còn lại (N-K) đứng lại. Đối
// xứng với Cộng Khối (composition ↔ decomposition).
//
// Reuse BLOCK_STYLES (1-9 màu rainbow) từ Khối Số để giữ visual identity
// xuyên suốt bộ 3 game CPA toán.

export type BeKhoiLevel = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  // Cặp (n, k): tháp ban đầu n, bẻ đi k → còn n-k. Đảm bảo k < n để kết quả ≥1
  // (tránh render khối "0" gây bối rối cho 5t).
  pairs: Array<[number, number]>;
  // Giá trị tối đa của N — dùng để clamp distractor.
  maxN: number;
};

// Sinh mọi cặp (n, k) với n ∈ [minN, maxN], 1 ≤ k < n. Tránh trùng tổng pool.
const buildPairs = (
  minN: number,
  maxN: number,
): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let n = minN; n <= maxN; n++) {
    for (let k = 1; k < n; k++) {
      out.push([n, k]);
    }
  }
  return out;
};

export const BEKHOI_LEVELS: BeKhoiLevel[] = [
  {
    id: 'bk_l1',
    name: 'Lv 1 — Bẻ Nhỏ',
    emoji: '🐰',
    desc: 'Bẻ tháp tối đa 5 ô — kết quả 1 đến 4',
    pairs: buildPairs(2, 5),
    maxN: 5,
  },
  {
    id: 'bk_l2',
    name: 'Lv 2 — Bẻ Trong Mười',
    emoji: '🦊',
    desc: 'Bẻ tháp tối đa 10 ô — kết quả 1 đến 9',
    pairs: buildPairs(3, 10),
    maxN: 10,
  },
];

export const QUESTIONS_PER_BEKHOI_LEVEL = 5;
export const BEKHOI_PASS_THRESHOLD = 4;

export type BeKhoiQuestion = {
  n: number;        // tháp ban đầu
  k: number;        // bẻ đi
  correct: number;  // = n - k
  options: number[]; // 3 lựa chọn shuffled
};

const shuffle = <T,>(arr: T[]): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Distractor ±1, ±2 từ correct, clamp ≥ 1.
const buildDistractors = (correct: number, maxN: number): [number, number] => {
  const candidates = [correct - 2, correct - 1, correct + 1, correct + 2].filter(
    (n) => n >= 1 && n <= maxN && n !== correct,
  );
  const picked = shuffle(candidates).slice(0, 2);
  while (picked.length < 2) {
    const fallback = correct + (picked.length + 3);
    if (!picked.includes(fallback) && fallback >= 1) picked.push(fallback);
    else picked.push(Math.max(1, correct - picked.length - 3));
  }
  return [picked[0], picked[1]];
};

export function generateBeKhoiDeck(
  level: BeKhoiLevel,
  count: number = QUESTIONS_PER_BEKHOI_LEVEL,
): BeKhoiQuestion[] {
  const pairs = shuffle(level.pairs).slice(0, count);
  return pairs.map(([n, k]) => {
    const correct = n - k;
    const [d1, d2] = buildDistractors(correct, level.maxN);
    return {
      n,
      k,
      correct,
      options: shuffle([correct, d1, d2]),
    };
  });
}

export const findBeKhoiLevel = (id: string): BeKhoiLevel | undefined =>
  BEKHOI_LEVELS.find((l) => l.id === id);

export const isBeKhoiLevelUnlocked = (
  id: string,
  passed: Set<string>,
): boolean => {
  const idx = BEKHOI_LEVELS.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return passed.has(BEKHOI_LEVELS[idx - 1].id);
};
