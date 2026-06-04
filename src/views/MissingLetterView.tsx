/* ──────────────────────────────────────────────────────────────────────────
 * GAME "BÉ TÌM CHỮ BỊ MẤT" (Game Island)
 *
 * Bé 5–6 tuổi giúp con vật / đồ vật tìm lại chữ cái bị mất trong tên của chúng.
 * Mỗi màn (level) là một chủ đề gồm nhiều câu hỏi; trả lời đúng được cộng điểm,
 * có hệ thống COMBO (đúng liên tiếp → nhân điểm) và sticker thưởng cuối màn.
 *
 * Triển khai theo convention của repo (HTML/Tailwind + canvas-confetti + TTS),
 * KHÔNG dùng React Konva — particle/feedback dùng canvas-confetti & CSS animation
 * như các game cùng loại (xem RhymeGardenView).
 *
 * localStorage (đều có prefix `lingoland_` để Profile-reset quét sạch):
 *   - lingoland_missingletter_hs    : number — điểm cao nhất 1 màn từng đạt
 *   - lingoland_missingletter_stars : JSON Record<levelId, stars(1..3)> — sao tốt
 *                                     nhất mỗi màn; cũng dùng để mở khoá tuần tự
 *                                     và xác định sticker đã sưu tầm.
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  MISSING_LETTER_LEVELS,
  TOTAL_ML_LEVELS,
  fullWord,
  allChoices,
  type MLLevel,
  type MLQuestion,
} from '../data/missingLetterData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'home' | 'playing' | 'result' | 'stickers';

const HS_KEY = 'lingoland_missingletter_hs';
const STARS_KEY = 'lingoland_missingletter_stars';
const TRANSITION_DELAY = 1200; // ms — thời gian dừng để bé thấy đáp án + nghe đọc từ
const SCORE_PER_CORRECT = 10;
const COMBO_X2 = 3; // đúng liên tiếp ≥ 3 → nhân đôi điểm
const COMBO_X3 = 5; // đúng liên tiếp ≥ 5 → nhân ba điểm

const CONFETTI_COLORS = ['#7dd3fc', '#a7f3d0', '#fde68a', '#f9a8d4', '#c4b5fd'];

// ── localStorage helpers ───────────────────────────────────────────────────
const loadHs = (): number => {
  try {
    return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
};
const saveHs = (n: number) => {
  try {
    localStorage.setItem(HS_KEY, String(n));
  } catch {
    /* ignore */
  }
};

