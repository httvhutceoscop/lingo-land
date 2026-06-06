/* ──────────────────────────────────────────────────────────────────────────
 * GAME "DU LỊCH CÙNG MÈO Ú" (Game Island)
 *
 * Bé cùng Mèo Ú đi khắp thế giới. Mỗi điểm đến: nghe Mèo Ú giới thiệu → tìm địa
 * danh → tìm đặc sản → quiz văn hoá → đóng DẤU HỘ CHIẾU + thẻ kiến thức. Có
 * năng lượng ❤️, combo, xu, hộ chiếu, thành tích, sticker, bảng phụ huynh.
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Đây là chuỗi câu hỏi/CHẠM nên repo dùng
 *     HTML/Tailwind là phù hợp; hiệu ứng bằng CSS + canvas-confetti.
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_travel_visited   : JSON string[] — id điểm đến đã khám phá
 *   - lingoland_travel_countries : JSON string[] — id quốc gia đã hoàn thành
 *   - lingoland_travel_stats     : JSON {coins, timeMs}
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  DESTINATIONS,
  CHAPTERS,
  CAT_MOODS,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_DESTINATIONS,
  TOTAL_COUNTRIES,
  destinationsOfCountry,
  type Destination,
  type TravelStats,
  type AchievementCtx,
} from '../data/travelCatData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'map' | 'playing' | 'passport' | 'collection' | 'parent';
type Step = 'intro' | 'round' | 'stamp';
type RoundKind = 'landmark' | 'food' | 'quiz';

const VISITED_KEY = 'lingoland_travel_visited';
const COUNTRIES_KEY = 'lingoland_travel_countries';
const STATS_KEY = 'lingoland_travel_stats';

const CONFETTI_COLORS = ['#38bdf8', '#fb923c', '#34d399', '#fde047', '#a78bfa'];

const {
  INITIAL_ENERGY,
  SCORE_QUEST,
  SCORE_MINIGAME,
  SCORE_NEW_PLACE,
  SCORE_COUNTRY,
  COINS_PER_PLACE,
  COMBO_N,
  COMBO_BONUS,
  QUICK_ROUNDS,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

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
const loadStats = (): TravelStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return { coins: p?.coins || 0, timeMs: p?.timeMs || 0 };
  } catch {
    return { coins: 0, timeMs: 0 };
  }
};
const saveStats = (s: TravelStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

/* ===========================================================================
 * Tiện ích + dựng câu hỏi
 * ========================================================================= */

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const uniq = (arr: string[]) => [...new Set(arr)];
const fmtTime = (ms: number) => `${Math.round(ms / 60000)} phút`;

// Kho emoji để tạo phương án nhiễu (loại trùng).
const LANDMARK_POOL = uniq(DESTINATIONS.map((d) => d.landmark));
const FOOD_POOL = uniq(DESTINATIONS.map((d) => d.food));

/** Một câu hỏi (round) trong điểm đến. */
interface Round {
  kind: RoundKind;
  prompt: string;
  speak: string;
  options: string[];
  answer: string;
  isEmoji: boolean; // phương án là emoji (landmark/food) hay chữ (quiz)?
}

/** 4 phương án emoji gồm đáp án + 3 nhiễu khác nhau. */
const emojiOptions = (answer: string, pool: string[]): string[] => {
  const distractors = shuffle(pool.filter((x) => x !== answer)).slice(0, 3);
  return shuffle([answer, ...distractors]);
};

/** Dựng 1 round theo loại cho một điểm đến. */
const buildRound = (dest: Destination, kind: RoundKind): Round => {
  if (kind === 'landmark') {
    return {
      kind,
      prompt: `Tìm ${dest.landmarkName} ở ${dest.city}!`,
      speak: `Tìm ${dest.landmarkName}`,
      options: emojiOptions(dest.landmark, LANDMARK_POOL),
      answer: dest.landmark,
      isEmoji: true,
    };
  }
  if (kind === 'food') {
    return {
      kind,
      prompt: `Đặc sản ${dest.city} là món nào?`,
      speak: `Đặc sản ${dest.city} là món gì?`,
      options: emojiOptions(dest.food, FOOD_POOL),
      answer: dest.food,
      isEmoji: true,
    };
  }
  // quiz văn hoá
  return {
    kind,
    prompt: dest.quiz.q,
    speak: dest.quiz.q,
    options: shuffle(dest.quiz.options),
    answer: dest.quiz.answer,
    isEmoji: false,
  };
};

