/* ──────────────────────────────────────────────────────────────────────────
 * GAME "CỨU HỘ ĐỘNG VẬT" (Game Island)
 *
 * Bé là Siêu Anh Hùng Cứu Hộ. Mỗi nhiệm vụ gồm 3 bước:
 *   1) TÌM con vật (tìm trong môi trường) → 2) CHĂM SÓC đúng (đói/khát/mệt/thương)
 *   → 3) ĐƯA VỀ môi trường sống đúng → xem THẺ KIẾN THỨC động vật.
 * Có tim ❤️, combo, xu nâng cấp trung tâm, từ điển động vật, thành tích, sticker
 * và bảng phụ huynh (Learning Engine: loài/môi trường/kỹ năng/lòng yêu thương).
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Đây là chuỗi mini-game CHẠM nên repo dùng
 *     HTML/Tailwind là phù hợp; hiệu ứng bằng CSS + canvas-confetti.
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_rescue_stats    : JSON RescueStats (missions, treats, coins, time)
 *   - lingoland_rescue_animals  : JSON string[] — id loài đã cứu
 *   - lingoland_rescue_areas    : JSON string[] — id khu vực đã hoàn thành
 *   - lingoland_rescue_center   : JSON {upgrades:string[]} — nâng cấp đã mua
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  AREAS,
  ANIMALS,
  HABITATS,
  CONDITIONS,
  CARE_POOL,
  UPGRADES,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_ANIMALS,
  TOTAL_AREAS,
  habitatById,
  type Area,
  type Animal,
  type Condition,
  type RescueStats,
  type AchievementCtx,
} from '../data/animalRescueData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'map' | 'mission' | 'center' | 'encyclopedia' | 'parent';
type Step = 'find' | 'care' | 'habitat' | 'fact';

const STATS_KEY = 'lingoland_rescue_stats';
const ANIMALS_KEY = 'lingoland_rescue_animals';
const AREAS_KEY = 'lingoland_rescue_areas';
const CENTER_KEY = 'lingoland_rescue_center';

const CONFETTI_COLORS = ['#34d399', '#38bdf8', '#fde047', '#fb923c', '#f9a8d4'];
const FIND_TILES = 12; // số ô ở bước "tìm động vật"

const {
  INITIAL_HEARTS,
  SCORE_MISSION,
  SCORE_CARE,
  SCORE_PERFECT,
  COMBO_N,
  COMBO_BONUS,
  COINS_BASE,
  COINS_PER_STAR,
  EMERGENCY_SECONDS,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): RescueStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      missions: p?.missions || 0,
      treats: p?.treats || 0,
      coins: p?.coins || 0,
      timeMs: p?.timeMs || 0,
    };
  } catch {
    return { missions: 0, treats: 0, coins: 0, timeMs: 0 };
  }
};
const saveStats = (s: RescueStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const loadSet = (key: string): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveSet = (key: string, s: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

const loadCenter = (): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(CENTER_KEY) ?? '{}');
    const up = p?.upgrades;
    return Array.isArray(up) ? new Set(up.filter((x: unknown) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveCenter = (s: Set<string>) => {
  try {
    localStorage.setItem(CENTER_KEY, JSON.stringify({ upgrades: [...s] }));
  } catch {
    /* ignore */
  }
};

/* ===========================================================================
 * Tiện ích
 * ========================================================================= */

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

/** Vật phẩm chăm sóc ĐÚNG cho 1 con vật + tình trạng. */
const correctCare = (animal: Animal, cond: Condition): string => cond.careItem ?? animal.food;

