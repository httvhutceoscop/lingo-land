/* ──────────────────────────────────────────────────────────────────────────
 * GAME "SIÊU THỊ TOÁN HỌC" (Game Island)
 *
 * Bé 5–7 tuổi đóng vai nhân viên siêu thị. Khách hàng đưa yêu cầu, bé thực hiện
 * thao tác toán học tương ứng qua 5 chế độ: ĐẾM · SO SÁNH · CỘNG · TRỪ · THANH TOÁN.
 * Có hệ thống MẠNG (❤️), COMBO nhân điểm, LEVEL tăng dần và STICKER sưu tầm.
 *
 * GHI CHÚ KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Repo này KHÔNG dùng Konva → để bám convention
 *     (xem CLAUDE.md & các game cùng loại), game được dựng bằng HTML/Tailwind +
 *     canvas-confetti cho particle + Web Speech API (TTS). Mọi hiệu ứng "đúng/sai/
 *     coin/star/confetti" vẫn đầy đủ, chỉ khác lớp render.
 *   - Thao tác chính là CHẠM (tap) thay vì kéo-thả thuần: với bé 5–7 tuổi trên
 *     tablet, chạm để "bỏ vào giỏ" ổn định và ít lỗi hơn drag — vẫn giữ đúng
 *     core loop "đếm/chọn đúng số lượng".
 *
 * React quản lý toàn bộ game state (score, lives, level, combo, câu hỏi, giỏ
 * hàng, sticker). Câu hỏi do supermarketData.generateQuestion(level) sinh ra.
 *
 * localStorage (prefix `lingoland_` để Profile-reset quét sạch):
 *   - lingoland_supermarket_hs       : number — điểm cao nhất
 *   - lingoland_supermarket_stickers : JSON string[] — id sticker đã sưu tầm
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  STICKERS,
  generateQuestion,
  type Sticker,
  type SMQuestion,
} from '../data/supermarketData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'start' | 'playing' | 'gameover';
type Feedback = 'idle' | 'correct' | 'wrong';

const HS_KEY = 'lingoland_supermarket_hs';
const STICKERS_KEY = 'lingoland_supermarket_stickers';

// Bảng màu pastel theo doc (sky / mint / soft yellow / pastel pink) cho confetti.
const CONFETTI_COLORS = ['#7dd3fc', '#a7f3d0', '#fde68a', '#f9a8d4', '#c4b5fd'];

// Các khuôn mặt khách hàng — đổi ngẫu nhiên mỗi câu cho sinh động.
const CUSTOMERS = ['👩', '👨', '🧑', '👵', '👴', '🧒', '👧', '👦', '🧓', '👱‍♀️'];

const { INITIAL_LIVES, SCORE_PER_CORRECT, QUESTIONS_PER_LEVEL, MAX_LEVEL, COMBO_X2, COMBO_X3, ANIMATION_DURATION } =
  GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

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

const loadStickers = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STICKERS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveStickers = (set: Set<string>) => {
  try {
    localStorage.setItem(STICKERS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
};

/* ===========================================================================
 * Tiện ích nhỏ
 * ========================================================================= */

const randCustomer = (): string => CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];

/** Số sao tổng kết dựa trên level cao nhất đạt được. */
const starsForLevel = (level: number): number => {
  if (level >= 15) return 3;
  if (level >= 8) return 2;
  return 1;
};

/** Câu đọc TTS chúc mừng khi đúng — tuỳ chế độ để củng cố kết quả. */
const successSpeech = (q: SMQuestion): string => {
  switch (q.mode) {
    case 'count':
      return `Đúng rồi! ${q.target} ${q.product?.name ?? ''}`;
    case 'add':
    case 'subtract':
      return `Đúng rồi! Bằng ${q.answer}`;
    case 'checkout':
      return `Đúng rồi! ${q.answer} xu`;
    case 'compare':
    default:
      return 'Đúng rồi!';
  }
};

