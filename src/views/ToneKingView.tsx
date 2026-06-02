import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  KINGDOMS,
  SYLLABLES,
  TONES,
  PASS_THRESHOLD,
  QUESTIONS_PER_KINGDOM,
  generateDeck,
  isKingdomUnlocked,
  type Kingdom,
  type Tone,
  type ToneQuestion,
} from '../data/toneKingData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip } from '../lib/beep';

type Phase = 'idle' | 'playing' | 'finished';

const STORAGE_KEY = 'lingoland_toneking_passed';

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

const gridColsFor = (n: number): string => {
  if (n <= 2) return 'grid-cols-2';
  if (n === 4) return 'grid-cols-2';
  return 'grid-cols-3';
};

type ToneKingViewProps = {
  onBack: () => void;
};

export default function ToneKingView({ onBack }: ToneKingViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeKingdom, setActiveKingdom] = useState<Kingdom | null>(null);
  const [deck, setDeck] = useState<ToneQuestion[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongInRound, setWrongInRound] = useState(0); // sai trong câu hiện tại
  const [shakingTone, setShakingTone] = useState<Tone | null>(null);
  const [dimmedTones, setDimmedTones] = useState<Set<Tone>>(new Set());
  const [hintReveal, setHintReveal] = useState(false);
  const [solved, setSolved] = useState(false);
  const [passedSet, setPassedSet] = useState<Set<string>>(() => loadPassed());
  const inactiveRef = useRef<number | null>(null);

  const currentQuestion = deck[questionIdx] ?? null;

  // Đọc tiếng mục tiêu mỗi khi câu hỏi đổi.
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion) return;
    const variant = SYLLABLES[currentQuestion.syllable][currentQuestion.target];
    const t = window.setTimeout(() => {
      // Đọc tiếng 2 lần với khoảng nghỉ để bé nghe rõ thanh.
      speak(`${variant}. ${variant}.`, LANG_SPEAK_DEFAULT);
    }, 350);
    return () => window.clearTimeout(t);
  }, [phase, currentQuestion]);

  // Nhắc lại nếu bé không tương tác 10s.
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion || solved) return;
    if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    inactiveRef.current = window.setTimeout(() => {
      const variant = SYLLABLES[currentQuestion.syllable][currentQuestion.target];
      speak(variant, LANG_SPEAK_DEFAULT);
    }, 10000);
    return () => {
      if (inactiveRef.current) window.clearTimeout(inactiveRef.current);
    };
  }, [phase, currentQuestion, solved, wrongInRound]);

  const startKingdom = (k: Kingdom) => {
    setActiveKingdom(k);
    setDeck(generateDeck(k));
    setQuestionIdx(0);
    setCorrectCount(0);
    setWrongInRound(0);
    setDimmedTones(new Set());
    setHintReveal(false);
    setSolved(false);
    setShakingTone(null);
    setPhase('playing');
  };

  const advanceQuestion = (didCorrectly: boolean) => {
    if (!activeKingdom) return;
    if (questionIdx + 1 < deck.length) {
      setQuestionIdx(questionIdx + 1);
      setWrongInRound(0);
      setDimmedTones(new Set());
      setHintReveal(false);
      setSolved(false);
      setShakingTone(null);
    } else {
      // Câu cuối — chuyển sang finished. correctCount đã cộng (hoặc chưa cộng
      // nếu sai). Lưu pass nếu đạt threshold.
      const finalCorrect = correctCount + (didCorrectly ? 1 : 0);
      if (finalCorrect >= PASS_THRESHOLD) {
        const newSet = new Set(passedSet);
        newSet.add(activeKingdom.id);
        setPassedSet(newSet);
        savePassed(newSet);
      }
      setPhase('finished');
    }
  };

  const handleToneTap = (tone: Tone) => {
    if (!currentQuestion || !activeKingdom || solved) return;
    if (dimmedTones.has(tone)) return;

    if (tone === currentQuestion.target) {
      // ── ĐÚNG ──
      playSfx('snd-correct');
      playTing();
      setSolved(true);

      // Chỉ tính điểm + thưởng đá quý nếu bé KHÔNG cần hint reveal.
      const earnedGem = !hintReveal;
      if (earnedGem) setCorrectCount((c) => c + 1);

      confetti({
        particleCount: 50,
        spread: 70,
        startVelocity: 30,
        origin: { y: 0.4 },
        colors: ['#fde047', '#fbbf24', '#f97316', '#a855f7'],
      });

      // Đọc tên dấu để củng cố — phần học cốt lõi.
      const toneInfo = TONES[tone];
      const variant = SYLLABLES[currentQuestion.syllable][tone];
      window.setTimeout(() => {
        speak(`Đúng. ${variant}. Dấu ${toneInfo.name}.`, LANG_SPEAK_DEFAULT);
      }, 300);

      window.setTimeout(() => advanceQuestion(earnedGem), 2400);
    } else {
      // ── SAI ──
      playSfx('snd-wrong');
      playBip();
      setShakingTone(tone);
      window.setTimeout(() => {
        setShakingTone((t) => (t === tone ? null : t));
      }, 500);

      const next = wrongInRound + 1;
      setWrongInRound(next);

      // Hint leo thang.
      if (next === 2) {
        // Dim 1 tone sai (tone vừa tap).
        setDimmedTones((s) => new Set(s).add(tone));
      } else if (next >= 3) {
        // Reveal: tone đúng được wiggle vàng.
        setHintReveal(true);
      }

      // Đọc lại tiếng mục tiêu sau 800ms.
      window.setTimeout(() => {
        const variant = SYLLABLES[currentQuestion.syllable][currentQuestion.target];
        speak(variant, LANG_SPEAK_DEFAULT);
      }, 800);
    }
  };

  const replayTarget = () => {
    if (!currentQuestion) return;
    const variant = SYLLABLES[currentQuestion.syllable][currentQuestion.target];
    speak(variant, LANG_SPEAK_DEFAULT);
  };

  // Confetti to khi pass vương quốc.
  useEffect(() => {
    if (phase !== 'finished' || !activeKingdom) return;
    const passed = correctCount >= PASS_THRESHOLD;
    if (passed) {
      confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fde047', '#fbbf24', '#f97316', '#a855f7', '#8b5cf6'],
      });
      const t = window.setTimeout(() => {
        speak(`Hoan hô! Bé là vua ${activeKingdom.name}!`, LANG_SPEAK_DEFAULT);
      }, 400);
      return () => window.clearTimeout(t);
    }
  }, [phase, activeKingdom, correctCount]);

  const totalKingdoms = KINGDOMS.length;
  const passedCount = passedSet.size;

  // ─── IDLE: chọn vương quốc ───────────────────────────────────────────
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
          <div className="text-7xl mb-2 floating">👑</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-500 via-orange-500 to-purple-500 bg-clip-text text-transparent">
            Vua Thanh Điệu
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-3">
            Bé nghe tiếng và chọn đúng dấu thanh. Chinh phục cả 6 vương quốc để
            thành Vua!
          </p>
          <div className="inline-block bg-amber-100 text-amber-700 font-black text-xs px-3 py-1 rounded-full mb-5">
            💎 {passedCount}/{totalKingdoms} vương quốc đã chinh phục
          </div>

          <div className="space-y-3 text-left">
            {KINGDOMS.map((k) => {
              const passed = passedSet.has(k.id);
              const unlocked = isKingdomUnlocked(k.id, passedSet);
              return (
                <button
                  key={k.id}
                  onClick={() => unlocked && startKingdom(k)}
                  disabled={!unlocked}
                  className={`relative w-full p-4 rounded-3xl shadow-lg transition-all flex items-center gap-4 ${
                    !unlocked
                      ? 'bg-slate-100 border-2 border-slate-200 opacity-60 cursor-not-allowed'
                      : passed
                        ? 'bg-gradient-to-br from-amber-100 via-orange-100 to-purple-100 border-2 border-amber-300 active:scale-95'
                        : 'bg-gradient-to-br from-amber-50 via-orange-50 to-purple-50 border-2 border-amber-200 active:scale-95'
                  }`}
                >
                  <div className="text-5xl">{unlocked ? k.emoji : '🔒'}</div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 text-base leading-tight">
                      {k.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                      {unlocked ? k.desc : 'Hoàn thành vương quốc trước để mở khoá'}
                    </div>
                  </div>
                  {passed ? (
                    <span className="text-2xl">💎</span>
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

  // ─── FINISHED ─────────────────────────────────────────────────────────
  if (phase === 'finished' && activeKingdom) {
    const passed = correctCount >= PASS_THRESHOLD;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-3 floating">{passed ? '👑' : '🦁'}</div>
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-500 via-orange-500 to-purple-500 bg-clip-text text-transparent">
          {passed ? 'Hoan hô!' : 'Cố lên nhé!'}
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-1">
          {passed ? 'Bé là vua' : 'Bé sắp chinh phục'}
        </p>
        <p className="text-xl font-black text-slate-800 mb-5">
          {activeKingdom.name}
        </p>

        {/* Vương miện hiển thị đá quý theo correctCount. */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: QUESTIONS_PER_KINGDOM }).map((_, i) => (
            <span
              key={i}
              className={`text-4xl transition-all ${
                i < correctCount ? '' : 'grayscale opacity-20'
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              💎
            </span>
          ))}
        </div>

        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-purple-50 border-2 border-amber-200 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-amber-500 to-purple-500 bg-clip-text text-transparent">
            {correctCount}
            <span className="text-2xl text-slate-400">/{QUESTIONS_PER_KINGDOM}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Câu trả lời đúng
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setActiveKingdom(null);
              setPhase('idle');
            }}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            👑 Vương quốc
          </button>
          <button
            onClick={() => startKingdom(activeKingdom)}
            className="flex-1 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ──────────────────────────────────────────────────────────
  if (!activeKingdom || !currentQuestion) return null;

  const baseSyllable = currentQuestion.syllable.toUpperCase();
  const optionTones = currentQuestion.options;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={() => {
            setActiveKingdom(null);
            setPhase('idle');
          }}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="font-bold text-amber-600 text-sm flex items-center gap-1">
          {activeKingdom.emoji} {activeKingdom.name}
        </span>
        <span className="font-bold text-purple-500 text-sm">
          {questionIdx + 1}/{deck.length}
        </span>
      </div>

      {/* Vương miện đá quý — tiến trình trong vương quốc. */}
      <div className="flex justify-center items-center gap-2 mb-4">
        <span className="text-2xl">👑</span>
        {Array.from({ length: QUESTIONS_PER_KINGDOM }).map((_, i) => (
          <span
            key={i}
            className={`text-xl transition-all duration-300 ${
              i < correctCount ? '' : 'grayscale opacity-20'
            }`}
          >
            💎
          </span>
        ))}
      </div>

      {/* Ngai vàng — tiếng gốc lớn + nút nghe lại. */}
      <div className="relative bg-gradient-to-br from-amber-100 via-orange-100 to-purple-100 border-2 border-amber-200 rounded-3xl px-5 py-6 mb-4 text-center shadow-inner">
        <div className="text-4xl mb-2">🦁</div>
        <div className="text-7xl font-black text-slate-800 tracking-wider leading-none mb-2">
          {baseSyllable}
        </div>
        <button
          type="button"
          onClick={replayTarget}
          aria-label="Nghe lại"
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur border-2 border-amber-200 rounded-full active:scale-95 shadow-sm text-amber-700 font-bold text-sm"
        >
          🔁 Nghe lại
        </button>
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-3">
        👆 Chạm vào tiếng vừa nghe
      </p>

      <div className={`grid ${gridColsFor(optionTones.length)} gap-3`}>
        {optionTones.map((tone) => {
          const variant = SYLLABLES[currentQuestion.syllable][tone];
          const toneInfo = TONES[tone];
          const isTarget = tone === currentQuestion.target;
          const isShaking = shakingTone === tone;
          const isDimmed = dimmedTones.has(tone);
          const showSolved = solved && isTarget;
          const showHint = hintReveal && isTarget && !solved;
          return (
            <button
              key={tone}
              type="button"
              disabled={solved || isDimmed}
              onClick={() => handleToneTap(tone)}
              className={`aspect-square bg-white border-2 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                isShaking
                  ? 'shake-x border-red-300 bg-red-50'
                  : showSolved
                    ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200'
                    : showHint
                      ? 'border-amber-400 bg-amber-50 animate-pulse ring-2 ring-amber-200'
                      : isDimmed
                        ? 'border-slate-100 opacity-30 grayscale'
                        : 'border-amber-200 shadow-sm hover:border-amber-300'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="text-4xl md:text-5xl font-black text-slate-800 leading-none">
                {variant}
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-1">
                dấu {toneInfo.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
