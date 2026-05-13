import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';
type Level = 'easy' | 'medium' | 'hard';

type CountObject = {
  id: string;
  emoji: string;
  vi: string;
  viPlural: string; // for "Có bao nhiêu con/quả/cái X?"
};

const OBJECTS: CountObject[] = [
  { id: 'cat', emoji: '🐱', vi: 'mèo', viPlural: 'con mèo' },
  { id: 'dog', emoji: '🐶', vi: 'chó', viPlural: 'con chó' },
  { id: 'turtle', emoji: '🐢', vi: 'rùa', viPlural: 'con rùa' },
  { id: 'fish', emoji: '🐠', vi: 'cá', viPlural: 'con cá' },
  { id: 'dino', emoji: '🦖', vi: 'khủng long', viPlural: 'con khủng long' },
  { id: 'car', emoji: '🚗', vi: 'xe hơi', viPlural: 'chiếc xe' },
  { id: 'apple', emoji: '🍎', vi: 'táo', viPlural: 'quả táo' },
  { id: 'orange', emoji: '🍊', vi: 'cam', viPlural: 'quả cam' },
  { id: 'banana', emoji: '🍌', vi: 'chuối', viPlural: 'quả chuối' },
  { id: 'balloon', emoji: '🎈', vi: 'bóng bay', viPlural: 'quả bóng bay' },
  { id: 'star', emoji: '⭐', vi: 'sao', viPlural: 'ngôi sao' },
  { id: 'candy', emoji: '🍬', vi: 'kẹo', viPlural: 'chiếc kẹo' },
];

const TOTAL_ROUNDS = 10;
const HS_KEY = 'lingoland_count_hs';

const LEVEL_MAX: Record<Level, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
};

const LEVEL_META: Record<
  Level,
  { title: string; desc: string; emoji: string; gradient: string; shadow: string }
> = {
  easy: {
    title: 'Dễ',
    desc: 'Đếm từ 1 đến 5',
    emoji: '🌱',
    gradient: 'from-emerald-400 to-teal-500',
    shadow: 'shadow-emerald-200',
  },
  medium: {
    title: 'Vừa',
    desc: 'Đếm từ 1 đến 10',
    emoji: '🌟',
    gradient: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-200',
  },
  hard: {
    title: 'Khó',
    desc: 'Đếm từ 1 đến 20',
    emoji: '🔥',
    gradient: 'from-pink-500 to-fuchsia-600',
    shadow: 'shadow-pink-200',
  },
};

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

// ─── Rounds ─────────────────────────────────────────────────────────

type CountRound = {
  mode: 'count';
  object: CountObject;
  amount: number;
  options: number[];
  answer: number;
};

type MatchCard = {
  object: CountObject;
  count: number;
};

type MatchRound = {
  mode: 'match';
  target: number;
  cards: MatchCard[];
  answerCardIdx: number; // index of the card whose count === target
};

type MissingRound = {
  mode: 'missing';
  sequence: number[];
  hiddenIdx: number;
  answer: number;
  options: number[];
};

type Round = CountRound | MatchRound | MissingRound;

function numberOptions(answer: number, max: number, count = 4): number[] {
  const pool = new Set<number>([answer]);
  let tries = 0;
  while (pool.size < count && tries < 40) {
    const cand = answer + randInt(-3, 3);
    if (cand >= 0 && cand <= max && cand !== answer) pool.add(cand);
    tries++;
  }
  let backfill = 0;
  while (pool.size < count && backfill <= max) {
    if (backfill !== answer) pool.add(backfill);
    backfill++;
  }
  return shuffle(Array.from(pool));
}

function buildCount(level: Level, prevObjectId?: string): CountRound {
  const max = LEVEL_MAX[level];
  let object = pick(OBJECTS);
  let s = 0;
  while (prevObjectId && object.id === prevObjectId && s < 5) {
    object = pick(OBJECTS);
    s++;
  }
  const amount = randInt(1, max);
  return {
    mode: 'count',
    object,
    amount,
    options: numberOptions(amount, max),
    answer: amount,
  };
}

