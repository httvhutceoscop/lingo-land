/* ──────────────────────────────────────────────────────────────────────────
 * GAME "CHUYẾN TÀU ÂM VẦN" (Game Island)
 *
 * Bé là trưởng tàu: nhìn hình → nghe đọc → ghép các TOA (âm đầu + vần + thanh
 * điệu) thành TIẾNG hoàn chỉnh, rồi tàu chạy tới ga kế tiếp. 6 ga (chế độ), combo
 * thưởng điểm, gợi ý 💡, thành tích, sticker và BẢNG PHỤ HUYNH (âm/vần còn yếu).
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva + kéo-thả toa. Repo dùng HTML/Tailwind cho game
 *     dạng chọn-ghép (xem GhepTiengView, ToneKingView) → game này CHẠM để ghép
 *     toa (ổn định trên cảm ứng cho bé 5–7 tuổi), hiệu ứng bằng CSS + confetti.
 *   - Thanh điệu KHÔNG ghép dấu bằng Unicode: từ vựng lưu sẵn `base` (không dấu)
 *     và `word` (có dấu) → chọn đúng thanh thì hiển thị `word` (xem data).
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_train_stats         : JSON TrainStats
 *   - lingoland_train_stations      : JSON string[] — id ga đã hoàn thành
 *   - lingoland_train_weak_initial  : JSON Record<initial,{correct,count}>
 *   - lingoland_train_weak_rhyme    : JSON Record<rhyme,{correct,count}>
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  STATIONS,
  WORDS,
  INITIALS,
  RHYMES,
  TONES,
  toneById,
  stepsForStation,
  ACHIEVEMENTS,
  STICKERS,
  type Station,
  type TrainWord,
  type TrainStats,
  type AchievementCtx,
} from '../data/trainPhonicsData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'map' | 'playing' | 'parent' | 'collection';
type StepKey = 'initial' | 'rhyme' | 'tone';

const STATS_KEY = 'lingoland_train_stats';
const STATIONS_KEY = 'lingoland_train_stations';
const WEAK_I_KEY = 'lingoland_train_weak_initial';
const WEAK_R_KEY = 'lingoland_train_weak_rhyme';

const CONFETTI_COLORS = ['#7dd3fc', '#a7f3d0', '#fde68a', '#c4b5fd', '#fdba74'];

const {
  INITIAL_HINTS,
  SCORE_SEGMENT,
  SCORE_WORD,
  COMBO_X3,
  COMBO_X3_BONUS,
  COMBO_X5,
  COMBO_X5_BONUS,
  ROUNDS_PER_STATION,
  SPEED_SECONDS,
  STATION_COMPLETE_BONUS,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): TrainStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      wordsLearned: p?.wordsLearned || 0,
      correct: p?.correct || 0,
      attempts: p?.attempts || 0,
      timeMs: p?.timeMs || 0,
    };
  } catch {
    return { wordsLearned: 0, correct: 0, attempts: 0, timeMs: 0 };
  }
};
const saveStats = (s: TrainStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const loadStations = (): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(STATIONS_KEY) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveStations = (s: Set<string>) => {
  try {
    localStorage.setItem(STATIONS_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

type WeakMap = Record<string, { correct: number; count: number }>;
const loadWeak = (key: string): WeakMap => {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? '{}');
    return p && typeof p === 'object' ? (p as WeakMap) : {};
  } catch {
    return {};
  }
};
const saveWeak = (key: string, m: WeakMap) => {
  try {
    localStorage.setItem(key, JSON.stringify(m));
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

/** Các "toa" hiển thị theo loại ga (gồm cả toa cho sẵn/khoá). */
function carsForStation(kind: Station['id']): StepKey[] {
  switch (kind) {
    case 'initial':
      return ['initial'];
    case 'rhyme':
    case 'blend':
      return ['initial', 'rhyme'];
    case 'tone':
    case 'full':
    case 'speed':
      return ['initial', 'rhyme', 'tone'];
  }
}

const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

