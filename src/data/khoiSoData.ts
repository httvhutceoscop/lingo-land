// Dữ liệu cho game "Khối Số" (Number Builder).
//
// Triết lý: trẻ xây tháp số bằng cách xếp các khối nhỏ. Một số có thể được
// "lắp ráp" theo nhiều cách (5 = 1+4 = 2+3 = 1+1+3...) — đây là số đầu tiên
// trong app dạy DECOMPOSITION, nền tảng mental math của Singapore Math.
//
// Bảng màu khối (1-9): mỗi số 1 màu nhất quán, theo sequence rainbow để bé
// dần ghi nhớ. Khối càng to → màu càng đậm.

export type BlockValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type BlockStyle = {
  bg: string;        // Tailwind bg class cho thân khối
  text: string;      // Tailwind text class cho số trên khối
  border: string;    // Tailwind border class
};

// Bảng màu rainbow lấy cảm hứng từ Numberblocks nhưng dùng tone Tailwind
// gốc — KHÔNG nhân vật hoá (tránh issue copyright + giữ neutral cho trẻ Việt).
export const BLOCK_STYLES: Record<BlockValue, BlockStyle> = {
  1: { bg: 'bg-red-500',     text: 'text-white', border: 'border-red-600' },
  2: { bg: 'bg-orange-500',  text: 'text-white', border: 'border-orange-600' },
  3: { bg: 'bg-yellow-400',  text: 'text-slate-800', border: 'border-yellow-500' },
  4: { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
  5: { bg: 'bg-sky-500',     text: 'text-white', border: 'border-sky-600' },
  6: { bg: 'bg-indigo-500',  text: 'text-white', border: 'border-indigo-600' },
  7: { bg: 'bg-purple-500',  text: 'text-white', border: 'border-purple-600' },
  8: { bg: 'bg-pink-500',    text: 'text-white', border: 'border-pink-600' },
  9: { bg: 'bg-amber-800',   text: 'text-white', border: 'border-amber-900' },
};

export type KhoiSoLevel = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  // Các khối có thể dùng trong pool của level này.
  blocks: BlockValue[];
  // Các target số mà bé sẽ phải xây — random pick mỗi vòng từ pool.
  targets: number[];
};

export const KHOISO_LEVELS: KhoiSoLevel[] = [
  {
    id: 'ks_l1',
    name: 'Lv 1 — Tháp Mini',
    emoji: '🧱',
    desc: 'Xây tháp 3, 4, 5 — khối 1 đến 4',
    blocks: [1, 2, 3, 4],
    targets: [3, 4, 5],
  },
  {
    id: 'ks_l2',
    name: 'Lv 2 — Tháp Vừa',
    emoji: '🏠',
    desc: 'Xây tháp 6 đến 10 — khối 1 đến 5',
    blocks: [1, 2, 3, 4, 5],
    targets: [6, 7, 8, 9, 10],
  },
  {
    id: 'ks_l3',
    name: 'Lv 3 — Tháp Cao',
    emoji: '🏰',
    desc: 'Xây tháp 8 đến 15 — khối lớn 1 đến 9',
    // Pool nghiêng về khối lớn để tránh tedious "tap 15 lần khối 1".
    blocks: [2, 3, 4, 5, 6, 7, 8, 9],
    targets: [8, 10, 12, 15],
  },
];

export const QUESTIONS_PER_KHOISO_LEVEL = 5;

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Sinh 5 target ngẫu nhiên cho level. Tránh 2 target giống nhau liên tiếp.
export function generateKhoiSoTargets(
  level: KhoiSoLevel,
  count: number = QUESTIONS_PER_KHOISO_LEVEL,
): number[] {
  const out: number[] = [];
  let last: number | null = null;
  let safety = 0;
  while (out.length < count && safety < 100) {
    safety++;
    const t = pickRandom(level.targets);
    if (t === last) continue;
    out.push(t);
    last = t;
  }
  return out;
}

export const findKhoiSoLevel = (id: string): KhoiSoLevel | undefined =>
  KHOISO_LEVELS.find((l) => l.id === id);

export const isKhoiSoLevelUnlocked = (
  id: string,
  passed: Set<string>,
): boolean => {
  const idx = KHOISO_LEVELS.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return passed.has(KHOISO_LEVELS[idx - 1].id);
};

// Build chuỗi đánh vần phép cộng — vd [3, 2] → "3 cộng 2 bằng 5".
// audio.ts speak() sẽ tự dịch số thành chữ Việt khi lang='vi-VN'.
export function buildSumNarration(placed: number[]): string {
  if (placed.length === 0) return '';
  const sum = placed.reduce((s, x) => s + x, 0);
  if (placed.length === 1) return `${sum}`;
  return `${placed.join(' cộng ')} bằng ${sum}`;
}