function buildMatch(level: Level): MatchRound {
  const max = LEVEL_MAX[level];
  // Pick three distinct counts and three distinct objects (so cards look varied)
  const counts = new Set<number>();
  while (counts.size < 3) counts.add(randInt(1, max));
  const used = new Set<string>();
  const cards: MatchCard[] = [];
  for (const c of counts) {
    let o = pick(OBJECTS);
    let safety = 0;
    while (used.has(o.id) && safety < 8) {
      o = pick(OBJECTS);
      safety++;
    }
    used.add(o.id);
    cards.push({ object: o, count: c });
  }
  const answerCardIdx = randInt(0, cards.length - 1);
  return {
    mode: 'match',
    target: cards[answerCardIdx].count,
    cards,
    answerCardIdx,
  };
}

function buildMissing(level: Level): MissingRound {
  const max = LEVEL_MAX[level];
  // Sequence length 4 of consecutive numbers, fits within [0..max]
  const start = randInt(0, Math.max(0, max - 3));
  const sequence = [start, start + 1, start + 2, start + 3];
  const hiddenIdx = randInt(0, sequence.length - 1);
  const answer = sequence[hiddenIdx];
  return {
    mode: 'missing',
    sequence,
    hiddenIdx,
    answer,
    options: numberOptions(answer, Math.max(max, sequence[3])),
  };
}

function buildRound(level: Level, prevObjectId?: string): Round {
  const r = Math.random();
  if (r < 0.5) return buildCount(level, prevObjectId);
  if (r < 0.8) return buildMatch(level);
  return buildMissing(level);
}

function buildDeck(level: Level): Round[] {
  const out: Round[] = [];
  let prevId: string | undefined;
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const r = buildRound(level, prevId);
    if (r.mode === 'count') prevId = r.object.id;
    else prevId = undefined;
    out.push(r);
  }
  return out;
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

// ─── Voice prompts ──────────────────────────────────────────────────

function promptFor(round: Round): { say: string; show: string } {
  switch (round.mode) {
    case 'count':
      return {
        say: `Có bao nhiêu ${round.object.viPlural}?`,
        show: `Có bao nhiêu ${round.object.viPlural}?`,
      };
    case 'match':
      return {
        say: `Tìm card có ${round.target}`,
        show: `Tìm card có ${round.target} ${round.cards[round.answerCardIdx].object.viPlural}`,
      };
    case 'missing':
      return {
        say: 'Số nào còn thiếu?',
        show: 'Số nào còn thiếu?',
      };
  }
}

// ─── Component ──────────────────────────────────────────────────────

type CountViewProps = {
  onBack: () => void;
};

