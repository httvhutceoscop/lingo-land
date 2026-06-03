import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  BEKHOI_LEVELS,
  BEKHOI_PASS_THRESHOLD,
  QUESTIONS_PER_BEKHOI_LEVEL,
  generateBeKhoiDeck,
  isBeKhoiLevelUnlocked,
  type BeKhoiLevel,
  type BeKhoiQuestion,
} from '../data/beKhoiData';
import { BLOCK_STYLES, type BlockValue } from '../data/khoiSoData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip } from '../lib/beep';

type Phase = 'idle' | 'playing' | 'finished';

const STORAGE_KEY = 'lingoland_bekhoi_passed';

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

const UNIT_HEIGHT = 28;
const BLOCK_WIDTH = 56;

// Render 1 khối có value → cùng pattern với Cộng Khối (chung BLOCK_STYLES).
function Block({ value, fontSize = 22 }: { value: BlockValue; fontSize?: number }) {
  const style = BLOCK_STYLES[value];
  return (
    <div
      className={`${style.bg} ${style.text} ${style.border} border-2 flex items-center justify-center font-black`}
      style={{
        width: BLOCK_WIDTH,
        height: value * UNIT_HEIGHT,
        fontSize,
        borderRadius: 6,
      }}
    >
      {value}
    </div>
  );
}

// Render tháp đã BẺ — phần top (K) bay đi, phần bottom (N-K) ở lại.
// Animation: 2 segment stacked, segment trên fade-out với translateY.
function SplitStack({ n, k, correct }: { n: number; k: number; correct: number }) {
  return (
    <div className="flex flex-col items-center">
      {/* Top: phần bị bẻ đi (K) — fade-out + bay lên */}
      <div
        className="opacity-0 -translate-y-4 transition-all duration-700"
        style={{
          animation: 'splitFlyAway 700ms ease-out forwards',
        }}
      >
        <Block value={k as BlockValue} fontSize={16} />
      </div>
      {/* Bottom: phần còn lại (N-K) — đứng yên với glow */}
      <div className="ring-4 ring-emerald-300 ring-offset-2 ring-offset-amber-50 rounded-lg">
        <Block value={correct as BlockValue} />
      </div>
      <div className="mt-2 px-4 py-1 rounded-full bg-white border-2 border-emerald-300 text-emerald-600 font-black text-2xl shadow-sm">
        = {correct}
      </div>
      {/* Keyframe inline — tách K block bay lên rồi mờ đi */}
      <style>{`
        @keyframes splitFlyAway {
          0% { opacity: 1; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-8px); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
      `}</style>
      {/* Spacer giữ chỗ cho K (vì K chạy animation tách rời, layout không co lại) */}
      <div style={{ display: 'none' }} aria-hidden>
        N={n}, K={k}
      </div>
    </div>
  );
}

type BeKhoiViewProps = {
  onBack: () => void;
};

