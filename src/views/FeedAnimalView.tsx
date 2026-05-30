import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  buildRound,
  TOTAL_FEED_ROUNDS,
  type FeedRound,
  type Food,
} from '../data/feedAnimalData';
import { useGame } from '../context/GameContext';
import { playSfx, pronounce } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'finished';

type DragState = {
  foodId: string;
  pointerId: number;
  origin: { x: number; y: number };
  offset: { x: number; y: number };
  pos: { x: number; y: number };
};

type FloatingHeart = {
  id: number;
  left: number;
  delay: number;
  emoji: string;
};

const HEART_EMOJIS = ['❤️', '💖', '⭐', '✨', '🌟'];

const buildDeck = (count: number): FeedRound[] => {
  const out: FeedRound[] = [];
  let prevId: string | undefined;
  for (let i = 0; i < count; i++) {
    const r = buildRound(4, prevId);
    out.push(r);
    prevId = r.animal.id;
  }
  return out;
};

type FeedAnimalViewProps = {
  onBack: () => void;
};

export default function FeedAnimalView({ onBack }: FeedAnimalViewProps) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [deck, setDeck] = useState<FeedRound[]>(() => buildDeck(TOTAL_FEED_ROUNDS));
  const [roundIdx, setRoundIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hovering, setHovering] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [eatenFoodId, setEatenFoodId] = useState<string | null>(null);
  const heartIdRef = useRef(0);

  const round = deck[roundIdx];
  const animalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'playing' || !round) return;
    const t = window.setTimeout(() => {
      pronounce(`${round.animal.en} is hungry!`);
    }, 350);
    return () => window.clearTimeout(t);
  }, [phase, round]);

  const startGame = () => {
    setDeck(buildDeck(TOTAL_FEED_ROUNDS));
    setRoundIdx(0);
    setCorrectCount(0);
    setSolved(false);
    setWrongId(null);
    setDrag(null);
    setHovering(false);
    setHearts([]);
    setEatenFoodId(null);
    setPhase('playing');
  };

  const isOverAnimal = (x: number, y: number): boolean => {
    const el = animalRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const burstHearts = () => {
    const base = heartIdRef.current;
    const next: FloatingHeart[] = Array.from({ length: 6 }, (_, i) => ({
      id: base + i,
      left: 20 + Math.random() * 60,
      delay: Math.random() * 0.3,
      emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
    }));
    heartIdRef.current = base + next.length;
    setHearts((arr) => [...arr, ...next]);
    window.setTimeout(() => {
      const ids = new Set(next.map((h) => h.id));
      setHearts((arr) => arr.filter((h) => !ids.has(h.id)));
    }, 1600);
  };

  const handleCorrect = (food: Food) => {
    if (!round) return;
    setSolved(true);
    setEatenFoodId(food.id);
    playSfx('snd-correct');
    addScore(15);
    setCorrectCount((c) => c + 1);
    burstHearts();
    confetti({
      particleCount: 80,
      spread: 80,
      startVelocity: 32,
      origin: { y: 0.4 },
      colors: ['#fb7185', '#f472b6', '#fbbf24', '#34d399', '#60a5fa'],
    });
    window.setTimeout(() => pronounce(food.en), 350);
    window.setTimeout(() => pronounce('Yummy!'), 950);

    window.setTimeout(() => {
      if (roundIdx + 1 < deck.length) {
        setRoundIdx(roundIdx + 1);
        setSolved(false);
        setEatenFoodId(null);
      } else {
        setPhase('finished');
      }
    }, 1700);
  };

  const handleWrong = (foodId: string) => {
    playSfx('snd-wrong');
    setWrongId(foodId);
    window.setTimeout(() => setWrongId((id) => (id === foodId ? null : id)), 500);
  };

  const onTilePointerDown = (e: React.PointerEvent<HTMLButtonElement>, food: Food) => {
    if (solved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      foodId: food.id,
      pointerId: e.pointerId,
      origin: { x: rect.left, y: rect.top },
      offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      pos: { x: e.clientX, y: e.clientY },
    });
    setHovering(isOverAnimal(e.clientX, e.clientY));
  };

  const onTilePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDrag({ ...drag, pos: { x: e.clientX, y: e.clientY } });
    setHovering(isOverAnimal(e.clientX, e.clientY));
  };

  const onTilePointerUp = (e: React.PointerEvent<HTMLButtonElement>, food: Food) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dropped = isOverAnimal(e.clientX, e.clientY);
    setDrag(null);
    setHovering(false);
    if (!dropped) return;
    if (!round) return;
    if (food.id === round.correct.id) {
      handleCorrect(food);
    } else {
      handleWrong(food.id);
    }
  };

  const onTilePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDrag(null);
    setHovering(false);
  };

  const tileTransform = (food: Food): string | undefined => {
    if (!drag || drag.foodId !== food.id) return undefined;
    const targetX = drag.pos.x - drag.offset.x;
    const targetY = drag.pos.y - drag.offset.y;
    const dx = targetX - drag.origin.x;
    const dy = targetY - drag.origin.y;
    return `translate3d(${dx}px, ${dy}px, 0) scale(1.15) rotate(-6deg)`;
  };

  useEffect(() => {
    if (phase !== 'finished') return;
    if (correctCount >= TOTAL_FEED_ROUNDS * 0.7) {
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#fb7185', '#f472b6', '#fbbf24', '#34d399', '#a78bfa'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─── IDLE ────────────────────────────────────────────────────────────
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
          <div className="text-7xl mb-4 floating">🐰</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">
            Cho thú ăn
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-8">
            Kéo món ăn đúng vào con vật đang đói. Bạn sẽ học được tên các con vật và món ăn yêu thích của chúng!
          </p>
          <div className="bg-gradient-to-br from-amber-50 via-pink-50 to-rose-50 border-2 border-pink-100 rounded-3xl p-5 mb-6">
            <div className="flex justify-center gap-2 text-3xl mb-3">
              🐰 🐵 🐼 🐱 🐘 🐻
            </div>
            <p className="text-xs text-slate-500 font-bold">
              {TOTAL_FEED_ROUNDS} con vật đang đói chờ bạn đút mồi!
            </p>
          </div>
          <button
            onClick={startGame}
            className="w-full p-5 bg-gradient-to-br from-amber-400 via-pink-500 to-rose-500 text-white rounded-3xl shadow-lg shadow-pink-200 active:scale-95 transition-all font-black text-lg"
          >
            🍴 Bắt đầu cho ăn
          </button>
        </div>
      </div>
    );
  }

  // ─── FINISHED ────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const stars =
      correctCount >= TOTAL_FEED_ROUNDS
        ? 3
        : correctCount >= TOTAL_FEED_ROUNDS * 0.7
          ? 2
          : correctCount >= TOTAL_FEED_ROUNDS * 0.4
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
    const emoji = stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🐾';
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{emoji}</div>
        <h2 className="text-3xl font-black mb-3">{label}</h2>
        <p className="text-slate-500 mb-4 text-sm">
          Các bạn thú đã ăn no và rất hạnh phúc! 🥰
        </p>
        <div className="flex justify-center gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`text-3xl ${s <= stars ? '' : 'grayscale opacity-20'}`}
            >
              ⭐
            </span>
          ))}
        </div>
        <div className="bg-slate-50 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{TOTAL_FEED_ROUNDS}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Lần đút đúng
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
            onClick={startGame}
            className="flex-1 py-4 bg-gradient-to-r from-amber-500 via-pink-500 to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────
  if (!round) return null;
  return (
    <div className="animate-in fade-in duration-300 select-none max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="font-bold text-rose-500">
          {roundIdx + 1}/{deck.length}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-rose-500 transition-all duration-300"
          style={{ width: `${((roundIdx + 1) / deck.length) * 100}%` }}
        />
      </div>

      <div
        ref={animalRef}
        className={`relative rounded-3xl border-2 transition-all duration-200 mb-3 flex items-center justify-center overflow-hidden ${
          solved
            ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 via-amber-50 to-rose-50'
            : hovering
              ? 'border-rose-400 scale-[1.02] shadow-lg shadow-rose-100 bg-gradient-to-br from-amber-50 via-pink-50 to-rose-50'
              : 'border-slate-200 bg-gradient-to-br from-amber-50 via-pink-50 to-rose-50'
        }`}
        style={{ height: 220 }}
      >
        <div
          className={`leading-none transition-transform duration-300 ${
            solved ? round.animal.reactionClass : 'animal-hungry'
          }`}
          style={{ fontSize: 130 }}
        >
          {round.animal.emoji}
        </div>
        {!solved && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm">
            <span className="font-black text-slate-700 text-sm">{round.animal.en}</span>
            <span className="text-slate-400 text-[10px] font-bold ml-1">
              ({round.animal.vi})
            </span>
          </div>
        )}
        {!solved && (
          <button
            type="button"
            onClick={() => pronounce(`${round.animal.en} is hungry!`)}
            aria-label="Phát âm"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-slate-200 flex items-center justify-center active:scale-95 shadow-sm"
          >
            🔊
          </button>
        )}
        {!solved && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-slate-500 bg-white/80 backdrop-blur px-3 py-1 rounded-full whitespace-nowrap">
            💭 “I'm hungry!”
          </div>
        )}
        {solved && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm font-black text-emerald-600 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-sm">
            😋 Yummy!
          </div>
        )}

        {hearts.map((h) => (
          <span
            key={h.id}
            className="absolute text-2xl pointer-events-none heart-float"
            style={{
              left: `${h.left}%`,
              bottom: '20%',
              animationDelay: `${h.delay}s`,
            }}
          >
            {h.emoji}
          </span>
        ))}
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-3">
        Kéo món ăn đúng vào con vật 👆
      </p>

      <div className="grid grid-cols-2 gap-3">
        {round.options.map((f) => {
          const isDragging = drag?.foodId === f.id;
          const isWrong = wrongId === f.id;
          const isEaten = eatenFoodId === f.id;
          return (
            <div key={f.id} style={{ height: 110 }}>
              <button
                type="button"
                disabled={solved || isEaten}
                onPointerDown={(e) => onTilePointerDown(e, f)}
                onPointerMove={onTilePointerMove}
                onPointerUp={(e) => onTilePointerUp(e, f)}
                onPointerCancel={onTilePointerCancel}
                className={`w-full h-full bg-white border-2 rounded-2xl flex flex-col items-center justify-center gap-1 disabled:opacity-30 ${
                  isWrong
                    ? 'shake-x border-red-300 bg-red-50'
                    : isDragging
                      ? 'shadow-2xl border-rose-300'
                      : 'border-slate-100 shadow-sm'
                } ${!isDragging && !solved ? 'food-wiggle' : ''}`}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  transform: tileTransform(f),
                  transition: isDragging ? 'none' : 'transform 0.25s ease',
                  zIndex: isDragging ? 50 : 'auto',
                  position: 'relative',
                  cursor: solved ? 'default' : 'grab',
                }}
              >
                <span style={{ fontSize: 40, lineHeight: 1 }}>{f.emoji}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {f.en}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
