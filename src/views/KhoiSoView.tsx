import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  KHOISO_LEVELS,
  BLOCK_STYLES,
  QUESTIONS_PER_KHOISO_LEVEL,
  generateKhoiSoTargets,
  isKhoiSoLevelUnlocked,
  buildSumNarration,
  type BlockValue,
  type KhoiSoLevel,
} from '../data/khoiSoData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Phase = 'idle' | 'playing' | 'finished';

const STORAGE_KEY = 'lingoland_khoiso_passed';

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

// Chiều cao 1 ô đơn vị (px) — co giãn theo target để tháp vừa khít màn hình.
const unitHeightFor = (target: number): number => {
  if (target <= 5) return 40;
  if (target <= 10) return 28;
  return 20;
};

const sumOf = (placed: BlockValue[]): number =>
  placed.reduce((s, x) => s + x, 0);

type KhoiSoViewProps = {
  onBack: () => void;
};

export default function KhoiSoView({ onBack }: KhoiSoViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeLevel, setActiveLevel] = useState<KhoiSoLevel | null>(null);
  const [targets, setTargets] = useState<number[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [placed, setPlaced] = useState<BlockValue[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [overshootCount, setOvershootCount] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(false);
  const [hintTopBlock, setHintTopBlock] = useState<BlockValue | null>(null);
  const [passedSet, setPassedSet] = useState<Set<string>>(() => loadPassed());
  const inactiveRef = useRef<number | null>(null);
  // Track stable identity của lần "đúng" hiện tại — useEffect chỉ chạy 1 lần
  // narrate cho mỗi lần đạt target, không bị fire khi placed thay đổi sau đó.
  const correctHandledRef = useRef(false);

  const currentTarget = targets[questionIdx];

  // Đọc target khi câu hỏi mới hiện.
  useEffect(() => {
    if (phase !== 'playing' || currentTarget === undefined) return;
    const t = window.setTimeout(() => {
      speak(`Tháp số ${currentTarget}`, LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, [phase, currentTarget]);

  // Inactive prompt sau 12s.
  useEffect(() => {
    if (phase !== 'playing' || solved || currentTarget === undefined) return;
    if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    inactiveRef.current = window.setTimeout(() => {
      speak(`Mình xây tháp số ${currentTarget} nào`, LANG_SPEAK_DEFAULT);
    }, 12000);
    return () => {
      if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    };
  }, [phase, currentTarget, solved, placed.length]);

  // Auto-check sau mỗi lần placed thay đổi.
  useEffect(() => {
    if (phase !== 'playing' || solved || currentTarget === undefined) return;
    if (placed.length === 0) return;
    const sum = sumOf(placed);

    if (sum === currentTarget) {
      // ── ĐÚNG ──
      if (correctHandledRef.current) return;
      correctHandledRef.current = true;
      handleCorrect();
    } else if (sum > currentTarget) {
      // ── OVERSHOOT ──
      handleOvershoot();
    }
    // sum < target: bé tiếp tục xây, không cần phản hồi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, currentTarget, phase, solved]);

  const handleCorrect = () => {
    if (!activeLevel || currentTarget === undefined) return;
    playSfx('snd-correct');
    playTing();
    setSolved(true);
    setCorrectCount((c) => c + 1);

    confetti({
      particleCount: 70,
      spread: 80,
      startVelocity: 30,
      origin: { y: 0.4 },
      colors: ['#ef4444', '#f97316', '#facc15', '#10b981', '#0ea5e9', '#6366f1', '#a855f7'],
    });

    // Voice: đọc decomposition để bé thấy "ba cộng hai bằng năm".
    window.setTimeout(() => {
      const narration = buildSumNarration(placed);
      speak(`${narration}!`, LANG_SPEAK_DEFAULT);
    }, 350);

    window.setTimeout(() => {
      advanceQuestion();
    }, 3000);
  };

  const handleOvershoot = () => {
    playSfx('snd-wrong');
    playBip();
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
    setOvershootCount((c) => c + 1);

    // Voice nhắc nhẹ — không trách bé.
    window.setTimeout(() => {
      speak('Hơi cao rồi nhỉ', LANG_SPEAK_DEFAULT);
    }, 250);

    // Sau overshoot ≥3, glow gợi ý 1 khối còn thiếu trong pool.
    // Tính tổng đúng cần là target - sum_trước_block_cuối. Vd target=5, placed=[3,4]
    // → sau khi rút khối 4 đi, cần 5-3 = 2. Vậy gợi ý khối 2.
    if (overshootCount + 1 >= 3 && activeLevel) {
      const sumBeforeLast = sumOf(placed.slice(0, -1));
      const need = currentTarget! - sumBeforeLast;
      const hint = activeLevel.blocks.find((b) => b === need);
      if (hint) setHintTopBlock(hint);
    }
  };

  const advanceQuestion = () => {
    if (!activeLevel) return;
    correctHandledRef.current = false;
    if (questionIdx + 1 < targets.length) {
      setQuestionIdx(questionIdx + 1);
      setPlaced([]);
      setOvershootCount(0);
      setSolved(false);
      setShake(false);
      setHintTopBlock(null);
    } else {
      // Pass nếu hoàn thành đủ 5 tháp (cả 5 đều đến target).
      const finalCorrect = correctCount; // đã được cộng trong handleCorrect
      if (finalCorrect >= QUESTIONS_PER_KHOISO_LEVEL) {
        const newSet = new Set(passedSet);
        newSet.add(activeLevel.id);
        setPassedSet(newSet);
        savePassed(newSet);
      }
      setPhase('finished');
    }
  };

  const startLevel = (level: KhoiSoLevel) => {
    correctHandledRef.current = false;
    setActiveLevel(level);
    setTargets(generateKhoiSoTargets(level));
    setQuestionIdx(0);
    setPlaced([]);
    setCorrectCount(0);
    setOvershootCount(0);
    setSolved(false);
    setShake(false);
    setHintTopBlock(null);
    setPhase('playing');
  };

  const tapPoolBlock = (value: BlockValue) => {
    if (solved) return;
    playPop();
    setHintTopBlock(null);
    setPlaced((prev) => [...prev, value]);
  };

  const tapPlacedBlock = (index: number) => {
    if (solved) return;
    playPop();
    setPlaced((prev) => prev.filter((_, i) => i !== index));
  };

  // Confetti finished + voice congrats.
  useEffect(() => {
    if (phase !== 'finished' || !activeLevel) return;
    const passed = correctCount >= QUESTIONS_PER_KHOISO_LEVEL;
    if (passed) {
      confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ef4444', '#f97316', '#facc15', '#10b981', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'],
      });
      const t = window.setTimeout(() => {
        speak('Bé là thợ xây giỏi!', LANG_SPEAK_DEFAULT);
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
          <div className="flex justify-center items-end gap-1 mb-3">
            <div className="w-8 h-8 rounded-md bg-red-500 border-2 border-red-600 floating"
                 style={{ animationDelay: '0s' }} />
            <div className="w-8 h-16 rounded-md bg-orange-500 border-2 border-orange-600 floating"
                 style={{ animationDelay: '0.2s' }} />
            <div className="w-8 h-24 rounded-md bg-yellow-400 border-2 border-yellow-500 floating"
                 style={{ animationDelay: '0.4s' }} />
          </div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
            Khối Số
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Bé xếp khối nhỏ để xây tháp đúng số. Một số có nhiều cách lắp ráp —
            xếp sao cũng được!
          </p>

          <div className="space-y-3 text-left">
            {KHOISO_LEVELS.map((l) => {
              const passed = passedSet.has(l.id);
              const unlocked = isKhoiSoLevelUnlocked(l.id, passedSet);
              return (
                <button
                  key={l.id}
                  onClick={() => unlocked && startLevel(l)}
                  disabled={!unlocked}
                  className={`relative w-full p-4 rounded-3xl shadow-lg transition-all flex items-center gap-4 ${
                    !unlocked
                      ? 'bg-slate-100 border-2 border-slate-200 opacity-60 cursor-not-allowed'
                      : passed
                        ? 'bg-gradient-to-br from-emerald-100 via-amber-100 to-orange-100 border-2 border-emerald-300 active:scale-95'
                        : 'bg-gradient-to-br from-red-50 via-amber-50 to-emerald-50 border-2 border-amber-200 active:scale-95'
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
                    <span className="text-amber-500 text-xl">▶️</span>
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
    const passed = correctCount >= QUESTIONS_PER_KHOISO_LEVEL;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-3 floating">{passed ? '🏆' : '🧱'}</div>
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
          {passed ? 'Tuyệt vời!' : 'Cố lên nhé!'}
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-1">
          {passed ? 'Bé đã hoàn thành' : 'Sắp hoàn thành rồi'}
        </p>
        <p className="text-xl font-black text-slate-800 mb-5">{activeLevel.name}</p>

        {/* 5 tháp 🏆 đếm tiến trình */}
        <div className="flex justify-center items-end gap-1 mb-6 h-12">
          {Array.from({ length: QUESTIONS_PER_KHOISO_LEVEL }).map((_, i) => (
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

        <div className="bg-gradient-to-br from-red-50 via-amber-50 to-emerald-50 border-2 border-amber-200 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-red-500 to-emerald-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{QUESTIONS_PER_KHOISO_LEVEL}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Tháp xây xong
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
            className="flex-1 py-4 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────
  if (!activeLevel || currentTarget === undefined) return null;

  const unit = unitHeightFor(currentTarget);
  const towerHeightPx = currentTarget * unit;
  const towerWidthPx = currentTarget > 10 ? 88 : 100;
  const sum = sumOf(placed);
  const overTarget = sum > currentTarget;

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
        <span className="font-bold text-amber-600 text-sm flex items-center gap-1">
          {activeLevel.emoji} {activeLevel.name}
        </span>
        <span className="font-bold text-emerald-600 text-sm">
          {questionIdx + 1}/{targets.length}
        </span>
      </div>

      {/* Hàng 🏆 progress */}
      <div className="flex justify-center items-end gap-1 mb-3 h-8">
        {Array.from({ length: QUESTIONS_PER_KHOISO_LEVEL }).map((_, i) => (
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

      {/* Sàn xây dựng — target marker + tháp + tổng hiện tại */}
      <div className="bg-gradient-to-b from-sky-50 via-amber-50 to-emerald-50 border-2 border-amber-200 rounded-3xl px-4 py-5 mb-4">
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border-2 border-amber-300 shadow-sm">
            <span className="text-2xl">🎯</span>
            <span className="text-3xl font-black text-slate-800">{currentTarget}</span>
          </div>
        </div>

        <div className="flex justify-center items-end">
          {/* Khung tháp — chiều cao đúng target */}
          <div
            className={`relative bg-white/60 border-2 border-dashed border-amber-300 rounded-xl ${
              shake ? 'shake-x' : ''
            }`}
            style={{ width: towerWidthPx, height: towerHeightPx + 4 }}
          >
            {/* Hiển thị tổng hiện tại bên trái khung khi đang xây */}
            {placed.length > 0 && !solved && (
              <div className="absolute -left-12 bottom-0 flex items-center gap-1">
                <span
                  className={`text-2xl font-black ${
                    overTarget ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  {sum}
                </span>
              </div>
            )}
            {solved && (
              <div className="absolute -left-12 bottom-0">
                <span className="text-3xl">✨</span>
              </div>
            )}

            {/* Stack blocks từ bottom-up */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse">
              {placed.map((value, i) => {
                const style = BLOCK_STYLES[value];
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={solved}
                    onClick={() => tapPlacedBlock(i)}
                    className={`w-full ${style.bg} ${style.text} ${style.border} border-2 flex items-center justify-center font-black active:scale-95 transition-transform`}
                    style={{ height: value * unit, fontSize: Math.min(value * unit * 0.5, 28) }}
                    aria-label={`Khối ${value} — chạm để gỡ`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-3">
        👆 Chạm khối dưới để xếp tháp — chạm khối trên tháp để gỡ xuống
      </p>

      {/* Pool khối */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-3">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
          Khối có sẵn
        </div>
        <div className="flex justify-center items-end gap-2 flex-wrap">
          {activeLevel.blocks.map((value) => {
            const style = BLOCK_STYLES[value];
            const isHinted = hintTopBlock === value && !solved;
            const blockHeight = Math.max(value * 10, 28); // height proportional, min 28px
            return (
              <button
                key={value}
                type="button"
                disabled={solved}
                onClick={() => tapPoolBlock(value)}
                className={`${style.bg} ${style.text} ${style.border} border-2 rounded-lg flex items-center justify-center font-black active:scale-90 transition-transform shadow-sm ${
                  isHinted ? 'animate-pulse ring-4 ring-amber-300' : ''
                }`}
                style={{
                  width: 40,
                  height: blockHeight,
                  fontSize: 18,
                }}
                aria-label={`Khối số ${value}`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