export default function BeKhoiView({ onBack }: BeKhoiViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeLevel, setActiveLevel] = useState<BeKhoiLevel | null>(null);
  const [deck, setDeck] = useState<BeKhoiQuestion[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongInRound, setWrongInRound] = useState(0);
  const [shakingOption, setShakingOption] = useState<number | null>(null);
  const [dimmedOption, setDimmedOption] = useState<number | null>(null);
  const [hintReveal, setHintReveal] = useState(false);
  const [solved, setSolved] = useState(false);
  const [passedSet, setPassedSet] = useState<Set<string>>(() => loadPassed());
  const inactiveRef = useRef<number | null>(null);

  const q = deck[questionIdx] ?? null;

  // Đọc câu hỏi khi câu mới.
  useEffect(() => {
    if (phase !== 'playing' || !q) return;
    const t = window.setTimeout(() => {
      speak(`${q.n} trừ ${q.k} bằng mấy?`, LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, [phase, q]);

  // Inactive 10s.
  useEffect(() => {
    if (phase !== 'playing' || !q || solved) return;
    if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    inactiveRef.current = window.setTimeout(() => {
      if (q) speak(`${q.n} trừ ${q.k} bằng mấy?`, LANG_SPEAK_DEFAULT);
    }, 10000);
    return () => {
      if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    };
  }, [phase, q, solved, wrongInRound]);

  const startLevel = (level: BeKhoiLevel) => {
    setActiveLevel(level);
    setDeck(generateBeKhoiDeck(level));
    setQuestionIdx(0);
    setCorrectCount(0);
    setWrongInRound(0);
    setShakingOption(null);
    setDimmedOption(null);
    setHintReveal(false);
    setSolved(false);
    setPhase('playing');
  };

  const advanceQuestion = (earnedFully: boolean) => {
    if (!activeLevel) return;
    if (questionIdx + 1 < deck.length) {
      setQuestionIdx(questionIdx + 1);
      setWrongInRound(0);
      setShakingOption(null);
      setDimmedOption(null);
      setHintReveal(false);
      setSolved(false);
    } else {
      const finalCorrect = correctCount + (earnedFully ? 1 : 0);
      if (finalCorrect >= BEKHOI_PASS_THRESHOLD) {
        const newSet = new Set(passedSet);
        newSet.add(activeLevel.id);
        setPassedSet(newSet);
        savePassed(newSet);
      }
      setPhase('finished');
    }
  };

  const tapOption = (n: number) => {
    if (!q || solved) return;
    if (dimmedOption === n) return;

    if (n === q.correct) {
      playSfx('snd-correct');
      playTing();
      setSolved(true);

      const earnedFully = !hintReveal;
      if (earnedFully) setCorrectCount((c) => c + 1);

      confetti({
        particleCount: 70,
        spread: 80,
        startVelocity: 30,
        origin: { y: 0.4 },
        colors: ['#ef4444', '#f97316', '#facc15', '#10b981', '#0ea5e9', '#6366f1'],
      });

      window.setTimeout(() => {
        speak(`${q.n} trừ ${q.k} bằng ${q.correct}!`, LANG_SPEAK_DEFAULT);
      }, 350);

      window.setTimeout(() => advanceQuestion(earnedFully), 2800);
    } else {
      playSfx('snd-wrong');
      playBip();
      setShakingOption(n);
      window.setTimeout(() => {
        setShakingOption((x) => (x === n ? null : x));
      }, 500);

      const next = wrongInRound + 1;
      setWrongInRound(next);

      if (next === 2 && !dimmedOption) {
        setDimmedOption(n);
      } else if (next >= 3) {
        setHintReveal(true);
      }

      window.setTimeout(() => {
        if (q) speak(`${q.n} trừ ${q.k} bằng mấy?`, LANG_SPEAK_DEFAULT);
      }, 800);
    }
  };

  useEffect(() => {
    if (phase !== 'finished' || !activeLevel) return;
    const passed = correctCount >= BEKHOI_PASS_THRESHOLD;
    if (passed) {
      confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ef4444', '#f97316', '#facc15', '#10b981', '#0ea5e9', '#6366f1', '#a855f7'],
      });
      const t = window.setTimeout(() => {
        speak('Tuyệt vời! Bé biết trừ rồi!', LANG_SPEAK_DEFAULT);
      }, 400);
      return () => window.clearTimeout(t);
    }
  }, [phase, activeLevel, correctCount]);

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
          {/* Hero: 5 - 3 = 2 */}
          <div className="flex justify-center items-end gap-2 mb-4 h-24">
            <Block value={5 as BlockValue} fontSize={18} />
            <span className="text-3xl font-black text-slate-400 self-center">−</span>
            <Block value={3 as BlockValue} fontSize={18} />
            <span className="text-3xl font-black text-slate-400 self-center">=</span>
            <Block value={2 as BlockValue} fontSize={18} />
          </div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            Bẻ Khối
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Tháp lớn bẻ làm hai — bé đoán phần còn lại!
          </p>

          <div className="space-y-3 text-left">
            {BEKHOI_LEVELS.map((l) => {
              const passed = passedSet.has(l.id);
              const unlocked = isBeKhoiLevelUnlocked(l.id, passedSet);
              return (
                <button
                  key={l.id}
                  onClick={() => unlocked && startLevel(l)}
                  disabled={!unlocked}
                  className={`relative w-full p-4 rounded-3xl shadow-lg transition-all flex items-center gap-4 ${
                    !unlocked
                      ? 'bg-slate-100 border-2 border-slate-200 opacity-60 cursor-not-allowed'
                      : passed
                        ? 'bg-gradient-to-br from-rose-100 via-purple-100 to-indigo-100 border-2 border-purple-300 active:scale-95'
                        : 'bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50 border-2 border-purple-200 active:scale-95'
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
                    <span className="text-2xl">🏆</span>
                  ) : unlocked ? (
                    <span className="text-purple-500 text-xl">▶️</span>
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
    const passed = correctCount >= BEKHOI_PASS_THRESHOLD;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-3 floating">{passed ? '🏆' : '🧱'}</div>
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
          {passed ? 'Tuyệt vời!' : 'Cố lên nhé!'}
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-1">
          {passed ? 'Bé đã hoàn thành' : 'Sắp hoàn thành rồi'}
        </p>
        <p className="text-xl font-black text-slate-800 mb-5">{activeLevel.name}</p>

        <div className="flex justify-center items-end gap-1 mb-6 h-12">
          {Array.from({ length: QUESTIONS_PER_BEKHOI_LEVEL }).map((_, i) => (
            <span
              key={i}
              className={`text-4xl transition-all duration-300 ${
                i < correctCount ? '' : 'grayscale opacity-20'
              }`}
            >
              🏆
            </span>
          ))}
        </div>

        <div className="bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50 border-2 border-purple-200 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-rose-500 to-indigo-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{QUESTIONS_PER_BEKHOI_LEVEL}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Phép trừ đúng
          </div>
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
            className="flex-1 py-4 bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────
  if (!activeLevel || !q) return null;

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
        <span className="font-bold text-purple-600 text-sm flex items-center gap-1">
          {activeLevel.emoji} {activeLevel.name}
        </span>
        <span className="font-bold text-rose-500 text-sm">
          {questionIdx + 1}/{deck.length}
        </span>
      </div>

      <div className="flex justify-center items-end gap-1 mb-3 h-8">
        {Array.from({ length: QUESTIONS_PER_BEKHOI_LEVEL }).map((_, i) => (
          <span
            key={i}
            className={`text-2xl transition-all duration-300 ${
              i < correctCount ? '' : 'grayscale opacity-20'
            }`}
          >
            🏆
          </span>
        ))}
      </div>

      {/* Sàn bẻ khối: N - K hoặc tháp bẻ rồi */}
      <div className="bg-gradient-to-b from-indigo-50 via-purple-50 to-rose-50 border-2 border-purple-200 rounded-3xl px-4 py-6 mb-4">
        <div className="flex justify-center items-end gap-2 min-h-[180px]">
          {!solved ? (
            <>
              {/* N tháp + dấu - + K tháp */}
              <div className="flex flex-col items-center gap-1">
                <Block value={q.n as BlockValue} />
              </div>
              <span className="text-4xl font-black text-slate-400 self-center">−</span>
              <div className="flex flex-col items-center gap-1">
                <Block value={q.k as BlockValue} />
              </div>
            </>
          ) : (
            // Tháp đã bẻ — K bay đi, còn N-K
            <SplitStack n={q.n} k={q.k} correct={q.correct} />
          )}
        </div>
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => speak(`${q.n} trừ ${q.k} bằng mấy?`, LANG_SPEAK_DEFAULT)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur border-2 border-purple-200 rounded-full active:scale-95 shadow-sm text-purple-700 font-bold text-xs"
          >
            🔁 Nghe lại
          </button>
        </div>
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-3">
        👆 Chạm số đúng — bẻ đi {q.k} ô, còn lại mấy?
      </p>

      <div className="grid grid-cols-3 gap-3">
        {q.options.map((n) => {
          const isCorrect = n === q.correct;
          const isShaking = shakingOption === n;
          const isDimmed = dimmedOption === n;
          const showHint = hintReveal && isCorrect && !solved;
          const showSolved = solved && isCorrect;
          return (
            <button
              key={n}
              type="button"
              disabled={solved || isDimmed}
              onClick={() => tapOption(n)}
              className={`aspect-square bg-white border-2 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${
                isShaking
                  ? 'shake-x border-red-300 bg-red-50'
                  : showSolved
                    ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200'
                    : showHint
                      ? 'border-amber-400 bg-amber-50 animate-pulse ring-2 ring-amber-200'
                      : isDimmed
                        ? 'border-slate-100 opacity-30 grayscale'
                        : 'border-purple-200 shadow-sm hover:border-purple-300'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="text-5xl font-black text-slate-800">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
