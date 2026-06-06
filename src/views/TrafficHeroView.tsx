/* ──────────────────────────────────────────────────────────────────────────
 * GAME "SIÊU NHÂN GIAO THÔNG" (Game Island)
 *
 * Bé làm Siêu Nhân Giao Thông: đi qua 5 khu vực, học luật giao thông qua các
 * nhiệm vụ (đèn tín hiệu, sang đường, mũ bảo hiểm, biển báo, tìm lỗi). Có CHỈ SỐ
 * AN TOÀN, combo, skin siêu nhân, từ điển biển báo, thành tích, sticker và bảng
 * phụ huynh. Biển báo & đèn vẽ bằng CSS.
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Đây là chuỗi nhiệm vụ CHẠM → repo dùng
 *     HTML/Tailwind; hiệu ứng CSS + canvas-confetti.
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_traffic_stats : JSON TrafficStats
 *   - lingoland_traffic_zones : JSON string[] — id khu vực hoàn thành
 *   - lingoland_traffic_signs : JSON string[] — id biển báo đã học
 *   - lingoland_traffic_learn : JSON Record<Knowledge, number> — Learning Engine
 *   - lingoland_traffic_skin  : string — id skin đang chọn
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  ZONES,
  ROAD_SIGNS,
  HERO_SKINS,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_ZONES,
  TOTAL_SIGNS,
  signById,
  type Zone,
  type Mission,
  type ChoiceOption,
  type RoadSign,
  type Knowledge,
  type TrafficStats,
  type AchievementCtx,
} from '../data/trafficHeroData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'map' | 'playing' | 'encyclopedia' | 'collection' | 'parent' | 'skins';

const STATS_KEY = 'lingoland_traffic_stats';
const ZONES_KEY = 'lingoland_traffic_zones';
const SIGNS_KEY = 'lingoland_traffic_signs';
const LEARN_KEY = 'lingoland_traffic_learn';
const SKIN_KEY = 'lingoland_traffic_skin';

const CONFETTI_COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#f97316'];
const LIGHT_COLORS: Record<string, string> = { red: '#ef4444', yellow: '#eab308', green: '#22c55e' };

const {
  SCORE_ACTION, SCORE_MISSION, SCORE_PERFECT, COMBO_N, COMBO_BONUS, COINS_PER_MISSION,
  SAFETY_START, SAFETY_UP, SAFETY_DOWN, SUPPORT_WRONG_STREAK,
} = GAME_CONFIG;

const KNOW_LABEL: Record<Knowledge, string> = {
  lights: 'Đèn tín hiệu', signs: 'Biển báo', crossing: 'Sang đường an toàn', driving: 'Tình huống thực tế',
};

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): TrafficStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      missions: p?.missions || 0, correct: p?.correct || 0, attempts: p?.attempts || 0,
      crossing: p?.crossing || 0, coins: p?.coins || 0, timeMs: p?.timeMs || 0,
    };
  } catch {
    return { missions: 0, correct: 0, attempts: 0, crossing: 0, coins: 0, timeMs: 0 };
  }
};
const saveStats = (s: TrafficStats) => { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const loadSet = (key: string): Set<string> => {
  try { const p = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set(); }
  catch { return new Set(); }
};
const saveSet = (key: string, s: Set<string>) => { try { localStorage.setItem(key, JSON.stringify([...s])); } catch { /* ignore */ } };

type LearnMap = Record<Knowledge, number>;
const EMPTY_LEARN: LearnMap = { lights: 0, signs: 0, crossing: 0, driving: 0 };
const loadLearn = (): LearnMap => {
  try { const p = JSON.parse(localStorage.getItem(LEARN_KEY) ?? 'null'); return p ? { ...EMPTY_LEARN, ...p } : { ...EMPTY_LEARN }; }
  catch { return { ...EMPTY_LEARN }; }
};
const saveLearn = (m: LearnMap) => { try { localStorage.setItem(LEARN_KEY, JSON.stringify(m)); } catch { /* ignore */ } };

const fmtTime = (ms: number) => `${Math.round(ms / 60000)} phút`;

