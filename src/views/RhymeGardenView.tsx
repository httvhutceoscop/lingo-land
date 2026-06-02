import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  DONG_DAO_LIST,
  type DongDao,
  type RhymeOption,
  type RhymeQuestion,
} from '../data/rhymeGardenData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip } from '../lib/beep';

type Phase = 'idle' | 'playing' | 'finished';

type RhymeGardenViewProps = {
  onBack: () => void;
};

const STORAGE_KEY = 'lingoland_rhymegarden_passed';

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

// Xáo trộn 3 lựa chọn (1 đúng + 2 sai) để vị trí đáp án không cố định.
const shuffleOptions = (q: RhymeQuestion): RhymeOption[] => {
  const arr = [q.correct, ...q.distractors];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function RhymeGardenView({ onBack }: RhymeGardenViewProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeDongDao, setActiveDongDao] = useState<DongDao | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [solved, setSolved] = useState<boolean[]>([]); // độ dài = questions.length
  const [shuffled, setShuffled] = useState<RhymeOption[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [wrongLabel, setWrongLabel] = useState<string | null>(null); // shake feedback
  const [dimmedLabel, setDimmedLabel] = useState<string | null>(null); // hint sau sai 2
  const [hintReveal, setHintReveal] = useState(false); // hint sau sai 3
  const [passedSet, setPassedSet] = useState<Set<string>>(() => loadPassed());
  const inactiveTimerRef = useRef<number | null>(null);

  const currentQuestion: RhymeQuestion | null =
    activeDongDao?.questions[questionIdx] ?? null;

  // Reset state khi chuyển sang câu hỏi mới hoặc chọn đồng dao mới.
  useEffect(() => {
    if (!currentQuestion) return;
    setShuffled(shuffleOptions(currentQuestion));
    setWrongCount(0);
    setWrongLabel(null);
    setDimmedLabel(null);
    setHintReveal(false);
  }, [currentQuestion]);

  // Đọc câu đồng dao (có placeholder "___" → đọc thành "..." để TTS ngắt nghỉ).
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion) return;
    const text = currentQuestion.prompt.replace(/___/g, '... gì?');
    const t = window.setTimeout(() => speak(text, LANG_SPEAK_DEFAULT), 350);
    return () => window.clearTimeout(t);
  }, [phase, currentQuestion]);

  // Inactive prompt: sau 12s không tương tác, đọc lại câu để nhắc bé.
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion) return;
    if (inactiveTimerRef.current) window.clearTimeout(inactiveTimerRef.current);
    inactiveTimerRef.current = window.setTimeout(() => {
      const text = currentQuestion.prompt.replace(/___/g, '... gì?');
      speak(text, LANG_SPEAK_DEFAULT);
    }, 12000);
    return () => {
      if (inactiveTimerRef.current) window.clearTimeout(inactiveTimerRef.current);
    };
  }, [phase, currentQuestion, wrongCount]);

  const startDongDao = (dd: DongDao) => {
    setActiveDongDao(dd);
    setQuestionIdx(0);
    setSolved(new Array(dd.questions.length).fill(false));
    setPhase('playing');
  };

  const handleOptionTap = (opt: RhymeOption) => {
    if (!currentQuestion || !activeDongDao) return;
    if (dimmedLabel === opt.label) return; // ô đã bị mờ → ignore

    // Phát âm tên để bé nghe rõ.
    speak(opt.label, LANG_SPEAK_DEFAULT);

    if (opt.label === currentQuestion.correct.label) {
      // ── ĐÚNG ──
      playSfx('snd-correct');
      playTing();
      const nextSolved = [...solved];
      nextSolved[questionIdx] = true;
      setSolved(nextSolved);

      // Confetti nhỏ ngay khi đúng câu (chứ không đợi hết bài).
      confetti({
        particleCount: 40,
        spread: 60,
        startVelocity: 28,
        origin: { y: 0.4 },
        colors: ['#f9a8d4', '#fbbf24', '#a7f3d0', '#bfdbfe'],
      });

      // Đọc lại câu đầy đủ để củng cố trí nhớ — đợi chút cho speak(label) xong.
      window.setTimeout(() => {
        speak(currentQuestion.full, LANG_SPEAK_DEFAULT);
      }, 750);

      // Sau 2.2s chuyển sang câu kế tiếp hoặc finish.
      window.setTimeout(() => {
        if (questionIdx + 1 < activeDongDao.questions.length) {
          setQuestionIdx(questionIdx + 1);
        } else {
          // Hoàn thành đồng dao này.
          const newSet = new Set(passedSet);
          newSet.add(activeDongDao.id);
          setPassedSet(newSet);
          savePassed(newSet);
          setPhase('finished');
        }
      }, 2200);
    } else {
      // ── SAI ──
      playSfx('snd-wrong');
      playBip();
      setWrongLabel(opt.label);
      window.setTimeout(() => {
        setWrongLabel((l) => (l === opt.label ? null : l));
      }, 500);

      const newWrongCount = wrongCount + 1;
      setWrongCount(newWrongCount);

      // Sai lần 2: làm mờ 1 ô sai (chọn ô vừa tap nếu nó sai, hoặc ô sai đầu tiên).
      if (newWrongCount === 2 && !dimmedLabel) {
        setDimmedLabel(opt.label);
      }
      // Sai lần 3: hint reveal — ô đúng wiggle.
      if (newWrongCount >= 3) {
        setHintReveal(true);
      }

      // Đọc lại câu để bé nghe lại context.
      window.setTimeout(() => {
        const text = currentQuestion.prompt.replace(/___/g, '... gì?');
        speak(text, LANG_SPEAK_DEFAULT);
      }, 900);
    }
  };

  const replayPrompt = () => {
    if (!currentQuestion) return;
    const text = currentQuestion.prompt.replace(/___/g, '... gì?');
    speak(text, LANG_SPEAK_DEFAULT);
  };

  // Confetti lớn khi hoàn thành đồng dao.
  useEffect(() => {
    if (phase !== 'finished') return;
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#f9a8d4', '#fbbf24', '#a7f3d0', '#bfdbfe', '#c4b5fd'],
    });
    // Đọc câu chúc mừng + tên đồng dao vừa thuộc.
    if (activeDongDao) {
      const t = window.setTimeout(() => {
        speak(`Bé đã thuộc bài ${activeDongDao.title}!`, LANG_SPEAK_DEFAULT);
      }, 400);
      return () => window.clearTimeout(t);
    }
  }, [phase, activeDongDao]);

  const passedCount = passedSet.size;
  const totalCount = DONG_DAO_LIST.length;

  // ─── IDLE: chọn đồng dao ─────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>
        <div className="text-center py-4 max-w-md mx-auto">
          <div className="text-7xl mb-3 floating">🌷</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
            Vần Vần Đồng Dao
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-3">
            Chọn một bài đồng dao và điền từ còn thiếu nhé. Mỗi bài thuộc lòng,
            khu vườn sẽ nở thêm hoa!
          </p>
          <div className="inline-block bg-pink-100 text-pink-700 font-black text-xs px-3 py-1 rounded-full mb-5">
            🌸 {passedCount}/{totalCount} bài đã thuộc
          </div>

          <div className="space-y-3">
            {DONG_DAO_LIST.map((dd) => {
              const passed = passedSet.has(dd.id);
              return (
                <button
                  key={dd.id}
                  onClick={() => startDongDao(dd)}
                  className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                    passed
                      ? 'bg-gradient-to-br from-emerald-100 via-pink-100 to-amber-100 border-2 border-emerald-300'
                      : 'bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 border-2 border-pink-100'
                  }`}
                >
                  <div className="text-5xl">{dd.emoji}</div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 text-base leading-tight">
                      {dd.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold mt-0.5 line-clamp-2">
                      {dd.intro}
                    </div>
                  </div>
                  {passed ? (
                    <span className="text-2xl">🌸</span>
                  ) : (
                    <span className="text-pink-400 text-xl">▶️</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── FINISHED: chúc mừng hoàn thành 1 đồng dao ────────────────────────
  if (phase === 'finished' && activeDongDao) {
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-3 floating">{activeDongDao.emoji}</div>
        <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
          Hoan hô!
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-1">
          Bé đã thuộc bài
        </p>
        <p className="text-xl font-black text-slate-800 mb-5">
          "{activeDongDao.title}"
        </p>

        {/* Hàng hoa nở theo số câu hỏi đã trả lời. */}
        <div className="flex justify-center gap-2 mb-6">
          {activeDongDao.questions.map((_, i) => (
            <span key={i} className="text-4xl animate-in zoom-in" style={{ animationDelay: `${i * 200}ms` }}>
              🌸
            </span>
          ))}
        </div>

        <div className="bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 border-2 border-pink-100 rounded-3xl p-5 mb-6">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Vườn của bé
          </div>
          <div className="text-3xl font-black bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            {passedSet.size}/{totalCount}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1">
            bài đồng dao đã thuộc
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            ← Bản đồ
          </button>
          <button
            onClick={() => {
              setActiveDongDao(null);
              setPhase('idle');
            }}
            className="flex-1 py-4 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
          >
            🌷 Bài khác
          </button>
        </div>
      </div>
    );
  }

  // ─── PLAYING ───────────────────────────────────────────────────────────
  if (!activeDongDao || !currentQuestion) return null;

  const isSolvedNow = solved[questionIdx] === true;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-3">
        <button
          onClick={() => {
            setActiveDongDao(null);
            setPhase('idle');
          }}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="font-bold text-fuchsia-500 text-sm">
          {questionIdx + 1}/{activeDongDao.questions.length}
        </span>
      </div>

      <div className="text-center mb-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {activeDongDao.emoji} {activeDongDao.title}
        </div>
      </div>

      {/* Vườn hoa nhỏ — mỗi câu trả lời đúng = 1 hoa nở. */}
      <div className="flex justify-center items-end gap-3 mb-4 h-12">
        {activeDongDao.questions.map((_, i) => (
          <span
            key={i}
            className={`transition-all duration-500 ${
              solved[i]
                ? 'text-4xl'
                : i === questionIdx
                  ? 'text-2xl opacity-70'
                  : 'text-2xl opacity-40'
            }`}
          >
            {solved[i] ? '🌸' : '🌱'}
          </span>
        ))}
      </div>

      {/* Khung câu đồng dao có chỗ khuyết. */}
      <div className="relative bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 border-2 border-pink-100 rounded-3xl p-5 mb-4 text-center">
        <div className="text-base md:text-lg font-black text-slate-700 leading-snug">
          "{currentQuestion.prompt.replace(/___/g, '____')}"
        </div>
        <button
          type="button"
          onClick={replayPrompt}
          aria-label="Nghe lại"
          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-pink-200 flex items-center justify-center active:scale-95 shadow-sm text-pink-500"
        >
          🔁
        </button>
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-3">
        👆 Chạm vào hình có từ đúng
      </p>

      <div className="grid grid-cols-3 gap-3">
        {shuffled.map((opt) => {
          const isCorrect = opt.label === currentQuestion.correct.label;
          const isWrongFeedback = wrongLabel === opt.label;
          const isDimmed = dimmedLabel === opt.label;
          const showHint = hintReveal && isCorrect && !isSolvedNow;
          const showSolved = isSolvedNow && isCorrect;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={isSolvedNow || isDimmed}
              onClick={() => handleOptionTap(opt)}
              className={`relative aspect-square bg-white border-2 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                isWrongFeedback
                  ? 'shake-x border-red-300 bg-red-50'
                  : showSolved
                    ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200'
                    : showHint
                      ? 'border-amber-300 bg-amber-50 animate-pulse'
                      : isDimmed
                        ? 'border-slate-100 opacity-30 grayscale'
                        : 'border-pink-100 shadow-sm hover:border-pink-200'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="text-5xl leading-none">{opt.emoji}</span>
              <span className="text-xs font-black text-slate-600">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