export default function AnimalRescueView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('map');
  const [mode, setMode] = useState<'story' | 'emergency'>('story');
  const [area, setArea] = useState<Area | null>(null);

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [queue, setQueue] = useState<Animal[]>([]); // hàng đợi con vật cần cứu
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState<number>(INITIAL_HEARTS);
  const [timeLeft, setTimeLeft] = useState(0);

  /* ── State 1 nhiệm vụ ────────────────────────────────────────────────── */
  const [step, setStep] = useState<Step>('find');
  const [condition, setCondition] = useState<Condition>(CONDITIONS[0]);
  const [findTiles, setFindTiles] = useState<number[]>([]); // chỉ số ô; animalPos là 1 ô
  const [animalPos, setAnimalPos] = useState(0);
  const [careOptions, setCareOptions] = useState<string[]>([]);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null); // adaptive: gợi ý đáp án đúng
  const [sessionDone, setSessionDone] = useState<'area' | 'emergency' | 'fail' | null>(null);

  const mistakesRef = useRef(0); // số lỗi trong nhiệm vụ hiện tại
  const wrongStreakRef = useRef(0); // sai liên tiếp (cho adaptive hint)
  const missionStartRef = useRef(0);
  const lockRef = useRef(false);

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<RescueStats>(loadStats());
  const animalsRef = useRef<Set<string>>(loadSet(ANIMALS_KEY));
  const areasRef = useRef<Set<string>>(loadSet(AREAS_KEY));
  const centerRef = useRef<Set<string>>(loadCenter());
  const [stats, setStats] = useState<RescueStats>(() => statsRef.current);
  const [rescued, setRescued] = useState<Set<string>>(() => animalsRef.current);
  const [areasDone, setAreasDone] = useState<Set<string>>(() => areasRef.current);
  const [center, setCenter] = useState<Set<string>>(() => centerRef.current);
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const current: Animal | undefined = queue[qIndex];

  /* ── Toast + xét mở khoá ─────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);
  const makeCtx = useCallback(
    (): AchievementCtx => ({
      ...statsRef.current,
      animalsCount: animalsRef.current.size,
      areasCount: areasRef.current.size,
    }),
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

  /* ── Tạo phương án chăm sóc (đúng + 3 nhiễu) ─────────────────────────── */
  const buildCareOptions = useCallback((animal: Animal, cond: Condition): string[] => {
    const correct = correctCare(animal, cond);
    const distractors = shuffle(CARE_POOL.filter((x) => x !== correct)).slice(0, 3);
    return shuffle([correct, ...distractors]);
  }, []);

  /* ── Nạp một nhiệm vụ (1 con vật) ────────────────────────────────────── */
  const loadMission = useCallback(
    (animal: Animal) => {
      const cond = CONDITIONS[randInt(0, CONDITIONS.length - 1)];
      setCondition(cond);
      setStep('find');
      setHearts(INITIAL_HEARTS);
      setWrongPick(null);
      setHint(null);
      setAnimalPos(randInt(0, FIND_TILES - 1));
      setFindTiles(Array.from({ length: FIND_TILES }, (_, i) => i));
      setCareOptions(buildCareOptions(animal, cond));
      mistakesRef.current = 0;
      wrongStreakRef.current = 0;
      missionStartRef.current = Date.now();
      lockRef.current = false;
      const t = window.setTimeout(() => speak(`Cứu bạn ${animal.name} ${cond.label} nào!`, LANG_SPEAK_DEFAULT), 350);
      addTimer(t);
    },
    [buildCareOptions],
  );

  /* ── Bắt đầu một khu vực (Story) ─────────────────────────────────────── */
  const startArea = useCallback(
    (a: Area) => {
      clearTimers();
      setMode('story');
      setArea(a);
      const list = a.animalIds.map((id) => ANIMALS.find((an) => an.id === id)!).filter(Boolean);
      setQueue(list);
      setQIndex(0);
      setScore(0);
      setCombo(0);
      setTimeLeft(0);
      setSessionDone(null);
      setPhase('mission');
      loadMission(list[0]);
    },
    [clearTimers, loadMission],
  );

  /* ── Bắt đầu Giải Cứu Khẩn Cấp (timed, ngẫu nhiên) ───────────────────── */
  const startEmergency = useCallback(() => {
    clearTimers();
    setMode('emergency');
    setArea(null);
    const list = shuffle(ANIMALS);
    setQueue(list);
    setQIndex(0);
    setScore(0);
    setCombo(0);
    setTimeLeft(EMERGENCY_SECONDS);
    setSessionDone(null);
    setPhase('mission');
    loadMission(list[0]);
  }, [clearTimers, loadMission]);

  /* ── Kết thúc phiên ──────────────────────────────────────────────────── */
  const endSession = useCallback(
    (kind: 'area' | 'emergency' | 'fail') => {
      if (kind === 'area' && area) {
        const prev = makeCtx();
        const next = new Set(areasRef.current);
        next.add(area.id);
        areasRef.current = next;
        setAreasDone(next);
        saveSet(AREAS_KEY, next);
        announceUnlocks(prev);
      }
      if (kind !== 'fail') {
        confetti({ particleCount: 220, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        playSfx('snd-correct');
        speak('Tuyệt vời! Bé đã cứu được rất nhiều bạn động vật!', LANG_SPEAK_DEFAULT);
      } else {
        speak('Hết tim rồi! Nghỉ một chút rồi cứu hộ tiếp nhé.', LANG_SPEAK_DEFAULT);
      }
      setSessionDone(kind);
      const t = window.setTimeout(() => {
        setSessionDone(null);
        setPhase('map');
      }, 2300);
      addTimer(t);
    },
    [area, makeCtx, announceUnlocks],
  );

  /* ── Đồng hồ chế độ khẩn cấp ─────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'mission' || mode !== 'emergency' || sessionDone) return;
    const id = window.setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase, mode, sessionDone]);

  useEffect(() => {
    if (phase === 'mission' && mode === 'emergency' && timeLeft === 0 && !sessionDone) {
      endSession('emergency');
    }
  }, [timeLeft, phase, mode, sessionDone, endSession]);

  /* ── Sang nhiệm vụ kế ────────────────────────────────────────────────── */
  const nextMission = useCallback(() => {
    if (mode === 'story') {
      if (qIndex + 1 >= queue.length) {
        endSession('area');
        return;
      }
      setQIndex((i) => {
        loadMission(queue[i + 1]);
        return i + 1;
      });
    } else {
      // Khẩn cấp: hết hàng đợi thì trộn lại, chơi tới khi hết giờ.
      const ni = qIndex + 1;
      if (ni >= queue.length) {
        const reshuffled = shuffle(ANIMALS);
        setQueue(reshuffled);
        setQIndex(0);
        loadMission(reshuffled[0]);
      } else {
        setQIndex(ni);
        loadMission(queue[ni]);
      }
    }
  }, [mode, qIndex, queue, endSession, loadMission]);

  /* ── Hoàn thành nhiệm vụ (sau bước môi trường) → thẻ kiến thức ────────── */
  const completeMission = useCallback(() => {
    if (!current) return;
    lockRef.current = true;
    const stars = mistakesRef.current === 0 ? 3 : mistakesRef.current <= 1 ? 2 : 1;

    // Điểm + combo.
    const newCombo = combo + 1;
    setCombo(newCombo);
    let gained = SCORE_MISSION + (mistakesRef.current === 0 ? SCORE_PERFECT : 0);
    if (newCombo > 0 && newCombo % COMBO_N === 0) gained += COMBO_BONUS;
    setScore((s) => s + gained);

    // Thống kê + Learning Engine.
    const prevCtx = makeCtx();
    const coins = COINS_BASE + stars * COINS_PER_STAR;
    const ns: RescueStats = {
      missions: statsRef.current.missions + 1,
      treats: statsRef.current.treats, // đã cộng ở bước chăm sóc
      coins: statsRef.current.coins + coins,
      timeMs: statsRef.current.timeMs + (Date.now() - missionStartRef.current),
    };
    statsRef.current = ns;
    setStats(ns);
    saveStats(ns);

    // Mở khoá loài vật trong từ điển.
    const nextRescued = new Set(animalsRef.current);
    nextRescued.add(current.id);
    animalsRef.current = nextRescued;
    setRescued(nextRescued);
    saveSet(ANIMALS_KEY, nextRescued);

    announceUnlocks(prevCtx);

    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    playTing();
    // Cảm ơn + đọc fun fact.
    speak(`Cảm ơn bạn đã giúp mình! ${current.fact}`, LANG_SPEAK_DEFAULT);

    setStep('fact');
  }, [current, combo, makeCtx, announceUnlocks]);

  /* ── Sai một bước: trừ tim, rung, adaptive hint ──────────────────────── */
  const registerWrong = useCallback(
    (correctValue: string) => {
      mistakesRef.current += 1;
      wrongStreakRef.current += 1;
      playSfx('snd-wrong');
      playBip();
      const newHearts = hearts - 1;
      setHearts(newHearts);
      // ADAPTIVE: sai liên tiếp ≥ 2 → hiện gợi ý đáp án đúng.
      if (wrongStreakRef.current >= 2) setHint(correctValue);
      if (newHearts <= 0) {
        lockRef.current = true;
        const t = window.setTimeout(() => endSession('fail'), 700);
        addTimer(t);
      }
    },
    [hearts, endSession],
  );

  /* ── BƯỚC 1: TÌM — chạm ô có con vật ─────────────────────────────────── */
  const handleFindTap = (idx: number) => {
    if (!current || step !== 'find' || lockRef.current) return;
    if (idx === animalPos) {
      playPop();
      playTing();
      wrongStreakRef.current = 0;
      setHint(null);
      setStep('care');
    } else {
      setWrongPick(String(idx));
      const t = window.setTimeout(() => setWrongPick((w) => (w === String(idx) ? null : w)), 450);
      addTimer(t);
      registerWrong(String(animalPos));
    }
  };

  /* ── BƯỚC 2: CHĂM SÓC — chọn vật phẩm đúng ───────────────────────────── */
  const handleCareTap = (item: string) => {
    if (!current || step !== 'care' || lockRef.current) return;
    const correct = correctCare(current, condition);
    if (item === correct) {
      playTing();
      wrongStreakRef.current = 0;
      setHint(null);
      // +điểm chăm sóc + đếm "ca chữa trị" (Learning empathy).
      setScore((s) => s + SCORE_CARE);
      const ns = { ...statsRef.current, treats: statsRef.current.treats + 1 };
      statsRef.current = ns;
      setStats(ns);
      saveStats(ns);
      speak('Chăm sóc đúng rồi, giỏi quá!', LANG_SPEAK_DEFAULT);
      setStep('habitat');
    } else {
      setWrongPick(item);
      const t = window.setTimeout(() => setWrongPick((w) => (w === item ? null : w)), 450);
      addTimer(t);
      registerWrong(correct);
    }
  };

  /* ── BƯỚC 3: MÔI TRƯỜNG — chọn nơi sống đúng ─────────────────────────── */
  const handleHabitatTap = (habId: string) => {
    if (!current || step !== 'habitat' || lockRef.current) return;
    if (habId === current.habitat) {
      wrongStreakRef.current = 0;
      setHint(null);
      completeMission();
    } else {
      setWrongPick(habId);
      const t = window.setTimeout(() => setWrongPick((w) => (w === habId ? null : w)), 450);
      addTimer(t);
      registerWrong(current.habitat);
    }
  };

  /* ── Mua nâng cấp trung tâm ──────────────────────────────────────────── */
  const buyUpgrade = (id: string, cost: number) => {
    if (center.has(id) || stats.coins < cost) return;
    const ns = { ...statsRef.current, coins: statsRef.current.coins - cost };
    statsRef.current = ns;
    setStats(ns);
    saveStats(ns);
    const next = new Set(centerRef.current);
    next.add(id);
    centerRef.current = next;
    setCenter(next);
    saveCenter(next);
    playTing();
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const achievementCtx: AchievementCtx = { ...stats, animalsCount: rescued.size, areasCount: areasDone.size };
  const isAreaUnlocked = useCallback(
    (idx: number) => idx === 0 || areasDone.has(AREAS[idx - 1].id),
    [areasDone],
  );

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: WORLD MAP
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
          <div className="text-7xl mb-1 floating">🦸</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-orange-500 bg-clip-text text-transparent">
            Cứu Hộ Động Vật
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            Các bạn động vật đang cần giúp đỡ. Cùng làm siêu anh hùng cứu hộ nhé!
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-1.5 rounded-full">🪙 {stats.coins}</span>
          <button onClick={startEmergency} className="bg-gradient-to-br from-rose-400 to-orange-500 text-white font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            🚨 Khẩn cấp
          </button>
          <button onClick={() => setPhase('center')} className="bg-sky-100 text-sky-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            🏥 Trung tâm
          </button>
          <button onClick={() => setPhase('encyclopedia')} className="bg-emerald-100 text-emerald-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            📖 Từ điển
          </button>
          <button onClick={() => setPhase('parent')} className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            👨‍👩‍👧
          </button>
        </div>

        <div className="space-y-2">
          {AREAS.map((a, idx) => {
            const unlocked = isAreaUnlocked(idx);
            const done = areasDone.has(a.id);
            const rescuedInArea = a.animalIds.filter((id) => rescued.has(id)).length;
            return (
              <button
                key={a.id}
                disabled={!unlocked}
                onClick={() => startArea(a)}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked ? `bg-gradient-to-br ${a.gradient}` : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-4xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{unlocked ? a.emoji : '🔒'}</div>
                <div className="flex-1">
                  <div className={`font-black text-sm leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {unlocked ? a.name : '???'}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>
                    {unlocked ? `Đã cứu ${rescuedInArea}/${a.animalIds.length} bạn` : 'Hoàn thành khu trước để mở'}
                  </div>
                </div>
                {done && <span className="text-2xl">🏅</span>}
                {unlocked && !done && <span className="text-white text-xl">▶️</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: RESCUE CENTER (builder)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'center') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏥</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
            Trung Tâm Cứu Hộ
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            Cấp {center.size + 1} · 🪙 {stats.coins} xu · Dùng xu để nâng cấp!
          </p>
        </div>

        {/* Mô hình trung tâm: hiện các hạng mục đã xây */}
        <div className="bg-gradient-to-br from-emerald-50 to-sky-50 border-2 border-emerald-100 rounded-3xl p-4 mb-4 flex flex-wrap justify-center gap-3 min-h-[6rem] items-center">
          <span className="text-4xl">🏥</span>
          {UPGRADES.filter((u) => center.has(u.id)).map((u) => (
            <span key={u.id} className="text-4xl animate-in zoom-in">
              {u.emoji}
            </span>
          ))}
          {center.size === 0 && <span className="text-xs text-slate-400 font-bold">Chưa có hạng mục nào…</span>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {UPGRADES.map((u) => {
            const owned = center.has(u.id);
            const canBuy = stats.coins >= u.cost;
            return (
              <button
                key={u.id}
                disabled={owned || !canBuy}
                onClick={() => buyUpgrade(u.id, u.cost)}
                className={`rounded-3xl border-2 p-4 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                  owned ? 'border-emerald-300 bg-emerald-50' : canBuy ? 'border-sky-200 bg-white hover:border-sky-300' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className={`text-4xl ${owned || canBuy ? '' : 'grayscale opacity-50'}`}>{u.emoji}</span>
                <span className="font-black text-sm text-slate-700">{u.name}</span>
                <span className={`text-[11px] font-black ${owned ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {owned ? 'Đã xây ✓' : `🪙 ${u.cost}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: ENCYCLOPEDIA (từ điển + thành tích + sticker)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'encyclopedia') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">📖</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
            Từ Điển Động Vật
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            Đã cứu {rescued.size}/{TOTAL_ANIMALS} loài · chạm để nghe điều thú vị
          </p>
        </div>

        {/* Lưới động vật — đã cứu thì hiện, chưa thì ❓ */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {ANIMALS.map((a) => {
            const got = rescued.has(a.id);
            return (
              <button
                key={a.id}
                disabled={!got}
                onClick={() => speak(`${a.name}. ${a.fact}`, LANG_SPEAK_DEFAULT)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 ${
                  got ? 'bg-gradient-to-br from-emerald-50 to-sky-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-25'}`}>{got ? a.emoji : '❓'}</span>
                <span className={`text-[9px] font-black mt-0.5 ${got ? 'text-slate-600' : 'text-slate-300'}`}>
                  {got ? a.name : '???'}
                </span>
              </button>
            );
          })}
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thành tích</h3>
        <div className="space-y-2 mb-4">
          {ACHIEVEMENTS.map((a) => {
            const got = a.unlocked(achievementCtx);
            return (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${got ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-30'}`}>{a.emoji}</span>
                <div className="flex-1">
                  <div className={`font-black text-sm ${got ? 'text-slate-700' : 'text-slate-400'}`}>{got ? a.name : '???'}</div>
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
              <div key={s.id} className={`aspect-square rounded-2xl flex items-center justify-center border-2 ${got ? 'bg-gradient-to-br from-amber-50 to-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-2xl ${got ? '' : 'grayscale opacity-25'}`}>{got ? s.emoji : '🔒'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PARENT DASHBOARD (Learning Engine)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'parent') {
    const habitatsLearned = new Set([...rescued].map((id) => ANIMALS.find((a) => a.id === id)?.habitat).filter(Boolean)).size;
    const minutes = Math.round(stats.timeMs / 60000);
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Bảng Phụ Huynh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">{minutes} phút chơi</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Loài đã học</div>
            <div className="text-2xl font-black text-emerald-600">{rescued.size}/{TOTAL_ANIMALS}</div>
          </div>
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Môi trường đã học</div>
            <div className="text-2xl font-black text-sky-600">{habitatsLearned}/{HABITATS.length}</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Nhiệm vụ xong</div>
            <div className="text-2xl font-black text-amber-600">{stats.missions}</div>
          </div>
          <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Lòng yêu thương</div>
            <div className="text-2xl font-black text-rose-600">❤️ {stats.treats}</div>
          </div>
        </div>

        {/* Điểm mạnh / cần cải thiện đơn giản theo dữ liệu */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm mạnh</div>
            <div className="text-sm font-black text-emerald-600 mt-1">
              {stats.treats >= stats.missions ? '❤️ Chăm sóc' : '🔎 Quan sát'}
            </div>
          </div>
          <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Cần cải thiện</div>
            <div className="text-sm font-black text-rose-600 mt-1">
              {areasDone.size < TOTAL_AREAS ? '🗺️ Khám phá khu mới' : '🌟 Đã rất giỏi!'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: MISSION (3 bước + thẻ kiến thức)
   * ════════════════════════════════════════════════════════════════════ */
  if (!current) return null;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* ── Thanh trạng thái: thoát · điểm · tim ───────────────────────── */}
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
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">⭐ {score}</span>
          {combo >= 2 && <span className="bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">🔥 {combo}</span>}
          {mode === 'emergency' && (
            <span className={`font-black text-xs px-2.5 py-1 rounded-full ${timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-sky-100 text-sky-700'}`}>
              ⏱️ {fmtTime(timeLeft)}
            </span>
          )}
        </div>
      </div>
      <div className="text-center mb-3 text-sm tracking-tighter">
        {Array.from({ length: INITIAL_HEARTS }, (_, i) => (i < hearts ? '❤️' : '🤍')).join('')}
      </div>

      {/* ════ BƯỚC 1: TÌM ĐỘNG VẬT ════ */}
      {step === 'find' && (
        <div>
          <p className="text-center font-black text-slate-700 mb-1">🔎 Tìm bạn {current.name} đang trốn ở đâu!</p>
          <p className="text-center text-slate-400 text-xs font-bold mb-3">Chạm vào ô có bạn ấy nhé</p>
          <div className="grid grid-cols-4 gap-2 bg-gradient-to-br from-emerald-50 to-sky-50 border-2 border-emerald-100 rounded-3xl p-3">
            {findTiles.map((i) => {
              const hasAnimal = i === animalPos;
              const isWrong = wrongPick === String(i);
              const isHint = hint === String(animalPos) && hasAnimal;
              return (
                <button
                  key={i}
                  onClick={() => handleFindTap(i)}
                  className={`aspect-square rounded-2xl flex items-center justify-center relative active:scale-90 transition-all ${
                    isWrong ? 'shake-x bg-red-50' : isHint ? 'ring-4 ring-amber-300 bg-amber-50' : 'bg-white/70'
                  }`}
                >
                  {/* Lá cây/nền của khu vực */}
                  <span className="text-3xl leading-none">{area?.foliage ?? '🌿'}</span>
                  {/* Con vật "ló" ra ở một ô (nhỏ hơn để cần quan sát) */}
                  {hasAnimal && <span className="absolute bottom-0.5 right-0.5 text-base">{current.emoji}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════ BƯỚC 2: CHĂM SÓC ════ */}
      {step === 'care' && (
        <div>
          <div className="text-center mb-3">
            <div className="text-7xl mb-1 floating">{current.emoji}</div>
            <p className="font-black text-slate-700">
              Bạn {current.name} {condition.label}!
            </p>
            <p className="text-slate-500 text-xs font-bold">{condition.clue}</p>
          </div>
          <p className="text-center text-slate-400 text-xs font-bold mb-2">👆 Chọn thứ giúp bạn ấy</p>
          <div className="grid grid-cols-2 gap-3">
            {careOptions.map((item) => {
              const isWrong = wrongPick === item;
              const isHint = hint === item;
              return (
                <button
                  key={item}
                  onClick={() => handleCareTap(item)}
                  className={`h-20 rounded-2xl border-2 flex items-center justify-center text-4xl active:scale-95 transition-all ${
                    isWrong ? 'shake-x border-red-300 bg-red-50' : isHint ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse' : 'border-sky-100 bg-white shadow-sm'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════ BƯỚC 3: ĐƯA VỀ MÔI TRƯỜNG ════ */}
      {step === 'habitat' && (
        <div>
          <div className="text-center mb-3">
            <div className="text-7xl mb-1 floating">{current.emoji}</div>
            <p className="font-black text-slate-700">Đưa bạn {current.name} về nhà!</p>
            <p className="text-slate-500 text-xs font-bold">Bạn ấy sống ở môi trường nào?</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {HABITATS.map((h) => {
              const isWrong = wrongPick === h.id;
              const isHint = hint === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => handleHabitatTap(h.id)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1 active:scale-95 transition-all ${
                    isWrong ? 'shake-x border-red-300 bg-red-50' : isHint ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse' : 'border-sky-100 bg-white shadow-sm'
                  }`}
                >
                  <span className="text-4xl">{h.emoji}</span>
                  <span className="text-xs font-black text-slate-600">{h.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════ THẺ KIẾN THỨC (Animal Fact Card) ════ */}
      {step === 'fact' && (
        <div className="bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 border-2 border-emerald-100 rounded-3xl p-5 text-center animate-in zoom-in">
          <div className="text-7xl mb-1 floating">{current.emoji}</div>
          <h3 className="text-2xl font-black text-slate-800">{current.name}</h3>
          <div className="text-[11px] font-bold text-slate-400 mb-2">
            Sống ở {habitatById(current.habitat).emoji} {habitatById(current.habitat).name} · thích ăn {current.food}
          </div>
          <div className="bg-white rounded-2xl p-3 mb-3 border-2 border-amber-100">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">💡 Điều thú vị</div>
            <p className="font-bold text-slate-700 text-sm leading-snug">{current.fact}</p>
          </div>
          <button
            onClick={nextMission}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            {mode === 'story' && qIndex + 1 >= queue.length ? '🏅 Hoàn thành khu vực!' : 'Cứu bạn tiếp theo ▶️'}
          </button>
        </div>
      )}

      {/* ── Overlay kết thúc phiên ─────────────────────────────────────── */}
      {sessionDone && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
            <div className="text-6xl mb-1 animate-bounce">{sessionDone === 'fail' ? '💔' : '🏆'}</div>
            <div className={`text-xl font-black ${sessionDone === 'fail' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {sessionDone === 'fail' ? 'Hết tim rồi!' : sessionDone === 'area' ? 'Hoàn thành khu vực!' : 'Hết giờ cứu hộ!'}
            </div>
            <div className="text-sm font-bold text-slate-500 mt-1">Bé là siêu anh hùng tuyệt vời! 🎉</div>
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