/* ===========================================================================
 * Component: BIỂN BÁO vẽ bằng CSS theo nhóm (warning/prohibition/...)
 * ========================================================================= */

function RoadSignIcon({ sign, size = 64 }: { sign: RoadSign; size?: number }) {
  const sym = sign.symbol;
  if (sign.category === 'warning') {
    // Tam giác vàng (cảnh báo) — dùng clip-path, ký hiệu đặt phần dưới.
    return (
      <div style={{ width: size, height: size, position: 'relative' }}>
        <div style={{ width: size, height: size, background: '#fbbf24', clipPath: 'polygon(50% 5%, 4% 95%, 96% 95%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: size * 0.12 }}>
          <span style={{ fontSize: size * 0.32 }}>{sym}</span>
        </div>
      </div>
    );
  }
  if (sign.category === 'prohibition') {
    // Tròn viền đỏ (cấm). 'bar' = vạch trắng (cấm đi ngược chiều).
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', border: `${size * 0.12}px solid #ef4444`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {sym === 'bar'
          ? <div style={{ width: size * 0.55, height: size * 0.16, background: '#ef4444', borderRadius: 2 }} />
          : <span style={{ fontSize: size * 0.32 }}>{sym}</span>}
      </div>
    );
  }
  if (sign.category === 'mandatory') {
    // Tròn xanh dương (hiệu lệnh).
    return <div style={{ width: size, height: size, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: size * 0.4 }}>{sym}</span></div>;
  }
  // instruction — vuông xanh dương (chỉ dẫn).
  return <div style={{ width: size, height: size, borderRadius: 8, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: size * 0.4 }}>{sym}</span></div>;
}

