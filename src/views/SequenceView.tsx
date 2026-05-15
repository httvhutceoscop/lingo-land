import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';
type Level = 'easy' | 'medium' | 'hard';
type SeqKind = 'asc' | 'desc' | 'evens' | 'odds' | 'skip5' | 'pattern2';

type Sequence = {
  kind: SeqKind;
  values: number[];
  hiddenIdxs: number[]; // sorted ascending
};

type Round = {
  theme: Theme;
  sequence: Sequence;
  tray: TrayTile[]; // includes correct answers + distractors, shuffled
};

type Theme = {
  id: string;
  vi: string;
  emoji: string;
  board: string;
  border: string;
  badge: string;
};

type TrayTile = {
  id: string; // unique within round
  value: number;
};

// ─── Themes ────────────────────────────────────────────────────────────

const THEMES: Theme[] = [
  {
    id: 'bee',
    vi: 'Vườn ong',
    emoji: '🐝',
    board: 'from-yellow-50 via-amber-50 to-orange-50',
    border: 'border-amber-200',
    badge: 'bg-amber-500',
  },
  {
    id: 'balloon',
    vi: 'Lễ hội',
    emoji: '🎈',
    board: 'from-pink-50 via-rose-50 to-fuchsia-50',
    border: 'border-pink-200',
    badge: 'bg-pink-500',
  },
  {
    id: 'apple',
    vi: 'Vườn táo',
    emoji: '🍎',
    board: 'from-rose-50 via-red-50 to-amber-50',
    border: 'border-rose-200',
    badge: 'bg-rose-500',
  },
  {
    id: 'star',
    vi: 'Bầu trời sao',
    emoji: '⭐',
    board: 'from-indigo-50 via-violet-50 to-purple-50',
    border: 'border-violet-200',
    badge: 'bg-violet-500',
  },
  {
    id: 'flower',
    vi: 'Vườn hoa',
    emoji: '🌸',
    board: 'from-pink-50 via-fuchsia-50 to-purple-50',
    border: 'border-fuchsia-200',
    badge: 'bg-fuchsia-500',
  },
  {
    id: 'fish',
    vi: 'Đại dương',
    emoji: '🐠',
    board: 'from-cyan-50 via-sky-50 to-blue-50',
    border: 'border-cyan-200',
    badge: 'bg-cyan-500',
  },
  {
    id: 'candy',
    vi: 'Kẹo ngọt',
    emoji: '🍬',
    board: 'from-fuchsia-50 via-pink-50 to-amber-50',
    border: 'border-pink-200',
    badge: 'bg-pink-500',
  },
  {
    id: 'egg',
    vi: 'Trứng khủng long',
    emoji: '🥚',
    board: 'from-emerald-50 via-teal-50 to-cyan-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-500',
  },
];

const TOTAL_ROUNDS = 5;
const HS_KEY = 'lingoland_sequence_hs';

const LEVEL_META: Record<
  Level,
  {
    title: string;
    desc: string;
    emoji: string;
    gradient: string;
    shadow: string;
    max: number;
    hiddenSlots: number;
    kinds: SeqKind[];
    seqLen: number;
  }
