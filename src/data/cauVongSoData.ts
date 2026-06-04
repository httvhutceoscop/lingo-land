// Dữ liệu cho game "Cầu Vồng Số" (Number Rainbow).
//
// Triết lý: bé xếp các số 1→N theo thứ tự để xây CẦU THANG bậc tăng dần.
// Đây là magnitude visualization — bé THẤY 5 cao hơn 4, cao hơn 3, v.v.
// qua chiều cao block thật. Đây là kỹ năng ordinal sense nền tảng cho việc
// so sánh số sau này (thay vì chỉ "đếm" 1-2-3 như bài hát).
//
// Reuse BLOCK_STYLES — bộ 5 game CPA preschool có visual identity nhất quán.

export type CauVongLevel = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  // Số tối đa của cầu thang. Lv 1 = 5, Lv 2 = 10.
  maxN: number;
};

export const CAUVONG_LEVELS: CauVongLevel[] = [
  {
    id: 'cv_l1',
    name: 'Lv 1 — Cầu thang Năm',
    emoji: '🌈',
    desc: 'Xếp số 1 đến 5 theo thứ tự',
    maxN: 5,
  },
  {
    id: 'cv_l2',
    name: 'Lv 2 — Cầu thang Mười',
    emoji: '🎨',
    desc: 'Xếp số 1 đến 10 — cầu vồng đầy đủ',
    maxN: 10,
  },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Sinh pool đã shuffle [1..maxN]. Đảm bảo pool[0] ≠ 1 (kẻo bé không nhận
// ra mình đang được test — thấy 1 ngay đầu = quá easy).
export function generateCauVongPool(level: CauVongLevel): number[] {
  const numbers = Array.from({ length: level.maxN }, (_, i) => i + 1);
  let pool = shuffle(numbers);
  let safety = 0;
  while (pool[0] === 1 && safety < 10) {
    pool = shuffle(numbers);
    safety++;
  }
  return pool;
}

export const findCauVongLevel = (id: string): CauVongLevel | undefined =>
  CAUVONG_LEVELS.find((l) => l.id === id);

export const isCauVongLevelUnlocked = (
  id: string,
  passed: Set<string>,
): boolean => {
  const idx = CAUVONG_LEVELS.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return passed.has(CAUVONG_LEVELS[idx - 1].id);
};
