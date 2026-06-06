/* ──────────────────────────────────────────────────────────────────────────
 * GAME "BÉ LÀM LỚP TRƯỞNG" (Game Island)
 *
 * Game kỹ năng mềm: bé đóng vai lớp trưởng, xử lý tình huống lớp học. Mỗi lựa
 * chọn ảnh hưởng tới HỒ SƠ KỸ NĂNG (trách nhiệm/đồng cảm/hợp tác/giao tiếp/lãnh
 * đạo) và MỨC VUI VẺ của lớp. Có sao, combo, thành tích, sticker, bảng phụ huynh.
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Đây là game TÌNH HUỐNG–LỰA CHỌN nên repo dùng
 *     HTML/Tailwind (chạm chọn) là phù hợp nhất; hiệu ứng bằng CSS + confetti.
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_monitor_skills : JSON SkillProfile (5 kỹ năng, 0–100)
 *   - lingoland_monitor_stats  : JSON MonitorStats
 *   - lingoland_monitor_weeks  : JSON string[] — id tuần đã hoàn thành
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  WEEKS,
  RANDOM_EVENTS,
  SKILL_META,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_WEEKS,
  studentById,
  type Week,
  type Mission,
  type Choice,
  type SkillProfile,
  type SkillKey,
  type MonitorStats,
  type AchievementCtx,
} from '../data/classMonitorData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'home' | 'playing' | 'parent' | 'collection';

const SKILLS_KEY = 'lingoland_monitor_skills';
const STATS_KEY = 'lingoland_monitor_stats';
const WEEKS_KEY = 'lingoland_monitor_weeks';

const CONFETTI_COLORS = ['#7dd3fc', '#fde047', '#86efac', '#fdba74', '#f9a8d4'];

const {
  START_HAPPINESS,
  SCORE_MISSION,
  SCORE_GOOD_CHOICE,
  SCORE_HELP,
  COMBO_N,
  COMBO_BONUS,
  QUICK_COUNT,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const EMPTY_SKILLS: SkillProfile = {
  responsibility: 0,
  empathy: 0,
  teamwork: 0,
  communication: 0,
  leadership: 0,
};

const loadSkills = (): SkillProfile => {
  try {
    const p = JSON.parse(localStorage.getItem(SKILLS_KEY) ?? '');
    return { ...EMPTY_SKILLS, ...(p && typeof p === 'object' ? p : {}) };
  } catch {
    return { ...EMPTY_SKILLS };
  }
};
const saveSkills = (s: SkillProfile) => {
  try {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const loadStats = (): MonitorStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      missionsDone: p?.missionsDone || 0,
      helps: p?.helps || 0,
      teacherSupportDone: p?.teacherSupportDone || 0,
      timeMs: p?.timeMs || 0,
    };
  } catch {
    return { missionsDone: 0, helps: 0, teacherSupportDone: 0, timeMs: 0 };
  }
};
const saveStats = (s: MonitorStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const loadWeeks = (): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(WEEKS_KEY) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveWeeks = (s: Set<string>) => {
  try {
    localStorage.setItem(WEEKS_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

/* ===========================================================================
 * Tiện ích
 * ========================================================================= */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Mặt cười thể hiện mức vui vẻ của lớp. */
const moodEmoji = (h: number) => (h >= 80 ? '😄' : h >= 50 ? '🙂' : h >= 25 ? '😟' : '😢');

/** Tất cả tình huống lựa chọn (cho chế độ Thử thách). */
const ALL_DECISIONS: Mission[] = [
  ...WEEKS.flatMap((w) => w.missions).filter((m) => m.type === 'decision'),
  ...RANDOM_EVENTS,
];

/** Kết quả 1 nhiệm vụ để hiển thị overlay. */
interface MissionResult {
  stars: number;
  feedback: string;
  deltas: Partial<SkillProfile>;
  best: boolean;
}