> = {
  easy: {
    title: 'Dễ',
    desc: '1 → 5, thiếu 1 số',
    emoji: '🌱',
    gradient: 'from-emerald-400 to-teal-500',
    shadow: 'shadow-emerald-200',
    max: 5,
    hiddenSlots: 1,
    kinds: ['asc'],
    seqLen: 4,
  },
  medium: {
    title: 'Vừa',
    desc: '1 → 10, thiếu 2 số',
    emoji: '🌟',
    gradient: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-200',
    max: 10,
    hiddenSlots: 2,
    kinds: ['asc', 'desc'],
    seqLen: 4,
  },
  hard: {
    title: 'Khó',
    desc: '1 → 20, dãy phức tạp',
    emoji: '🔥',
    gradient: 'from-fuchsia-500 to-purple-600',
    shadow: 'shadow-fuchsia-200',
    max: 20,
    hiddenSlots: 2,
    kinds: ['asc', 'desc', 'evens', 'odds', 'skip5', 'pattern2'],
    seqLen: 5,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function pickDistinctIndices(count: number, length: number): number[] {
  const pool = Array.from({ length }, (_, i) => i);
  return shuffle(pool)
    .slice(0, count)
    .sort((a, b) => a - b);
}

// ─── Sequence generation ──────────────────────────────────────────────

function generateSeqValues(kind: SeqKind, max: number, len: number): number[] {
  switch (kind) {
    case 'asc': {
      const start = randInt(1, Math.max(1, max - (len - 1)));
      return Array.from({ length: len }, (_, i) => start + i);
    }
    case 'desc': {
      const start = randInt(len, max);
      return Array.from({ length: len }, (_, i) => start - i);
    }
    case 'evens': {
      // start at an even number, +2 each
      const lastMax = max - 2 * (len - 1);
      const start = 2 * randInt(1, Math.max(1, Math.floor(lastMax / 2)));
      return Array.from({ length: len }, (_, i) => start + 2 * i);
    }
    case 'odds': {
      const lastMax = max - 2 * (len - 1);
      const start = 2 * randInt(0, Math.max(0, Math.floor((lastMax - 1) / 2))) + 1;
      return Array.from({ length: len }, (_, i) => start + 2 * i);
    }
    case 'skip5': {
      // start at a multiple of 5 (>=0), step 5
      const last = max - 5 * (len - 1);
      const start = 5 * randInt(0, Math.max(0, Math.floor(last / 5)));
      return Array.from({ length: len }, (_, i) => start + 5 * i);
    }
    case 'pattern2': {
      // alternating a,b,a,b,a — pick distinct values within [1..max]
      const a = randInt(1, max);
      let b = randInt(1, max);
      let safety = 0;
      while (b === a && safety < 6) {
        b = randInt(1, max);
        safety++;
      }
      return Array.from({ length: len }, (_, i) => (i % 2 === 0 ? a : b));
    }
  }
}

function buildSequence(level: Level): Sequence {
  const meta = LEVEL_META[level];
  const kind = pick(meta.kinds);
  const values = generateSeqValues(kind, meta.max, meta.seqLen);
  const hiddenIdxs = pickDistinctIndices(meta.hiddenSlots, values.length);
  return { kind, values, hiddenIdxs };
}

function buildTray(sequence: Sequence, max: number): TrayTile[] {
  const answers = sequence.hiddenIdxs.map((i) => sequence.values[i]);
  // 2 distractors not equal to any answer and within a plausible range
  const distractors: number[] = [];
  const ceilRange = Math.max(max, ...sequence.values) + 3;
  let tries = 0;
  while (distractors.length < 2 && tries < 40) {
    const cand = randInt(0, ceilRange);
    if (!answers.includes(cand) && !distractors.includes(cand)) {
      distractors.push(cand);
    }
    tries++;
  }
  // Pieces are unique even if the answer values repeat (pattern2 case)
  const pieces: TrayTile[] = [];
  answers.forEach((v, i) => pieces.push({ id: `ans-${i}-${v}`, value: v }));
  distractors.forEach((v, i) => pieces.push({ id: `d-${i}-${v}`, value: v }));
  return shuffle(pieces);
}

function buildRound(level: Level, prevThemeId?: string): Round {
  let theme = pick(THEMES);
  let s = 0;
  while (prevThemeId && theme.id === prevThemeId && s < 6) {
    theme = pick(THEMES);
    s++;
  }
  const sequence = buildSequence(level);
  return { theme, sequence, tray: buildTray(sequence, LEVEL_META[level].max) };
}

function buildDeck(level: Level): Round[] {
  const rounds: Round[] = [];
  let prev: string | undefined;
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const r = buildRound(level, prev);
    rounds.push(r);
    prev = r.theme.id;
  }
  return rounds;
}

// ─── High scores ────────────────────────────────────────────────────

type HighScores = Record<Level, number>;
const DEFAULT_HS: HighScores = { easy: 0, medium: 0, hard: 0 };

function loadHighScores(): HighScores {
  const raw = localStorage.getItem(HS_KEY);
  if (!raw) return { ...DEFAULT_HS };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        easy: Number(parsed.easy) || 0,
        medium: Number(parsed.medium) || 0,
        hard: Number(parsed.hard) || 0,
      };
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_HS };
}

