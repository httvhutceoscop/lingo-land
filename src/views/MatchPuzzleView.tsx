import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';
type Level = 'easy' | 'medium' | 'hard';

type Piece = {
  id: string; // unique within round
  emoji: string;
  vi: string;
  themeId: string;
};

type Theme = {
  id: string;
  title: string;
  emoji: string;
  // gradient backdrop for the puzzle board
  board: string;
  border: string;
  items: { emoji: string; vi: string }[];
};

const THEMES: Theme[] = [
  {
    id: 'animals',
    title: 'Động vật',
    emoji: '🐾',
    board: 'from-amber-50 via-orange-50 to-rose-50',
    border: 'border-amber-200',
    items: [
      { emoji: '🐱', vi: 'mèo' },
      { emoji: '🐶', vi: 'chó' },
      { emoji: '🐰', vi: 'thỏ' },
      { emoji: '🐢', vi: 'rùa' },
      { emoji: '🐠', vi: 'cá' },
      { emoji: '🦖', vi: 'khủng long' },
      { emoji: '🦁', vi: 'sư tử' },
      { emoji: '🐼', vi: 'gấu trúc' },
    ],
  },
  {
    id: 'fruits',
    title: 'Trái cây',
    emoji: '🍎',
    board: 'from-pink-50 via-rose-50 to-amber-50',
    border: 'border-rose-200',
    items: [
      { emoji: '🍎', vi: 'táo' },
      { emoji: '🍊', vi: 'cam' },
      { emoji: '🍌', vi: 'chuối' },
      { emoji: '🍉', vi: 'dưa hấu' },
      { emoji: '🍓', vi: 'dâu' },
      { emoji: '🍇', vi: 'nho' },
      { emoji: '🍑', vi: 'đào' },
      { emoji: '🍍', vi: 'dứa' },
    ],
  },
  {
    id: 'vehicles',
    title: 'Phương tiện',
    emoji: '🚗',
    board: 'from-sky-50 via-cyan-50 to-blue-50',
    border: 'border-sky-200',
    items: [
      { emoji: '🚗', vi: 'xe hơi' },
      { emoji: '🚂', vi: 'tàu hỏa' },
      { emoji: '✈️', vi: 'máy bay' },
      { emoji: '🚲', vi: 'xe đạp' },
      { emoji: '🚌', vi: 'xe buýt' },
      { emoji: '🚀', vi: 'tên lửa' },
      { emoji: '🚓', vi: 'xe cảnh sát' },
      { emoji: '⛵', vi: 'thuyền buồm' },
    ],
  },
  {
    id: 'toys',
    title: 'Đồ chơi',
    emoji: '🧸',
    board: 'from-purple-50 via-fuchsia-50 to-pink-50',
    border: 'border-purple-200',
    items: [
      { emoji: '🧸', vi: 'gấu bông' },
      { emoji: '🎈', vi: 'bóng bay' },
      { emoji: '⚽', vi: 'bóng đá' },
      { emoji: '🪁', vi: 'diều' },
      { emoji: '🤖', vi: 'robot' },
      { emoji: '🎲', vi: 'xúc xắc' },
      { emoji: '🧩', vi: 'mảnh ghép' },
      { emoji: '🪀', vi: 'yo-yo' },
    ],
  },
];

const TOTAL_ROUNDS = 5;
const HS_KEY = 'lingoland_match_hs';

const LEVEL_META: Record<
  Level,
  {
    title: string;
    desc: string;
    emoji: string;
    gradient: string;
    shadow: string;
    slots: number; // number of slots per round
    distractors: number; // extra distractor pieces in the tray
  }