export default function CountView({ onBack }: CountViewProps) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>('easy');
  const [deck, setDeck] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [mascotCheer, setMascotCheer] = useState(false);
  const [streakFlash, setStreakFlash] = useState(false);
  const [highScores, setHighScores] = useState<HighScores>(() => loadHighScores());
  const [newRecord, setNewRecord] = useState(false);

  const round = deck[idx];

  useEffect(() => {
    if (phase !== 'playing' || !round) return;
    const t = window.setTimeout(() => {
      speak(promptFor(round).say, 'vi-VN');
    }, 350);
    return () => window.clearTimeout(t);
  }, [phase, idx, round]);

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
        colors: ['#ec4899', '#a855f7', '#f59e0b', '#10b981', '#3b82f6'],
      });
      window.setTimeout(() => speak('Bé học giỏi quá!', 'vi-VN'), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startGame = (lv: Level) => {
    setLevel(lv);
    setDeck(buildDeck(lv));
    setIdx(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setPicked(null);
    setWrong(null);
    setNewRecord(false);
    setPhase('playing');
  };

  const replay = () => startGame(level);

  const handlePick = (n: number) => {
    if (!round || picked !== null) return;
    const correct =
      (round.mode === 'count' && n === round.answer) ||
      (round.mode === 'match' && n === round.answerCardIdx) ||
      (round.mode === 'missing' && n === round.answer);
    if (correct) {
      setPicked(n);
      setCorrectCount((c) => c + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => (next > b ? next : b));
        return next;
      });
      setStreakFlash(true);
      setMascotCheer(true);
      playSfx('snd-correct');
      addScore(10);
      confetti({
        particleCount: 70,
        spread: 70,
        startVelocity: 30,
        origin: { y: 0.5 },
        colors: ['#ec4899', '#a855f7', '#f59e0b', '#10b981'],
      });
      window.setTimeout(() => speak('Chính xác!', 'vi-VN'), 200);
      window.setTimeout(() => setMascotCheer(false), 800);
      window.setTimeout(() => setStreakFlash(false), 600);
    } else {
      setWrong(n);
      setStreak(0);
      playSfx('snd-wrong');
      window.setTimeout(() => speak('Thử lại nhé!', 'vi-VN'), 100);
      window.setTimeout(() => setWrong((w) => (w === n ? null : w)), 500);
    }
  };

  const handleNext = () => {
    setPicked(null);
    setWrong(null);
    if (idx + 1 >= deck.length) {
      setPhase('finished');
    } else {
      setIdx((i) => i + 1);
    }
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
          <div className="text-7xl mb-4 floating">🐱</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
            Học Đếm Số
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Đếm đồ vật, ghép số với nhóm và tìm số còn thiếu — học đếm thật vui!
          </p>

          <div className="bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 border-2 border-fuchsia-100 rounded-3xl p-5 mb-6">
            <div className="flex items-center justify-around mb-2">
              <span className="text-3xl">🐱🐱🐱</span>
              <span className="text-3xl font-black text-fuchsia-500 number-glow">3</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Có 3 con mèo
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
      stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🐱';

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
          Bé đã đếm xong {TOTAL_ROUNDS} câu rồi!
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
          <div className="text-5xl font-black bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{TOTAL_ROUNDS}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Số câu đúng
          </div>
        </div>
        <div className="bg-slate-50 rounded-3xl p-3 mb-6 flex justify-around">
          <div>
            <div className="text-xl font-black text-amber-500">{bestStreak}🔥</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Streak tốt nhất
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-fuchsia-500">
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
            className="flex-1 py-4 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ───────────────────────────────────────────────────────
  if (!round) return null;
  const prompt = promptFor(round);
  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
          <span className="text-slate-400">
            Câu <span className="text-fuchsia-500 text-base">{idx + 1}/{deck.length}</span>
          </span>
          <span className={`text-amber-500 text-base ${streakFlash ? 'combo-flash' : ''}`}>
            {streak > 0 ? `${streak}🔥` : ''}
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Mascot + prompt */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          className={`text-4xl ${mascotCheer ? 'mascot-cheer' : 'floating'}`}
          aria-hidden
        >
          🐱
        </span>
        <button
          onClick={() => speak(prompt.say, 'vi-VN')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-full font-black text-sm text-slate-700 active:scale-95 transition-all shadow-sm max-w-[250px]"
          aria-label="Nghe lại"
        >
          🔊 <span className="truncate">{prompt.show}</span>
        </button>
      </div>

      {/* Mode-specific board */}
      {round.mode === 'count' && (
        <CountBoard
          round={round}
          picked={picked}
          wrong={wrong}
          onPick={handlePick}
        />
      )}
      {round.mode === 'match' && (
        <MatchBoard
          round={round}
          picked={picked}
          wrong={wrong}
          onPick={handlePick}
        />
      )}
      {round.mode === 'missing' && (
        <MissingBoard
          round={round}
          picked={picked}
          wrong={wrong}
          onPick={handlePick}
        />
      )}

      {/* Next button */}
      <div className="mt-5 h-14">
        {picked !== null && (
          <button
            onClick={handleNext}
            className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {idx + 1 >= deck.length ? '🎉 Xem kết quả' : 'Câu tiếp theo ▶️'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mode boards ───────────────────────────────────────────────────────

type BoardCommon = {
  picked: number | null;
  wrong: number | null;
  onPick: (n: number) => void;
};

function CountBoard({
  round,
  picked,
  wrong,
  onPick,
}: BoardCommon & { round: CountRound }) {
  return (
    <>
      <ObjectCanvas
        count={round.amount}
        emoji={round.object.emoji}
        accent="from-pink-50 to-fuchsia-50 border-fuchsia-200"
        badge="bg-fuchsia-500"
      />
      <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mt-3 mb-2">
        Chọn số đúng
      </p>
      <NumberOptions options={round.options} picked={picked} wrong={wrong} onPick={onPick} />
    </>
  );
}

function MatchBoard({
  round,
  picked,
  wrong,
  onPick,
}: BoardCommon & { round: MatchRound }) {
  return (
    <>
      <div className="flex flex-col items-center mb-3">
        <div className="relative">
          <span className="block w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200 flex items-center justify-center text-white font-black number-glow" style={{ fontSize: 56, lineHeight: 1 }}>
            {round.target}
          </span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-slate-300" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
          Tìm card có {round.target} {round.cards[round.answerCardIdx].object.vi}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {round.cards.map((c, i) => {
          const isPicked = picked === i;
          const isWrong = wrong === i;
          const disabled = picked !== null;
          return (
            <button
              key={i}
              onClick={() => onPick(i)}
              disabled={disabled}
              className={`relative rounded-3xl border-2 bg-gradient-to-br from-amber-50 to-pink-50 border-amber-200 p-3 pt-5 min-h-[140px] active:scale-95 transition-all disabled:opacity-70 ${
                isPicked ? 'ring-4 ring-emerald-300 glow-pulse' : ''
              } ${isWrong ? 'shake-x' : ''}`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs font-black px-3 py-0.5 rounded-full shadow-sm badge-pop">
                {c.count}
              </span>
              <div className="flex flex-wrap justify-center items-center gap-1 h-full">
                {Array.from({ length: c.count }, (_, j) => (
                  <span
                    key={j}
                    className="drop-in leading-none"
                    style={{
                      fontSize: c.count <= 4 ? 24 : c.count <= 8 ? 20 : 16,
                      animationDelay: `${j * 0.04}s`,
                    }}
                  >
                    {c.object.emoji}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function MissingBoard({
  round,
  picked,
  wrong,
  onPick,
}: BoardCommon & { round: MissingRound }) {
  return (
    <>
      <div className="grid grid-cols-4 gap-2 md:gap-3 mb-4">
        {round.sequence.map((n, i) => {
          const isHidden = i === round.hiddenIdx;
          const showAnswer = isHidden && picked === round.answer;
          return (
            <div
              key={i}
              className={`aspect-square rounded-3xl flex items-center justify-center font-black shadow-md ${
                isHidden
                  ? showAnswer
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white drop-in'
                    : 'bg-white border-2 border-dashed border-slate-300 text-slate-300'
                  : 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white'
              }`}
              style={{ fontSize: 'clamp(28px, 7vw, 48px)' }}
            >
              {isHidden && !showAnswer ? '?' : n}
            </div>
          );
        })}
      </div>
      <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
        Chọn số còn thiếu
      </p>
      <NumberOptions
        options={round.options}
        picked={picked}
        wrong={wrong}
        onPick={onPick}
      />
    </>
  );
}

// ─── Shared widgets ────────────────────────────────────────────────────

type NumberOptionsProps = {
  options: number[];
  picked: number | null;
  wrong: number | null;
  onPick: (n: number) => void;
};

function NumberOptions({ options, picked, wrong, onPick }: NumberOptionsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {options.map((n) => {
        const isPicked = picked === n;
        const isWrong = wrong === n;
        const disabled = picked !== null;
        return (
          <button
            key={n}
            onClick={() => onPick(n)}
            disabled={disabled}
            className={`aspect-square rounded-3xl bg-gradient-to-br from-fuchsia-500 to-purple-700 text-white font-black shadow-lg shadow-fuchsia-200 active:scale-95 transition-all flex items-center justify-center disabled:opacity-60 ${
              isPicked ? 'ring-4 ring-offset-2 ring-emerald-300 glow-pulse' : ''
            } ${isWrong ? 'shake-x' : ''}`}
            style={{ fontSize: 'clamp(32px, 7vw, 56px)', touchAction: 'manipulation' }}
          >
            <span className="drop-shadow-md">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

type ObjectCanvasProps = {
  count: number;
  emoji: string;
  accent: string;
  badge: string;
};

function ObjectCanvas({ count, emoji, accent, badge }: ObjectCanvasProps) {
  const fontSize = useMemo(() => {
    if (count <= 4) return 56;
    if (count <= 8) return 40;
    if (count <= 12) return 30;
    if (count <= 16) return 24;
    return 20;
  }, [count]);

  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count]
  );

  return (
    <div
      className={`relative min-h-[200px] rounded-3xl border-2 bg-gradient-to-br ${accent} p-4 pt-6 flex items-center justify-center`}
    >
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 ${badge} text-white text-sm font-black px-4 py-1 rounded-full shadow-sm badge-pop`}
      >
        {count}
      </span>
      <div className="flex flex-wrap justify-center items-center gap-2">
        {items.map((i) => (
          <span
            key={i}
            className="leading-none drop-in object-bounce"
            style={{
              fontSize,
              animationDelay: `${i * 0.04}s, ${(i % 5) * 0.2}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