function saveHighScore(level: Level, score: number, current: HighScores): HighScores {
  if (score <= current[level]) return current;
  const next = { ...current, [level]: score };
  localStorage.setItem(HS_KEY, JSON.stringify(next));
  return next;
}

// ─── Drag state ─────────────────────────────────────────────────────

type DragState = {
  pieceId: string;
  pointerId: number;
  origin: { x: number; y: number };
  offset: { x: number; y: number };
  pos: { x: number; y: number };
};

type SequenceViewProps = {
  onBack: () => void;
};

export default function SequenceView({ onBack }: SequenceViewProps) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>('easy');
  const [deck, setDeck] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  // map: slotPositionIdx -> tile id placed (used to track which slot is filled with which piece)
  const [filledBySlot, setFilledBySlot] = useState<Record<number, string>>({});
  const [removedPieceIds, setRemovedPieceIds] = useState<Set<string>>(new Set());
  const [snappingSlotIdx, setSnappingSlotIdx] = useState<number | null>(null);
  const [wrongSlotIdx, setWrongSlotIdx] = useState<number | null>(null);
  const [returningPieceId, setReturningPieceId] = useState<string | null>(null);
  const [hoverSlotIdx, setHoverSlotIdx] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [mascotCheer, setMascotCheer] = useState(false);
  const [highScores, setHighScores] = useState<HighScores>(() => loadHighScores());
  const [newRecord, setNewRecord] = useState(false);
  const [roundDone, setRoundDone] = useState(false);

  const round = deck[idx];
  // slot refs are keyed by absolute position (0..seqLen-1); only hidden slots have refs
  const slotRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    slotRefs.current = {};
  }, [idx]);

  useEffect(() => {
    if (phase !== 'playing' || !round) return;
    const t = window.setTimeout(() => {
      speak('Hãy điền số còn thiếu', LANG_SPEAK_DEFAULT);
    }, 350);
    return () => window.clearTimeout(t);
  }, [phase, idx, round]);

  // Round complete when every hidden slot has a piece in it
  useEffect(() => {
    if (phase !== 'playing' || !round || roundDone) return;
    const allFilled = round.sequence.hiddenIdxs.every(
      (slotPos) => filledBySlot[slotPos]
    );
    if (allFilled && round.sequence.hiddenIdxs.length > 0) {
      setRoundDone(true);
      setMascotCheer(true);
      setCorrectCount((c) => c + 1);
      addScore(20);
      confetti({
        particleCount: 120,
        spread: 90,
        startVelocity: 35,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#34d399', '#a855f7', '#06b6d4', '#ec4899'],
      });
      window.setTimeout(() => speak('Giỏi lắm!', LANG_SPEAK_DEFAULT), 250);
      window.setTimeout(() => setMascotCheer(false), 900);
    }
  }, [filledBySlot, phase, round, roundDone, addScore]);

  useEffect(() => {
    if (phase !== 'finished') return;
    if (correctCount > highScores[level]) {
      setNewRecord(true);
      setHighScores((hs) => saveHighScore(level, correctCount, hs));
    }
    if (correctCount >= TOTAL_ROUNDS * 0.7) {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#34d399', '#a855f7', '#06b6d4'],
      });
      window.setTimeout(() => speak('Bé giỏi quá!', LANG_SPEAK_DEFAULT), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startGame = (lv: Level) => {
    setLevel(lv);
    setDeck(buildDeck(lv));
    setIdx(0);
    setCorrectCount(0);
    setFilledBySlot({});
    setRemovedPieceIds(new Set());
    setRoundDone(false);
    setDrag(null);
    setWrongSlotIdx(null);
    setSnappingSlotIdx(null);
    setReturningPieceId(null);
    setHoverSlotIdx(null);
    setNewRecord(false);
    setPhase('playing');
  };

  const replay = () => startGame(level);

  const handleNext = () => {
    if (idx + 1 >= deck.length) {
      setPhase('finished');
      return;
    }
    setIdx((i) => i + 1);
    setFilledBySlot({});
    setRemovedPieceIds(new Set());
    setRoundDone(false);
    setSnappingSlotIdx(null);
  };

  // ─── Drag handlers ─────────────────────────────────────────────

  const slotAtPoint = (x: number, y: number): number | null => {
    if (!round) return null;
    for (const slotPos of round.sequence.hiddenIdxs) {
      const el = slotRefs.current[slotPos];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return slotPos;
    }
    return null;
  };

  const onPiecePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    piece: TrayTile
  ) => {
    if (roundDone || removedPieceIds.has(piece.id)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      pieceId: piece.id,
      pointerId: e.pointerId,
      origin: { x: rect.left, y: rect.top },
      offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      pos: { x: e.clientX, y: e.clientY },
    });
    setHoverSlotIdx(slotAtPoint(e.clientX, e.clientY));
  };

  const onPiecePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDrag({ ...drag, pos: { x: e.clientX, y: e.clientY } });
    setHoverSlotIdx(slotAtPoint(e.clientX, e.clientY));
  };

  const onPiecePointerUp = (
    e: React.PointerEvent<HTMLButtonElement>,
    piece: TrayTile
  ) => {
    if (!drag || drag.pointerId !== e.pointerId || !round) return;
    const slotPos = slotAtPoint(e.clientX, e.clientY);
    setDrag(null);
    setHoverSlotIdx(null);

    if (slotPos === null) {
      bouncePiece(piece);
      return;
    }
    if (filledBySlot[slotPos]) {
      bouncePiece(piece);
      return;
    }
    const expected = round.sequence.values[slotPos];
    if (piece.value === expected) {
      playSfx('snd-correct');
      setSnappingSlotIdx(slotPos);
      setFilledBySlot((m) => ({ ...m, [slotPos]: piece.id }));
      setRemovedPieceIds((s) => new Set(s).add(piece.id));
      window.setTimeout(
        () => setSnappingSlotIdx((s) => (s === slotPos ? null : s)),
        650
      );
    } else {
      playSfx('snd-wrong');
      setWrongSlotIdx(slotPos);
      bouncePiece(piece);
      window.setTimeout(
        () => setWrongSlotIdx((s) => (s === slotPos ? null : s)),
        500
      );
    }
  };

  const onPiecePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDrag(null);
    setHoverSlotIdx(null);
  };

  const bouncePiece = (piece: TrayTile) => {
    setReturningPieceId(piece.id);
    window.setTimeout(
      () => setReturningPieceId((p) => (p === piece.id ? null : p)),
      350
    );
  };

  const tileTransform = (piece: TrayTile): string | undefined => {
    if (!drag || drag.pieceId !== piece.id) return undefined;
    const targetX = drag.pos.x - drag.offset.x;
    const targetY = drag.pos.y - drag.offset.y;
    const dx = targetX - drag.origin.x;
    const dy = targetY - drag.origin.y;
    return `translate3d(${dx}px, ${dy}px, 0) scale(1.15) rotate(-4deg)`;
  };

  // ─── IDLE / WELCOME ────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>
        <div className="text-center py-6 max-w-md mx-auto">
          <div className="text-7xl mb-4 floating">🐝</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Điền số còn thiếu
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Kéo số đúng vào ô có dấu ? để hoàn thành chuỗi số.
          </p>

          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-2 border-amber-100 rounded-3xl p-5 mb-6">
            <div className="flex items-center justify-around mb-3 text-2xl font-black">
              <span className="bg-amber-500 text-white px-3 py-1 rounded-xl">1</span>
              <span className="bg-white border-2 border-dashed border-amber-300 text-amber-400 px-3 py-1 rounded-xl">?</span>
              <span className="bg-amber-500 text-white px-3 py-1 rounded-xl">3</span>
              <span className="bg-white border-2 border-dashed border-amber-300 text-amber-400 px-3 py-1 rounded-xl">?</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Bé kéo 2 và 4 vào ô đúng
            </p>
          </div>

          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Chọn cấp độ
          </p>
          <div className="space-y-3">
            {(['easy', 'medium', 'hard'] as const).map((lv) => {
              const meta = LEVEL_META[lv];
              const hs = highScores[lv];
              return (
                <button
                  key={lv}
                  onClick={() => startGame(lv)}
                  className={`w-full p-5 bg-gradient-to-br ${meta.gradient} text-white rounded-3xl shadow-lg ${meta.shadow} active:scale-95 transition-all flex items-center gap-4 text-left`}
                >
                  <div className="text-4xl">{meta.emoji}</div>
                  <div className="flex-1">
                    <div className="font-black text-lg leading-tight">{meta.title}</div>
                    <div className="text-xs opacity-90 font-bold mt-0.5">
                      {meta.desc}
                    </div>
                    {hs > 0 && (
                      <div className="text-[10px] mt-1 font-bold bg-white/20 inline-block px-2 py-0.5 rounded-full">
                        🏆 Kỷ lục: {hs}/{TOTAL_ROUNDS}
                      </div>
                    )}
                  </div>
                  <span className="text-xl">▶️</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── FINISHED ─────────────────────────────────────────────────────
  if (phase === 'finished') {
    const stars =
      correctCount >= TOTAL_ROUNDS
        ? 3
        : correctCount >= TOTAL_ROUNDS * 0.7
          ? 2
          : correctCount >= TOTAL_ROUNDS * 0.4
            ? 1
            : 0;
    const label =
      stars === 3
        ? 'Hoàn hảo!'
        : stars === 2
          ? 'Tuyệt vời!'
          : stars === 1
            ? 'Khá lắm!'
            : 'Thử lại nhé!';
    const emoji =
      stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🐝';

    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{emoji}</div>
        <h2 className="text-3xl font-black mb-3">{label}</h2>
        {newRecord && (
          <div className="inline-block px-3 py-1 mb-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-xs font-black uppercase tracking-widest badge-pop">
            🏆 Kỷ lục mới!
          </div>
        )}
        <p className="text-slate-500 text-sm mb-4">
          Bé đã hoàn thành {TOTAL_ROUNDS} chuỗi số!
        </p>
        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`text-3xl badge-pop ${s <= stars ? '' : 'grayscale opacity-20'}`}
              style={{ animationDelay: `${s * 0.15}s` }}
            >
              ⭐
            </span>
          ))}
        </div>
        <div className="bg-slate-50 rounded-3xl p-5 mb-3">
          <div className="text-5xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{TOTAL_ROUNDS}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Chuỗi số hoàn thành
          </div>
        </div>
        <div className="bg-slate-50 rounded-3xl p-3 mb-6 flex justify-around">
          <div>
            <div className="text-xl font-black text-amber-500">
              {highScores[level]}/{TOTAL_ROUNDS}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kỷ lục {LEVEL_META[level].title}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={replay}
            className="flex-1 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ──────────────────────────────────────────────────────
  if (!round) return null;
  const seqLen = round.sequence.values.length;
  const colsCls =
    seqLen <= 4 ? 'grid-cols-4' : 'grid-cols-5';

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-xs font-black uppercase tracking-widest">
          <span className="text-slate-400">
            Chuỗi{' '}
            <span className="text-amber-500 text-base">
              {idx + 1}/{deck.length}
            </span>
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Mascot + prompt */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span
          className={`text-4xl ${mascotCheer ? 'mascot-cheer' : 'floating'}`}
          aria-hidden
        >
          🐝
        </span>
        <button
          onClick={() => speak('Hãy điền số còn thiếu', LANG_SPEAK_DEFAULT)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-full font-black text-sm text-slate-700 active:scale-95 transition-all shadow-sm"
          aria-label="Nghe lại"
        >
          🔊 <span>Điền số còn thiếu</span>
        </button>
      </div>

      {/* Theme chip */}
      <div className="text-center mb-3">
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-slate-100 rounded-full text-xs font-black text-slate-600 shadow-sm">
          <span className="text-base">{round.theme.emoji}</span>
          <span>{round.theme.vi}</span>
        </span>
      </div>

      {/* Sequence board */}
      <div
        className={`relative rounded-3xl border-2 bg-gradient-to-br ${round.theme.board} ${round.theme.border} p-4 md:p-5 mb-5`}
      >
        <div className={`grid gap-2 md:gap-3 ${colsCls}`}>
          {round.sequence.values.map((value, slotPos) => {
            const isHidden = round.sequence.hiddenIdxs.includes(slotPos);
            const filledId = filledBySlot[slotPos];
            const isFilled = Boolean(filledId);
            const isSnapping = snappingSlotIdx === slotPos;
            const isWrong = wrongSlotIdx === slotPos;
            const isHover = hoverSlotIdx === slotPos && !isFilled;

            if (!isHidden) {
              // Static visible number with theme object
              return (
                <div
                  key={slotPos}
                  className="aspect-square rounded-3xl bg-white border-2 border-slate-100 shadow-sm relative flex items-center justify-center"
                >
                  <span className="text-3xl md:text-4xl absolute top-1 left-1/2 -translate-x-1/2 opacity-90">
                    {round.theme.emoji}
                  </span>
                  <span
                    className={`absolute bottom-2 ${round.theme.badge} text-white font-black rounded-xl px-3 py-1`}
                    style={{ fontSize: 'clamp(20px, 5vw, 28px)' }}
                  >
                    {value}
                  </span>
                </div>
              );
            }

            // Hidden slot — drop target
            return (
              <div
                key={slotPos}
                ref={(el) => {
                  slotRefs.current[slotPos] = el;
                }}
                className={`aspect-square rounded-3xl border-2 border-dashed flex items-center justify-center transition-all relative ${
                  isFilled
                    ? `bg-white border-transparent shadow-sm`
                    : isHover
                      ? 'border-amber-400 bg-amber-50 scale-105 slot-glow'
                      : 'border-slate-300 bg-white/60'
                } ${isWrong ? 'shake-x' : ''}`}
              >
                <span className="text-3xl md:text-4xl absolute top-1 left-1/2 -translate-x-1/2 opacity-40">
                  {round.theme.emoji}
                </span>
                {isFilled ? (
                  <span
                    className={`absolute bottom-2 ${round.theme.badge} text-white font-black rounded-xl px-3 py-1 ${
                      isSnapping ? 'piece-snap' : ''
                    }`}
                    style={{ fontSize: 'clamp(20px, 5vw, 28px)' }}
                  >
                    {value}
                  </span>
                ) : (
                  <span
                    className="absolute bottom-2 text-amber-400 font-black"
                    style={{ fontSize: 'clamp(24px, 6vw, 36px)' }}
                  >
                    ?
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {roundDone && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-full badge-pop">
            ✓ Hoàn thành
          </div>
        )}
      </div>

      {/* Number tray */}
      <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
        Kéo số vào ô có dấu ?
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 md:gap-3 mb-5">
        {round.tray.map((p) => {
          const isDragging = drag?.pieceId === p.id;
          const removed = removedPieceIds.has(p.id);
          const isReturning = returningPieceId === p.id;
          return (
            <div key={p.id} className="aspect-square">
              <button
                type="button"
                disabled={removed || roundDone}
                onPointerDown={(e) => onPiecePointerDown(e, p)}
                onPointerMove={onPiecePointerMove}
                onPointerUp={(e) => onPiecePointerUp(e, p)}
                onPointerCancel={onPiecePointerCancel}
                className={`w-full h-full bg-gradient-to-br from-violet-500 to-purple-700 text-white font-black rounded-2xl flex items-center justify-center disabled:opacity-0 disabled:scale-0 shadow-lg shadow-purple-200 ${
                  isDragging ? 'shadow-2xl ring-4 ring-amber-300' : ''
                } ${isReturning ? 'piece-return' : ''}`}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  transform: tileTransform(p),
                  transition: isDragging
                    ? 'none'
                    : removed
                      ? 'all 0.4s ease'
                      : 'transform 0.25s ease',
                  zIndex: isDragging ? 50 : 'auto',
                  position: 'relative',
                  cursor: roundDone ? 'default' : 'grab',
                  fontSize: 'clamp(28px, 7vw, 44px)',
                }}
                aria-label={`Số ${p.value}`}
              >
                <span className="drop-shadow-md">{p.value}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Next button */}
      <div className="h-14">
        {roundDone && (
          <button
            onClick={handleNext}
            className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {idx + 1 >= deck.length ? '🎉 Xem kết quả' : 'Chuỗi tiếp theo ▶️'}
          </button>
        )}
      </div>
    </div>
  );
}