export default function TrainPhonicsView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('map');
  const [station, setStation] = useState<Station | null>(null);

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [deck, setDeck] = useState<TrainWord[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  /* ── State một vòng ──────────────────────────────────────────────────── */
  const [steps, setSteps] = useState<StepKey[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [picks, setPicks] = useState<Partial<Record<StepKey, string>>>({});
  const [options, setOptions] = useState<string[]>([]);
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const [hintOption, setHintOption] = useState<string | null>(null);
  const [hintsLeft, setHintsLeft] = useState<number>(INITIAL_HINTS);
  const [departing, setDeparting] = useState(false); // tàu đang chạy → khoá input
  const [timeLeft, setTimeLeft] = useState(0);

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<TrainStats>(loadStats());
  const stationsRef = useRef<Set<string>>(loadStations());
  const weakIRef = useRef<WeakMap>(loadWeak(WEAK_I_KEY));
  const weakRRef = useRef<WeakMap>(loadWeak(WEAK_R_KEY));
  const [stats, setStats] = useState<TrainStats>(() => statsRef.current);
  const [stationsDone, setStationsDone] = useState<Set<string>>(() => stationsRef.current);
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  const roundStartRef = useRef(0); // mốc thời gian vòng (đo thời gian học)
  const departingRef = useRef(false);

  /* ── Timer setTimeout cleanup ─────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);
  departingRef.current = departing;

  const target: TrainWord | undefined = deck[roundIndex];
  const currentStep = steps[stepIndex];

  /* ── Toast mở khoá ────────────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);

  const makeCtx = useCallback(
    (): AchievementCtx => ({ ...statsRef.current, stations: stationsRef.current }),
    [],
  );

  /** So sánh trước/sau để báo achievement hoặc sticker mới mở khoá. */
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

  /* ── Tạo phương án cho 1 bước ────────────────────────────────────────── */
  const buildOptions = useCallback((step: StepKey, word: TrainWord): string[] => {
    if (step === 'tone') return TONES.map((t) => t.id); // hiện đủ 6 thanh, giữ thứ tự
    const pool = step === 'initial' ? INITIALS : RHYMES;
    const correct = step === 'initial' ? word.initial : word.rhyme;
    const distractors = shuffle(pool.filter((x) => x !== correct)).slice(0, 2);
    return shuffle([correct, ...distractors]);
  }, []);

  /* ── Nạp một vòng (1 tiếng) ──────────────────────────────────────────── */
  const loadRound = useCallback(
    (st: Station, word: TrainWord) => {
      const stepList = stepsForStation(st.id);
      const cars = carsForStation(st.id);
      // Toa KHÔNG nằm trong bước chơi → cho sẵn (khoá): vd ga Vần cho sẵn âm đầu.
      const prefilled: Partial<Record<StepKey, string>> = {};
      for (const car of cars) {
        if (!stepList.includes(car)) {
          prefilled[car] = car === 'tone' ? word.tone : car === 'initial' ? word.initial : word.rhyme;
        }
      }
      setSteps(stepList);
      setStepIndex(0);
      setPicks(prefilled);
      setOptions(buildOptions(stepList[0], word));
      setWrongOption(null);
      setHintOption(null);
      setHintsLeft(INITIAL_HINTS);
      setDeparting(false);
      departingRef.current = false;
      roundStartRef.current = Date.now();

      // Đọc to từ mục tiêu để bé nghe trước khi ghép (Bước 2 của doc).
      const t = window.setTimeout(() => speak(word.read, LANG_SPEAK_DEFAULT), 350);
      addTimer(t);
    },
    [buildOptions],
  );

  /* ── Bắt đầu một ga ───────────────────────────────────────────────────── */
  const startStation = useCallback(
    (st: Station) => {
      clearTimers();
      const isSpeed = st.id === 'speed';
      // Ga thường: lấy ROUNDS từ; ga tốc độ: trộn toàn bộ (chơi tới khi hết giờ).
      const d = isSpeed ? shuffle(WORDS) : shuffle(WORDS).slice(0, ROUNDS_PER_STATION);
      setDeck(d);
      setStation(st);
      setRoundIndex(0);
      setScore(0);
      setCombo(0);
      setTimeLeft(isSpeed ? SPEED_SECONDS : 0);
      setPhase('playing');
      loadRound(st, d[0]);
    },
    [clearTimers, loadRound],
  );

  /* ── Hoàn thành một ga ───────────────────────────────────────────────── */
  const completeStation = useCallback(() => {
    if (!station) return;
    setScore((s) => s + STATION_COMPLETE_BONUS);

    const prev = makeCtx();
    const nextStations = new Set(stationsRef.current);
    nextStations.add(station.id);
    stationsRef.current = nextStations;
    setStationsDone(nextStations);
    saveStations(nextStations);
    announceUnlocks(prev);

    confetti({ particleCount: 220, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    speak(`Hoàn thành ${station.name}! Bé giỏi quá!`, LANG_SPEAK_DEFAULT);
    const t = window.setTimeout(() => setPhase('map'), 1700);
    addTimer(t);
  }, [station, makeCtx, announceUnlocks]);

  /* ── Sang vòng kế tiếp ───────────────────────────────────────────────── */
  const nextRound = useCallback(() => {
    if (!station) return;
    const isSpeed = station.id === 'speed';
    if (!isSpeed && roundIndex + 1 >= deck.length) {
      completeStation();
      return;
    }
    // Ga tốc độ: hết deck thì trộn lại (chơi liên tục tới khi hết giờ).
    const nextIdx = roundIndex + 1;
    if (isSpeed && nextIdx >= deck.length) {
      const reshuffled = shuffle(WORDS);
      setDeck(reshuffled);
      setRoundIndex(0);
      loadRound(station, reshuffled[0]);
    } else {
      setRoundIndex(nextIdx);
      loadRound(station, deck[nextIdx]);
    }
  }, [station, roundIndex, deck, completeStation, loadRound]);

  /* ── Đồng hồ ga tốc độ ───────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'playing' || station?.id !== 'speed') return;
    const id = window.setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase, station]);

  useEffect(() => {
    if (phase === 'playing' && station?.id === 'speed' && timeLeft === 0) completeStation();
  }, [timeLeft, phase, station, completeStation]);

  /* ── Ghi nhận độ chính xác âm đầu / vần (cho bảng phụ huynh) ─────────── */
  const recordWeak = (step: StepKey, word: TrainWord, isCorrect: boolean) => {
    if (step === 'tone') return; // chỉ theo dõi âm đầu & vần
    const ref = step === 'initial' ? weakIRef : weakRRef;
    const key = step === 'initial' ? word.initial : word.rhyme;
    const m = { ...ref.current };
    const e = m[key] ?? { correct: 0, count: 0 };
    m[key] = { correct: e.correct + (isCorrect ? 1 : 0), count: e.count + 1 };
    ref.current = m;
    saveWeak(step === 'initial' ? WEAK_I_KEY : WEAK_R_KEY, m);
  };

  /* ── Xử lý chọn một phương án ─────────────────────────────────────────── */
  const handlePick = (value: string) => {
    if (!target || !station || departingRef.current) return;
    const step = currentStep;
    const correct = step === 'tone' ? target.tone : step === 'initial' ? target.initial : target.rhyme;

    // Cập nhật thống kê chính xác.
    const ns: TrainStats = { ...statsRef.current, attempts: statsRef.current.attempts + 1 };

    if (value === correct) {
      ns.correct += 1;
      statsRef.current = ns;
      setStats(ns);
      saveStats(ns);
      recordWeak(step, target, true);

      // Cập nhật toa đã ghép.
      setPicks((p) => ({ ...p, [step]: value }));
      playSfx('snd-correct');
      playTing();

      // Điểm + combo.
      const newCombo = combo + 1;
      setCombo(newCombo);
      let gained = SCORE_SEGMENT;
      if (newCombo === COMBO_X3) gained += COMBO_X3_BONUS;
      if (newCombo === COMBO_X5) gained += COMBO_X5_BONUS;

      // Đọc to phần vừa ghép.
      if (step === 'initial' || step === 'rhyme') speak(value, LANG_SPEAK_DEFAULT);

      if (stepIndex + 1 < steps.length) {
        // Còn toa → sang bước kế.
        setScore((s) => s + gained);
        setStepIndex(stepIndex + 1);
        setOptions(buildOptions(steps[stepIndex + 1], target));
        setHintOption(null);
      } else {
        // ===== GHÉP HOÀN CHỈNH 1 TIẾNG =====
        setScore((s) => s + gained + SCORE_WORD);
        setDeparting(true);
        departingRef.current = true;

        // Đếm "tiếng đã học" cho ga có ghép tiếng (không tính ga nhận biết đơn).
        const buildsWord = station.id !== 'initial' && station.id !== 'rhyme';
        const prev = makeCtx();
        const ns2: TrainStats = {
          ...statsRef.current,
          wordsLearned: statsRef.current.wordsLearned + (buildsWord ? 1 : 0),
          timeMs: statsRef.current.timeMs + (Date.now() - roundStartRef.current),
        };
        statsRef.current = ns2;
        setStats(ns2);
        saveStats(ns2);
        announceUnlocks(prev);

        confetti({ particleCount: 110, spread: 90, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        // Đọc to tiếng hoàn chỉnh + hiệu ứng "tàu chạy".
        const ts = window.setTimeout(() => speak(target.read, LANG_SPEAK_DEFAULT), 250);
        addTimer(ts);
        const tn = window.setTimeout(nextRound, 1500);
        addTimer(tn);
      }
    } else {
      // ===== CHỌN SAI ===== (rung, đứt combo, cho chọn lại)
      statsRef.current = ns;
      setStats(ns);
      saveStats(ns);
      recordWeak(step, target, false);
      setCombo(0);
      setWrongOption(value);
      playBip();
      const t = window.setTimeout(() => setWrongOption((w) => (w === value ? null : w)), 450);
      addTimer(t);
    }
  };

  /* ── Gợi ý: làm sáng phương án đúng của bước hiện tại ─────────────────── */
  const useHint = () => {
    if (!target || hintsLeft <= 0 || hintOption || departingRef.current) return;
    const correct =
      currentStep === 'tone' ? target.tone : currentStep === 'initial' ? target.initial : target.rhyme;
    setHintOption(correct);
    setHintsLeft((h) => h - 1);
    playPop();
    const t = window.setTimeout(() => setHintOption((h) => (h === correct ? null : h)), GAME_CONFIG.HINT_DURATION);
    addTimer(t);
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const achievementCtx: AchievementCtx = { ...stats, stations: stationsDone };
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;

  // Mở khoá ga tuần tự: ga i mở nếu là ga đầu hoặc ga trước đã hoàn thành.
  const isStationUnlocked = useCallback(
    (idx: number) => idx === 0 || stationsDone.has(STATIONS[idx - 1].id),
    [stationsDone],
  );

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: STATION MAP
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

        <div className="text-center mb-5">
          <div className="text-7xl mb-2 floating">🚂</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Chuyến Tàu Âm Vần
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            Bé làm trưởng tàu, ghép các toa âm vần thành tiếng để tàu chạy nhé!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setPhase('collection')}
            className="bg-gradient-to-r from-amber-100 to-pink-100 text-amber-700 font-black text-sm px-3 py-2.5 rounded-2xl active:scale-95 transition-all"
          >
            🏅 Thành tích
          </button>
          <button
            onClick={() => setPhase('parent')}
            className="bg-gradient-to-r from-sky-100 to-indigo-100 text-indigo-700 font-black text-sm px-3 py-2.5 rounded-2xl active:scale-95 transition-all"
          >
            👨‍👩‍👧 Phụ huynh
          </button>
        </div>

        {/* Bản đồ tuyến tàu — các ga nối tiếp nhau */}
        <div className="space-y-2">
          {STATIONS.map((st, idx) => {
            const unlocked = isStationUnlocked(idx);
            const done = stationsDone.has(st.id);
            return (
              <button
                key={st.id}
                disabled={!unlocked}
                onClick={() => startStation(st)}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked ? `bg-gradient-to-br ${st.gradient}` : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-4xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                  {unlocked ? st.emoji : '🔒'}
                </div>
                <div className="flex-1">
                  <div className={`font-black text-base leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {unlocked ? st.name : '???'}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>
                    {unlocked ? st.desc : 'Hoàn thành ga trước để mở'}
                  </div>
                </div>
                {done && <span className="text-2xl">{st.sticker}</span>}
                {unlocked && !done && <span className="text-white text-xl">▶️</span>}
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
          <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Bảng Vinh Danh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            {stats.wordsLearned} tiếng · {stationsDone.size}/{STATIONS.length} ga · chính xác {accuracy}%
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
        <div className="grid grid-cols-5 gap-2">
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
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-25'}`}>{got ? s.emoji : '🔒'}</span>
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
    // Âm/vần còn yếu: tỉ lệ đúng thấp nhất (đã gặp ≥1 lần).
    const weakOf = (m: WeakMap) =>
      Object.entries(m)
        .map(([k, e]) => ({ k, acc: Math.round((e.correct / e.count) * 100), count: e.count }))
        .filter((x) => x.acc < 70)
        .sort((a, b) => a.acc - b.acc)
        .slice(0, 5);
    const weakInitials = weakOf(weakIRef.current);
    const weakRhymes = weakOf(weakRRef.current);
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

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tiếng đã học</div>
            <div className="text-2xl font-black text-sky-600">{stats.wordsLearned}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Chính xác</div>
            <div className="text-2xl font-black text-emerald-600">{accuracy}%</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</div>
            <div className="text-2xl font-black text-amber-600">{minutes}′</div>
          </div>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Âm đầu còn yếu</h3>
        {weakInitials.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-bold py-3 bg-slate-50 rounded-2xl mb-4">
            Chưa có — bé làm tốt! 🎉
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {weakInitials.map((w) => (
              <div key={w.k} className="flex items-center gap-2 bg-rose-50 border-2 border-rose-200 rounded-2xl px-3 py-2">
                <span className="text-xl font-black text-rose-600">{w.k}</span>
                <span className="text-[10px] font-bold text-rose-400">{w.acc}%</span>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vần còn yếu</h3>
        {weakRhymes.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-bold py-3 bg-slate-50 rounded-2xl">
            Chưa có — bé làm tốt! 🎉
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weakRhymes.map((w) => (
              <div key={w.k} className="flex items-center gap-2 bg-rose-50 border-2 border-rose-200 rounded-2xl px-3 py-2">
                <span className="text-xl font-black text-rose-600">{w.k}</span>
                <span className="text-[10px] font-bold text-rose-400">{w.acc}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PLAYING
   * ════════════════════════════════════════════════════════════════════ */
  if (!station || !target) return null;

  const cars = carsForStation(station.id);
  // Tiếng đang lắp ráp: có thanh điệu → hiện từ có dấu; chưa → ghép base.
  const assembled = picks.tone
    ? target.word
    : `${picks.initial ?? ''}${picks.rhyme ?? ''}`;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* ── Thanh trạng thái ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2 gap-2">
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
          {station.emoji} {station.name}
        </span>
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">
            ⭐ {score}
          </span>
          {station.id === 'speed' && (
            <span
              className={`font-black text-xs px-2.5 py-1 rounded-full ${
                timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-sky-100 text-sky-700'
              }`}
            >
              ⏱️ {fmtTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {/* ── Tiến độ vòng + combo ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-400">
          {station.id === 'speed' ? `Tiếng: ${stats.wordsLearned}` : `Ga ${roundIndex + 1}/${deck.length}`}
        </span>
        {combo >= 2 && (
          <span className="text-[11px] font-black text-orange-500">🔥 Combo {combo}</span>
        )}
      </div>

      {/* ── Hình minh hoạ + tiếng đang ghép ────────────────────────────── */}
      <div className="text-center mb-3">
        <button
          type="button"
          onClick={() => speak(target.read, LANG_SPEAK_DEFAULT)}
          className="text-7xl mb-1 active:scale-90 transition-transform"
          aria-label="Nghe đọc từ"
        >
          {target.emoji}
        </button>
        <div className="text-3xl font-black text-slate-700 tracking-wide min-h-[2.5rem]">
          {assembled || '???'}
        </div>
      </div>

      {/* ── ĐOÀN TÀU: các toa ───────────────────────────────────────────── */}
      <div
        className={`flex items-end justify-center gap-1 mb-4 transition-transform duration-700 ${
          departing ? 'translate-x-[120%]' : 'translate-x-0'
        }`}
      >
        {/* Đầu tàu */}
        <div className="text-3xl">🚂</div>
        {cars.map((car) => {
          const value = picks[car];
          const isActive = currentStep === car && !departing;
          const label =
            car === 'tone' ? (value ? toneById(value).name : 'Thanh') : car === 'initial' ? 'Âm đầu' : 'Vần';
          const display = car === 'tone' ? (value ? toneById(value).symbol : '?') : value ?? '?';
          return (
            <div key={car} className="flex flex-col items-center">
              <div
                className={`w-16 h-16 rounded-2xl border-4 flex items-center justify-center font-black text-2xl transition-all ${
                  value
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
                    : isActive
                      ? 'bg-amber-50 border-amber-400 text-amber-500 animate-pulse'
                      : 'bg-slate-50 border-slate-200 text-slate-300'
                }`}
              >
                {display}
              </div>
              <div className="text-[9px] font-bold text-slate-400 mt-0.5">{label}</div>
              {/* bánh xe */}
              <div className="text-[10px] -mt-0.5">⚙️</div>
            </div>
          );
        })}
      </div>

      {/* ── Câu hỏi bước hiện tại ──────────────────────────────────────── */}
      {!departing && (
        <p className="text-center text-slate-500 text-sm font-bold mb-2">
          {currentStep === 'initial'
            ? '👆 Chọn ÂM ĐẦU đúng'
            : currentStep === 'rhyme'
              ? '👆 Chọn VẦN đúng'
              : '👆 Chọn THANH ĐIỆU đúng'}
        </p>
      )}

      {/* ── Các phương án (toa để ghép) ────────────────────────────────── */}
      {!departing && (
        <div className={`grid gap-2 ${currentStep === 'tone' ? 'grid-cols-3' : 'grid-cols-3'}`}>
          {options.map((opt) => {
            const isWrong = wrongOption === opt;
            const isHint = hintOption === opt;
            const isTone = currentStep === 'tone';
            const tone = isTone ? toneById(opt) : null;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handlePick(opt)}
                className={`rounded-2xl border-2 p-3 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all ${
                  isWrong
                    ? 'shake-x border-red-300 bg-red-50'
                    : isHint
                      ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse'
                      : 'border-sky-100 bg-white shadow-sm hover:border-sky-200'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span className="text-3xl font-black text-slate-700 leading-none">
                  {isTone ? tone!.symbol : opt}
                </span>
                {isTone && <span className="text-[10px] font-bold text-slate-400">{tone!.name}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Tàu chạy ───────────────────────────────────────────────────── */}
      {departing && (
        <div className="text-center py-4 animate-in zoom-in">
          <div className="text-2xl font-black text-emerald-600">{target.word} 🎉</div>
          <div className="text-sm font-bold text-slate-400">Tàu chạy tới ga tiếp theo… 🚂💨</div>
        </div>
      )}

      {/* ── Nút gợi ý ──────────────────────────────────────────────────── */}
      {!departing && (
        <button
          onClick={useHint}
          disabled={hintsLeft <= 0 || hintOption !== null}
          className="w-full mt-3 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all disabled:opacity-40"
        >
          💡 Gợi ý ({hintsLeft})
        </button>
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
