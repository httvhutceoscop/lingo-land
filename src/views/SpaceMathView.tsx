/* ──────────────────────────────────────────────────────────────────────────
 * GAME "BAY VÀO VŨ TRỤ SỐ" (Game Island)
 *
 * Bé là phi hành gia nhí: bay qua 7 hành tinh toán học, robot AI giao nhiệm vụ,
 * bé trả lời để thu thập sao năng lượng, nâng cấp tàu, mở khoá hành tinh mới.
 * Có năng lượng ❤️, combo, ADAPTIVE LEARNING (tự tăng/giảm độ khó + hỗ trợ),
 * thành tích, sticker, gara tàu và bảng phụ huynh.
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Repo dùng HTML/Tailwind cho game dạng quiz
 *     (xem các game toán khác) → game này CHẠM để chọn đáp án, hiệu ứng bằng
 *     CSS + canvas-confetti. Câu hỏi sinh tự động qua spaceMathData (vô hạn).
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_space_stats    : JSON SpaceStats
 *   - lingoland_space_planets  : JSON string[] — id hành tinh đã hoàn thành
 *   - lingoland_space_pertype  : JSON Record<type,{correct,count}> — cho bảng PH
 *   - lingoland_space_ship     : string — id tàu đang chọn
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  PLANETS,
  SHIPS,
  TOTAL_PLANETS,
  ACHIEVEMENTS,
  STICKERS,
  generateForPlanet,
  type Planet,
  type Question,
  type QType,
  type SpaceStats,
  type AchievementCtx,
} from '../data/spaceMathData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'map' | 'mission' | 'garage' | 'collection' | 'parent';
type Feedback = 'idle' | 'correct' | 'wrong';

const STATS_KEY = 'lingoland_space_stats';
const PLANETS_KEY = 'lingoland_space_planets';
const PERTYPE_KEY = 'lingoland_space_pertype';
const SHIP_KEY = 'lingoland_space_ship';

const CONFETTI_COLORS = ['#38bdf8', '#a78bfa', '#22d3ee', '#fde047', '#fb923c'];

const {
  INITIAL_ENERGY,
  QUESTIONS_PER_PLANET,
  SCORE_CORRECT,
  SCORE_FAST_BONUS,
  FAST_SECONDS,
  COMBO_3,
  COMBO_3_BONUS,
  COMBO_5,
  COMBO_5_BONUS,
  COMBO_10,
  COMBO_10_BONUS,
  STARS_PER_CORRECT,
  STARS_PLANET_BONUS,
  SUPPORT_WRONG_STREAK,
  ADAPT_UP_STREAK,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
} = GAME_CONFIG;

/** Nhãn tiếng Việt cho từng loại câu hỏi (bảng phụ huynh). */
const TYPE_LABEL: Record<QType, string> = {
  count: 'Đếm số',
  number: 'Số học',
  add: 'Cộng',
  subtract: 'Trừ',
  compare: 'So sánh',
  pattern: 'Quy luật',
};

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): SpaceStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      missions: p?.missions || 0,
      stars: p?.stars || 0,
      correct: p?.correct || 0,
      attempts: p?.attempts || 0,
      timeMs: p?.timeMs || 0,
    };
  } catch {
    return { missions: 0, stars: 0, correct: 0, attempts: 0, timeMs: 0 };
  }
};
const saveStats = (s: SpaceStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const loadPlanets = (): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(PLANETS_KEY) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const savePlanets = (s: Set<string>) => {
  try {
    localStorage.setItem(PLANETS_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

type PerType = Record<string, { correct: number; count: number }>;
const loadPerType = (): PerType => {
  try {
    const p = JSON.parse(localStorage.getItem(PERTYPE_KEY) ?? '{}');
    return p && typeof p === 'object' ? (p as PerType) : {};
  } catch {
    return {};
  }
};
const savePerType = (m: PerType) => {
  try {
    localStorage.setItem(PERTYPE_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};

const loadShip = (): string => {
  try {
    return localStorage.getItem(SHIP_KEY) || 'classic';
  } catch {
    return 'classic';
  }
};

export default function SpaceMathView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('map');
  const [planet, setPlanet] = useState<Planet | null>(null);

  /* ── State nhiệm vụ ──────────────────────────────────────────────────── */
  const [question, setQuestion] = useState<Question | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [energy, setEnergy] = useState<number>(INITIAL_ENERGY);
  const [difficulty, setDifficulty] = useState(1);
  const [missionStars, setMissionStars] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [wrongOptions, setWrongOptions] = useState<string[]>([]);
  const [hintOption, setHintOption] = useState<string | null>(null); // chế độ hỗ trợ
  const [missionResult, setMissionResult] = useState<'win' | 'lose' | null>(null);

  // Bộ đếm streak để adaptive (không cần re-render → ref).
  const correctStreakRef = useRef(0);
  const wrongStreakRef = useRef(0);
  const supportRef = useRef(false); // đang ở chế độ hỗ trợ?
  const qStartRef = useRef(0); // mốc thời gian câu hỏi (tính trả lời nhanh)
  const missionStartRef = useRef(0);
  const answeredRef = useRef(false); // đã trả lời ĐÚNG câu hiện tại?

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<SpaceStats>(loadStats());
  const planetsRef = useRef<Set<string>>(loadPlanets());
  const perTypeRef = useRef<PerType>(loadPerType());
  const [stats, setStats] = useState<SpaceStats>(() => statsRef.current);
  const [planetsDone, setPlanetsDone] = useState<Set<string>>(() => planetsRef.current);
  const [shipId, setShipId] = useState<string>(() => loadShip());
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const selectedShip = SHIPS.find((s) => s.id === shipId) ?? SHIPS[0];

  /* ── Toast + xét mở khoá ─────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);

  const makeCtx = useCallback(
    (): AchievementCtx => ({ ...statsRef.current, planetsCount: planetsRef.current.size }),
    [],
  );
  const announceUnlocks = useCallback(
    (prev: AchievementCtx) => {
      const next = makeCtx();
      const a = ACHIEVEMENTS.find((x) => !x.unlocked(prev) && x.unlocked(next));
      if (a) {
        showToast(a.emoji, `Mở khoá: ${a.name}`);
        return;
      }
      const s = STICKERS.find((x) => !x.unlocked(prev) && x.unlocked(next));
      if (s) showToast(s.emoji, `Sticker mới: ${s.name}`);
    },
    [makeCtx, showToast],
  );

  /* ── Nạp một câu hỏi mới ─────────────────────────────────────────────── */
  const loadQuestion = useCallback((pl: Planet, diff: number) => {
    const q = generateForPlanet(pl, diff);
    setQuestion(q);
    setFeedback('idle');
    setWrongOptions([]);
    answeredRef.current = false;
    qStartRef.current = Date.now();
    // Chế độ hỗ trợ (sau khi sai nhiều): tự làm sáng đáp án đúng để gợi ý.
    setHintOption(supportRef.current ? q.answer : null);
    const t = window.setTimeout(() => speak(q.speak, LANG_SPEAK_DEFAULT), 350);
    addTimer(t);
  }, []);

  /* ── Bắt đầu một nhiệm vụ (hành tinh) ────────────────────────────────── */
  const startMission = useCallback(
    (pl: Planet) => {
      clearTimers();
      setPlanet(pl);
      setQIndex(0);
      setScore(0);
      setCombo(0);
      setEnergy(INITIAL_ENERGY);
      setDifficulty(pl.baseDiff);
      setMissionStars(0);
      setMissionResult(null);
      correctStreakRef.current = 0;
      wrongStreakRef.current = 0;
      supportRef.current = false;
      missionStartRef.current = Date.now();
      setPhase('mission');
      loadQuestion(pl, pl.baseDiff);
    },
    [clearTimers, loadQuestion],
  );

  /* ── Hoàn thành / thất bại nhiệm vụ ──────────────────────────────────── */
  const finishMission = useCallback(
    (win: boolean) => {
      if (!planet) return;
      const prev = makeCtx();
      const elapsed = Date.now() - missionStartRef.current;

      // Cập nhật thống kê tích luỹ.
      const ns: SpaceStats = {
        ...statsRef.current,
        timeMs: statsRef.current.timeMs + elapsed,
        missions: statsRef.current.missions + (win ? 1 : 0),
        stars: statsRef.current.stars + (win ? STARS_PLANET_BONUS : 0),
      };
      statsRef.current = ns;
      setStats(ns);
      saveStats(ns);

      if (win) {
        const nextPlanets = new Set(planetsRef.current);
        nextPlanets.add(planet.id);
        planetsRef.current = nextPlanets;
        setPlanetsDone(nextPlanets);
        savePlanets(nextPlanets);
        confetti({ particleCount: 220, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        playSfx('snd-correct');
        speak('Tuyệt vời! Chúng ta đã chinh phục hành tinh mới!', LANG_SPEAK_DEFAULT);
        announceUnlocks(prev);
      } else {
        speak('Hết năng lượng rồi! Quay về trạm nghỉ nhé.', LANG_SPEAK_DEFAULT);
      }

      setMissionResult(win ? 'win' : 'lose');
      const t = window.setTimeout(() => {
        setMissionResult(null);
        setPhase('map');
      }, 2200);
      addTimer(t);
    },
    [planet, makeCtx, announceUnlocks],
  );

  /* ── Xử lý chọn đáp án ───────────────────────────────────────────────── */
  const handleAnswer = (opt: string) => {
    if (!question || !planet || answeredRef.current || missionResult) return;
    if (wrongOptions.includes(opt)) return;

    // Ghi nhận thống kê chính xác + theo loại (bảng phụ huynh).
    const prevCtx = makeCtx();
    const ns: SpaceStats = { ...statsRef.current, attempts: statsRef.current.attempts + 1 };
    const pt = { ...perTypeRef.current };
    const e = pt[question.type] ?? { correct: 0, count: 0 };

    if (opt === question.answer) {
      // ===== ĐÚNG =====
      answeredRef.current = true;
      ns.correct += 1;
      ns.stars += STARS_PER_CORRECT;
      pt[question.type] = { correct: e.correct + 1, count: e.count + 1 };
      statsRef.current = ns;
      perTypeRef.current = pt;
      setStats(ns);
      saveStats(ns);
      savePerType(pt);
      setMissionStars((m) => m + STARS_PER_CORRECT);
      setFeedback('correct');

      playSfx('snd-correct');
      playTing();
      confetti({ particleCount: 36, spread: 60, startVelocity: 28, origin: { y: 0.5 }, colors: CONFETTI_COLORS });

      // Điểm: +100, +50 nếu nhanh, thưởng combo.
      const fast = Date.now() - qStartRef.current < FAST_SECONDS * 1000;
      const newCombo = combo + 1;
      setCombo(newCombo);
      let gained = SCORE_CORRECT + (fast ? SCORE_FAST_BONUS : 0);
      if (newCombo === COMBO_3) gained += COMBO_3_BONUS;
      if (newCombo === COMBO_5) gained += COMBO_5_BONUS;
      if (newCombo === COMBO_10) gained += COMBO_10_BONUS;
      setScore((s) => s + gained);

      // ADAPTIVE: đúng nhiều → tăng độ khó, tắt hỗ trợ.
      correctStreakRef.current += 1;
      wrongStreakRef.current = 0;
      if (correctStreakRef.current >= ADAPT_UP_STREAK) {
        correctStreakRef.current = 0;
        supportRef.current = false;
        setDifficulty((d) => Math.min(MAX_DIFFICULTY, d + 1));
      }

      announceUnlocks(prevCtx);

      // Sang câu kế / hoàn thành nhiệm vụ.
      const t = window.setTimeout(() => {
        if (qIndex + 1 >= QUESTIONS_PER_PLANET) {
          finishMission(true);
        } else {
          setQIndex((i) => i + 1);
          // difficulty có thể đã đổi → dùng giá trị mới nhất qua updater.
          setDifficulty((d) => {
            loadQuestion(planet, d);
            return d;
          });
        }
      }, 1100);
      addTimer(t);
    } else {
      // ===== SAI ===== (−1 năng lượng, cho chọn lại tới khi đúng/hết năng lượng)
      pt[question.type] = { correct: e.correct, count: e.count + 1 };
      statsRef.current = ns;
      perTypeRef.current = pt;
      setStats(ns);
      saveStats(ns);
      savePerType(pt);

      setCombo(0);
      setFeedback('wrong');
      setWrongOptions((w) => [...w, opt]);
      playSfx('snd-wrong');
      playBip();

      correctStreakRef.current = 0;
      wrongStreakRef.current += 1;
      // ADAPTIVE: sai liên tục → bật hỗ trợ + giảm độ khó.
      if (wrongStreakRef.current >= SUPPORT_WRONG_STREAK) {
        supportRef.current = true;
        setHintOption(question.answer); // làm sáng đáp án đúng ngay
        setDifficulty((d) => Math.max(MIN_DIFFICULTY, d - 1));
      }

      const newEnergy = energy - 1;
      setEnergy(newEnergy);
      const tf = window.setTimeout(() => setFeedback('idle'), 500);
      addTimer(tf);
      if (newEnergy <= 0) {
        const t = window.setTimeout(() => finishMission(false), 700);
        addTimer(t);
      }
    }
  };

  /* ── Chọn tàu trong gara ─────────────────────────────────────────────── */
  const selectShip = (id: string) => {
    const ship = SHIPS.find((s) => s.id === id);
    if (!ship || stats.stars < ship.starCost) return;
    setShipId(id);
    try {
      localStorage.setItem(SHIP_KEY, id);
    } catch {
      /* ignore */
    }
    playTing();
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const achievementCtx: AchievementCtx = { ...stats, planetsCount: planetsDone.size };
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
  const isPlanetUnlocked = useCallback(
    (idx: number) => idx === 0 || planetsDone.has(PLANETS[idx - 1].id),
    [planetsDone],
  );

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: GALAXY MAP
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'map') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>

        <div className="text-center mb-4">
          <div className="text-7xl mb-1 floating">{selectedShip.emoji}</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
            Bay Vào Vũ Trụ Số
          </h2>
          <p className="text-slate-500 text-sm font-bold">
            Phi hành gia nhí ơi, chinh phục các hành tinh toán học nào!
          </p>
        </div>

        {/* Thanh tài nguyên + lối tắt */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-1.5 rounded-full">
            ⭐ {stats.stars}
          </span>
          <button
            onClick={() => setPhase('garage')}
            className="bg-sky-100 text-sky-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95"
          >
            🛠️ Gara
          </button>
          <button
            onClick={() => setPhase('collection')}
            className="bg-pink-100 text-pink-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95"
          >
            🏅 Thành tích
          </button>
          <button
            onClick={() => setPhase('parent')}
            className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95"
          >
            👨‍👩‍👧
          </button>
        </div>

        {/* Danh sách hành tinh (mở khoá tuần tự) */}
        <div className="space-y-2">
          {PLANETS.map((pl, idx) => {
            const unlocked = isPlanetUnlocked(idx);
            const done = planetsDone.has(pl.id);
            return (
              <button
                key={pl.id}
                disabled={!unlocked}
                onClick={() => startMission(pl)}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked ? `bg-gradient-to-br ${pl.gradient}` : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-4xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                  {unlocked ? pl.emoji : '🔒'}
                </div>
                <div className="flex-1">
                  <div className={`font-black text-base leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {unlocked ? pl.name : '???'}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>
                    {unlocked ? pl.desc : 'Hoàn thành hành tinh trước để mở'}
                  </div>
                </div>
                {done && <span className="text-2xl">🏆</span>}
                {unlocked && !done && <span className="text-white text-xl">▶️</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: GARAGE (chọn / mở khoá tàu)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'garage') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('map')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">{selectedShip.emoji}</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
            Gara Tàu Vũ Trụ
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">Dùng ⭐ sao để mở khoá tàu mới · Hiện có {stats.stars} sao</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SHIPS.map((ship) => {
            const unlocked = stats.stars >= ship.starCost;
            const selected = shipId === ship.id;
            return (
              <button
                key={ship.id}
                disabled={!unlocked}
                onClick={() => selectShip(ship.id)}
                className={`rounded-3xl border-2 p-4 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                  selected
                    ? 'border-sky-400 bg-sky-50 ring-4 ring-sky-200'
                    : unlocked
                      ? 'border-slate-200 bg-white hover:border-sky-200'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className={`text-5xl ${unlocked ? '' : 'grayscale opacity-40'}`}>{ship.emoji}</span>
                <span className="font-black text-sm text-slate-700">{ship.name}</span>
                {unlocked ? (
                  <span className={`text-[10px] font-black ${selected ? 'text-sky-500' : 'text-emerald-500'}`}>
                    {selected ? 'Đang dùng ✓' : 'Đã mở khoá'}
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-amber-500">⭐ {ship.starCost} sao</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: COLLECTION
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'collection') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('map')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
            Bảng Vinh Danh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            {planetsDone.size}/{TOTAL_PLANETS} hành tinh · {stats.stars} sao · đúng {stats.correct} câu
          </p>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thành tích</h3>
        <div className="space-y-2 mb-5">
          {ACHIEVEMENTS.map((a) => {
            const got = a.unlocked(achievementCtx);
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${
                  got ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-30'}`}>{a.emoji}</span>
                <div className="flex-1">
                  <div className={`font-black text-sm ${got ? 'text-slate-700' : 'text-slate-400'}`}>
                    {got ? a.name : '???'}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400">{a.desc}</div>
                </div>
                {got && <span className="text-emerald-500 font-black">✓</span>}
              </div>
            );
          })}
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sticker</h3>
        <div className="grid grid-cols-6 gap-2">
          {STICKERS.map((s) => {
            const got = s.unlocked(achievementCtx);
            return (
              <div
                key={s.id}
                onClick={() => got && speak(s.name, LANG_SPEAK_DEFAULT)}
                className={`aspect-square rounded-2xl flex items-center justify-center border-2 ${
                  got ? 'bg-gradient-to-br from-amber-50 to-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={`text-2xl ${got ? '' : 'grayscale opacity-25'}`}>{got ? s.emoji : '🔒'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PARENT DASHBOARD
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'parent') {
    // Điểm mạnh / cần cải thiện theo loại (đã làm ≥2 câu).
    const perType = Object.entries(perTypeRef.current)
      .map(([t, e]) => ({ t: t as QType, acc: Math.round((e.correct / e.count) * 100), count: e.count }))
      .filter((x) => x.count >= 2);
    const strengths = [...perType].sort((a, b) => b.acc - a.acc).slice(0, 3);
    const weaknesses = [...perType].sort((a, b) => a.acc - b.acc).filter((x) => x.acc < 80).slice(0, 3);
    const minutes = Math.round(stats.timeMs / 60000);

    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('map')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Bảng Phụ Huynh
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Câu đã làm</div>
            <div className="text-2xl font-black text-sky-600">{stats.attempts}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Chính xác</div>
            <div className="text-2xl font-black text-emerald-600">{accuracy}%</div>
          </div>
          <div className="bg-violet-50 border-2 border-violet-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Hành tinh xong</div>
            <div className="text-2xl font-black text-violet-600">
              {planetsDone.size}/{TOTAL_PLANETS}
            </div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</div>
            <div className="text-2xl font-black text-amber-600">{minutes}′</div>
          </div>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Điểm mạnh</h3>
        {strengths.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-bold py-3 bg-slate-50 rounded-2xl mb-4">
            Chơi thêm để có dữ liệu nhé!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {strengths.map((x) => (
              <div key={x.t} className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-3 py-2">
                <span className="text-sm font-black text-emerald-700">{TYPE_LABEL[x.t]}</span>
                <span className="text-[10px] font-bold text-emerald-400">{x.acc}%</span>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cần cải thiện</h3>
        {weaknesses.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-bold py-3 bg-slate-50 rounded-2xl">
            Bé làm tốt mọi chủ đề! 🎉
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weaknesses.map((x) => (
              <div key={x.t} className="flex items-center gap-2 bg-rose-50 border-2 border-rose-200 rounded-2xl px-3 py-2">
                <span className="text-sm font-black text-rose-700">{TYPE_LABEL[x.t]}</span>
                <span className="text-[10px] font-bold text-rose-400">{x.acc}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: MISSION (PLAYING)
   * ════════════════════════════════════════════════════════════════════ */
  if (!planet || !question) return null;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* ── Thanh trạng thái: thoát · hành tinh · năng lượng ───────────── */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => {
            clearTimers();
            setPhase('map');
          }}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="text-xs font-black text-slate-500">
          {planet.emoji} {planet.name}
        </span>
        <span className="text-sm tracking-tighter">
          {Array.from({ length: INITIAL_ENERGY }, (_, i) => (i < energy ? '❤️' : '🤍')).join('')}
        </span>
      </div>

      {/* ── Hàng thông tin: điểm · sao · combo · độ khó ────────────────── */}
      <div className="flex items-center justify-between mb-2 gap-1 text-xs font-black">
        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">⭐ {score}</span>
        <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full">✨ {missionStars}</span>
        {combo >= 2 && <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">🔥 {combo}</span>}
        <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
          {'★'.repeat(difficulty)}
        </span>
      </div>

      {/* ── Thanh tiến độ nhiệm vụ ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: QUESTIONS_PER_PLANET }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < qIndex ? 'bg-sky-400' : i === qIndex ? 'bg-sky-200' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* ── Robot AI giao nhiệm vụ ─────────────────────────────────────── */}
      <div className="flex items-start gap-2 mb-3">
        <div className="text-4xl shrink-0 floating">🤖</div>
        <div className="flex-1 bg-gradient-to-br from-sky-50 to-violet-50 border-2 border-sky-100 rounded-2xl rounded-tl-sm p-3 relative">
          <p className="font-black text-slate-700 text-base leading-snug pr-8">{question.prompt}</p>
          <button
            type="button"
            onClick={() => speak(question.speak, LANG_SPEAK_DEFAULT)}
            aria-label="Nghe lại"
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-sky-200 flex items-center justify-center active:scale-95 text-sky-500"
          >
            🔊
          </button>
        </div>
      </div>

      {/* ── Câu ĐẾM: hiện các vật thể để bé đếm ────────────────────────── */}
      {question.visual && (
        <div className="bg-slate-900 rounded-3xl p-4 mb-3 flex flex-wrap gap-2 justify-center items-center min-h-[6rem]">
          {Array.from({ length: question.visual.count }, (_, i) => (
            <span key={i} className="text-4xl animate-in zoom-in" style={{ animationDelay: `${i * 60}ms` }}>
              {question.visual!.emoji}
            </span>
          ))}
        </div>
      )}

      {/* ── Các phương án ──────────────────────────────────────────────── */}
      <div className={`grid gap-2 ${question.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {question.options.map((opt) => {
          const isWrong = wrongOptions.includes(opt);
          const isCorrectPicked = feedback === 'correct' && opt === question.answer;
          const isHint = hintOption === opt && !isCorrectPicked;
          return (
            <button
              key={opt}
              type="button"
              disabled={answeredRef.current || isWrong}
              onClick={() => handleAnswer(opt)}
              className={`h-20 rounded-2xl border-2 flex items-center justify-center font-black text-4xl transition-all active:scale-95 ${
                isCorrectPicked
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-200'
                  : isWrong
                    ? 'border-slate-100 bg-slate-50 text-slate-300 opacity-40'
                    : isHint
                      ? 'border-amber-400 bg-amber-50 text-amber-600 ring-4 ring-amber-200 animate-pulse'
                      : 'border-sky-100 bg-white text-slate-700 shadow-sm hover:border-sky-200'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Gợi ý chế độ hỗ trợ */}
      {hintOption && (
        <p className="text-center text-amber-500 text-xs font-bold mt-2">
          🤖 Robot gợi ý: thử ô đang sáng nhé!
        </p>
      )}

      {/* ── Overlay kết quả nhiệm vụ (thắng / hết năng lượng) ──────────── */}
      {missionResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
            {missionResult === 'win' ? (
              <>
                <div className="text-6xl mb-1 animate-bounce">{selectedShip.emoji}</div>
                <div className="text-xl font-black text-emerald-600">Hoàn thành hành tinh! 🎉</div>
                <div className="text-sm font-bold text-slate-500 mt-1">
                  +{missionStars + STARS_PLANET_BONUS} ⭐ sao năng lượng
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-1">🪫</div>
                <div className="text-xl font-black text-rose-600">Hết năng lượng!</div>
                <div className="text-sm font-bold text-slate-500 mt-1">Về trạm nghỉ, thử lại nhé!</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toast mở khoá ──────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-white border-2 border-amber-200 rounded-3xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom">
          <span className="text-4xl">{toast.emoji}</span>
          <div className="text-left">
            <div className="text-[10px] font-bold text-amber-500 uppercase">Chúc mừng!</div>
            <div className="font-black text-slate-700">{toast.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