type StarMap = Record<string, number>;
const loadStars = (): StarMap => {
  try {
    const raw = localStorage.getItem(STARS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as StarMap;
    return {};
  } catch {
    return {};
  }
};
const saveStars = (m: StarMap) => {
  try {
    localStorage.setItem(STARS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};

// ── Tiện ích ────────────────────────────────────────────────────────────────
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Tách 1 chuỗi thành mảng "ký tự hiển thị" an toàn với Unicode (chữ có dấu).
const chars = (s: string): string[] => Array.from(s);

// Số sao theo tỉ lệ trả lời ĐÚNG NGAY LẦN ĐẦU (firstTry) / tổng số câu.
const starsFor = (firstTry: number, total: number): number => {
  const ratio = total === 0 ? 0 : firstTry / total;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
};

export default function MissingLetterView({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('home');
  const [levelIdx, setLevelIdx] = useState(0);

  // Tiến độ đã lưu
  const [starMap, setStarMap] = useState<StarMap>(() => loadStars());
  const [hs, setHs] = useState<number>(() => loadHs());

  // Trạng thái 1 lượt chơi
  const [order, setOrder] = useState<MLQuestion[]>([]); // câu hỏi đã xáo trộn cho màn
  const [qIdx, setQIdx] = useState(0);
  const [choices, setChoices] = useState<string[]>([]); // 4 đáp án đã xáo cho câu hiện tại
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0); // số câu đúng-ngay-lần-đầu liên tiếp
  const [firstTryCount, setFirstTryCount] = useState(0); // tổng câu đúng ngay lần đầu
  const [wrongPicks, setWrongPicks] = useState<string[]>([]); // các lựa chọn sai ở câu hiện tại
  const [solved, setSolved] = useState(false); // câu hiện tại đã giải đúng
  const [shakeChoice, setShakeChoice] = useState<string | null>(null);
  const [comboBanner, setComboBanner] = useState<string | null>(null);
  const [floatPoints, setFloatPoints] = useState<{ text: string; key: number } | null>(null);

  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };
  useEffect(() => () => clearTimers(), []); // cleanup khi unmount — tránh memory leak

  const level: MLLevel | undefined = MISSING_LETTER_LEVELS[levelIdx];
  const question: MLQuestion | undefined = order[qIdx];

  // Mức nhân điểm hiện tại theo combo.
  const comboMultiplier = combo >= COMBO_X3 ? 3 : combo >= COMBO_X2 ? 2 : 1;

  // Mở khoá tuần tự: màn i mở nếu i===0 hoặc màn i-1 đã đạt ≥1 sao.
  const isLevelUnlocked = useCallback(
    (idx: number): boolean => {
      if (idx <= 0) return true;
      const prev = MISSING_LETTER_LEVELS[idx - 1];
      return (starMap[prev.id] ?? 0) >= 1;
    },
    [starMap],
  );

  // ── Bắt đầu một màn ────────────────────────────────────────────────────
  const startLevel = useCallback((idx: number) => {
    const lv = MISSING_LETTER_LEVELS[idx];
    if (!lv) return;
    clearTimers();
    setLevelIdx(idx);
    setOrder(shuffle(lv.questions));
    setQIdx(0);
    setScore(0);
    setCombo(0);
    setFirstTryCount(0);
    setWrongPicks([]);
    setSolved(false);
    setComboBanner(null);
    setFloatPoints(null);
    setPhase('playing');
  }, []);

  // Xáo trộn lại 4 đáp án mỗi khi đổi câu hỏi.
  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    setChoices(shuffle(allChoices(question)));
    setWrongPicks([]);
    setSolved(false);
  }, [phase, question]);

  // Đọc từ (có chỗ trống) khi hiện câu hỏi mới — giúp bé liên hệ hình ↔ tiếng.
  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    const t = window.setTimeout(() => {
      speak(`${fullWord(question)} thiếu chữ gì?`, LANG_SPEAK_DEFAULT);
    }, 350);
    addTimer(t);
  }, [phase, qIdx, question]);

  // ── Xử lý chọn đáp án ───────────────────────────────────────────────────
  const handleChoice = (opt: string) => {
    if (!question || !level || solved) return;
    if (wrongPicks.includes(opt)) return; // đã chọn sai rồi → bỏ qua

    if (opt === question.missing) {
      // ===== ĐÚNG =====
      const isFirstTry = wrongPicks.length === 0;
      setSolved(true);
      playSfx('snd-correct');
      playTing();

      // Combo chỉ tăng khi đúng NGAY lần đầu; nếu phải thử lại thì không tính combo.
      let gained = SCORE_PER_CORRECT;
      if (isFirstTry) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        setFirstTryCount((c) => c + 1);
        const mult = newCombo >= COMBO_X3 ? 3 : newCombo >= COMBO_X2 ? 2 : 1;
        gained = SCORE_PER_CORRECT * mult;

        // Banner combo tại đúng các mốc.
        if (newCombo === COMBO_X3) {
          setComboBanner('🔥 TUYỆT VỜI! x2');
          speak('Tuyệt vời', LANG_SPEAK_DEFAULT);
        } else if (newCombo === COMBO_X3 + 1) {
          setComboBanner('🔥 TUYỆT VỜI! x2');
        } else if (newCombo === COMBO_X3 + 2) {
          setComboBanner('🌟 SIÊU GIỎI! x3');
          speak('Siêu giỏi', LANG_SPEAK_DEFAULT);
        } else if (newCombo > COMBO_X3 + 2) {
          setComboBanner('🌟 SIÊU GIỎI! x3');
        } else {
          setComboBanner(null);
        }
      } else {
        setComboBanner(null);
      }

      setScore((s) => s + gained);
      setFloatPoints({ text: `+${gained}`, key: qIdx * 10 + wrongPicks.length });

      // Particle effect ăn mừng câu đúng.
      confetti({
        particleCount: 45,
        spread: 65,
        startVelocity: 30,
        origin: { y: 0.45 },
        colors: CONFETTI_COLORS,
      });

      // Đọc lại TỪ HOÀN CHỈNH bằng TTS (đợi một chút cho ting kêu xong).
      const tSpeak = window.setTimeout(() => {
        speak(fullWord(question), LANG_SPEAK_DEFAULT);
      }, 450);
      addTimer(tSpeak);

      // Sang câu kế tiếp hoặc kết thúc màn.
      const tNext = window.setTimeout(() => {
        setComboBanner(null);
        setFloatPoints(null);
        if (qIdx + 1 < order.length) {
          setQIdx(qIdx + 1);
        } else {
          finishLevel(isFirstTry);
        }
      }, TRANSITION_DELAY);
      addTimer(tNext);
    } else {
      // ===== SAI ===== (không trừ điểm, cho chọn lại)
      playSfx('snd-wrong');
      playBip();
      setCombo(0); // chuỗi combo đứt
      setComboBanner(null);
      setWrongPicks((w) => [...w, opt]);
      setShakeChoice(opt);
      const t = window.setTimeout(() => setShakeChoice((s) => (s === opt ? null : s)), 450);
      addTimer(t);
    }
  };

  // ── Kết thúc màn → tính sao, lưu, chuyển sang result ────────────────────
  const finishLevel = (lastFirstTry: boolean) => {
    if (!level) return;
    // firstTryCount trong state chưa kịp gồm câu cuối (setState async) → cộng tay.
    const totalFirstTry = firstTryCount + (lastFirstTry ? 1 : 0);
    const stars = starsFor(totalFirstTry, order.length);

    // Lưu sao tốt nhất cho màn này.
    setStarMap((prev) => {
      const best = Math.max(prev[level.id] ?? 0, stars);
      const next = { ...prev, [level.id]: best };
      saveStars(next);
      return next;
    });

    // Điểm cao nhất 1 màn.
    setScore((finalScore) => {
      if (finalScore > hs) {
        setHs(finalScore);
        saveHs(finalScore);
      }
      return finalScore;
    });

    setPhase('result');
  };

  const replayPrompt = () => {
    if (question) speak(`${fullWord(question)} thiếu chữ gì?`, LANG_SPEAK_DEFAULT);
  };

  // Confetti lớn + chúc mừng khi vào màn result.
  useEffect(() => {
    if (phase !== 'result') return;
    confetti({
      particleCount: 180,
      spread: 100,
      origin: { y: 0.5 },
      colors: CONFETTI_COLORS,
    });
    const lv = MISSING_LETTER_LEVELS[levelIdx];
    if (lv) {
      const t = window.setTimeout(
        () => speak(`Hoàn thành ${lv.title}! Bé nhận được ${lv.stickerName}.`, LANG_SPEAK_DEFAULT),
        400,
      );
      return () => window.clearTimeout(t);
    }
  }, [phase, levelIdx]);

  const earnedStickers = useMemo(
    () => MISSING_LETTER_LEVELS.filter((lv) => (starMap[lv.id] ?? 0) >= 1),
    [starMap],
  );

  // ════════════════════════ HOME ════════════════════════
  if (phase === 'home') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>

        <div className="text-center mb-5">
          <div className="text-7xl mb-2 floating">🔤</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
            Bé Tìm Chữ Bị Mất
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            Các bạn thú bị rơi mất một chữ trong tên. Bé chọn chữ đúng để giúp nhé!
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-1.5 rounded-full">
            ⭐ Kỷ lục: {hs} điểm
          </div>
          <button
            onClick={() => setPhase('stickers')}
            className="bg-pink-100 text-pink-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95 transition-all"
          >
            🎁 Sticker {earnedStickers.length}/{TOTAL_ML_LEVELS}
          </button>
        </div>

        <div className="space-y-3">
          {MISSING_LETTER_LEVELS.map((lv, idx) => {
            const unlocked = isLevelUnlocked(idx);
            const stars = starMap[lv.id] ?? 0;
            return (
              <button
                key={lv.id}
                disabled={!unlocked}
                onClick={() => startLevel(idx)}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked
                    ? `bg-gradient-to-br ${lv.gradient}`
                    : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-5xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                  {unlocked ? lv.emoji : '🔒'}
                </div>
                <div className="flex-1">
                  <div
                    className={`font-black text-lg leading-tight ${
                      unlocked ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {unlocked ? lv.title : '???'}
                  </div>
                  <div
                    className={`text-[11px] font-bold mt-0.5 ${
                      unlocked ? 'text-white/90' : 'text-slate-400'
                    }`}
                  >
                    {unlocked
                      ? `${lv.questions.length} câu · thưởng ${lv.sticker}`
                      : 'Hoàn thành màn trước để mở khoá'}
                  </div>
                </div>
                {unlocked && (
                  <div className="text-sm">
                    {stars > 0 ? (
                      <span className="font-black text-white drop-shadow">
                        {'⭐'.repeat(stars)}
                      </span>
                    ) : (
                      <span className="text-white text-xl">▶️</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════ STICKER GALLERY ════════════════════════
  if (phase === 'stickers') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('home')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>
        <div className="text-center mb-5">
          <div className="text-6xl mb-2 floating">🎁</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
            Bộ Sưu Tập Sticker
          </h2>
          <p className="text-slate-500 text-sm font-bold mt-1">
            Hoàn thành mỗi màn để nhận một sticker mới!
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MISSING_LETTER_LEVELS.map((lv) => {
            const earned = (starMap[lv.id] ?? 0) >= 1;
            return (
              <div
                key={lv.id}
                className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-1 border-2 ${
                  earned
                    ? 'bg-gradient-to-br from-amber-50 to-pink-50 border-pink-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => earned && speak(lv.stickerName, LANG_SPEAK_DEFAULT)}
              >
                <div className={`text-6xl ${earned ? '' : 'grayscale opacity-30'}`}>
                  {earned ? lv.sticker : '🔒'}
                </div>
                <div
                  className={`text-xs font-black ${
                    earned ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {earned ? lv.stickerName : '???'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ════════════════════════ RESULT ════════════════════════
  if (phase === 'result' && level) {
    const stars = starsFor(firstTryCount, order.length);
    const nextIdx = levelIdx + 1;
    const hasNext = nextIdx < TOTAL_ML_LEVELS;
    return (
      <div className="text-center py-6 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-2 floating">{level.sticker}</div>
        <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
          Giỏi quá!
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-1">Bé đã hoàn thành màn</p>
        <p className="text-xl font-black text-slate-800 mb-3">"{level.title}"</p>

        {/* 3 ngôi sao — sáng theo thành tích */}
        <div className="flex justify-center gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`text-5xl animate-in zoom-in ${i < stars ? '' : 'grayscale opacity-25'}`}
              style={{ animationDelay: `${i * 220}ms` }}
            >
              ⭐
            </span>
          ))}
        </div>

        <div className="bg-gradient-to-br from-pink-50 via-fuchsia-50 to-sky-50 border-2 border-pink-100 rounded-3xl p-4 mb-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Điểm màn này
          </div>
          <div className="text-4xl font-black bg-gradient-to-r from-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
            {score}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-1">
            Đúng ngay lần đầu: {firstTryCount}/{order.length}
          </div>
        </div>

        {/* Sticker nhận được */}
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 font-black text-sm px-4 py-2 rounded-full mb-5">
          🎁 Nhận sticker: {level.sticker} {level.stickerName}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => startLevel(levelIdx)}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
          {hasNext ? (
            <button
              onClick={() => startLevel(nextIdx)}
              className="flex-1 py-4 bg-gradient-to-r from-sky-500 via-fuchsia-500 to-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-fuchsia-200 active:scale-95 transition-all"
            >
              Màn tiếp ▶️
            </button>
          ) : (
            <button
              onClick={() => setPhase('home')}
              className="flex-1 py-4 bg-gradient-to-r from-sky-500 via-fuchsia-500 to-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-fuchsia-200 active:scale-95 transition-all"
            >
              🏠 Về màn chọn
            </button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════ PLAYING ════════════════════════
  if (!level || !question) return null;

  const beforeChars = chars(question.before);
  const afterChars = chars(question.after);
  const progress = ((qIdx + (solved ? 1 : 0)) / order.length) * 100;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto">
      {/* Thanh trên: thoát · chủ đề · điểm */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => {
            clearTimers();
            setPhase('home');
          }}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
          {level.emoji} {level.title}
        </span>
        <span className="font-black text-fuchsia-500 text-sm">⭐ {score}</span>
      </div>

      {/* Thanh tiến độ */}
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] font-bold text-slate-400">
          Câu {qIdx + 1}/{order.length}
        </span>
        {comboMultiplier > 1 && (
          <span className="text-[11px] font-black text-orange-500">
            🔥 Combo x{comboMultiplier}
          </span>
        )}
      </div>

      {/* Khung hình minh hoạ + từ bị thiếu */}
      <div className="relative bg-gradient-to-br from-sky-50 via-fuchsia-50 to-amber-50 border-2 border-sky-100 rounded-3xl p-5 mb-4">
        <button
          type="button"
          onClick={replayPrompt}
          aria-label="Nghe lại"
          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-sky-200 flex items-center justify-center active:scale-95 shadow-sm text-sky-500"
        >
          🔁
        </button>

        {/* Banner combo / điểm bay lên */}
        {comboBanner && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-orange-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg animate-in zoom-in whitespace-nowrap">
            {comboBanner}
          </div>
        )}
        {floatPoints && (
          <div
            key={floatPoints.key}
            className="absolute right-5 top-4 text-emerald-500 font-black text-2xl animate-in fade-in zoom-in pointer-events-none"
          >
            {floatPoints.text}
          </div>
        )}

        <div className="text-center text-7xl mb-3 floating">{question.emoji}</div>

        {/* Các ô chữ — ô trống ở giữa */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {beforeChars.map((c, i) => (
            <LetterTile key={`b${i}`} char={c} />
          ))}
          <BlankTile
            filled={solved ? question.missing : null}
          />
          {afterChars.map((c, i) => (
            <LetterTile key={`a${i}`} char={c} />
          ))}
        </div>
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-3">
        👆 Chọn chữ còn thiếu
      </p>

      {/* 4 đáp án */}
      <div className="grid grid-cols-2 gap-3">
        {choices.map((opt) => {
          const isWrongPicked = wrongPicks.includes(opt);
          const isShaking = shakeChoice === opt;
          const isCorrectSolved = solved && opt === question.missing;
          return (
            <button
              key={opt}
              type="button"
              disabled={solved || isWrongPicked}
              onClick={() => handleChoice(opt)}
              className={`h-20 rounded-2xl border-2 flex items-center justify-center font-black text-4xl transition-all active:scale-95 ${
                isShaking
                  ? 'shake-x border-red-300 bg-red-50 text-red-400'
                  : isCorrectSolved
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-200'
                    : isWrongPicked
                      ? 'border-slate-100 bg-slate-50 text-slate-300 opacity-40'
                      : 'border-sky-100 bg-white text-slate-700 shadow-sm hover:border-sky-200'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Ô chữ đã biết ───────────────────────────────────────────────────────────
function LetterTile({ char }: { char: string }) {
  return (
    <div className="w-12 h-14 md:w-14 md:h-16 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center text-3xl md:text-4xl font-black text-slate-700">
      {char}
    </div>
  );
}

// ── Ô trống (chữ bị mất) — rỗng khi chưa trả lời, sáng xanh khi đã điền đúng ──
function BlankTile({ filled }: { filled: string | null }) {
  return (
    <div
      className={`w-12 h-14 md:w-14 md:h-16 rounded-xl flex items-center justify-center text-3xl md:text-4xl font-black transition-all ${
        filled
          ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-600 ring-4 ring-emerald-200 animate-in zoom-in'
          : 'bg-amber-50 border-2 border-dashed border-amber-400 text-amber-400 animate-pulse'
      }`}
    >
      {filled ?? '?'}
    </div>
  );
}
