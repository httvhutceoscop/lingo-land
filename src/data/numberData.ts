export type NumberGroup = 'basic' | 'teen' | 'tens' | 'big';

export type NumberEntry = {
  value: number;
  en: string;
  example: string;
  group: NumberGroup;
};

export const NUMBERS: NumberEntry[] = [
  // ── Số cơ bản 0-10 ──────────────────────────────────────────────
  { value: 0, en: 'zero', example: 'no items', group: 'basic' },
  { value: 1, en: 'one', example: 'one cat', group: 'basic' },
  { value: 2, en: 'two', example: 'two dogs', group: 'basic' },
  { value: 3, en: 'three', example: 'three trees', group: 'basic' },
  { value: 4, en: 'four', example: 'four legs', group: 'basic' },
  { value: 5, en: 'five', example: 'five fingers', group: 'basic' },
  { value: 6, en: 'six', example: 'six sides', group: 'basic' },
  { value: 7, en: 'seven', example: 'seven days', group: 'basic' },
  { value: 8, en: 'eight', example: 'eight legs', group: 'basic' },
  { value: 9, en: 'nine', example: 'nine lives', group: 'basic' },
  { value: 10, en: 'ten', example: 'ten toes', group: 'basic' },

  // ── Tuổi teen 11-19 ─────────────────────────────────────────────
  { value: 11, en: 'eleven', example: 'eleven players', group: 'teen' },
  { value: 12, en: 'twelve', example: 'twelve months', group: 'teen' },
  { value: 13, en: 'thirteen', example: 'thirteen years', group: 'teen' },
  { value: 14, en: 'fourteen', example: 'fourteen days', group: 'teen' },
  { value: 15, en: 'fifteen', example: 'fifteen minutes', group: 'teen' },
  { value: 16, en: 'sixteen', example: 'sixteen candles', group: 'teen' },
  { value: 17, en: 'seventeen', example: 'seventeen pages', group: 'teen' },
  { value: 18, en: 'eighteen', example: 'eighteen years', group: 'teen' },
  { value: 19, en: 'nineteen', example: 'nineteen flowers', group: 'teen' },

  // ── Hàng chục 20-90 ─────────────────────────────────────────────
  { value: 20, en: 'twenty', example: 'twenty steps', group: 'tens' },
  { value: 30, en: 'thirty', example: 'thirty days', group: 'tens' },
  { value: 40, en: 'forty', example: 'forty winks', group: 'tens' },
  { value: 50, en: 'fifty', example: 'fifty cents', group: 'tens' },
  { value: 60, en: 'sixty', example: 'sixty seconds', group: 'tens' },
  { value: 70, en: 'seventy', example: 'seventy years', group: 'tens' },
  { value: 80, en: 'eighty', example: 'eighty trees', group: 'tens' },
  { value: 90, en: 'ninety', example: 'ninety percent', group: 'tens' },

  // ── Số lớn ──────────────────────────────────────────────────────
  { value: 100, en: 'one hundred', example: 'one hundred points', group: 'big' },
  { value: 1000, en: 'one thousand', example: 'one thousand stars', group: 'big' },
];

export const NUMBER_GROUPS: { key: NumberGroup; label: string; subtitle: string; accent: string }[] = [
  { key: 'basic', label: 'Số cơ bản', subtitle: '0 — 10', accent: 'from-emerald-50 to-blue-50 border-emerald-200' },
  { key: 'teen', label: 'Tuổi teen', subtitle: '11 — 19', accent: 'from-blue-50 to-purple-50 border-blue-200' },
  { key: 'tens', label: 'Hàng chục', subtitle: '20, 30, ..., 90', accent: 'from-purple-50 to-pink-50 border-purple-200' },
  { key: 'big', label: 'Số lớn', subtitle: '100, 1.000', accent: 'from-orange-50 to-red-50 border-orange-200' },
];

export function formatNumeral(n: number): string {
  return n.toLocaleString('en-US');
}
