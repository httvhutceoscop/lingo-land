import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';
type Level = 'easy' | 'medium' | 'hard';

type SubObject = {
  id: string;
  emoji: string;
  vi: string;
};

type Question = {
  object: SubObject;
  a: number;
  b: number;
  answer: number;
  options: number[];
};

const OBJECTS: SubObject[] = [
  { id: 'apple', emoji: '🍎', vi: 'táo' },
  { id: 'orange', emoji: '🍊', vi: 'cam' },
  { id: 'banana', emoji: '🍌', vi: 'chuối' },
  { id: 'strawberry', emoji: '🍓', vi: 'dâu' },
  { id: 'candy', emoji: '🍬', vi: 'kẹo' },
  { id: 'balloon', emoji: '🎈', vi: 'bóng bay' },
  { id: 'star', emoji: '⭐', vi: 'sao' },
  { id: 'bear', emoji: '🧸', vi: 'gấu bông' },
];

const TOTAL_ROUNDS = 10;
const HS_STORAGE_KEY = 'lingoland_subtract_hs';

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
    desc: 'Phép trừ trong 5',
    emoji: '🌱',
    gradient: 'from-emerald-400 to-teal-500',
    shadow: 'shadow-emerald-200',
  },
  medium: {
    title: 'Vừa',
    desc: 'Phép trừ trong 10',
    emoji: '🌟',
    gradient: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-200',
  },
  hard: {
    title: 'Khó',
    desc: 'Phép trừ trong 20',
    emoji: '🔥',
    gradient: 'from-fuchsia-500 to-purple-600',
    shadow: 'shadow-fuchsia-200',
  },
};

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function buildQuestion(level: Level, prevObjectId?: string): Question {
  const max = LEVEL_MAX[level];

  // Avoid trivial 0 subtractions and same object twice in a row
  let object = pick(OBJECTS);
  let safety = 0;
  while (prevObjectId && object.id === prevObjectId && safety < 5) {
    object = pick(OBJECTS);
    safety++;
  }

  // a in [2..max] so the problem feels real, b in [1..a]
  const a = randInt(2, max);
  const b = randInt(1, a);
  const answer = a - b;

  // 4 unique number options including the answer
  const pool = new Set<number>([answer]);
  let tries = 0;
  while (pool.size < 4 && tries < 30) {
    const cand = answer + randInt(-3, 3);
    if (cand >= 0 && cand <= max && cand !== answer) pool.add(cand);
    tries++;
  }
  // Backfill with low numbers if the candidate pool was too small (e.g. answer=0, max=2)
  let backfill = 0;
  while (pool.size < 4 && backfill <= max) {
    if (backfill !== answer) pool.add(backfill);
    backfill++;
  }
  const options = Array.from(pool).sort(() => Math.random() - 0.5);

  return { object, a, b, answer, options };
}

function buildDeck(level: Level): Question[] {
  const out: Question[] = [];
  let prevId: string | undefined;
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const q = buildQuestion(level, prevId);
    out.push(q);
    prevId = q.object.id;
  }
  return out;
}

type HighScores = Record<Level, number>;

const DEFAULT_HS: HighScores = { easy: 0, medium: 0, hard: 0 };

