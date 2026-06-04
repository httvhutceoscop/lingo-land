import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CAUVONG_LEVELS,
  generateCauVongPool,
  isCauVongLevelUnlocked,
  type CauVongLevel,
} from '../data/cauVongSoData';
import { BLOCK_STYLES, type BlockValue } from '../data/khoiSoData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Phase = 'idle' | 'playing' | 'finished';

const STORAGE_KEY = 'lingoland_cauvongso_passed';

const loadPassed = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => typeof x === 'string'));
  } catch {
    return new Set();
  }
};

const savePassed = (set: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
};

// Cấu hình size theo maxN — Lv 2 cần slot hẹp hơn để 10 ô vừa màn hình.
const sizeFor = (maxN: number) => {
  if (maxN <= 5) return { slotW: 50, gap: 4, unit: 32, fontMain: 22, fontPool: 24 };
  return { slotW: 30, gap: 2, unit: 20, fontMain: 14, fontPool: 18 };
};

type CauVongSoViewProps = {
  onBack: () => void;
};

export default function CauVongSoView({ onBack }: CauVongSoViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeLevel, setActiveLevel] = useState<CauVongLevel | null>(null);
  const [pool, setPool] = useState<number[]>([]);
  const [targetN, setTargetN] = useState(1);
  const [placed, setPlaced] = useState<Set<number>>(new Set());
  const [shaking, setShaking] = useState<number | null>(null);
  const [wrongInRound, setWrongInRound] = useState(0);
  const [hintReveal, setHintReveal] = useState(false);
  const [solved, setSolved] = useState(false);
  const [passedSet, setPassedSet] = useState<Set<string>>(() => loadPassed());
  const inactiveRef = useRef<number | null>(null);

  // Voice "Tìm số N" mỗi lần đổi target.
  useEffect(() => {
    if (phase !== 'playing' || !activeLevel || solved) return;
    const t = window.setTimeout(() => {
      speak(`Tìm số ${targetN}`, LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, [phase, targetN, activeLevel, solved]);

  // Inactive 10s.
  useEffect(() => {
    if (phase !== 'playing' || solved) return;
    if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    inactiveRef.current = window.setTimeout(() => {
      speak(`Tìm số ${targetN}`, LANG_SPEAK_DEFAULT);
    }, 10000);
    return () => {
      if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    };
  }, [phase, targetN, solved, wrongInRound]);

  const startLevel = (level: CauVongLevel) => {
    setActiveLevel(level);
    setPool(generateCauVongPool(level));
    setTargetN(1);
    setPlaced(new Set());
    setWrongInRound(0);
    setShaking(null);
    setHintReveal(false);
    setSolved(false);
    setPhase('playing');
  };

  const tapNumber = (n: number) => {
    if (!activeLevel || solved) return;
    if (placed.has(n)) return;

    if (n === targetN) {
      // ── ĐÚNG ──
      playSfx('snd-correct');
      playTing();
      playPop();

      // Đặt block vào slot.
      const next = new Set(placed);
      next.add(n);
      setPlaced(next);

      // Confetti nhỏ mỗi lần đúng.
      confetti({
        particleCount: 30,
        spread: 50,
        startVelocity: 22,
        origin: { y: 0.5 },
        colors: ['#ef4444', '#f97316', '#facc15', '#10b981', '#0ea5e9', '#6366f1', '#a855f7'],
      });

      if (n >= activeLevel.maxN) {
        // Hoàn thành toàn bộ cầu thang.
        setSolved(true);
        const newSet = new Set(passedSet);
        newSet.add(activeLevel.id);
        setPassedSet(newSet);
        savePassed(newSet);

        // Confetti to.
        confetti({
          particleCount: 220,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#ef4444', '#f97316', '#facc15', '#10b981', '#0ea5e9', '#6366f1', '#a855f7'],
        });

        window.setTimeout(() => {
          speak('Cầu vồng hoàn thành! Tuyệt vời!', LANG_SPEAK_DEFAULT);
        }, 400);

        window.setTimeout(() => setPhase('finished'), 2400);
      } else {
        setTargetN(n + 1);
        setWrongInRound(0);
        setHintReveal(false);
      }
    } else {
      // ── SAI ──
      playSfx('snd-wrong');
      playBip();
      setShaking(n);
      window.setTimeout(() => {
        setShaking((s) => (s === n ? null : s));
      }, 500);

      const w = wrongInRound + 1;
      setWrongInRound(w);
      if (w >= 3) setHintReveal(true);

      window.setTimeout(() => {
        speak(`Mình cần số ${targetN}`, LANG_SPEAK_DEFAULT);
      }, 700);
    }
  };

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
        <div className="text-center py-3 max-w-md mx-auto">
          {/* Hero cầu thang 1-5 mini */}
          <div className="flex justify-center items-end gap-1 mb-4 h-32">
            {[1, 2, 3, 4, 5].map((v) => {
              const s = BLOCK_STYLES[v as BlockValue];
              return (
                <div
                  key={v}
                  className={`${s.bg} ${s.text} ${s.border} border-2 flex items-center justify-center font-black floating`}
                  style={{
                    width: 32,
                    height: v * 24,
                    borderRadius: 4,
                    fontSize: 14,
                    animationDelay: `${v * 0.1}s`,
                  }}
                >
                  {v}
                </div>
              );
            })}
          </div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-red-500 via-yellow-500 via-emerald-500 via-sky-500 to-purple-500 bg-clip-text text-transparent">
            Cầu Vồng Số
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Bé xếp số theo thứ tự để xây cầu thang cầu vồng — càng cao càng đẹp!
          </p>

          <div className="space-y-3 text-left">
            {CAUVONG_LEVELS.map((l) => {
              const passed = passedSet.has(l.id);
              const unlocked = isCauVongLevelUnlocked(l.id, passedSet);
              return (
                <button
                  key={l.id}
                  onClick={() => unlocked && startLevel(l)}
                  disabled={!unlocked}
                  className={`relative w-full p-4 rounded-3xl shadow-lg transition-all flex items-center gap-4 ${
                    !unlocked
                      ? 'bg-slate-100 border-2 border-slate-200 opacity-60 cursor-not-allowed'
                      : passed
                        ? 'bg-gradient-to-br from-red-100 via-yellow-100 via-emerald-100 to-purple-100 border-2 border-emerald-300 active:scale-95'
                        : 'bg-gradient-to-br from-red-50 via-yellow-50 via-emerald-50 to-purple-50 border-2 border-emerald-200 active:scale-95'
                  }`}
                >
                  <div className="text-5xl">{unlocked ? l.emoji : '🔒'}</div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 text-base leading-tight">
                      {l.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                      {unlocked ? l.desc : 'Hoàn thành level trước để mở khoá'}
                    </div>
                  </div>
                  {passed ? (
                    <span className="text-2xl">🌈</span>
                  ) : unlocked ? (
                    <span className="text-emerald-500 text-xl">▶️</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── FINISHED ────────────────────────────────────────────────────────
  if (phase === 'finished' && activeLevel) {
    const { slotW, gap, unit, fontMain } = sizeFor(activeLevel.maxN);
    return (
      <div className="text-center py-6 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-6xl mb-3 floating">🌈</div>
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-red-500 via-yellow-500 via-emerald-500 to-purple-500 bg-clip-text text-transparent">
          Cầu vồng xong!
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-1">Bé đã xây xong</p>
        <p className="text-xl font-black text-slate-800 mb-5">{activeLevel.name}</p>

        {/* Hiển thị cầu thang hoàn chỉnh. */}
        <div
          className="flex justify-center items-end mb-6 bg-gradient-to-b from-sky-50 to-yellow-50 rounded-2xl p-3 border-2 border-amber-200"
          style={{ gap }}
        >
          {Array.from({ length: activeLevel.maxN }, (_, i) => i + 1).map((v) => {
            const s = BLOCK_STYLES[v as BlockValue];
            return (
              <div
                key={v}
                className={`${s.bg} ${s.text} ${s.border} border-2 flex items-center justify-center font-black animate-in zoom-in`}
                style={{
                  width: slotW,
                  height: v * unit,
                  borderRadius: 4,
                  fontSize: fontMain,
                  animationDelay: `${v * 60}ms`,
                }}
              >
                {v}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setActiveLevel(null);
              setPhase('idle');
            }}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            🏠 Quay lại
          </button>
          <button
            onClick={() => startLevel(activeLevel)}
            className="flex-1 py-4 bg-gradient-to-r from-red-500 via-emerald-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────
  if (!activeLevel) return null;

  const { slotW, gap, unit, fontMain, fontPool } = sizeFor(activeLevel.maxN);
  const placedCount = placed.size;
  const totalSlots = activeLevel.maxN;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={() => {
            setActiveLevel(null);
            setPhase('idle');
          }}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="font-bold text-emerald-600 text-sm flex items-center gap-1">
          {activeLevel.emoji} {activeLevel.name}
        </span>
        <span className="font-bold text-purple-500 text-sm">
          {placedCount}/{totalSlots}
        </span>
      </div>

      {/* Indicator tìm số */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-100 via-yellow-100 to-emerald-100 rounded-full border-2 border-amber-300 shadow-sm">
          <span className="text-2xl">🌈</span>
          <span className="font-black text-slate-700 text-sm">Tìm số</span>
          <span className="text-3xl font-black text-purple-600">{targetN}</span>
        </div>
      </div>

      {/* Cầu thang frame */}
      <div
        className="flex justify-center items-end mb-5 bg-gradient-to-b from-sky-50 via-yellow-50 to-emerald-50 rounded-3xl p-3 border-2 border-amber-200"
        style={{ gap, minHeight: totalSlots * unit + 24 }}
      >
        {Array.from({ length: totalSlots }, (_, i) => i + 1).map((v) => {
          const isPlaced = placed.has(v);
          const slotH = v * unit;
          if (isPlaced) {
            const s = BLOCK_STYLES[v as BlockValue];
            return (
              <div
                key={v}
                className={`${s.bg} ${s.text} ${s.border} border-2 flex items-center justify-center font-black animate-in zoom-in`}
                style={{
                  width: slotW,
                  height: slotH,
                  borderRadius: 4,
                  fontSize: fontMain,
                }}
              >
                {v}
              </div>
            );
          }
          return (
            <div
              key={v}
              className="border-2 border-dashed border-slate-300 bg-white/40 rounded-md"
              style={{ width: slotW, height: slotH }}
            />
          );
        })}
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-3">
        👆 Chạm số {targetN} bên dưới
      </p>

      {/* Pool numbers — placed thì disabled */}
      <div
        className={`grid gap-2 ${
          totalSlots <= 5 ? 'grid-cols-5' : 'grid-cols-5'
        }`}
      >
        {pool.map((n) => {
          const isPlaced = placed.has(n);
          const isShaking = shaking === n;
          const showHint = hintReveal && n === targetN && !isPlaced;
          return (
            <button
              key={n}
              type="button"
              disabled={isPlaced || solved}
              onClick={() => tapNumber(n)}
              className={`aspect-square bg-white border-2 rounded-xl flex items-center justify-center font-black active:scale-95 transition-all ${
                isShaking
                  ? 'shake-x border-red-300 bg-red-50'
                  : isPlaced
                    ? 'border-slate-100 opacity-30 grayscale'
                    : showHint
                      ? 'border-amber-400 bg-amber-50 animate-pulse ring-2 ring-amber-200'
                      : 'border-emerald-200 shadow-sm hover:border-emerald-300'
              }`}
              style={{ touchAction: 'manipulation', fontSize: fontPool }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