> = {
  easy: {
    title: 'Dễ',
    desc: '1 mảnh ghép — chỉ một bước',
    emoji: '🌱',
    gradient: 'from-emerald-400 to-teal-500',
    shadow: 'shadow-emerald-200',
    slots: 1,
    distractors: 2,
  },
  medium: {
    title: 'Vừa',
    desc: '3 mảnh ghép — luyện tập',
    emoji: '🌟',
    gradient: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-200',
    slots: 3,
    distractors: 2,
  },
  hard: {
    title: 'Khó',
    desc: '5 mảnh ghép — thử thách',
    emoji: '🔥',
    gradient: 'from-rose-500 to-purple-600',
    shadow: 'shadow-rose-200',
    slots: 5,
    distractors: 2,
  },
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

// ─── Rounds ────────────────────────────────────────────────────────

type Round = {
  theme: Theme;
  targets: Piece[]; // expected slots, in display order
  tray: Piece[]; // tray pieces (targets + distractors), shuffled
};

function buildRound(level: Level, prevThemeId?: string): Round {
  const meta = LEVEL_META[level];

  // Pick a theme different from the previous round
  let theme = pick(THEMES);
  let s = 0;
  while (prevThemeId && theme.id === prevThemeId && s < 6) {
    theme = pick(THEMES);
    s++;
  }

  // N target pieces from the theme
  const themeItems = shuffle(theme.items).slice(0, meta.slots);
  const targets: Piece[] = themeItems.map((it, i) => ({
    id: `t-${i}-${it.emoji}`,
    emoji: it.emoji,
    vi: it.vi,
    themeId: theme.id,
  }));

  // Distractors from OTHER themes — avoid emoji collision with targets
  const usedEmojis = new Set(targets.map((t) => t.emoji));
  const otherPool = THEMES.filter((t) => t.id !== theme.id).flatMap((t) =>
    t.items.map((it) => ({ ...it, themeId: t.id }))
  );
  const distractors: Piece[] = [];
  const shuffledPool = shuffle(otherPool);
  for (const it of shuffledPool) {
    if (distractors.length >= meta.distractors) break;
    if (usedEmojis.has(it.emoji)) continue;
    usedEmojis.add(it.emoji);
    distractors.push({
      id: `d-${distractors.length}-${it.emoji}`,
      emoji: it.emoji,
      vi: it.vi,
      themeId: it.themeId,
    });
  }

  return {
    theme,
    targets,
    tray: shuffle([...targets, ...distractors]),
  };
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

type MatchPuzzleViewProps = {
  onBack: () => void;
};

export default function MatchPuzzleView({ onBack }: MatchPuzzleViewProps) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>('easy');
  const [deck, setDeck] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [filledByTargetId, setFilledByTargetId] = useState<Record<string, string>>({});
  // ^ map: targetId -> emoji (when filled)
  const [removedPieceIds, setRemovedPieceIds] = useState<Set<string>>(new Set());
  const [wrongSlotIdx, setWrongSlotIdx] = useState<number | null>(null);
  const [returningPieceId, setReturningPieceId] = useState<string | null>(null);
  const [snappingTargetId, setSnappingTargetId] = useState<string | null>(null);
  const [hoverSlotIdx, setHoverSlotIdx] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [mascotCheer, setMascotCheer] = useState(false);
  const [highScores, setHighScores] = useState<HighScores>(() => loadHighScores());
  const [newRecord, setNewRecord] = useState(false);
  const [roundDone, setRoundDone] = useState(false);

  const round = deck[idx];
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Reset slot refs when round changes
  useEffect(() => {
    slotRefs.current = [];
  }, [idx]);

  // Voice prompt on each round
  useEffect(() => {
    if (phase !== 'playing' || !round) return;
    const t = window.setTimeout(() => {
      speak('Hãy hoàn thành bức tranh', LANG_SPEAK_DEFAULT);
    }, 350);
    return () => window.clearTimeout(t);
  }, [phase, idx, round]);

  // Auto-detect round completion: all targets filled
  useEffect(() => {
    if (phase !== 'playing' || !round || roundDone) return;
    const filledCount = Object.keys(filledByTargetId).length;
    if (filledCount === round.targets.length && filledCount > 0) {
      setRoundDone(true);
      setMascotCheer(true);
      setCorrectCount((c) => c + 1);
      addScore(20);
      confetti({
        particleCount: 120,
        spread: 90,
        startVelocity: 35,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#34d399', '#a855f7', '#ec4899', '#06b6d4'],
      });
      window.setTimeout(() => speak('Giỏi lắm!', LANG_SPEAK_DEFAULT), 250);
      window.setTimeout(() => setMascotCheer(false), 900);
    }
  }, [filledByTargetId, phase, round, roundDone, addScore]);

  // Final celebration
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
        colors: ['#fbbf24', '#34d399', '#a855f7', '#ec4899'],
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
    setFilledByTargetId({});
    setRemovedPieceIds(new Set());
    setRoundDone(false);
    setDrag(null);
    setWrongSlotIdx(null);
    setSnappingTargetId(null);
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
    setFilledByTargetId({});
    setRemovedPieceIds(new Set());
    setRoundDone(false);
    setSnappingTargetId(null);
  };

  // ─── Drag handlers ───────────────────────────────────────────────

  const slotAtPoint = (x: number, y: number): number | null => {
    if (!round) return null;
    for (let i = 0; i < round.targets.length; i++) {
      const el = slotRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return null;
  };

  const onPiecePointerDown = (e: React.PointerEvent<HTMLButtonElement>, piece: Piece) => {
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

  const onPiecePointerUp = (e: React.PointerEvent<HTMLButtonElement>, piece: Piece) => {
    if (!drag || drag.pointerId !== e.pointerId || !round) return;
    const slotIdx = slotAtPoint(e.clientX, e.clientY);
    setDrag(null);
    setHoverSlotIdx(null);

    if (slotIdx === null) {
      // Dropped on empty space — bounce back
      bouncePiece(piece);
      return;
    }
    const target = round.targets[slotIdx];
    if (filledByTargetId[target.id]) {
      // Slot already filled — bounce back
      bouncePiece(piece);
      return;
    }
    if (piece.emoji === target.emoji) {
      // Correct match — snap into place
      playSfx('snd-correct');
      setSnappingTargetId(target.id);
      setFilledByTargetId((m) => ({ ...m, [target.id]: piece.emoji }));
      setRemovedPieceIds((s) => new Set(s).add(piece.id));
      window.setTimeout(
        () => setSnappingTargetId((t) => (t === target.id ? null : t)),
        650
      );
    } else {
      // Wrong slot — shake + bounce piece back + sad voice (only sometimes to avoid spam)
      playSfx('snd-wrong');
      setWrongSlotIdx(slotIdx);
      bouncePiece(piece);
      window.setTimeout(
        () => setWrongSlotIdx((s) => (s === slotIdx ? null : s)),
        500
      );
    }
  };

  const onPiecePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDrag(null);
    setHoverSlotIdx(null);
  };

  const bouncePiece = (piece: Piece) => {
    setReturningPieceId(piece.id);
    window.setTimeout(
      () => setReturningPieceId((p) => (p === piece.id ? null : p)),
      350
    );
  };

  const tileTransform = (piece: Piece): string | undefined => {
    if (!drag || drag.pieceId !== piece.id) return undefined;
    const targetX = drag.pos.x - drag.offset.x;
    const targetY = drag.pos.y - drag.offset.y;
    const dx = targetX - drag.origin.x;
    const dy = targetY - drag.origin.y;
    return `translate3d(${dx}px, ${dy}px, 0) scale(1.15) rotate(-6deg)`;
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
          <div className="text-7xl mb-4 floating">🐻</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 bg-clip-text text-transparent">
            Hoàn thành bức tranh
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Kéo đúng mảnh ghép vào bóng đen để hoàn thành bức tranh.
          </p>

          <div className="bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 border-2 border-amber-100 rounded-3xl p-5 mb-6">
            <div className="flex items-center justify-around mb-3">
              <span className="text-4xl shadow-silhouette">🐱</span>
              <span className="text-2xl">⬅️</span>
              <span className="text-4xl">🐱</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Kéo mèo vào bóng đen của nó
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

  // ─── FINISHED ──────────────────────────────────────────────────────
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
      stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🐻';

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
          Bé đã ghép xong {TOTAL_ROUNDS} bức tranh!
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
          <div className="text-5xl font-black bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{TOTAL_ROUNDS}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Bức tranh hoàn thành
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
            className="flex-1 py-4 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ──────────────────────────────────────────────────────
  if (!round) return null;
  const slotCount = round.targets.length;
  // Layout for slot grid: stay 1 wide for easy, fit-content row for 2-3, 2 rows for 4-5
  const slotsGridCls =
    slotCount === 1
      ? 'grid-cols-1 max-w-[180px] mx-auto'
      : slotCount === 2
        ? 'grid-cols-2 max-w-[360px] mx-auto'
        : slotCount === 3
          ? 'grid-cols-3 max-w-[500px] mx-auto'
          : 'grid-cols-3 max-w-[500px] mx-auto';

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
            Tranh{' '}
            <span className="text-amber-500 text-base">
              {idx + 1}/{deck.length}
            </span>
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-purple-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Mascot + prompt */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span
          className={`text-4xl ${mascotCheer ? 'mascot-cheer' : 'floating'}`}
          aria-hidden
        >
          🐻
        </span>
        <button
          onClick={() => speak('Hãy hoàn thành bức tranh', LANG_SPEAK_DEFAULT)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-full font-black text-sm text-slate-700 active:scale-95 transition-all shadow-sm"
          aria-label="Nghe lại"
        >
          🔊 <span>Hoàn thành bức tranh</span>
        </button>
      </div>

      {/* Theme chip */}
      <div className="text-center mb-3">
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-slate-100 rounded-full text-xs font-black text-slate-600 shadow-sm">
          <span className="text-base">{round.theme.emoji}</span>
          <span>{round.theme.title}</span>
        </span>
      </div>

      {/* Puzzle board with silhouette slots */}
      <div
        className={`relative rounded-3xl border-2 bg-gradient-to-br ${round.theme.board} ${round.theme.border} p-5 mb-5`}
      >
        <div className={`grid gap-3 ${slotsGridCls}`}>
          {round.targets.map((target, i) => {
            const filledEmoji = filledByTargetId[target.id];
            const isFilled = Boolean(filledEmoji);
            const isWrong = wrongSlotIdx === i;
            const isSnapping = snappingTargetId === target.id;
            const isHovered = hoverSlotIdx === i && !isFilled;
            return (
              <div
                key={target.id}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                className={`aspect-square rounded-3xl border-2 border-dashed flex items-center justify-center transition-all ${
                  isFilled
                    ? 'border-transparent bg-white shadow-inner'
                    : isHovered
                      ? 'border-amber-400 bg-amber-50 scale-105 slot-glow'
                      : 'border-slate-300 bg-white/60'
                } ${isWrong ? 'shake-x' : ''}`}
              >
                {isFilled ? (
                  <span
                    className={`leading-none ${isSnapping ? 'piece-snap' : ''}`}
                    style={{ fontSize: 'clamp(48px, 12vw, 80px)' }}
                  >
                    {filledEmoji}
                  </span>
                ) : (
                  <span
                    className="shadow-silhouette leading-none"
                    style={{ fontSize: 'clamp(48px, 12vw, 80px)' }}
                    aria-hidden
                  >
                    {target.emoji}
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

      {/* Piece tray */}
      <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
        Kéo mảnh ghép vào bóng đen
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
                className={`w-full h-full bg-white border-2 rounded-2xl flex items-center justify-center disabled:opacity-0 disabled:scale-0 ${
                  isDragging
                    ? 'shadow-2xl border-amber-300'
                    : 'border-slate-100 shadow-sm'
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
                  fontSize: 'clamp(32px, 8vw, 48px)',
                }}
                aria-label={p.vi}
              >
                <span className="leading-none drop-shadow-sm">{p.emoji}</span>
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
            {idx + 1 >= deck.length ? '🎉 Xem kết quả' : 'Bức tiếp theo ▶️'}
          </button>
        )}
      </div>
    </div>
  );
}
