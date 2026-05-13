import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';
type Level = 'easy' | 'medium';
type Symbol = '<' | '=' | '>';

type CompareObject = {
  id: string;
  emoji: string;
  vi: string;
};

type Question = {
  object: CompareObject;
  left: number;
  right: number;
  answer: Symbol;
};

const OBJECTS: CompareObject[] = [
  { id: 'apple', emoji: '🍎', vi: 'táo' },
  { id: 'orange', emoji: '🍊', vi: 'cam' },
  { id: 'pear', emoji: '🍐', vi: 'lê' },
  { id: 'banana', emoji: '🍌', vi: 'chuối' },
  { id: 'strawberry', emoji: '🍓', vi: 'dâu' },
  { id: 'candy', emoji: '🍬', vi: 'kẹo' },
  { id: 'star', emoji: '⭐', vi: 'sao' },
  { id: 'balloon', emoji: '🎈', vi: 'bóng bay' },
];

const TOTAL_ROUNDS = 10;
const SYMBOLS: Symbol[] = ['<', '=', '>'];

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function compareSymbol(a: number, b: number): Symbol {
  if (a < b) return '<';
  if (a > b) return '>';
  return '=';
}

function buildQuestion(level: Level, prevObjectId?: string): Question {
  const maxCount = level === 'easy' ? 3 : 5;

  // Avoid repeating the same fruit twice in a row
  let object = pick(OBJECTS);
  if (prevObjectId) {
    let safety = 0;
    while (object.id === prevObjectId && safety < 5) {
      object = pick(OBJECTS);
      safety++;
    }
  }

  // Encourage variety of answers: roughly 1-in-3 chance of equal, rest unequal
  const wantEqual = Math.random() < 0.33;
  let left: number;
  let right: number;
  if (wantEqual) {
    left = randInt(1, maxCount);
    right = left;
  } else {
    left = randInt(1, maxCount);
    right = randInt(1, maxCount);
    // If they happen to be equal but we wanted unequal, nudge right
    if (left === right) {
      right = right < maxCount ? right + 1 : right - 1;
    }
  }

  return {
    object,
    left,
    right,
    answer: compareSymbol(left, right),
  };
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

// Visual styling per symbol — bright colors that feel different at a glance
const SYMBOL_STYLE: Record<Symbol, { bg: string; ring: string; label: string }> = {
  '<': {
    bg: 'from-sky-400 to-blue-500',
    ring: 'ring-sky-300',
    label: 'Nhỏ hơn',
  },
  '=': {
    bg: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-300',
    label: 'Bằng',
  },
  '>': {
    bg: 'from-fuchsia-400 to-pink-500',
    ring: 'ring-pink-300',
    label: 'Lớn hơn',
  },
};

type CompareViewProps = {
  onBack: () => void;
};

export default function CompareView({ onBack }: CompareViewProps) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState<Level>('easy');
  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [chosen, setChosen] = useState<Symbol | null>(null);
  const [wrongSymbol, setWrongSymbol] = useState<Symbol | null>(null);
  const [mascotCheer, setMascotCheer] = useState(false);

  const question = deck[idx];

  // Announce prompt at the start of each round
  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    const t = window.setTimeout(() => {
      speak('Hãy chọn dấu đúng', 'vi-VN');
    }, 300);
    return () => window.clearTimeout(t);
  }, [phase, idx]);

  // Final celebration
  useEffect(() => {
    if (phase !== 'finished') return;
    if (correctCount >= TOTAL_ROUNDS * 0.7) {
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#38bdf8', '#fbbf24', '#ec4899', '#a78bfa', '#34d399'],
      });
      window.setTimeout(() => speak('Chúc mừng bé!', 'vi-VN'), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startGame = (lv: Level) => {
    setLevel(lv);
    setDeck(buildDeck(lv));
    setIdx(0);
    setCorrectCount(0);
    setChosen(null);
    setWrongSymbol(null);
    setPhase('playing');
  };

  const replay = () => startGame(level);

  const handlePick = (sym: Symbol) => {
    if (!question || chosen) return;
    if (sym === question.answer) {
      setChosen(sym);
      setCorrectCount((c) => c + 1);
      setMascotCheer(true);
      playSfx('snd-correct');
      addScore(10);
      confetti({
        particleCount: 70,
        spread: 70,
        startVelocity: 28,
        origin: { y: 0.45 },
        colors: ['#38bdf8', '#fbbf24', '#ec4899', '#a78bfa'],
      });
      window.setTimeout(() => speak('Chính xác!', 'vi-VN'), 200);
      window.setTimeout(() => setMascotCheer(false), 800);
    } else {
      setWrongSymbol(sym);
      playSfx('snd-wrong');
      window.setTimeout(() => speak('Thử lại nhé!', 'vi-VN'), 100);
      window.setTimeout(
        () => setWrongSymbol((s) => (s === sym ? null : s)),
        500
      );
    }
  };

  const handleNext = () => {
    setChosen(null);
    setWrongSymbol(null);
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
          <div className="text-7xl mb-4 floating">🦊</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-sky-500 via-amber-500 to-pink-500 bg-clip-text text-transparent">
            So sánh số lượng
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
            Bé hãy chọn dấu đúng: nhỏ hơn{' '}
            <span className="font-black text-sky-500">{'<'}</span>, lớn hơn{' '}
            <span className="font-black text-pink-500">{'>'}</span> hoặc bằng{' '}
            <span className="font-black text-amber-500">{'='}</span>.
          </p>

          <div className="bg-gradient-to-br from-sky-50 via-amber-50 to-pink-50 border-2 border-amber-100 rounded-3xl p-5 mb-6">
            <div className="flex items-center justify-around text-3xl mb-2">
              <span>🍎</span>
              <span className="text-2xl font-black text-sky-500">{'<'}</span>
              <span>
                🍎🍎
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Ví dụ: 1 ít hơn 2
            </p>
          </div>

          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Chọn cấp độ
          </p>
          <div className="space-y-3">
            <button
              onClick={() => startGame('easy')}
              className="w-full p-5 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-3xl shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center gap-4 text-left"
            >
              <div className="text-4xl">🌱</div>
              <div className="flex-1">
                <div className="font-black text-lg leading-tight">Dễ</div>
                <div className="text-xs opacity-90 font-bold mt-0.5">
                  Số lượng từ 1 đến 3
                </div>
              </div>
              <span className="text-xl">▶️</span>
            </button>
            <button
              onClick={() => startGame('medium')}
              className="w-full p-5 bg-gradient-to-br from-violet-400 to-purple-600 text-white rounded-3xl shadow-lg shadow-violet-200 active:scale-95 transition-all flex items-center gap-4 text-left"
            >
              <div className="text-4xl">🌟</div>
              <div className="flex-1">
                <div className="font-black text-lg leading-tight">Vừa</div>
                <div className="text-xs opacity-90 font-bold mt-0.5">
                  Số lượng từ 1 đến 5
                </div>
              </div>
              <span className="text-xl">▶️</span>
            </button>
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
      stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🦊';

    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{emoji}</div>
        <h2 className="text-3xl font-black mb-3">{label}</h2>
        <p className="text-slate-500 text-sm mb-4">
          Bé đã so sánh xong {TOTAL_ROUNDS} câu rồi đấy!
        </p>
        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`text-3xl pop-in ${s <= stars ? '' : 'grayscale opacity-20'}`}
              style={{ animationDelay: `${s * 0.15}s` }}
            >
              ⭐
            </span>
          ))}
        </div>
        <div className="bg-slate-50 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-sky-500 via-amber-500 to-pink-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{TOTAL_ROUNDS}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Số câu đúng
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
            className="flex-1 py-4 bg-gradient-to-r from-sky-500 via-amber-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
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
    <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Đúng
          <span className="text-emerald-500 text-base ml-1">{correctCount}</span>
          <span className="text-slate-300"> / </span>
          <span className="text-slate-500">{idx + 1}/{deck.length}</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-pink-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Mascot prompt */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          className={`text-4xl ${mascotCheer ? 'mascot-cheer' : 'floating'}`}
          aria-hidden
        >
          🦊
        </span>
        <button
          onClick={() => speak('Hãy chọn dấu đúng', 'vi-VN')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-full font-black text-sm text-slate-700 active:scale-95 transition-all shadow-sm"
          aria-label="Nghe lại"
        >
          🔊 <span>Chọn dấu đúng</span>
        </button>
      </div>

      {/* Comparison row: left | middle slot | right */}
      <ObjectsCompareRow
        left={question.left}
        right={question.right}
        emoji={question.object.emoji}
        chosen={chosen}
      />

      <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-3 mb-4">
        {question.object.vi} • bên trái và bên phải
      </p>

      {/* Symbol picker */}
      <div className="grid grid-cols-3 gap-3">
        {SYMBOLS.map((sym) => {
          const isWrong = wrongSymbol === sym;
          const isPicked = chosen === sym;
          const disabled = chosen !== null;
          const style = SYMBOL_STYLE[sym];
          return (
            <button
              key={sym}
              onClick={() => handlePick(sym)}
              disabled={disabled}
              className={`relative aspect-square rounded-3xl bg-gradient-to-br ${style.bg} text-white shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center disabled:opacity-60 ${
                isPicked ? 'ring-4 ring-offset-2 ' + style.ring + ' glow-pulse' : ''
              } ${isWrong ? 'shake-x' : ''}`}
              style={{ touchAction: 'manipulation' }}
              aria-label={style.label}
            >
              <span className="font-black leading-none drop-shadow-md" style={{ fontSize: 56 }}>
                {sym}
              </span>
              <span className="absolute bottom-2 text-[10px] font-black uppercase tracking-widest opacity-90">
                {style.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Next button — only after a correct pick */}
      <div className="mt-5 h-14">
        {chosen && (
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

type ObjectsCompareRowProps = {
  left: number;
  right: number;
  emoji: string;
  chosen: Symbol | null;
};

function ObjectsCompareRow({ left, right, emoji, chosen }: ObjectsCompareRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
      <ObjectGroup count={left} emoji={emoji} accent="from-sky-50 to-blue-50 border-sky-100" />
      <CenterSlot chosen={chosen} />
      <ObjectGroup count={right} emoji={emoji} accent="from-pink-50 to-fuchsia-50 border-pink-100" />
    </div>
  );
}

type ObjectGroupProps = {
  count: number;
  emoji: string;
  accent: string;
};

function ObjectGroup({ count, emoji, accent }: ObjectGroupProps) {
  // Layout heuristic: 1-3 single column, 4-5 two columns
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count]
  );
  const twoCol = count >= 4;

  return (
    <div
      className={`min-h-[180px] rounded-3xl border-2 bg-gradient-to-br ${accent} p-3 flex items-center justify-center`}
    >
      <div
        className={`grid gap-1 place-items-center ${twoCol ? 'grid-cols-2' : 'grid-cols-1'}`}
      >
        {items.map((i) => (
          <span
            key={i}
            className="pop-in leading-none"
            style={{
              fontSize: twoCol ? 36 : 48,
              animationDelay: `${i * 0.05}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

type CenterSlotProps = {
  chosen: Symbol | null;
};

function CenterSlot({ chosen }: CenterSlotProps) {
  const tint = chosen ? SYMBOL_STYLE[chosen] : null;
  return (
    <div
      className={`min-w-[68px] md:min-w-[88px] rounded-3xl border-2 border-dashed flex items-center justify-center transition-colors ${
        chosen ? 'border-transparent bg-white shadow-inner' : 'border-slate-300 bg-slate-50'
      }`}
    >
      {chosen ? (
        <span
          key={chosen}
          className={`slot-drop font-black bg-gradient-to-br ${tint!.bg} bg-clip-text text-transparent`}
          style={{ fontSize: 64, lineHeight: 1 }}
        >
          {chosen}
        </span>
      ) : (
        <span className="text-slate-300 font-black" style={{ fontSize: 48 }}>
          ?
        </span>
      )}
    </div>
  );
}