/** 3 nhiệm vụ của một điểm đến: địa danh → đặc sản → quiz. */
const buildDestRounds = (dest: Destination): Round[] => [
  buildRound(dest, 'landmark'),
  buildRound(dest, 'food'),
  buildRound(dest, 'quiz'),
];

export default function TravelCatView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('map');
  const [mode, setMode] = useState<'story' | 'quick'>('story');

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [dest, setDest] = useState<Destination | null>(null); // null trong chế độ Ôn tập
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [step, setStep] = useState<Step>('intro');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [energy, setEnergy] = useState<number>(INITIAL_ENERGY);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [mood, setMood] = useState<string>(CAT_MOODS.curious);
  const [sessionEnd, setSessionEnd] = useState<'fail' | 'quick' | null>(null);

  const mistakesRef = useRef(0);
  const wrongStreakRef = useRef(0);
  const missionStartRef = useRef(0);
  const lockRef = useRef(false);

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const visitedRef = useRef<Set<string>>(loadSet(VISITED_KEY));
  const countriesRef = useRef<Set<string>>(loadSet(COUNTRIES_KEY));
  const statsRef = useRef<TravelStats>(loadStats());
  const [visited, setVisited] = useState<Set<string>>(() => visitedRef.current);
  const [countries, setCountries] = useState<Set<string>>(() => countriesRef.current);
  const [stats, setStats] = useState<TravelStats>(() => statsRef.current);
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const round: Round | undefined = rounds[roundIndex];

  /* ── Toast + xét mở khoá ─────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);
  const makeCtx = useCallback(
    (): AchievementCtx => ({
      ...statsRef.current,
      destCount: visitedRef.current.size,
      countryCount: countriesRef.current.size,
      visited: visitedRef.current,
      countries: countriesRef.current,
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

  /* ── Bắt đầu một điểm đến (Story) ────────────────────────────────────── */
  const startDestination = useCallback((d: Destination) => {
    clearTimers();
    setMode('story');
    setDest(d);
    setRounds(buildDestRounds(d));
    setRoundIndex(0);
    setStep('intro');
    setEnergy(INITIAL_ENERGY);
    setWrongPick(null);
    setHint(null);
    setMood(CAT_MOODS.curious);
    setSessionEnd(null);
    mistakesRef.current = 0;
    wrongStreakRef.current = 0;
    missionStartRef.current = Date.now();
    lockRef.current = false;
    setPhase('playing');
    const t = window.setTimeout(() => speak(d.intro, LANG_SPEAK_DEFAULT), 400);
    addTimer(t);
  }, [clearTimers]);

  /* ── Bắt đầu Ôn tập nhanh (câu hỏi ngẫu nhiên) ───────────────────────── */
  const startQuick = useCallback(() => {
    clearTimers();
    setMode('quick');
    setDest(null);
    // Bốc QUICK_ROUNDS câu ngẫu nhiên từ các điểm ĐÃ thăm (hoặc tất cả nếu chưa thăm gì).
    const pool = visitedRef.current.size > 0 ? DESTINATIONS.filter((d) => visitedRef.current.has(d.id)) : DESTINATIONS;
    const kinds: RoundKind[] = ['landmark', 'food', 'quiz'];
    const deck: Round[] = Array.from({ length: QUICK_ROUNDS }, () => {
      const d = pool[Math.floor(Math.random() * pool.length)];
      return buildRound(d, kinds[Math.floor(Math.random() * kinds.length)]);
    });
    setRounds(deck);
    setRoundIndex(0);
    setStep('round');
    setEnergy(INITIAL_ENERGY);
    setWrongPick(null);
    setHint(null);
    setSessionEnd(null);
    mistakesRef.current = 0;
    wrongStreakRef.current = 0;
    missionStartRef.current = Date.now();
    lockRef.current = false;
    setPhase('playing');
  }, [clearTimers]);

  /* ── Cộng thời gian học vào thống kê ─────────────────────────────────── */
  const flushTime = useCallback(() => {
    const ns = { ...statsRef.current, timeMs: statsRef.current.timeMs + (Date.now() - missionStartRef.current) };
    statsRef.current = ns;
    setStats(ns);
    saveStats(ns);
  }, []);

  /* ── Hoàn thành điểm đến → đóng dấu hộ chiếu ─────────────────────────── */
  const completeDestination = useCallback(() => {
    if (!dest) return;
    lockRef.current = true;
    setMood(CAT_MOODS.proud);

    const prevCtx = makeCtx();

    // Khám phá điểm mới + xu.
    let bonus = SCORE_NEW_PLACE;
    const nextVisited = new Set(visitedRef.current);
    nextVisited.add(dest.id);
    visitedRef.current = nextVisited;
    setVisited(nextVisited);
    saveSet(VISITED_KEY, nextVisited);

    // Hoàn thành quốc gia? (mọi điểm đến của nước này đã thăm)
    const allCityDone = destinationsOfCountry(dest.countryId).every((d) => nextVisited.has(d.id));
    if (allCityDone && !countriesRef.current.has(dest.countryId)) {
      const nextCountries = new Set(countriesRef.current);
      nextCountries.add(dest.countryId);
      countriesRef.current = nextCountries;
      setCountries(nextCountries);
      saveSet(COUNTRIES_KEY, nextCountries);
      bonus += SCORE_COUNTRY;
      showToast(dest.flag, `Hoàn thành ${dest.country}!`);
    }

    setScore((s) => s + bonus);
    const ns = { ...statsRef.current, coins: statsRef.current.coins + COINS_PER_PLACE };
    statsRef.current = ns;
    setStats(ns);
    saveStats(ns);
    flushTime();
    announceUnlocks(prevCtx);

    confetti({ particleCount: 160, spread: 110, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    speak(`Đóng dấu hộ chiếu! ${dest.fact}`, LANG_SPEAK_DEFAULT);
    setStep('stamp');
  }, [dest, makeCtx, announceUnlocks, flushTime, showToast]);

  /* ── Kết thúc thất bại / ôn tập ──────────────────────────────────────── */
  const endSession = useCallback(
    (kind: 'fail' | 'quick') => {
      lockRef.current = true;
      flushTime();
      if (kind === 'fail') {
        setMood(CAT_MOODS.surprised);
        speak('Hết năng lượng rồi! Nghỉ chút rồi khám phá tiếp nhé.', LANG_SPEAK_DEFAULT);
      } else {
        confetti({ particleCount: 160, spread: 110, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        speak('Ôn tập xong rồi, Mèo Ú khen bé giỏi!', LANG_SPEAK_DEFAULT);
      }
      setSessionEnd(kind);
      const t = window.setTimeout(() => {
        setSessionEnd(null);
        setPhase('map');
      }, 2200);
      addTimer(t);
    },
    [flushTime],
  );

  /* ── Xử lý chọn đáp án ───────────────────────────────────────────────── */
  const handleAnswer = (value: string) => {
    if (!round || step !== 'round' || lockRef.current) return;
    if (value === round.answer) {
      // ===== ĐÚNG =====
      playSfx('snd-correct');
      playTing();
      setMood(CAT_MOODS.happy);
      wrongStreakRef.current = 0;
      setHint(null);

      const newCombo = combo + 1;
      setCombo(newCombo);
      let gained = round.kind === 'quiz' ? SCORE_MINIGAME : SCORE_QUEST;
      if (newCombo > 0 && newCombo % COMBO_N === 0) gained += COMBO_BONUS;
      setScore((s) => s + gained);
      confetti({ particleCount: 30, spread: 55, startVelocity: 26, origin: { y: 0.5 }, colors: CONFETTI_COLORS });

      if (roundIndex + 1 < rounds.length) {
        setRoundIndex((i) => i + 1);
      } else if (mode === 'story') {
        completeDestination();
      } else {
        endSession('quick');
      }
    } else {
      // ===== SAI ===== (−1 năng lượng, cho chọn lại)
      playSfx('snd-wrong');
      playBip();
      setMood(CAT_MOODS.surprised);
      mistakesRef.current += 1;
      wrongStreakRef.current += 1;
      setWrongPick(value);
      const t = window.setTimeout(() => setWrongPick((w) => (w === value ? null : w)), 450);
      addTimer(t);
      // ADAPTIVE: sai liên tiếp ≥ 2 → gợi ý đáp án đúng.
      if (wrongStreakRef.current >= 2) setHint(round.answer);

      const ne = energy - 1;
      setEnergy(ne);
      if (ne <= 0) {
        const t2 = window.setTimeout(() => endSession('fail'), 700);
        addTimer(t2);
      }
    }
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const ctx: AchievementCtx = {
    ...stats,
    destCount: visited.size,
    countryCount: countries.size,
    visited,
    countries,
  };
  const isDestUnlocked = useCallback(
    (idx: number) => idx === 0 || visited.has(DESTINATIONS[idx - 1].id),
    [visited],
  );

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: WORLD MAP (theo chương)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'map') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Bản đồ
        </button>

        <div className="text-center mb-4">
          <div className="text-7xl mb-1 floating">😺</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-orange-500 to-emerald-500 bg-clip-text text-transparent">
            Du Lịch Cùng Mèo Ú
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            Cùng Mèo Ú vi vu khắp thế giới, sưu tầm dấu hộ chiếu nào!
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-1.5 rounded-full">🪙 {stats.coins}</span>
          <button onClick={startQuick} className="bg-gradient-to-br from-fuchsia-400 to-purple-500 text-white font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            🧠 Ôn tập
          </button>
          <button onClick={() => setPhase('passport')} className="bg-sky-100 text-sky-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            📔 Hộ chiếu
          </button>
          <button onClick={() => setPhase('collection')} className="bg-emerald-100 text-emerald-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            🏅 Thành tích
          </button>
          <button onClick={() => setPhase('parent')} className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">
            👨‍👩‍👧
          </button>
        </div>

        {/* Hành trình theo từng chương */}
        {CHAPTERS.map((ch) => {
          const items = DESTINATIONS.map((d, idx) => ({ d, idx })).filter((x) => x.d.chapter === ch.id);
          return (
            <section key={ch.id} className="mb-4">
              <div className="text-xs font-black text-slate-500 mb-2 px-1">
                {ch.emoji} {ch.title}
              </div>
              <div className="space-y-2">
                {items.map(({ d, idx }) => {
                  const unlocked = isDestUnlocked(idx);
                  const done = visited.has(d.id);
                  return (
                    <button
                      key={d.id}
                      disabled={!unlocked}
                      onClick={() => startDestination(d)}
                      className={`relative w-full p-3 rounded-2xl shadow active:scale-95 transition-all flex items-center gap-3 text-left ${
                        unlocked ? `bg-gradient-to-br ${ch.gradient}` : 'bg-slate-100 border-2 border-slate-200'
                      }`}
                    >
                      <div className={`text-3xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{unlocked ? d.landmark : '🔒'}</div>
                      <div className="flex-1">
                        <div className={`font-black text-sm leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                          {unlocked ? `${d.flag} ${d.city}` : '???'}
                        </div>
                        <div className={`text-[10px] font-bold ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>
                          {unlocked ? d.landmarkName : 'Khám phá nơi trước để mở'}
                        </div>
                      </div>
                      {done && <span className="text-xl">✅</span>}
                      {unlocked && !done && <span className="text-white text-lg">▶️</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PASSPORT (sổ dấu hộ chiếu)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'passport') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">📔</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-orange-500 bg-clip-text text-transparent">
            Hộ Chiếu Của Bé
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            {visited.size}/{TOTAL_DESTINATIONS} điểm đến · {countries.size}/{TOTAL_COUNTRIES} quốc gia
          </p>
        </div>

        {/* Mỗi điểm đến = một "dấu" — đã thăm thì hiện cờ + địa danh */}
        <div className="grid grid-cols-3 gap-2">
          {DESTINATIONS.map((d) => {
            const got = visited.has(d.id);
            return (
              <div
                key={d.id}
                onClick={() => got && speak(`${d.city}. ${d.fact}`, LANG_SPEAK_DEFAULT)}
                className={`rounded-2xl border-2 p-2 flex flex-col items-center justify-center gap-0.5 aspect-square ${
                  got ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-sky-50' : 'border-dashed border-slate-200 bg-slate-50'
                }`}
              >
                {got ? (
                  <>
                    <span className="text-2xl leading-none">{d.flag}</span>
                    <span className="text-2xl leading-none">{d.landmark}</span>
                    <span className="text-[9px] font-black text-slate-600 text-center leading-tight">{d.city}</span>
                  </>
                ) : (
                  <span className="text-2xl opacity-30">❔</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: COLLECTION (thành tích + sticker)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'collection') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-orange-500 to-emerald-500 bg-clip-text text-transparent">
            Bảng Vinh Danh
          </h2>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thành tích</h3>
        <div className="space-y-2 mb-5">
          {ACHIEVEMENTS.map((a) => {
            const got = a.unlocked(ctx);
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

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sticker lưu niệm</h3>
        <div className="grid grid-cols-7 gap-2">
          {STICKERS.map((s) => {
            const got = s.unlocked(ctx);
            return (
              <div key={s.id} className={`aspect-square rounded-2xl flex items-center justify-center border-2 ${got ? 'bg-gradient-to-br from-amber-50 to-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-xl ${got ? '' : 'grayscale opacity-25'}`}>{got ? s.emoji : '🔒'}</span>
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
    const pct = Math.round((visited.size / TOTAL_DESTINATIONS) * 100);
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
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Quốc gia đã khám phá</div>
            <div className="text-2xl font-black text-sky-600">{countries.size}/{TOTAL_COUNTRIES}</div>
          </div>
          <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thành phố đã thăm</div>
            <div className="text-2xl font-black text-orange-600">{visited.size}/{TOTAL_DESTINATIONS}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Kiến thức đã học</div>
            <div className="text-2xl font-black text-emerald-600">{visited.size} điều</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian chơi</div>
            <div className="text-2xl font-black text-amber-600">{fmtTime(stats.timeMs)}</div>
          </div>
        </div>

        {/* Tỷ lệ hoàn thành */}
        <div className="mb-2">
          <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
            <span>Tỷ lệ hoàn thành hành trình</span>
            <span>{pct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PLAYING
   * ════════════════════════════════════════════════════════════════════ */

  // INTRO — Mèo Ú giới thiệu điểm đến.
  if (phase === 'playing' && step === 'intro' && dest) {
    return (
      <div className="animate-in fade-in duration-300 max-w-md mx-auto text-center py-6">
        <button onClick={() => { clearTimers(); setPhase('map'); }} className="float-left text-slate-400 font-bold text-sm">
          ✕ Thoát
        </button>
        <div className="clear-both" />
        <div className="text-7xl mb-2 floating">{mood}</div>
        <div className="text-6xl mb-2">{dest.flag}</div>
        <h2 className="text-2xl font-black text-slate-800 mb-1">{dest.city}</h2>
        <div className="text-sm font-bold text-slate-400 mb-3">{dest.country}</div>
        <div className="bg-gradient-to-br from-sky-50 to-orange-50 border-2 border-sky-100 rounded-3xl p-4 mb-5 relative">
          <p className="font-bold text-slate-700 leading-snug">"{dest.intro}"</p>
          <button onClick={() => speak(dest.intro, LANG_SPEAK_DEFAULT)} className="mt-2 text-sky-500 text-sm font-bold">
            🔊 Nghe lại
          </button>
        </div>
        <button
          onClick={() => setStep('round')}
          className="w-full py-4 bg-gradient-to-r from-sky-500 via-orange-500 to-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-200 active:scale-95 transition-all"
        >
          🧳 Bắt đầu khám phá!
        </button>
      </div>
    );
  }

  // STAMP — đóng dấu hộ chiếu + thẻ kiến thức.
  if (phase === 'playing' && step === 'stamp' && dest) {
    return (
      <div className="animate-in zoom-in duration-500 max-w-md mx-auto text-center py-6">
        <div className="text-7xl mb-1 floating">{CAT_MOODS.proud}</div>
        <h2 className="text-2xl font-black text-emerald-600 mb-2">Đã đóng dấu hộ chiếu! 🎉</h2>

        {/* Con dấu */}
        <div className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-dashed border-orange-400 bg-orange-50 mb-4 rotate-[-8deg]">
          <span className="text-4xl">{dest.flag}</span>
          <span className="text-3xl">{dest.landmark}</span>
          <span className="text-[10px] font-black text-orange-500">{dest.city}</span>
        </div>

        <div className="bg-white rounded-2xl p-3 mb-4 border-2 border-amber-100">
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">💡 Điều thú vị</div>
          <p className="font-bold text-slate-700 text-sm leading-snug">{dest.fact}</p>
        </div>

        <button
          onClick={() => setPhase('map')}
          className="w-full py-4 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
        >
          ✈️ Đi tiếp nào!
        </button>
      </div>
    );
  }

  // ROUND — câu hỏi.
  if (phase === 'playing' && round) {
    return (
      <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
        {/* Thanh trạng thái */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => { clearTimers(); setPhase('map'); }} className="text-slate-400 font-bold hover:text-slate-600 text-sm">
            ✕ Thoát
          </button>
          <span className="text-xs font-black text-slate-500">
            {dest ? `${dest.flag} ${dest.city}` : '🧠 Ôn tập'} · {roundIndex + 1}/{rounds.length}
          </span>
          <div className="flex items-center gap-1">
            <span className="bg-amber-100 text-amber-700 font-black text-xs px-2 py-1 rounded-full">⭐ {score}</span>
          </div>
        </div>
        <div className="text-center mb-3 text-sm tracking-tighter">
          {Array.from({ length: INITIAL_ENERGY }, (_, i) => (i < energy ? '❤️' : '🤍')).join('')}
          {combo >= 2 && <span className="ml-2 text-orange-500 font-black text-xs">🔥 {combo}</span>}
        </div>

        {/* Mèo Ú + câu hỏi */}
        <div className="flex items-start gap-2 mb-4">
          <div className="text-5xl shrink-0 floating">{mood}</div>
          <div className="flex-1 bg-gradient-to-br from-sky-50 to-orange-50 border-2 border-sky-100 rounded-2xl rounded-tl-sm p-3 relative">
            <p className="font-black text-slate-700 text-base leading-snug pr-8">{round.prompt}</p>
            <button onClick={() => speak(round.speak, LANG_SPEAK_DEFAULT)} aria-label="Nghe lại" className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-sky-200 flex items-center justify-center active:scale-95 text-sky-500">
              🔊
            </button>
          </div>
        </div>

        {/* Phương án */}
        <div className={`grid gap-3 ${round.isEmoji ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {round.options.map((opt) => {
            const isWrong = wrongPick === opt;
            const isHint = hint === opt;
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className={`rounded-2xl border-2 active:scale-95 transition-all ${
                  round.isEmoji ? 'h-24 flex items-center justify-center text-5xl' : 'p-4 font-black text-slate-700 text-left'
                } ${
                  isWrong
                    ? 'shake-x border-red-300 bg-red-50'
                    : isHint
                      ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse'
                      : 'border-sky-100 bg-white shadow-sm hover:border-sky-200'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Overlay kết thúc (thất bại / ôn tập) */}
        {sessionEnd && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none">
            <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
              <div className="text-6xl mb-1 animate-bounce">{sessionEnd === 'fail' ? '🙀' : '😻'}</div>
              <div className={`text-xl font-black ${sessionEnd === 'fail' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {sessionEnd === 'fail' ? 'Hết năng lượng!' : 'Ôn tập hoàn thành!'}
              </div>
              <div className="text-sm font-bold text-slate-500 mt-1">Mèo Ú và bé thật tuyệt vời! 🎉</div>
            </div>
          </div>
        )}

        {/* Toast mở khoá */}
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

  return null;
}
