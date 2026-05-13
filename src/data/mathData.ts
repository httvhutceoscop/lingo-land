export type MathLevelKind = 'symbols' | 'compute';
export type MathOp = '+' | '-';

export type MathLevel = {
  id: string;
  title: string;
  icon: string;
  kind: MathLevelKind;
  op?: MathOp;
  range?: number;
  questionCount: number;
};

export type SymbolQuestion = {
  kind: 'symbol';
  symbol: string;
  name: string;
  options: string[];
};

export type ComputeQuestion = {
  kind: 'compute';
  a: number;
  b: number;
  op: MathOp;
  answer: number;
  options: number[];
};

export type MathQuestion = SymbolQuestion | ComputeQuestion;

export const SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: '+', name: 'cộng' },
  { symbol: '−', name: 'trừ' },
  { symbol: '×', name: 'nhân' },
  { symbol: ':', name: 'chia' },
  { symbol: '=', name: 'bằng' },
];

export const MATH_LEVELS: MathLevel[] = [
  { id: 'math.symbols', title: 'Ký hiệu', icon: '🔣', kind: 'symbols', questionCount: 5 },
  { id: 'math.plus.5', title: 'Cộng đến 5', icon: '➕', kind: 'compute', op: '+', range: 5, questionCount: 10 },
  { id: 'math.minus.5', title: 'Trừ đến 5', icon: '➖', kind: 'compute', op: '-', range: 5, questionCount: 10 },
  { id: 'math.plus.10', title: 'Cộng đến 10', icon: '➕', kind: 'compute', op: '+', range: 10, questionCount: 10 },
  { id: 'math.minus.10', title: 'Trừ đến 10', icon: '➖', kind: 'compute', op: '-', range: 10, questionCount: 10 },
  { id: 'math.plus.20', title: 'Cộng đến 20', icon: '➕', kind: 'compute', op: '+', range: 20, questionCount: 10 },
  { id: 'math.minus.20', title: 'Trừ đến 20', icon: '➖', kind: 'compute', op: '-', range: 20, questionCount: 10 },
];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function genSymbolQuestion(): SymbolQuestion {
  const correct = SYMBOLS[randInt(0, SYMBOLS.length - 1)];
  const others = SYMBOLS.filter((s) => s.name !== correct.name);
  const distractors = shuffle(others).slice(0, 3).map((s) => s.name);
  return {
    kind: 'symbol',
    symbol: correct.symbol,
    name: correct.name,
    options: shuffle([correct.name, ...distractors]),
  };
}

function genSymbolDeck(count: number): SymbolQuestion[] {
  // Pick distinct symbols if possible (5 total → if count <= 5 unique; else allow repeats)
  const pool = shuffle(SYMBOLS).slice(0, Math.min(count, SYMBOLS.length));
  const out: SymbolQuestion[] = pool.map((entry) => {
    const distractors = shuffle(SYMBOLS.filter((s) => s.name !== entry.name))
      .slice(0, 3)
      .map((s) => s.name);
    return {
      kind: 'symbol',
      symbol: entry.symbol,
      name: entry.name,
      options: shuffle([entry.name, ...distractors]),
    };
  });
  while (out.length < count) out.push(genSymbolQuestion());
  return out;
}

function buildNumberOptions(answer: number, range: number): number[] {
  const set = new Set<number>([answer]);
  let safety = 30;
  while (set.size < 4 && safety > 0) {
    safety--;
    const delta = randInt(-3, 3);
    if (delta === 0) continue;
    const candidate = answer + delta;
    if (candidate < 0 || candidate > range + Math.max(2, Math.floor(range / 4))) continue;
    set.add(candidate);
  }
  // Fallback if range is tiny and we couldn't fill 4 distinct numbers
  let fallback = 0;
  while (set.size < 4) {
    if (fallback !== answer && fallback >= 0) set.add(fallback);
    fallback++;
    if (fallback > range * 2 + 10) break;
  }
  return shuffle([...set]);
}

function genPlusQuestion(range: number): ComputeQuestion {
  const a = randInt(0, range);
  const b = randInt(0, range - a);
  const answer = a + b;
  return {
    kind: 'compute',
    a,
    b,
    op: '+',
    answer,
    options: buildNumberOptions(answer, range),
  };
}

function genMinusQuestion(range: number): ComputeQuestion {
  const a = randInt(0, range);
  const b = randInt(0, a);
  const answer = a - b;
  return {
    kind: 'compute',
    a,
    b,
    op: '-',
    answer,
    options: buildNumberOptions(answer, range),
  };
}

export function generateQuestions(level: MathLevel): MathQuestion[] {
  if (level.kind === 'symbols') return genSymbolDeck(level.questionCount);
  const range = level.range ?? 10;
  const gen = level.op === '+' ? () => genPlusQuestion(range) : () => genMinusQuestion(range);
  return Array.from({ length: level.questionCount }, () => gen());
}

export function findMathLevel(id: string): MathLevel | null {
  return MATH_LEVELS.find((l) => l.id === id) ?? null;
}

export function nextMathLevelId(id: string): string | null {
  const idx = MATH_LEVELS.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  return MATH_LEVELS[idx + 1]?.id ?? null;
}

export function prevMathLevelId(id: string): string | null {
  const idx = MATH_LEVELS.findIndex((l) => l.id === id);
  if (idx <= 0) return null;
  return MATH_LEVELS[idx - 1].id;
}

export const TOTAL_MATH_LEVELS = MATH_LEVELS.length;