/* Component: ĐÈN GIAO THÔNG (3 bóng dọc, sáng bóng đang bật) */
function TrafficLight({ color }: { color: 'red' | 'yellow' | 'green' }) {
  return (
    <div className="inline-flex flex-col gap-1.5 bg-slate-800 rounded-2xl p-2.5">
      {(['red', 'yellow', 'green'] as const).map((c) => {
        const on = color === c;
        return (
          <div
            key={c}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: on ? LIGHT_COLORS[c] : '#334155',
              boxShadow: on ? `0 0 16px ${LIGHT_COLORS[c]}` : 'none',
              opacity: on ? 1 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
}

export default function TrafficHeroView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('map');

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [zone, setZone] = useState<Zone | null>(null);
  const [missionIndex, setMissionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [safety, setSafety] = useState<number>(SAFETY_START);

  /* ── State 1 nhiệm vụ ────────────────────────────────────────────────── */
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [orderShuffled, setOrderShuffled] = useState<string[]>([]); // bước đã xáo (mode order)
  const [placed, setPlaced] = useState<string[]>([]); // bước đã đặt đúng thứ tự
  const [result, setResult] = useState<{ stars: number; text: string } | null>(null);
  const [zoneDone, setZoneDone] = useState<Zone | null>(null);

  const mistakesRef = useRef(0);
  const wrongStreakRef = useRef(0);
  const missionStartRef = useRef(0);
  const lockRef = useRef(false);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<TrafficStats>(loadStats());
  const zonesRef = useRef<Set<string>>(loadSet(ZONES_KEY));
  const signsRef = useRef<Set<string>>(loadSet(SIGNS_KEY));
  const learnRef = useRef<LearnMap>(loadLearn());
  const [stats, setStats] = useState<TrafficStats>(() => statsRef.current);
  const [zonesDone, setZonesDone] = useState<Set<string>>(() => zonesRef.current);
  const [signsLearned, setSignsLearned] = useState<Set<string>>(() => signsRef.current);
  const [skinId, setSkinId] = useState<string>(() => { try { return localStorage.getItem(SKIN_KEY) || 'hero'; } catch { return 'hero'; } });
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const mission: Mission | undefined = zone?.missions[missionIndex];
  const selectedSkin = HERO_SKINS.find((s) => s.id === skinId) ?? HERO_SKINS[0];

  /* ── Toast + xét mở khoá ─────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);
  const makeCtx = useCallback(
    (): AchievementCtx => ({ ...statsRef.current, zonesCount: zonesRef.current.size, signsCount: signsRef.current.size }),
    [],
  );
  const announceUnlocks = useCallback((prev: AchievementCtx) => {
    const next = makeCtx();
    const a = ACHIEVEMENTS.find((x) => !x.unlocked(prev) && x.unlocked(next));
    if (a) { showToast(a.emoji, `Mở khoá: ${a.name}`); return; }
    const s = STICKERS.find((x) => !x.unlocked(prev) && x.unlocked(next));
    if (s) showToast(s.emoji, `Sticker mới: ${s.name}`);
  }, [makeCtx, showToast]);

  /* ── Tiện ích shuffle (cho bước sang đường) ──────────────────────────── */
  const shuffle = (arr: string[]): string[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ── Nạp một nhiệm vụ ────────────────────────────────────────────────── */
  const loadMission = useCallback((m: Mission) => {
    setWrongId(null);
    setHintId(null);
    setResult(null);
    setPlaced([]);
    if (m.type === 'order') setOrderShuffled(shuffle(m.steps));
    mistakesRef.current = 0;
    wrongStreakRef.current = 0;
    missionStartRef.current = Date.now();
    lockRef.current = false;
    const t = window.setTimeout(() => speak(m.prompt, LANG_SPEAK_DEFAULT), 350);
    addTimer(t);
  }, []);

  /* ── Bắt đầu một khu vực ─────────────────────────────────────────────── */
  const startZone = useCallback((z: Zone) => {
    clearTimers();
    setZone(z);
    setMissionIndex(0);
    setScore(0);
    setCombo(0);
    setSafety(SAFETY_START);
    setZoneDone(null);
    setPhase('playing');
    loadMission(z.missions[0]);
  }, [clearTimers, loadMission]);

  /* ── Cập nhật chỉ số an toàn (clamp 0–100) ───────────────────────────── */
  const bumpSafety = (delta: number) => setSafety((s) => Math.max(0, Math.min(100, s + delta)));

  /* ── Ghi nhận 1 lần SAI (giảm an toàn, gợi ý sau 2 lần) ──────────────── */
  const registerWrong = useCallback(() => {
    mistakesRef.current += 1;
    wrongStreakRef.current += 1;
    setCombo(0);
    bumpSafety(-SAFETY_DOWN);
    playSfx('snd-wrong');
    playBip();
    const ns = { ...statsRef.current, attempts: statsRef.current.attempts + 1 };
    statsRef.current = ns; setStats(ns); saveStats(ns);
  }, []);

  /* ── Ghi nhận 1 hành động ĐÚNG ───────────────────────────────────────── */
  const registerCorrectAction = useCallback(() => {
    wrongStreakRef.current = 0;
    bumpSafety(SAFETY_UP);
    const ns = { ...statsRef.current, correct: statsRef.current.correct + 1, attempts: statsRef.current.attempts + 1 };
    statsRef.current = ns; setStats(ns); saveStats(ns);
  }, []);

  /* ── Hoàn thành một nhiệm vụ ─────────────────────────────────────────── */
  const completeMission = useCallback(() => {
    if (!zone || !mission) return;
    lockRef.current = true;
    const stars = mistakesRef.current === 0 ? 3 : mistakesRef.current <= 2 ? 2 : 1;

    // Điểm + combo (updater THUẦN; cập nhật thống kê làm ngoài để an toàn StrictMode).
    const newCombo = combo + 1;
    setCombo(newCombo);
    let gained = SCORE_ACTION + SCORE_MISSION + (mistakesRef.current === 0 ? SCORE_PERFECT : 0);
    if (newCombo > 0 && newCombo % COMBO_N === 0) gained += COMBO_BONUS;
    setScore((s) => s + gained);

    // Biển báo đã học (nếu nhiệm vụ liên quan biển báo).
    const learnedSigns: string[] = [];
    if (mission.type === 'choice') {
      if (mission.optionKind === 'sign') {
        const ans = mission.options.find((o) => o.id === mission.answerId);
        if (ans?.signId) learnedSigns.push(ans.signId);
      }
      if (mission.visual?.kind === 'sign') learnedSigns.push(mission.visual.signId);
    }

    // Cập nhật thống kê + Learning Engine.
    const prev = makeCtx();
    const ns: TrafficStats = {
      ...statsRef.current,
      missions: statsRef.current.missions + 1,
      crossing: statsRef.current.crossing + (mission.knowledge === 'crossing' ? 1 : 0),
      coins: statsRef.current.coins + COINS_PER_MISSION,
      timeMs: statsRef.current.timeMs + (Date.now() - missionStartRef.current),
    };
    statsRef.current = ns; setStats(ns); saveStats(ns);

    const nl = { ...learnRef.current, [mission.knowledge]: learnRef.current[mission.knowledge] + 1 };
    learnRef.current = nl; saveLearn(nl);

    if (learnedSigns.length > 0) {
      const nextSigns = new Set(signsRef.current);
      learnedSigns.forEach((id) => nextSigns.add(id));
      signsRef.current = nextSigns; setSignsLearned(nextSigns); saveSet(SIGNS_KEY, nextSigns);
    }
    announceUnlocks(prev);

    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct'); playTing();
    const praise = stars === 3 ? 'Rất tốt! Con tham gia giao thông an toàn!' : 'Tốt lắm, con làm đúng rồi!';
    setResult({ stars, text: praise });
    speak(praise, LANG_SPEAK_DEFAULT);

    // Sang nhiệm vụ kế / hoàn thành khu vực.
    const t = window.setTimeout(() => {
      if (missionIndex + 1 < zone.missions.length) {
        setMissionIndex((i) => i + 1);
        loadMission(zone.missions[missionIndex + 1]);
      } else {
        // Hoàn thành khu vực.
        const prevZ = makeCtx();
        const nextZones = new Set(zonesRef.current);
        nextZones.add(zone.id);
        zonesRef.current = nextZones; setZonesDone(nextZones); saveSet(ZONES_KEY, nextZones);
        announceUnlocks(prevZ);
        confetti({ particleCount: 220, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        speak(`Hoàn thành ${zone.name}! Con là siêu nhân giao thông!`, LANG_SPEAK_DEFAULT);
        setZoneDone(zone);
      }
    }, 1600);
    addTimer(t);
  }, [zone, mission, combo, missionIndex, makeCtx, announceUnlocks, loadMission]);

  /* ── CHOICE: chạm một đáp án ─────────────────────────────────────────── */
  const handleChoice = (opt: ChoiceOption) => {
    if (!mission || mission.type !== 'choice' || lockRef.current) return;
    if (opt.id === mission.answerId) {
      registerCorrectAction();
      // Đọc tên biển báo / nội dung đúng để củng cố.
      if (mission.optionKind === 'sign' && opt.signId) speak(signById(opt.signId).name, LANG_SPEAK_DEFAULT);
      completeMission();
    } else {
      registerWrong();
      setWrongId(opt.id);
      const t = window.setTimeout(() => setWrongId((w) => (w === opt.id ? null : w)), 450);
      addTimer(t);
      if (wrongStreakRef.current >= SUPPORT_WRONG_STREAK) setHintId(mission.answerId);
    }
  };

  /* ── ORDER: chạm bước theo đúng thứ tự ───────────────────────────────── */
  const handleOrderTap = (step: string) => {
    if (!mission || mission.type !== 'order' || lockRef.current) return;
    if (placed.includes(step)) return;
    const expected = mission.steps[placed.length];
    if (step === expected) {
      playPop(); playTing();
      registerCorrectAction();
      const next = [...placed, step];
      setPlaced(next);
      if (next.length === mission.steps.length) completeMission();
    } else {
      registerWrong();
      setWrongId(step);
      const t = window.setTimeout(() => setWrongId((w) => (w === step ? null : w)), 450);
      addTimer(t);
    }
  };

  /* ── Chọn skin ───────────────────────────────────────────────────────── */
  const selectSkin = (id: string) => {
    const sk = HERO_SKINS.find((s) => s.id === id);
    if (!sk || zonesDone.size < sk.zonesNeeded) return;
    setSkinId(id);
    try { localStorage.setItem(SKIN_KEY, id); } catch { /* ignore */ }
    playTing();
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const ctx: AchievementCtx = { ...stats, zonesCount: zonesDone.size, signsCount: signsLearned.size };
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
  const isZoneUnlocked = useCallback((idx: number) => idx === 0 || zonesDone.has(ZONES[idx - 1].id), [zonesDone]);

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: CITY MAP
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'map') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Bản đồ</button>
        <div className="text-center mb-4">
          <div className="text-7xl mb-1 floating">{selectedSkin.emoji}</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent">
            Siêu Nhân Giao Thông
          </h2>
          <p className="text-slate-500 text-sm font-bold">Giúp Thành Phố An Toàn tham gia giao thông đúng luật nào!</p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-1.5 rounded-full">🪙 {stats.coins}</span>
          <button onClick={() => setPhase('skins')} className="bg-orange-100 text-orange-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">🦸 Bộ đồ</button>
          <button onClick={() => setPhase('encyclopedia')} className="bg-sky-100 text-sky-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">📖 Biển báo</button>
          <button onClick={() => setPhase('collection')} className="bg-pink-100 text-pink-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">🏅</button>
          <button onClick={() => setPhase('parent')} className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-1.5 rounded-full active:scale-95">👨‍👩‍👧</button>
        </div>
        <div className="space-y-2">
          {ZONES.map((z, idx) => {
            const unlocked = isZoneUnlocked(idx);
            const done = zonesDone.has(z.id);
            return (
              <button
                key={z.id}
                disabled={!unlocked}
                onClick={() => startZone(z)}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked ? `bg-gradient-to-br ${z.gradient}` : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-4xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{unlocked ? z.emoji : '🔒'}</div>
                <div className="flex-1">
                  <div className={`font-black text-base leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>{unlocked ? z.name : '???'}</div>
                  <div className={`text-[11px] font-bold mt-0.5 ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>{unlocked ? `${z.missions.length} nhiệm vụ` : 'Hoàn thành khu trước để mở'}</div>
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
   * SCREEN: SKINS
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'skins') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">{selectedSkin.emoji}</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Bộ Đồ Siêu Nhân</h2>
          <p className="text-slate-500 text-xs font-bold mt-1">Hoàn thành khu vực để mở khoá bộ đồ mới!</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {HERO_SKINS.map((sk) => {
            const unlocked = zonesDone.size >= sk.zonesNeeded;
            const selected = skinId === sk.id;
            return (
              <button
                key={sk.id}
                disabled={!unlocked}
                onClick={() => selectSkin(sk.id)}
                className={`rounded-3xl border-2 p-4 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                  selected ? 'border-orange-400 bg-orange-50 ring-4 ring-orange-200' : unlocked ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className={`text-5xl ${unlocked ? '' : 'grayscale opacity-40'}`}>{unlocked ? sk.emoji : '🔒'}</span>
                <span className="font-black text-sm text-slate-700">{sk.name}</span>
                <span className={`text-[10px] font-black ${unlocked ? (selected ? 'text-orange-500' : 'text-emerald-500') : 'text-amber-500'}`}>
                  {unlocked ? (selected ? 'Đang mặc ✓' : 'Đã mở') : `Cần ${sk.zonesNeeded} khu`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: ENCYCLOPEDIA (từ điển biển báo)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'encyclopedia') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">📖</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Từ Điển Biển Báo</h2>
          <p className="text-slate-500 text-xs font-bold mt-1">Đã học {signsLearned.size}/{TOTAL_SIGNS} biển báo · chạm để nghe</p>
        </div>
        <div className="space-y-2">
          {ROAD_SIGNS.map((sign) => {
            const got = signsLearned.has(sign.id);
            return (
              <button
                key={sign.id}
                onClick={() => speak(`${sign.name}. ${sign.desc}`, LANG_SPEAK_DEFAULT)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left ${got ? 'bg-white border-sky-100' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className={got ? '' : 'grayscale opacity-40'}><RoadSignIcon sign={sign} size={48} /></div>
                <div className="flex-1">
                  <div className="font-black text-sm text-slate-700">{got ? sign.name : '???'}</div>
                  <div className="text-[11px] font-bold text-slate-400 line-clamp-2">{got ? sign.desc : 'Chưa học biển báo này'}</div>
                </div>
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
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">Bảng Vinh Danh</h2>
          <p className="text-slate-500 text-xs font-bold mt-1">{zonesDone.size}/{TOTAL_ZONES} khu vực · {stats.missions} nhiệm vụ · {signsLearned.size} biển báo</p>
        </div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Huy hiệu</h3>
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
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sticker</h3>
        <div className="grid grid-cols-6 gap-2">
          {STICKERS.map((s) => {
            const got = s.unlocked(ctx);
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
    const learn = learnRef.current;
    const knows = (Object.keys(KNOW_LABEL) as Knowledge[]).map((k) => ({ k, n: learn[k] }));
    const weakest = [...knows].sort((a, b) => a.n - b.n)[0];
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Bảng Phụ Huynh</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Bài học</div>
            <div className="text-2xl font-black text-sky-600">{stats.missions}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ đúng</div>
            <div className="text-2xl font-black text-emerald-600">{accuracy}%</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</div>
            <div className="text-xl font-black text-amber-600">{fmtTime(stats.timeMs)}</div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3 mb-4 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Biển báo đã học</div>
          <div className="text-xl font-black text-slate-700">🚸 {signsLearned.size}/{TOTAL_SIGNS}</div>
        </div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tiến bộ theo kỹ năng</h3>
        <div className="space-y-2 mb-4">
          {knows.map((x) => (
            <div key={x.k} className="flex items-center justify-between bg-white border-2 border-slate-100 rounded-2xl px-3 py-2">
              <span className="font-black text-sm text-slate-700">{KNOW_LABEL[x.k]}</span>
              <span className="text-xs font-black text-sky-600">{x.n} lần đúng</span>
            </div>
          ))}
        </div>
        <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-3 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Kỹ năng cần luyện thêm</div>
          <div className="text-sm font-black text-rose-600 mt-1">{KNOW_LABEL[weakest.k]}</div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PLAYING
   * ════════════════════════════════════════════════════════════════════ */
  if (!zone || !mission) return null;
  const safetyColor = safety >= 70 ? 'from-emerald-400 to-sky-400' : safety >= 40 ? 'from-amber-400 to-orange-400' : 'from-rose-400 to-red-500';

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* Thanh trạng thái */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { clearTimers(); setPhase('map'); }} className="text-slate-400 font-bold hover:text-slate-600 text-sm">✕ Thoát</button>
        <span className="text-xs font-black text-slate-500">{zone.emoji} Nhiệm vụ {missionIndex + 1}/{zone.missions.length}</span>
        <div className="flex items-center gap-1">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">⭐ {score}</span>
          {combo >= 2 && <span className="bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">🔥 {combo}</span>}
        </div>
      </div>

      {/* Chỉ số an toàn */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🛡️</span>
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${safetyColor} rounded-full transition-all duration-500`} style={{ width: `${safety}%` }} />
        </div>
        <span className="text-[11px] font-black text-slate-400">An toàn {safety}</span>
      </div>

      {/* Thẻ nhiệm vụ (siêu nhân + đề bài) */}
      <div className="flex items-start gap-2 mb-3">
        <div className="text-4xl shrink-0 floating">{selectedSkin.emoji}</div>
        <div className="flex-1 bg-gradient-to-br from-sky-50 to-amber-50 border-2 border-sky-100 rounded-2xl rounded-tl-sm p-3 relative">
          <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{mission.title}</div>
          <p className="font-black text-slate-700 text-base leading-snug pr-8">{mission.prompt}</p>
          <button onClick={() => speak(mission.prompt, LANG_SPEAK_DEFAULT)} aria-label="Nghe lại" className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-sky-200 flex items-center justify-center active:scale-95 text-sky-500">🔊</button>
        </div>
      </div>

      {/* Hình minh hoạ đề bài: đèn / biển báo */}
      {mission.type === 'choice' && mission.visual && (
        <div className="flex justify-center mb-4">
          {mission.visual.kind === 'light' ? <TrafficLight color={mission.visual.color} /> : <RoadSignIcon sign={signById(mission.visual.signId)} size={90} />}
        </div>
      )}

      {/* ── CHOICE ── */}
      {mission.type === 'choice' && !result && (
        mission.optionKind === 'sign' ? (
          // Phương án là BIỂN BÁO
          <div className="grid grid-cols-3 gap-3">
            {mission.options.map((opt) => {
              const isWrong = wrongId === opt.id;
              const isHint = hintId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleChoice(opt)}
                  className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-1 active:scale-95 transition-all ${
                    isWrong ? 'shake-x border-red-300 bg-red-50' : isHint ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse' : 'border-sky-100 bg-white shadow-sm'
                  }`}
                >
                  <RoadSignIcon sign={signById(opt.signId!)} size={52} />
                  <span className="text-[10px] font-black text-slate-500 text-center leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          // Phương án là CHỮ + emoji
          <div className="space-y-2">
            {mission.options.map((opt) => {
              const isWrong = wrongId === opt.id;
              const isHint = hintId === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleChoice(opt)}
                  className={`w-full p-4 rounded-2xl border-2 flex items-center gap-3 active:scale-95 transition-all text-left ${
                    isWrong ? 'shake-x border-red-300 bg-red-50' : isHint ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse' : 'border-sky-100 bg-white shadow-sm'
                  }`}
                >
                  {opt.emoji && <span className="text-3xl">{opt.emoji}</span>}
                  <span className="font-black text-slate-700">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )
      )}

      {/* ── ORDER (sang đường) ── */}
      {mission.type === 'order' && !result && (
        <div>
          {/* Khu đã sắp đúng */}
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 mb-3 min-h-[3rem]">
            {placed.length === 0 ? (
              <span className="text-xs text-slate-400 font-bold">Bấm các bước theo đúng thứ tự…</span>
            ) : (
              <div className="space-y-1">
                {placed.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-sm font-black text-emerald-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-white text-[11px] flex items-center justify-center">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Các bước còn lại (đã xáo) */}
          <div className="space-y-2">
            {orderShuffled.filter((s) => !placed.includes(s)).map((s) => {
              const isWrong = wrongId === s;
              return (
                <button
                  key={s}
                  onClick={() => handleOrderTap(s)}
                  className={`w-full p-3 rounded-2xl border-2 font-black text-slate-700 active:scale-95 transition-all ${
                    isWrong ? 'shake-x border-red-300 bg-red-50' : 'border-sky-100 bg-white shadow-sm'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Overlay kết quả nhiệm vụ */}
      {result && (
        <div className="bg-white border-2 border-emerald-100 rounded-3xl p-5 text-center shadow-lg animate-in zoom-in">
          <div className="flex justify-center gap-1 mb-2">
            {[0, 1, 2].map((i) => (<span key={i} className={`text-4xl ${i < result.stars ? '' : 'grayscale opacity-25'}`}>⭐</span>))}
          </div>
          <div className="text-3xl mb-1">{selectedSkin.emoji}</div>
          <p className="font-black text-slate-700 text-sm">"{result.text}"</p>
        </div>
      )}

      {/* Overlay hoàn thành khu vực (huy hiệu) */}
      {zoneDone && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setPhase('map')}>
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-7 text-center animate-in zoom-in max-w-xs">
            <div className="text-7xl mb-1 animate-bounce">🏅</div>
            <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Huy hiệu an toàn</div>
            <div className="text-lg font-black text-slate-800 my-1">{zoneDone.name}</div>
            <button onClick={() => setPhase('map')} className="mt-3 w-full py-3 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-2xl font-black active:scale-95 transition-all">Tiếp tục →</button>
          </div>
        </div>
      )}

      {/* Toast */}
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