export default function SupermarketMathView({ onBack }: Props) {
  /* ── State chính ──────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('start');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState<number>(INITIAL_LIVES);
  const [combo, setCombo] = useState(0); // số câu đúng liên tiếp
  const [comboMax, setComboMax] = useState(0); // combo cao nhất (thành tích)
  const [correctInLevel, setCorrectInLevel] = useState(0); // tiến độ trong level
  const [totalCorrect, setTotalCorrect] = useState(0); // tổng câu đúng (thành tích)

  const [question, setQuestion] = useState<SMQuestion | null>(null);
  const [customer, setCustomer] = useState('👩');
  const [answered, setAnswered] = useState(false); // đã trả lời ĐÚNG câu hiện tại?

  /* ── State tương tác / phản hồi ──────────────────────────────────────── */
  const [cartCount, setCartCount] = useState(0); // chế độ đếm: số món trong giỏ
  const [wrongOptions, setWrongOptions] = useState<number[]>([]); // số đã chọn sai
  const [wrongSide, setWrongSide] = useState<number | null>(null); // so sánh: bên chọn sai
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [shake, setShake] = useState(false);
  const [floatPoints, setFloatPoints] = useState<string | null>(null);
  const [comboBanner, setComboBanner] = useState<string | null>(null);

  /* ── Tiến độ lưu lại ─────────────────────────────────────────────────── */
  const [hs, setHs] = useState<number>(() => loadHs());
  const [unlocked, setUnlocked] = useState<Set<string>>(() => loadStickers());
  const [newSticker, setNewSticker] = useState<Sticker | null>(null); // toast khi mở khoá
  const [levelUp, setLevelUp] = useState(false); // banner "Lên cấp!"

  /* ── Quản lý timer để cleanup, tránh memory leak ─────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]); // unmount → dọn sạch

  /* ── Sinh câu hỏi mới cho một level ──────────────────────────────────── */
  const nextQuestion = useCallback((forLevel: number) => {
    setQuestion(generateQuestion(forLevel));
    setCustomer(randCustomer());
    setAnswered(false);
    setCartCount(0);
    setWrongOptions([]);
    setWrongSide(null);
    setFeedback('idle');
    setFloatPoints(null);
  }, []);

  /* ── Bắt đầu / chơi lại ──────────────────────────────────────────────── */
  const startGame = useCallback(() => {
    clearTimers();
    setLevel(1);
    setScore(0);
    setLives(INITIAL_LIVES);
    setCombo(0);
    setComboMax(0);
    setCorrectInLevel(0);
    setTotalCorrect(0);
    setComboBanner(null);
    setNewSticker(null);
    setLevelUp(false);
    setPhase('playing');
    nextQuestion(1);
  }, [clearTimers, nextQuestion]);

  /* ── Đọc đề bài bằng TTS mỗi khi có câu hỏi mới ──────────────────────── */
  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    const t = window.setTimeout(() => speak(question.speak, LANG_SPEAK_DEFAULT), 350);
    addTimer(t);
  }, [phase, question]);

  /* ── Kết thúc game → tính sao, lưu kỷ lục ────────────────────────────── */
  const endGame = useCallback(() => {
    setScore((finalScore) => {
      if (finalScore > hs) {
        setHs(finalScore);
        saveHs(finalScore);
      }
      return finalScore;
    });
    setPhase('gameover');
  }, [hs]);

  /* ── Sau khi trả lời ĐÚNG: cộng tiến độ, lên cấp, mở sticker, câu mới ── */
  const afterCorrect = useCallback(() => {
    setFeedback('idle');
    setFloatPoints(null);
    setComboBanner(null);

    const completed = correctInLevel + 1;
    if (completed >= QUESTIONS_PER_LEVEL) {
      // ── HOÀN THÀNH LEVEL hiện tại ──
      const finishedLevel = level;

      // Mở khoá sticker nếu có cột mốc rơi vào level vừa xong.
      const st = STICKERS.find((s) => s.atLevel === finishedLevel);
      if (st && !unlocked.has(st.id)) {
        const next = new Set(unlocked);
        next.add(st.id);
        setUnlocked(next);
        saveStickers(next);
        setNewSticker(st);
        const tc = window.setTimeout(() => setNewSticker(null), 2600);
        addTimer(tc);
      }

      const nextLevel = Math.min(level + 1, MAX_LEVEL);
      setLevel(nextLevel);
      setCorrectInLevel(0);
      setLevelUp(true);
      const tl = window.setTimeout(() => setLevelUp(false), 1500);
      addTimer(tl);
      speak('Lên cấp rồi!', LANG_SPEAK_DEFAULT);
      nextQuestion(nextLevel);
    } else {
      // Còn trong level → câu kế tiếp.
      setCorrectInLevel(completed);
      nextQuestion(level);
    }
  }, [correctInLevel, level, unlocked, nextQuestion]);

  /* ── Xử lý kết quả một lượt trả lời ──────────────────────────────────── */
  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!question || answered) return;

      if (isCorrect) {
        // ===== ĐÚNG =====
        setAnswered(true);
        const newCombo = combo + 1;
        const mult = newCombo >= COMBO_X3 ? 3 : newCombo >= COMBO_X2 ? 2 : 1;
        const gained = SCORE_PER_CORRECT * mult;

        setCombo(newCombo);
        setComboMax((m) => Math.max(m, newCombo));
        setScore((s) => s + gained);
        setTotalCorrect((c) => c + 1);
        setFeedback('correct');
        setFloatPoints(`+${gained}`);

        playSfx('snd-correct');
        playTing();
        // Confetti + "coin/star burst" (đều bằng particle nhiều màu).
        confetti({
          particleCount: 50,
          spread: 70,
          startVelocity: 32,
          origin: { y: 0.45 },
          colors: CONFETTI_COLORS,
        });

        // Banner combo tại đúng mốc x2 / x3.
        if (newCombo === COMBO_X2) {
          setComboBanner('🔥 TUYỆT VỜI! x2');
          speak('Tuyệt vời', LANG_SPEAK_DEFAULT);
        } else if (newCombo === COMBO_X3) {
          setComboBanner('🌟 SIÊU GIỎI! x3');
          speak('Siêu giỏi', LANG_SPEAK_DEFAULT);
        } else {
          // Đọc lại kết quả để củng cố (đợi chút cho tiếng "ting" xong).
          const ts = window.setTimeout(() => speak(successSpeech(question), LANG_SPEAK_DEFAULT), 450);
          addTimer(ts);
        }

        // Chuyển tiếp sau khi bé kịp xem hiệu ứng.
        const tn = window.setTimeout(afterCorrect, ANIMATION_DURATION + 500);
        addTimer(tn);
      } else {
        // ===== SAI ===== (−1 mạng, được thử lại nếu còn mạng)
        const newLives = lives - 1;
        setLives(newLives);
        setCombo(0);
        setComboBanner(null);
        setFeedback('wrong');
        setShake(true);

        playSfx('snd-wrong');
        playBip();

        const ts = window.setTimeout(() => setShake(false), 450);
        addTimer(ts);
        const tf = window.setTimeout(() => setFeedback('idle'), ANIMATION_DURATION);
        addTimer(tf);

        if (newLives <= 0) {
          // Hết mạng → Game Over (đợi chút cho bé thấy phản hồi sai).
          const te = window.setTimeout(endGame, 800);
          addTimer(te);
        }
      }
    },
    [question, answered, combo, lives, afterCorrect, endGame],
  );

  /* ── Các handler tương tác theo từng chế độ ──────────────────────────── */

  // ĐẾM: chạm kệ hàng để thêm 1 món vào giỏ.
  const addToCart = () => {
    if (answered || !question) return;
    setCartCount((c) => c + 1);
    playPop();
  };
  // ĐẾM: bỏ bớt 1 món.
  const removeFromCart = () => {
    if (answered) return;
    setCartCount((c) => Math.max(0, c - 1));
  };
  // ĐẾM: bấm "Xong" để kiểm tra số lượng.
  const submitCount = () => {
    if (answered || !question) return;
    handleAnswer(cartCount === question.target);
  };

  // CHỌN SỐ (cộng/trừ/thanh toán): chạm một nút số.
  const pickNumber = (opt: number) => {
    if (answered || !question || wrongOptions.includes(opt)) return;
    if (opt === question.answer) handleAnswer(true);
    else {
      setWrongOptions((w) => [...w, opt]);
      handleAnswer(false);
    }
  };

  // SO SÁNH: chạm một bên (0 = trái, 1 = phải).
  const pickSide = (side: number) => {
    if (answered || !question) return;
    if (side === question.answer) handleAnswer(true);
    else {
      setWrongSide(side);
      handleAnswer(false);
      const t = window.setTimeout(() => setWrongSide((s) => (s === side ? null : s)), 500);
      addTimer(t);
    }
  };

  const replayInstruction = () => {
    if (question) speak(question.speak, LANG_SPEAK_DEFAULT);
  };

  const earnedCount = useMemo(() => STICKERS.filter((s) => unlocked.has(s.id)).length, [unlocked]);

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: START
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'start') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>

        <div className="text-center py-2">
          <div className="text-7xl mb-2 floating">🛒</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
            Siêu Thị Toán Học
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed mb-4">
            Bé làm nhân viên siêu thị nhé! Giúp khách mua hàng bằng cách đếm, so
            sánh, cộng, trừ và tính tiền.
          </p>

          {/* Mascot siêu thị + lời chào */}
          <div className="relative bg-gradient-to-br from-sky-50 via-emerald-50 to-amber-50 border-2 border-sky-100 rounded-3xl p-5 mb-4">
            <div className="text-6xl mb-1">🧑‍🍳</div>
            <div className="text-sm font-bold text-slate-600">
              "Chào bé! Hôm nay siêu thị đông khách lắm, giúp cô nhé!"
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-1.5 rounded-full">
              ⭐ Kỷ lục: {hs}
            </div>
            <div className="bg-pink-100 text-pink-700 font-black text-xs px-3 py-1.5 rounded-full">
              🎁 Sticker {earnedCount}/{STICKERS.length}
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-5 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 text-white rounded-3xl font-black text-xl shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            🛍️ BẮT ĐẦU
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: GAME OVER / RESULT
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'gameover') {
    const stars = starsForLevel(level);
    return (
      <div className="text-center py-6 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-2 floating">🏆</div>
        <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
          Hết giờ làm!
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-3">
          Bé đã phục vụ {totalCorrect} khách hàng! 🛍️
        </p>

        {/* 3 sao theo level đạt được */}
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

        {/* Bảng thành tích */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm</div>
            <div className="text-2xl font-black text-sky-600">{score}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Cấp</div>
            <div className="text-2xl font-black text-emerald-600">{level}</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Combo</div>
            <div className="text-2xl font-black text-amber-600">{comboMax}</div>
          </div>
        </div>

        {score >= hs && score > 0 && (
          <div className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-sm px-4 py-1.5 rounded-full mb-3">
            🎉 Kỷ lục mới!
          </div>
        )}

        {/* Bộ sưu tập sticker */}
        <div className="bg-gradient-to-br from-pink-50 to-amber-50 border-2 border-pink-100 rounded-3xl p-4 mb-5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Sticker đã sưu tầm
          </div>
          <div className="flex justify-center gap-3">
            {STICKERS.map((s) => {
              const got = unlocked.has(s.id);
              return (
                <div
                  key={s.id}
                  className="flex flex-col items-center"
                  onClick={() => got && speak(s.name, LANG_SPEAK_DEFAULT)}
                >
                  <span className={`text-4xl ${got ? '' : 'grayscale opacity-25'}`}>
                    {got ? s.emoji : '🔒'}
                  </span>
                  <span className={`text-[9px] font-bold mt-0.5 ${got ? 'text-slate-600' : 'text-slate-300'}`}>
                    {got ? s.name : '???'}
                  </span>
                </div>
              );
            })}
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
            onClick={startGame}
            className="flex-1 py-4 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            🔄 CHƠI LẠI
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PLAYING
   * ════════════════════════════════════════════════════════════════════ */
  if (!question) return null;

  return (
    <div className={`max-w-md mx-auto ${shake ? 'shake-x' : ''}`}>
      {/* ── Thanh trạng thái: thoát · cấp · điểm · mạng ─────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => {
            clearTimers();
            setPhase('start');
          }}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-700 font-black text-xs px-2.5 py-1 rounded-full">
            Cấp {level}
          </span>
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">
            ⭐ {score}
          </span>
          {/* Mạng — ❤️ còn / 🤍 đã mất */}
          <span className="text-sm tracking-tight">
            {Array.from({ length: INITIAL_LIVES }, (_, i) => (i < lives ? '❤️' : '🤍')).join('')}
          </span>
        </div>
      </div>

      {/* ── Tiến độ trong level (chấm tròn) ─────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-3 px-1">
        {Array.from({ length: QUESTIONS_PER_LEVEL }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < correctInLevel ? 'bg-emerald-400' : 'bg-slate-200'
            }`}
          />
        ))}
        {combo >= COMBO_X2 && (
          <span className="text-[11px] font-black text-orange-500 ml-1 whitespace-nowrap">
            🔥 x{combo >= COMBO_X3 ? 3 : 2}
          </span>
        )}
      </div>

      {/* ── Khách hàng + bong bóng yêu cầu ──────────────────────────────── */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-5xl shrink-0 floating">{customer}</div>
        <div className="relative flex-1 bg-white border-2 border-sky-100 rounded-2xl rounded-tl-sm p-3 shadow-sm">
          <p className="font-black text-slate-700 text-base leading-snug pr-8">
            {question.instruction}
          </p>
          <button
            type="button"
            onClick={replayInstruction}
            aria-label="Nghe lại"
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center active:scale-95 text-sky-500"
          >
            🔁
          </button>
        </div>
      </div>

      {/* ── Khu vực tương tác theo từng chế độ ──────────────────────────── */}
      <div className="relative">
        {/* Điểm thưởng bay lên khi đúng */}
        {floatPoints && (
          <div className="absolute right-3 -top-1 z-10 text-emerald-500 font-black text-2xl animate-in fade-in zoom-in pointer-events-none">
            {floatPoints}
          </div>
        )}
        {/* Banner combo */}
        {comboBanner && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 bg-orange-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg animate-in zoom-in whitespace-nowrap">
            {comboBanner}
          </div>
        )}
        {/* Icon phản hồi sai 😅 */}
        {feedback === 'wrong' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="text-7xl animate-in zoom-in">😅</div>
          </div>
        )}

        {question.mode === 'count' && renderCountMode()}
        {question.mode === 'compare' && renderCompareMode()}
        {(question.mode === 'add' || question.mode === 'subtract') && renderArithMode()}
        {question.mode === 'checkout' && renderCheckoutMode()}
      </div>

      {/* ── Toast mở khoá sticker ───────────────────────────────────────── */}
      {newSticker && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-30 bg-white border-2 border-amber-200 rounded-3xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom">
          <span className="text-4xl">{newSticker.emoji}</span>
          <div className="text-left">
            <div className="text-[10px] font-bold text-amber-500 uppercase">Sticker mới!</div>
            <div className="font-black text-slate-700">{newSticker.name}</div>
          </div>
        </div>
      )}

      {/* ── Banner "Lên cấp!" ───────────────────────────────────────────── */}
      {levelUp && (
        <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-black text-2xl px-8 py-4 rounded-3xl shadow-2xl animate-in zoom-in">
            🎉 Lên cấp {level}!
          </div>
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────
   * CÁC HÀM RENDER THEO CHẾ ĐỘ
   * (đặt sau return chính nhờ hoisting của function declaration; chúng đọc
   *  `question`, state và handler ở closure phía trên)
   * ───────────────────────────────────────────────────────────────────── */

  // ── Chế độ ĐẾM: kệ hàng (chạm để thêm) + giỏ hàng ────────────────────
  function renderCountMode() {
    if (!question?.product) return null;
    const product = question.product;
    const correctNow = answered; // khi đã đúng → tô xanh giỏ
    return (
      <div>
        {/* Kệ hàng — chạm vào để bỏ 1 món vào giỏ */}
        <button
          type="button"
          onClick={addToCart}
          disabled={answered}
          className="w-full bg-gradient-to-br from-sky-50 to-emerald-50 border-2 border-sky-100 rounded-3xl p-4 mb-3 active:scale-[0.98] transition-all"
        >
          <div className="text-7xl mb-1">{product.emoji}</div>
          <div className="text-xs font-bold text-slate-500">
            👆 Chạm để bỏ {product.name} vào giỏ
          </div>
        </button>

        {/* Giỏ hàng — hiển thị các món đã thêm + số đếm */}
        <div
          className={`rounded-3xl border-2 p-4 mb-3 min-h-[7rem] transition-colors ${
            correctNow ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-500">🛒 Giỏ hàng</span>
            <span className="text-lg font-black text-slate-700">{cartCount}</span>
          </div>
          <div className="flex flex-wrap gap-1 justify-center items-center min-h-[3rem]">
            {cartCount === 0 ? (
              <span className="text-xs text-slate-400 font-bold">Giỏ đang trống…</span>
            ) : (
              Array.from({ length: cartCount }, (_, i) => (
                <span key={i} className="text-3xl animate-in zoom-in">
                  {product.emoji}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Nút điều khiển: bỏ bớt · Xong */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={removeFromCart}
            disabled={answered || cartCount === 0}
            className="px-5 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-xl active:scale-95 transition-all disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            onClick={submitCount}
            disabled={answered}
            className="flex-1 py-4 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
          >
            ✓ Xong
          </button>
        </div>
      </div>
    );
  }

  // ── Chế độ SO SÁNH: 2 đống hàng, chạm bên đúng (không hiện số) ────────
  function renderCompareMode() {
    if (!question?.left || !question?.right) return null;
    const sides = [question.left, question.right];
    return (
      <div className="grid grid-cols-2 gap-3">
        {sides.map((pile, idx) => {
          const isWrong = wrongSide === idx;
          const isCorrect = answered && question.answer === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => pickSide(idx)}
              disabled={answered}
              className={`rounded-3xl border-2 p-3 min-h-[10rem] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                isWrong
                  ? 'shake-x border-red-300 bg-red-50'
                  : isCorrect
                    ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200'
                    : 'border-sky-100 bg-white shadow-sm hover:border-sky-200'
              }`}
            >
              {/* Đống emoji — bé phải tự đếm để so sánh (cố ý KHÔNG ghi số) */}
              <div className="flex flex-wrap gap-0.5 justify-center items-center">
                {Array.from({ length: pile.count }, (_, i) => (
                  <span key={i} className="text-2xl leading-none">
                    {pile.product.emoji}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-1">{pile.product.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Chế độ CỘNG / TRỪ: minh hoạ trực quan + 4 nút số ─────────────────
  function renderArithMode() {
    if (!question?.product || !question.options) return null;
    const product = question.product;
    const isAdd = question.mode === 'add';

    return (
      <div>
        {/* Minh hoạ bằng emoji để bé "thấy" phép tính */}
        <div className="bg-gradient-to-br from-sky-50 to-emerald-50 border-2 border-sky-100 rounded-3xl p-4 mb-3">
          {isAdd ? (
            // CỘNG: nhóm A  ➕  nhóm B
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Group emoji={product.emoji} n={question.addA ?? 0} />
              <span className="text-3xl font-black text-emerald-500">＋</span>
              <Group emoji={product.emoji} n={question.addB ?? 0} />
            </div>
          ) : (
            // TRỪ: tổng, trong đó B món bị "lấy đi" (mờ + gạch)
            <div className="flex flex-wrap justify-center items-center gap-1">
              {Array.from({ length: question.subTotal ?? 0 }, (_, i) => {
                const removed = i >= (question.subTotal ?? 0) - (question.subRemove ?? 0);
                return (
                  <span
                    key={i}
                    className={`text-3xl leading-none ${removed ? 'grayscale opacity-30 line-through' : ''}`}
                  >
                    {product.emoji}
                  </span>
                );
              })}
              <span className="w-full text-center text-[11px] font-bold text-rose-400 mt-1">
                ➖ lấy đi {question.subRemove}
              </span>
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs font-bold mb-2">👆 Chọn số đúng</p>
        {renderNumberOptions(question.options)}
      </div>
    );
  }

  // ── Chế độ THANH TOÁN: hoá đơn + 4 nút số (tổng xu) ──────────────────
  function renderCheckoutMode() {
    if (!question?.lines || !question.options) return null;
    return (
      <div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-3xl p-4 mb-3">
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 text-center">
            🧾 Hoá đơn
          </div>
          <div className="space-y-2">
            {question.lines.map((line, i) => (
              <div key={i} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-700">{line.qty}</span>
                  <span className="text-2xl">{line.product.emoji}</span>
                  <span className="text-[11px] font-bold text-slate-400">{line.product.name}</span>
                </div>
                {/* Giá mỗi món: qty × đơn giá */}
                <span className="text-xs font-bold text-amber-600 whitespace-nowrap">
                  {line.qty} × {line.product.price}🪙
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs font-bold mb-2">👆 Tổng cộng mấy xu?</p>
        {renderNumberOptions(question.options)}
      </div>
    );
  }

  // ── Lưới 4 nút số dùng chung cho cộng / trừ / thanh toán ─────────────
  function renderNumberOptions(options: number[]) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {options.map((opt) => {
          const isWrong = wrongOptions.includes(opt);
          const isCorrect = answered && opt === question!.answer;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => pickNumber(opt)}
              disabled={answered || isWrong}
              className={`h-16 rounded-2xl border-2 flex items-center justify-center font-black text-3xl transition-all active:scale-95 ${
                isCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-200'
                  : isWrong
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
    );
  }
}

/* ── Component phụ: một nhóm N emoji (dùng cho minh hoạ phép cộng) ───────── */
function Group({ emoji, n }: { emoji: string; n: number }) {
  return (
    <div className="flex flex-wrap justify-center items-center gap-0.5 max-w-[7rem]">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="text-3xl leading-none">
          {emoji}
        </span>
      ))}
    </div>
  );
}