export default function ClassMonitorView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('home');

  /* ── State phiên chơi ────────────────────────────────────────────────── */
  const [missionList, setMissionList] = useState<Mission[]>([]);
  const [missionIndex, setMissionIndex] = useState(0);
  const [activeWeek, setActiveWeek] = useState<Week | null>(null); // null = chế độ Thử thách
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [happiness, setHappiness] = useState<number>(START_HAPPINESS);

  /* ── State 1 nhiệm vụ ────────────────────────────────────────────────── */
  const [result, setResult] = useState<MissionResult | null>(null); // overlay phản hồi
  const [wrongSeat, setWrongSeat] = useState<string | null>(null); // điểm danh: chỗ tap sai
  const [tidyFixed, setTidyFixed] = useState<Set<number>>(new Set()); // dọn dẹp: ô đã xếp
  const [hintChoice, setHintChoice] = useState<string | null>(null); // hỗ trợ: gợi ý lựa chọn tốt
  const [sessionDone, setSessionDone] = useState<'week' | 'quick' | null>(null); // overlay kết thúc

  const lockRef = useRef(false); // khoá input khi đang hiện kết quả
  const missionStartRef = useRef(0);
  const poorStreakRef = useRef(0); // số lần chọn kém liên tiếp (cho adaptive)

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const skillsRef = useRef<SkillProfile>(loadSkills());
  const statsRef = useRef<MonitorStats>(loadStats());
  const weeksRef = useRef<Set<string>>(loadWeeks());
  const [skills, setSkills] = useState<SkillProfile>(() => skillsRef.current);
  const [stats, setStats] = useState<MonitorStats>(() => statsRef.current);
  const [weeksDone, setWeeksDone] = useState<Set<string>>(() => weeksRef.current);
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const current: Mission | undefined = missionList[missionIndex];

  /* ── Toast + xét mở khoá ─────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);
  const makeCtx = useCallback(
    (): AchievementCtx => ({ ...statsRef.current, weeksCount: weeksRef.current.size }),
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

  /* ── Áp dụng thay đổi kỹ năng (clamp 0–100, lưu lại) ─────────────────── */
  const applySkills = useCallback((deltas: Partial<SkillProfile>) => {
    const next = { ...skillsRef.current };
    (Object.keys(deltas) as SkillKey[]).forEach((k) => {
      next[k] = clamp(next[k] + (deltas[k] ?? 0), 0, 100);
    });
    skillsRef.current = next;
    setSkills(next);
    saveSkills(next);
  }, []);

  /* ── Nạp một nhiệm vụ ────────────────────────────────────────────────── */
  const loadMission = useCallback((m: Mission) => {
    setResult(null);
    setWrongSeat(null);
    setTidyFixed(new Set());
    lockRef.current = false;
    missionStartRef.current = Date.now();
    // Chế độ hỗ trợ (sau 2 lựa chọn kém liên tiếp): gợi ý lựa chọn tốt nhất.
    if (m.type === 'decision' && poorStreakRef.current >= 2) {
      setHintChoice(m.choices.find((c) => c.quality === 'best')?.id ?? null);
    } else {
      setHintChoice(null);
    }
    const t = window.setTimeout(() => speak(m.prompt, LANG_SPEAK_DEFAULT), 350);
    addTimer(t);
  }, []);

  /* ── Bắt đầu một tuần (Story) ────────────────────────────────────────── */
  const startWeek = useCallback(
    (w: Week) => {
      clearTimers();
      setActiveWeek(w);
      setMissionList(w.missions);
      setMissionIndex(0);
      setScore(0);
      setCombo(0);
      setHappiness(START_HAPPINESS);
      setSessionDone(null);
      poorStreakRef.current = 0;
      setPhase('playing');
      loadMission(w.missions[0]);
    },
    [clearTimers, loadMission],
  );

  /* ── Bắt đầu chế độ Thử thách (tình huống ngẫu nhiên) ────────────────── */
  const startQuick = useCallback(() => {
    clearTimers();
    const deck = shuffle(ALL_DECISIONS).slice(0, QUICK_COUNT);
    setActiveWeek(null);
    setMissionList(deck);
    setMissionIndex(0);
    setScore(0);
    setCombo(0);
    setHappiness(START_HAPPINESS);
    setSessionDone(null);
    poorStreakRef.current = 0;
    setPhase('playing');
    loadMission(deck[0]);
  }, [clearTimers, loadMission]);

  /* ── Hoàn thành phiên (hết danh sách nhiệm vụ) ───────────────────────── */
  const finishSession = useCallback(() => {
    if (activeWeek) {
      // Story: đánh dấu tuần hoàn thành.
      const prev = makeCtx();
      const next = new Set(weeksRef.current);
      next.add(activeWeek.id);
      weeksRef.current = next;
      setWeeksDone(next);
      saveWeeks(next);
      announceUnlocks(prev);
      setSessionDone('week');
    } else {
      setSessionDone('quick');
    }
    confetti({ particleCount: 220, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    speak('Cô rất tự hào về con! Con là lớp trưởng tuyệt vời.', LANG_SPEAK_DEFAULT);
    const t = window.setTimeout(() => {
      setSessionDone(null);
      setPhase('home');
    }, 2400);
    addTimer(t);
  }, [activeWeek, makeCtx, announceUnlocks]);

  /* ── Sang nhiệm vụ kế / kết thúc phiên ───────────────────────────────── */
  const advance = useCallback(() => {
    setResult(null);
    if (missionIndex + 1 >= missionList.length) {
      finishSession();
    } else {
      setMissionIndex((i) => {
        const ni = i + 1;
        loadMission(missionList[ni]);
        return ni;
      });
    }
  }, [missionIndex, missionList, finishSession, loadMission]);

  /* ── Ghi nhận hoàn thành 1 nhiệm vụ (điểm, combo, thống kê, sao) ──────── */
  const completeMission = useCallback(
    (opts: {
      stars: number;
      feedback: string;
      deltas: Partial<SkillProfile>;
      happinessDelta: number;
      best: boolean;
      isHelp?: boolean;
    }) => {
      if (!current) return;
      lockRef.current = true;

      applySkills(opts.deltas);
      setHappiness((h) => clamp(h + opts.happinessDelta, 0, 100));

      // Điểm: +100, +50 nếu lựa chọn tốt, +75 nếu giúp bạn, thưởng combo.
      const newCombo = combo + 1;
      setCombo(newCombo);
      let gained = SCORE_MISSION;
      if (opts.best) gained += SCORE_GOOD_CHOICE;
      if (opts.isHelp) gained += SCORE_HELP;
      if (newCombo > 0 && newCombo % COMBO_N === 0) gained += COMBO_BONUS;
      setScore((s) => s + gained);

      // Thống kê tích luỹ.
      const prevCtx = makeCtx();
      const ns: MonitorStats = {
        missionsDone: statsRef.current.missionsDone + 1,
        helps: statsRef.current.helps + (opts.isHelp ? 1 : 0),
        teacherSupportDone: statsRef.current.teacherSupportDone + (current.isTeacherSupport ? 1 : 0),
        timeMs: statsRef.current.timeMs + (Date.now() - missionStartRef.current),
      };
      statsRef.current = ns;
      setStats(ns);
      saveStats(ns);
      announceUnlocks(prevCtx);

      setResult({ stars: opts.stars, feedback: opts.feedback, deltas: opts.deltas, best: opts.best });
      speak(opts.feedback, LANG_SPEAK_DEFAULT);
      if (opts.best) {
        playSfx('snd-correct');
        playTing();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
      } else {
        playTing();
      }

      const t = window.setTimeout(advance, 2200);
      addTimer(t);
    },
    [current, combo, applySkills, makeCtx, announceUnlocks, advance],
  );

  /* ── Xử lý chọn lựa (decision) ───────────────────────────────────────── */
  const handleChoice = (choice: Choice) => {
    if (!current || current.type !== 'decision' || lockRef.current) return;
    const stars = choice.quality === 'best' ? 3 : choice.quality === 'ok' ? 2 : 1;
    if (choice.quality === 'poor') {
      poorStreakRef.current += 1;
      playBip();
    } else {
      poorStreakRef.current = 0;
    }
    completeMission({
      stars,
      feedback: choice.feedback,
      deltas: choice.skills,
      happinessDelta: choice.happiness,
      best: choice.quality === 'best',
      isHelp: choice.isHelp,
    });
  };

  /* ── Xử lý điểm danh: chạm vào bạn vắng (chỗ ngồi trống) ─────────────── */
  const handleSeatTap = (studentId: string) => {
    if (!current || current.type !== 'attendance' || lockRef.current) return;
    if (studentId === current.absentId) {
      const noMistake = wrongSeat === null;
      completeMission({
        stars: noMistake ? 3 : 2,
        feedback: `Giỏi quá! Bạn ${studentById(current.absentId).name} hôm nay vắng mặt.`,
        deltas: { responsibility: 4 },
        happinessDelta: 6,
        best: true,
      });
    } else {
      // Chạm nhầm bạn đang có mặt.
      playBip();
      setWrongSeat(studentId);
      const t = window.setTimeout(() => setWrongSeat((w) => (w === studentId ? null : w)), 450);
      addTimer(t);
    }
  };

  /* ── Xử lý dọn dẹp: chạm để xếp gọn từng món ─────────────────────────── */
  const handleTidyTap = (idx: number) => {
    if (!current || current.type !== 'tidy' || lockRef.current) return;
    if (tidyFixed.has(idx)) return;
    playPop();
    const next = new Set(tidyFixed);
    next.add(idx);
    setTidyFixed(next);
    if (next.size >= current.items) {
      // Đã xếp gọn tất cả.
      completeMission({
        stars: 3,
        feedback: 'Lớp học gọn gàng quá! Con làm việc rất chăm chỉ.',
        deltas: { responsibility: 3 },
        happinessDelta: 6,
        best: true,
      });
    }
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const achievementCtx: AchievementCtx = { ...stats, weeksCount: weeksDone.size };
  const isWeekUnlocked = useCallback(
    (idx: number) => idx === 0 || weeksDone.has(WEEKS[idx - 1].id),
    [weeksDone],
  );

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: HOME (bản đồ trường + chế độ)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'home') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>

        <div className="text-center mb-4">
          <div className="text-7xl mb-1 floating">🎓</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
            Bé Làm Lớp Trưởng
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            Cô giáo tin tưởng giao con làm lớp trưởng. Cùng quản lý lớp thật giỏi nhé!
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={startQuick}
            className="bg-gradient-to-br from-fuchsia-400 to-purple-500 text-white font-black text-xs px-3 py-3 rounded-2xl active:scale-95 transition-all"
          >
            ⚡ Thử thách
          </button>
          <button
            onClick={() => setPhase('collection')}
            className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-3 rounded-2xl active:scale-95 transition-all"
          >
            🏅 Thành tích
          </button>
          <button
            onClick={() => setPhase('parent')}
            className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-3 rounded-2xl active:scale-95 transition-all"
          >
            👨‍👩‍👧 Phụ huynh
          </button>
        </div>

        {/* Lộ trình 4 tuần (mở khoá tuần tự) */}
        <div className="space-y-2">
          {WEEKS.map((w, idx) => {
            const unlocked = isWeekUnlocked(idx);
            const done = weeksDone.has(w.id);
            return (
              <button
                key={w.id}
                disabled={!unlocked}
                onClick={() => startWeek(w)}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked
                    ? 'bg-gradient-to-br from-sky-400 via-amber-400 to-emerald-400'
                    : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-4xl ${unlocked ? '' : 'grayscale opacity-50'}`}>
                  {unlocked ? w.emoji : '🔒'}
                </div>
                <div className="flex-1">
                  <div className={`font-black text-sm leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {unlocked ? w.title : '???'}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>
                    {unlocked ? `${w.missions.length} nhiệm vụ` : 'Hoàn thành tuần trước để mở'}
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
   * SCREEN: COLLECTION
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'collection') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('home')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
            Bảng Vinh Danh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            {stats.missionsDone} nhiệm vụ · giúp {stats.helps} bạn · {weeksDone.size}/{TOTAL_WEEKS} tuần
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
    const minutes = Math.round(stats.timeMs / 60000);
    // Sắp xếp kỹ năng để tìm điểm mạnh / cần cải thiện.
    const ranked = [...SKILL_META].sort((a, b) => skills[b.key] - skills[a.key]);
    const strongest = ranked[0];
    const weakest = ranked[ranked.length - 1];

    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('home')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Bảng Phụ Huynh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            {minutes} phút chơi · {stats.missionsDone} nhiệm vụ hoàn thành
          </p>
        </div>

        {/* Hồ sơ kỹ năng mềm */}
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kỹ năng đã học</h3>
        <div className="space-y-3 mb-4">
          {SKILL_META.map((sk) => (
            <div key={sk.key}>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>
                  {sk.emoji} {sk.label}
                </span>
                <span>{skills[sk.key]}/100</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${sk.color} rounded-full transition-all`}
                  style={{ width: `${skills[sk.key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm mạnh</div>
            <div className="text-sm font-black text-emerald-600 mt-1">
              {strongest.emoji} {strongest.label}
            </div>
          </div>
          <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Cần cải thiện</div>
            <div className="text-sm font-black text-rose-600 mt-1">
              {weakest.emoji} {weakest.label}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PLAYING
   * ════════════════════════════════════════════════════════════════════ */
  if (!current) return null;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* ── Thanh trạng thái: thoát · điểm · mức vui vẻ ────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => {
            clearTimers();
            setPhase('home');
          }}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <span className="text-xs font-black text-slate-500">
          {activeWeek ? activeWeek.emoji : '⚡'} {activeWeek ? `Nhiệm vụ ${missionIndex + 1}/${missionList.length}` : 'Thử thách'}
        </span>
        <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">
          ⭐ {score}
        </span>
      </div>

      {/* ── Thước đo "Lớp vui vẻ" ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{moodEmoji(happiness)}</span>
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              happiness >= 50 ? 'bg-gradient-to-r from-emerald-400 to-sky-400' : 'bg-gradient-to-r from-amber-400 to-rose-400'
            }`}
            style={{ width: `${happiness}%` }}
          />
        </div>
        <span className="text-[11px] font-black text-slate-400">{happiness}%</span>
      </div>

      {/* ── Thẻ nhiệm vụ (cô giáo / robot giao việc) ───────────────────── */}
      <div className="bg-gradient-to-br from-sky-50 via-amber-50 to-emerald-50 border-2 border-sky-100 rounded-3xl p-4 mb-4 text-center">
        <div className="text-5xl mb-1">{current.emoji}</div>
        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{current.title}</div>
        <p className="font-black text-slate-700 text-base leading-snug mt-1">{current.prompt}</p>
        <button
          type="button"
          onClick={() => speak(current.prompt, LANG_SPEAK_DEFAULT)}
          className="mt-2 text-sky-500 text-sm font-bold"
        >
          🔊 Nghe lại
        </button>
      </div>

      {/* ── Khu tương tác theo loại nhiệm vụ ───────────────────────────── */}
      {!result && current.type === 'decision' && (
        <div className="space-y-2">
          {current.choices.map((choice) => {
            const isHint = hintChoice === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => handleChoice(choice)}
                className={`w-full p-4 rounded-2xl border-2 font-bold text-left text-slate-700 active:scale-95 transition-all ${
                  isHint
                    ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse'
                    : 'border-sky-100 bg-white shadow-sm hover:border-sky-200'
                }`}
              >
                {choice.label}
              </button>
            );
          })}
          {hintChoice && (
            <p className="text-center text-amber-500 text-xs font-bold">
              👩‍🏫 Cô gợi ý: thử cách đang sáng nhé!
            </p>
          )}
        </div>
      )}

      {!result && current.type === 'attendance' && (
        <div className="grid grid-cols-4 gap-2">
          {current.roster.map((id) => {
            const st = studentById(id);
            const absent = id === current.absentId;
            const isWrong = wrongSeat === id;
            return (
              <button
                key={id}
                onClick={() => handleSeatTap(id)}
                className={`rounded-2xl border-2 p-2 flex flex-col items-center gap-0.5 active:scale-95 transition-all ${
                  isWrong ? 'shake-x border-red-300 bg-red-50' : 'border-sky-100 bg-white shadow-sm'
                }`}
              >
                {/* Bạn vắng → ghế trống; bạn có mặt → avatar */}
                <span className="text-3xl leading-none">{absent ? '🪑' : st.avatar}</span>
                <span className="text-[10px] font-black text-slate-600">{st.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {!result && current.type === 'tidy' && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-2">
            {Array.from({ length: current.items }, (_, i) => {
              const fixed = tidyFixed.has(i);
              return (
                <button
                  key={i}
                  onClick={() => handleTidyTap(i)}
                  className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-4xl active:scale-90 transition-all ${
                    fixed ? 'border-emerald-300 bg-emerald-50' : 'border-sky-100 bg-white shadow-sm'
                  }`}
                  style={{ transform: fixed ? 'rotate(0deg)' : `rotate(${(i % 2 === 0 ? -1 : 1) * 18}deg)` }}
                >
                  {fixed ? '✨' : '🪑'}
                </button>
              );
            })}
          </div>
          <p className="text-center text-slate-400 text-xs font-bold">
            Đã xếp {tidyFixed.size}/{current.items}
          </p>
        </div>
      )}

      {/* ── Overlay kết quả nhiệm vụ ───────────────────────────────────── */}
      {result && (
        <div className="bg-white border-2 border-emerald-100 rounded-3xl p-5 text-center shadow-lg animate-in zoom-in">
          <div className="flex justify-center gap-1 mb-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`text-4xl ${i < result.stars ? '' : 'grayscale opacity-25'}`}>
                ⭐
              </span>
            ))}
          </div>
          <div className="text-3xl mb-1">👩‍🏫</div>
          <p className="font-black text-slate-700 text-sm leading-snug mb-2">"{result.feedback}"</p>
          {/* Kỹ năng tăng/giảm */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {(Object.keys(result.deltas) as SkillKey[]).map((k) => {
              const d = result.deltas[k] ?? 0;
              const meta = SKILL_META.find((s) => s.key === k)!;
              return (
                <span
                  key={k}
                  className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    d >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {meta.emoji} {d >= 0 ? '+' : ''}
                  {d}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Overlay kết thúc tuần / thử thách ──────────────────────────── */}
      {sessionDone && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
            <div className="text-6xl mb-1 animate-bounce">🏆</div>
            <div className="text-xl font-black text-emerald-600">
              {sessionDone === 'week' ? 'Hoàn thành tuần học!' : 'Hoàn thành thử thách!'}
            </div>
            <div className="text-sm font-bold text-slate-500 mt-1">Cô rất tự hào về con! 🎉</div>
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
