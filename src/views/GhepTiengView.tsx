import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GHEP_LEVELS,
  GHEP_PASS_THRESHOLD,
  QUESTIONS_PER_GHEP_LEVEL,
  ONSET_READ,
  generateGhepDeck,
  isGhepLevelUnlocked,
  type GhepLevel,
  type GhepQuestion,
} from '../data/ghepTiengData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Phase = 'idle' | 'playing' | 'finished';

const STORAGE_KEY = 'lingoland_ghepting_passed';

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

// Đánh vần: "cờ - á - cá". Trẻ Việt nghe quen cách đọc này từ ông bà.
const buildDanhVan = (onset: string, rime: string, full: string): string => {
  const onsetName = ONSET_READ[onset] ?? onset;
  return `${onsetName}. ${rime}. ${full}.`;
};

type GhepTiengViewProps = {
  onBack: () => void;
};

export default function GhepTiengView({ onBack }: GhepTiengViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeLevel, setActiveLevel] = useState<GhepLevel | null>(null);
  const [deck, setDeck] = useState<GhepQuestion[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [onsetSlot, setOnsetSlot] = useState<string | null>(null);
  const [rimeSlot, setRimeSlot] = useState<string | null>(null);
  const [wrongInRound, setWrongInRound] = useState(0);
  const [shakeSlots, setShakeSlots] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0=none, 1=hint onset, 2=hint both
  const [solved, setSolved] = useState(false);
  const [passedSet, setPassedSet] = useState<Set<string>>(() => loadPassed());
  const inactiveRef = useRef<number | null>(null);
  const checkTimerRef = useRef<number | null>(null);

  const currentQuestion = deck[questionIdx] ?? null;

  // Đọc tên picture khi câu hỏi mới hiện.
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion) return;
    const t = window.setTimeout(() => {
      speak(currentQuestion.word.full, LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, [phase, currentQuestion]);

  // Inactive: sau 12s không thao tác → đọc lại tên tiếng đích.
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion || solved) return;
    if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    inactiveRef.current = window.setTimeout(() => {
      speak(currentQuestion.word.full, LANG_SPEAK_DEFAULT);
    }, 12000);
    return () => {
      if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    };
  }, [phase, currentQuestion, solved, onsetSlot, rimeSlot]);

  // Auto-check khi cả 2 slot đầy.
  useEffect(() => {
    if (!currentQuestion || solved) return;
    if (onsetSlot === null || rimeSlot === null) return;

    if (checkTimerRef.current) window.clearTimeout(checkTimerRef.current);
    checkTimerRef.current = window.setTimeout(() => {
      checkCombo();
    }, 600);

    return () => {
      if (checkTimerRef.current) window.clearTimeout(checkTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onsetSlot, rimeSlot, currentQuestion]);

  const checkCombo = () => {
    if (!currentQuestion || !activeLevel) return;
    if (onsetSlot === null || rimeSlot === null) return;

    const correctOnset = onsetSlot === currentQuestion.word.onset;
    const correctRime = rimeSlot === currentQuestion.word.rime;

    if (correctOnset && correctRime) {
      // ── ĐÚNG ──
      playSfx('snd-correct');
      playTing();
      setSolved(true);

      const earnedFully = hintLevel === 0;
      if (earnedFully) setCorrectCount((c) => c + 1);

      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 30,
        origin: { y: 0.4 },
        colors: ['#fcd34d', '#86efac', '#93c5fd', '#fda4af'],
      });

      // Đánh vần đúng nhịp truyền thống.
      const { onset, rime, full } = currentQuestion.word;
      window.setTimeout(() => {
        speak(buildDanhVan(onset, rime, full), LANG_SPEAK_DEFAULT);
      }, 300);

      window.setTimeout(() => {
        advanceQuestion(earnedFully);
      }, 2800);
    } else {
      // ── SAI ──
      playSfx('snd-wrong');
      playBip();
      setShakeSlots(true);
      window.setTimeout(() => setShakeSlots(false), 500);

      const next = wrongInRound + 1;
      setWrongInRound(next);

      if (next === 2) setHintLevel(1); // glow onset đúng
      else if (next >= 3) setHintLevel(2); // glow cả 2

      // Sau shake, clear slots để bé thử lại.
      window.setTimeout(() => {
        setOnsetSlot(null);
        setRimeSlot(null);
      }, 700);

      // Đọc lại tên tiếng đích.
      window.setTimeout(() => {
        if (currentQuestion) speak(currentQuestion.word.full, LANG_SPEAK_DEFAULT);
      }, 900);
    }
  };

  const advanceQuestion = (didCorrectly: boolean) => {
    if (!activeLevel) return;
    if (questionIdx + 1 < deck.length) {
      setQuestionIdx(questionIdx + 1);
      setOnsetSlot(null);
      setRimeSlot(null);
      setWrongInRound(0);
      setHintLevel(0);
      setSolved(false);
      setShakeSlots(false);
    } else {
      const finalCorrect = correctCount + (didCorrectly ? 1 : 0);
      if (finalCorrect >= GHEP_PASS_THRESHOLD) {
        const newSet = new Set(passedSet);
        newSet.add(activeLevel.id);
        setPassedSet(newSet);
        savePassed(newSet);
      }
      setPhase('finished');
    }
  };

  const startLevel = (level: GhepLevel) => {
    setActiveLevel(level);
    setDeck(generateGhepDeck(level));
    setQuestionIdx(0);
    setCorrectCount(0);
    setOnsetSlot(null);
    setRimeSlot(null);
    setWrongInRound(0);
    setHintLevel(0);
    setSolved(false);
    setShakeSlots(false);
    setPhase('playing');
  };

  // ── Tap handlers ──
  const tapOnsetCard = (onset: string) => {
    if (solved) return;
    playPop();
    setOnsetSlot(onset);
  };

  const tapRimeCard = (rime: string) => {
    if (solved) return;
    playPop();
    setRimeSlot(rime);
  };

  const clearOnsetSlot = () => {
    if (solved) return;
    setOnsetSlot(null);
  };

  const clearRimeSlot = () => {
    if (solved) return;
    setRimeSlot(null);
  };

  // Confetti to khi hoàn thành level.
  useEffect(() => {
    if (phase !== 'finished' || !activeLevel) return;
    const passed = correctCount >= GHEP_PASS_THRESHOLD;
    if (passed) {
      confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fcd34d', '#86efac', '#93c5fd', '#fda4af', '#c4b5fd'],
      });
      const t = window.setTimeout(() => {
        speak('Bé là thợ xây giỏi của làng!', LANG_SPEAK_DEFAULT);
      }, 400);
      return () => window.clearTimeout(t);
    }
  }, [phase, activeLevel, correctCount]);

  // ─── IDLE: chọn level ────────────────────────────────────────────────
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
          <div className="text-7xl mb-2 floating">🧩</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Ghép Tiếng
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Bé ghép phụ âm và vần để xây ra tiếng — như chú thợ xây ghép từng
            viên gạch chữ!
          </p>

          <div className="space-y-3 text-left">
            {GHEP_LEVELS.map((l) => {
              const passed = passedSet.has(l.id);
              const unlocked = isGhepLevelUnlocked(l.id, passedSet);
              return (
                <button
                  key={l.id}
                  onClick={() => unlocked && startLevel(l)}
                  disabled={!unlocked}
                  className={`relative w-full p-4 rounded-3xl shadow-lg transition-all flex items-center gap-4 ${
                    !unlocked
                      ? 'bg-slate-100 border-2 border-slate-200 opacity-60 cursor-not-allowed'
                      : passed
                        ? 'bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 border-2 border-emerald-300 active:scale-95'
                        : 'bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50 border-2 border-emerald-200 active:scale-95'
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
    const passed = correctCount >= GHEP_PASS_THRESHOLD;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-3 floating">{passed ? '👷' : '🧱'}</div>
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
          {passed ? 'Tuyệt vời!' : 'Cố lên nhé!'}
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-1">
          {passed ? 'Bé đã hoàn thành' : 'Sắp hoàn thành rồi'}
        </p>
        <p className="text-xl font-black text-slate-800 mb-5">{activeLevel.name}</p>

        {/* Gạch xếp thành nhà — mỗi câu đúng = 1 viên gạch */}
        <div className="flex justify-center items-end gap-1 mb-6 h-16">
          {Array.from({ length: QUESTIONS_PER_GHEP_LEVEL }).map((_, i) => (
            <span
              key={i}
              className={`text-4xl transition-all duration-300 ${
                i < correctCount ? '' : 'grayscale opacity-20'
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              🧱
            </span>
          ))}
        </div>

        <div className="bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50 border-2 border-sky-200 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-indigo-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{QUESTIONS_PER_GHEP_LEVEL}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Tiếng đã ghép đúng
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
            className="flex-1 py-4 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────
  if (!activeLevel || !currentQuestion) return null;

  const target = currentQuestion.word;
  const onsetHinted = hintLevel >= 1;
  const rimeHinted = hintLevel >= 2;

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
        <span className="font-bold text-sky-600 text-sm flex items-center gap-1">
          {activeLevel.emoji} {activeLevel.name}
        </span>
        <span className="font-bold text-indigo-500 text-sm">
          {questionIdx + 1}/{deck.length}
        </span>
      </div>

      {/* Hàng gạch tiến trình */}
      <div className="flex justify-center items-end gap-1 mb-3 h-8">
        {Array.from({ length: QUESTIONS_PER_GHEP_LEVEL }).map((_, i) => (
          <span
            key={i}
            className={`text-2xl transition-all duration-300 ${
              i < correctCount ? '' : 'grayscale opacity-20'
            }`}
          >
            🧱
          </span>
        ))}
      </div>

      {/* Sàn xây dựng: picture + 2 slot ghép */}
      <div className="bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-50 border-2 border-sky-200 rounded-3xl p-5 mb-4">
        <div className="text-center mb-3">
          <div className="text-7xl leading-none mb-2">{target.emoji}</div>
          <button
            type="button"
            onClick={() => speak(target.full, LANG_SPEAK_DEFAULT)}
            aria-label="Nghe lại"
            className="inline-flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur border-2 border-sky-200 rounded-full active:scale-95 shadow-sm text-sky-700 font-bold text-xs"
          >
            🔁 Nghe lại
          </button>
        </div>

        {/* 2 slot ghép cạnh nhau */}
        <div className={`flex justify-center items-stretch gap-1 ${shakeSlots ? 'shake-x' : ''}`}>
          <button
            type="button"
            onClick={clearOnsetSlot}
            disabled={solved}
            className={`flex-1 max-w-[120px] aspect-square rounded-l-2xl border-4 flex flex-col items-center justify-center transition-all ${
              solved
                ? 'border-emerald-400 bg-emerald-50'
                : onsetSlot
                  ? 'border-sky-400 bg-white shadow-inner'
                  : 'border-dashed border-sky-300 bg-white/50'
            }`}
          >
            {onsetSlot ? (
              <span className="text-5xl font-black text-slate-800">
                {onsetSlot.toUpperCase()}
              </span>
            ) : (
              <span className="text-xs font-bold text-sky-400">phụ âm</span>
            )}
          </button>
          <button
            type="button"
            onClick={clearRimeSlot}
            disabled={solved}
            className={`flex-1 max-w-[120px] aspect-square rounded-r-2xl border-4 border-l-0 flex flex-col items-center justify-center transition-all ${
              solved
                ? 'border-emerald-400 bg-emerald-50'
                : rimeSlot
                  ? 'border-sky-400 bg-white shadow-inner'
                  : 'border-dashed border-sky-300 bg-white/50'
            }`}
          >
            {rimeSlot ? (
              <span className="text-5xl font-black text-slate-800">{rimeSlot}</span>
            ) : (
              <span className="text-xs font-bold text-sky-400">vần</span>
            )}
          </button>
        </div>

        {/* Hiển thị tiếng đầy đủ khi đã ghép đúng */}
        {solved && (
          <div className="text-center mt-3 text-3xl font-black text-emerald-600 animate-in zoom-in">
            ✨ {target.full} ✨
          </div>
        )}
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-2">
        👆 Chạm phụ âm và vần để ghép thành tiếng
      </p>

      {/* Hàng phụ âm */}
      <div className="mb-3">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
          Phụ âm
        </div>
        <div className="grid grid-cols-3 gap-2">
          {currentQuestion.onsetChoices.map((onset) => {
            const isCorrect = onset === target.onset;
            const isInSlot = onsetSlot === onset;
            const showHint = onsetHinted && isCorrect && !solved;
            return (
              <button
                key={onset}
                type="button"
                disabled={solved}
                onClick={() => tapOnsetCard(onset)}
                className={`aspect-square bg-white border-2 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${
                  isInSlot
                    ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
                    : showHint
                      ? 'border-amber-400 bg-amber-50 animate-pulse ring-2 ring-amber-200'
                      : 'border-emerald-200 shadow-sm hover:border-emerald-300'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="text-4xl font-black text-slate-800">
                  {onset.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hàng vần */}
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
          Vần
        </div>
        <div className="grid grid-cols-3 gap-2">
          {currentQuestion.rimeChoices.map((rime) => {
            const isCorrect = rime === target.rime;
            const isInSlot = rimeSlot === rime;
            const showHint = rimeHinted && isCorrect && !solved;
            return (
              <button
                key={rime}
                type="button"
                disabled={solved}
                onClick={() => tapRimeCard(rime)}
                className={`aspect-square bg-white border-2 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${
                  isInSlot
                    ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
                    : showHint
                      ? 'border-amber-400 bg-amber-50 animate-pulse ring-2 ring-amber-200'
                      : 'border-indigo-200 shadow-sm hover:border-indigo-300'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="text-4xl font-black text-slate-800">{rime}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