function loadHighScores(): HighScores {
  const raw = localStorage.getItem(HS_STORAGE_KEY);
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
  const next: HighScores = { ...current, [level]: score };
  localStorage.setItem(HS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

type SubtractViewProps = {
  onBack: () => void;
};

export default function SubtractView({ onBack }: SubtractViewProps) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>('easy');
  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [mascotCheer, setMascotCheer] = useState(false);
  const [streakFlash, setStreakFlash] = useState(false);
  const [highScores, setHighScores] = useState<HighScores>(() => loadHighScores());
  const [newRecord, setNewRecord] = useState(false);

  const question = deck[idx];

  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    const t = window.setTimeout(() => {
      speak(`${question.a} trừ ${question.b} bằng mấy?`, LANG_SPEAK_DEFAULT);
    }, 350);
    return () => window.clearTimeout(t);
  }, [phase, idx, question]);

  useEffect(() => {
    if (phase !== 'finished') return;
    const prev = highScores[level];
    if (correctCount > prev) {
      setNewRecord(true);
      setHighScores((hs) => saveHighScore(level, correctCount, hs));
    }
    if (correctCount >= TOTAL_ROUNDS * 0.7) {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
      });
      window.setTimeout(() => speak('Bé học giỏi quá!', LANG_SPEAK_DEFAULT), 250);
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
    setChosen(null);
    setWrong(null);
    setNewRecord(false);
    setPhase('playing');
  };

  const replay = () => startGame(level);

  const handlePick = (n: number) => {
    if (!question || chosen !== null) return;
    if (n === question.answer) {
      setChosen(n);
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
        colors: ['#a855f7', '#ec4899', '#f59e0b', '#10b981'],
      });
      window.setTimeout(() => speak('Chính xác!', LANG_SPEAK_DEFAULT), 200);
      window.setTimeout(() => setMascotCheer(false), 800);
      window.setTimeout(() => setStreakFlash(false), 600);
    } else {
      setWrong(n);
      setStreak(0);
      playSfx('snd-wrong');
      window.setTimeout(() => speak('Thử lại nhé!', LANG_SPEAK_DEFAULT), 100);
      window.setTimeout(() => setWrong((w) => (w === n ? null : w)), 500);
    }
  };

  const handleNext = () => {
    setChosen(null);
    setWrong(null);
    if (idx + 1 >= deck.length) {
      setPhase('finished');
    } else {
      setIdx((i) => i + 1);
    }
  };

  // ─── IDLE / WELCOME ─────────────────────────────────────────────────
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
          <div className="text-7xl mb-4 floating">🧸</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            Phép trừ vui
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Học phép trừ bằng hình ảnh: đồ vật bị ăn mất, bay đi hoặc biến mất.
          </p>

          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-purple-100 rounded-3xl p-5 mb-6">
            <div className="flex items-center justify-around mb-3">
              <span className="text-3xl">🍎🍎🍎🍎</span>
              <span className="text-2xl font-black text-purple-500">−</span>
              <span className="text-3xl">
                <span className="eaten inline-block">🍎</span>
                <span className="eaten inline-block">🍎</span>
              </span>
              <span className="text-2xl font-black text-purple-500">=</span>
              <span className="text-3xl">🍎🍎</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              4 trừ 2 bằng 2
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

  // ─── FINISHED ───────────────────────────────────────────────────────
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
      stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🧸';

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
          Bé đã giải xong {TOTAL_ROUNDS} câu phép trừ rồi!
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
          <div className="text-5xl font-black bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
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
            <div className="text-xl font-black text-purple-500">
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
            className="flex-1 py-4 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ────────────────────────────────────────────────────────
  if (!question) return null;
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
            Câu <span className="text-purple-500 text-base">{idx + 1}/{deck.length}</span>
          </span>
          <span className={`text-amber-500 text-base ${streakFlash ? 'combo-flash' : ''}`}>
            {streak > 0 ? `${streak}🔥` : ''}
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-fuchsia-400 via-purple-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Mascot + prompt */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          className={`text-4xl ${mascotCheer ? 'mascot-cheer' : 'floating'}`}
          aria-hidden
        >
          🧸
        </span>
        <button
          onClick={() => speak(`${question.a} trừ ${question.b} bằng mấy?`, LANG_SPEAK_DEFAULT)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-full font-black text-sm text-slate-700 active:scale-95 transition-all shadow-sm"
          aria-label="Nghe lại"
        >
          🔊 <span>{question.a} − {question.b} = ?</span>
        </button>
      </div>

      {/* Three cards: a, b (eaten), result */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1 md:gap-2 mb-5">
        <ObjectCard
          count={question.a}
          emoji={question.object.emoji}
          accent="from-sky-50 to-indigo-50 border-sky-200"
          badge="bg-sky-500"
        />
        <CenterGlyph glyph="−" color="text-purple-500" />
        <ObjectCard
          count={question.b}
          emoji={question.object.emoji}
          accent="from-rose-50 to-pink-50 border-rose-200"
          badge="bg-rose-500"
          eaten
        />
        <CenterGlyph glyph="=" color="text-purple-500" />
        <ObjectCard
          count={chosen !== null ? question.answer : 0}
          emoji={question.object.emoji}
          accent="from-emerald-50 to-teal-50 border-emerald-200"
          badge="bg-emerald-500"
          revealed={chosen !== null}
        />
      </div>

      {/* Answer options */}
      <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
        Chọn đáp án đúng
      </p>
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {question.options.map((n) => {
          const isWrong = wrong === n;
          const isPicked = chosen === n;
          const disabled = chosen !== null;
          return (
            <button
              key={n}
              onClick={() => handlePick(n)}
              disabled={disabled}
              className={`aspect-square rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 text-white font-black shadow-lg shadow-purple-200 active:scale-95 transition-all flex items-center justify-center disabled:opacity-60 ${
                isPicked ? 'ring-4 ring-offset-2 ring-emerald-300 glow-pulse' : ''
              } ${isWrong ? 'shake-x' : ''}`}
              style={{ fontSize: 'clamp(36px, 8vw, 56px)', touchAction: 'manipulation' }}
            >
              <span className="drop-shadow-md">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <div className="mt-5 h-14">
        {chosen !== null && (
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

// ─── Sub-components ────────────────────────────────────────────────────

type ObjectCardProps = {
  count: number;
  emoji: string;
  accent: string;
  badge: string;
  eaten?: boolean;
  revealed?: boolean;
};

function ObjectCard({ count, emoji, accent, badge, eaten, revealed }: ObjectCardProps) {
  const fontSize = useMemo(() => {
    if (count <= 4) return 36;
    if (count <= 8) return 28;
    if (count <= 12) return 22;
    if (count <= 16) return 18;
    return 16;
  }, [count]);

  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count]
  );

  // Render the question-mark slot when card 3 hasn't been revealed yet
  if (revealed === false) {
    return (
      <div className="relative min-h-[120px] md:min-h-[160px] rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
        <span className="text-slate-300 font-black" style={{ fontSize: 56 }}>
          ?
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-[120px] md:min-h-[160px] rounded-3xl border-2 bg-gradient-to-br ${accent} p-3 pt-5 flex items-center justify-center`}
    >
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 ${badge} text-white text-xs font-black px-3 py-0.5 rounded-full shadow-sm badge-pop`}
      >
        {count}
      </span>
      {count === 0 ? (
        <span className="text-3xl">✨</span>
      ) : (
        <div className="flex flex-wrap justify-center items-center gap-1">
          {items.map((i) => (
            <span
              key={i}
              className={`leading-none drop-in ${eaten ? 'eaten' : ''}`}
              style={{ fontSize, animationDelay: `${i * 0.04}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type CenterGlyphProps = {
  glyph: string;
  color: string;
};

function CenterGlyph({ glyph, color }: CenterGlyphProps) {
  return (
    <div className="flex items-center justify-center">
      <span
        className={`font-black ${color}`}
        style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}
      >
        {glyph}
      </span>
    </div>
  );
}
