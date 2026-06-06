/* ──────────────────────────────────────────────────────────────────────────
 * GAME "KHO BÁU TOÁN HỌC" (Game Island)
 *
 * Bé là nhà thám hiểm nhí: vượt 6 hòn đảo toán học, mỗi đảo hoàn thành thì mở
 * RƯƠNG KHO BÁU (xu/kim cương/skin). Có năng lượng ❤️, combo, ADAPTIVE LEARNING,
 * thành tích, sticker, kho skin và bảng phụ huynh. Hình học vẽ bằng CSS.
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Đây là quiz CHẠM nên repo dùng HTML/Tailwind;
 *     hiệu ứng CSS + canvas-confetti. Câu hỏi sinh tự động (vô hạn).
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_treasure_stats   : JSON TreasureStats
 *   - lingoland_treasure_islands : JSON string[] — id đảo đã hoàn thành
 *   - lingoland_treasure_pertype : JSON Record<type,{correct,count}> — bảng PH
 *   - lingoland_treasure_skins   : JSON {unlocked:string[], selected}
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  ISLANDS,
  SKINS,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_ISLANDS,
  generateForIsland,
  openChest,
  type Island,
  type Question,
  type QType,
  type ShapeKind,
  type ChestReward,
  type TreasureStats,
  type AchievementCtx,
} from '../data/mathTreasureData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'map' | 'mission' | 'chest' | 'skins' | 'collection' | 'parent';
type Mode = 'adventure' | 'quick' | 'endless';

const STATS_KEY = 'lingoland_treasure_stats';
const ISLANDS_KEY = 'lingoland_treasure_islands';
const PERTYPE_KEY = 'lingoland_treasure_pertype';
const SKINS_KEY = 'lingoland_treasure_skins';

const CONFETTI_COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#a78bfa'];

const {
  INITIAL_ENERGY,
  QUESTIONS_PER_ISLAND,
  SCORE_CORRECT,
  SCORE_FAST_BONUS,
  FAST_SECONDS,
  COMBO_3,
  COMBO_3_BONUS,
  COMBO_5,
  COMBO_5_BONUS,
  ADAPT_UP_STREAK,
  SUPPORT_WRONG_STREAK,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  QUICK_COUNT,
} = GAME_CONFIG;

const TYPE_LABEL: Record<QType, string> = {
  count: 'Đếm số', compare: 'So sánh', add: 'Cộng', subtract: 'Trừ', shape: 'Hình học', logic: 'Logic',
};

// Màu cho từng hình (giúp bé phân biệt).
const SHAPE_COLOR: Record<ShapeKind, string> = {
  circle: '#38bdf8', square: '#34d399', triangle: '#fbbf24', rectangle: '#f472b6',
};

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): TreasureStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      missions: p?.missions || 0, correct: p?.correct || 0, attempts: p?.attempts || 0,
      chests: p?.chests || 0, coins: p?.coins || 0, gems: p?.gems || 0, timeMs: p?.timeMs || 0,
    };
  } catch {
    return { missions: 0, correct: 0, attempts: 0, chests: 0, coins: 0, gems: 0, timeMs: 0 };
  }
};
const saveStats = (s: TreasureStats) => {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};
const loadSet = (key: string): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch { return new Set(); }
};
const saveSet = (key: string, s: Set<string>) => {
  try { localStorage.setItem(key, JSON.stringify([...s])); } catch { /* ignore */ }
};
type PerType = Record<string, { correct: number; count: number }>;
const loadPerType = (): PerType => {
  try { const p = JSON.parse(localStorage.getItem(PERTYPE_KEY) ?? '{}'); return p && typeof p === 'object' ? p : {}; }
  catch { return {}; }
};
const savePerType = (m: PerType) => { try { localStorage.setItem(PERTYPE_KEY, JSON.stringify(m)); } catch { /* ignore */ } };

interface SkinData { unlocked: string[]; selected: string }
const loadSkins = (): SkinData => {
  try {
    const p = JSON.parse(localStorage.getItem(SKINS_KEY) ?? 'null');
    if (p && Array.isArray(p.unlocked)) return { unlocked: p.unlocked, selected: p.selected || SKINS[0] };
  } catch { /* ignore */ }
  return { unlocked: [SKINS[0]], selected: SKINS[0] };
};
const saveSkins = (s: SkinData) => { try { localStorage.setItem(SKINS_KEY, JSON.stringify(s)); } catch { /* ignore */ } };

/* ===========================================================================
 * Component hình học (vẽ bằng CSS)
 * ========================================================================= */

function ShapeIcon({ kind, size = 48 }: { kind: ShapeKind; size?: number }) {
  const color = SHAPE_COLOR[kind];
  if (kind === 'circle') return <div style={{ width: size, height: size, background: color, borderRadius: '50%' }} />;
  if (kind === 'square') return <div style={{ width: size, height: size, background: color, borderRadius: 6 }} />;
  if (kind === 'rectangle') return <div style={{ width: size * 1.5, height: size * 0.66, background: color, borderRadius: 6 }} />;
  // triangle bằng border trick
  return (
    <div
      style={{
        width: 0, height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid ${color}`,
      }}
    />
  );
}

export default function MathTreasureView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('map');
  const [mode, setMode] = useState<Mode>('adventure');
  const [island, setIsland] = useState<Island | null>(null);

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [question, setQuestion] = useState<Question | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [energy, setEnergy] = useState<number>(INITIAL_ENERGY);
  const [difficulty, setDifficulty] = useState(1);
  const [wrongOptions, setWrongOptions] = useState<string[]>([]);
  const [hintOption, setHintOption] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [chestReward, setChestReward] = useState<ChestReward | null>(null);
  const [chestOpened, setChestOpened] = useState(false);
  const [sessionEnd, setSessionEnd] = useState<'gameover' | 'quick' | null>(null);

  const mistakesRef = useRef(0);
  const correctStreakRef = useRef(0);
  const wrongStreakRef = useRef(0);
  const supportRef = useRef(false);
  const qStartRef = useRef(0);
  const answeredRef = useRef(false);

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<TreasureStats>(loadStats());
  const islandsRef = useRef<Set<string>>(loadSet(ISLANDS_KEY));
  const perTypeRef = useRef<PerType>(loadPerType());
  const skinsRef = useRef<SkinData>(loadSkins());
  const [stats, setStats] = useState<TreasureStats>(() => statsRef.current);
  const [islandsDone, setIslandsDone] = useState<Set<string>>(() => islandsRef.current);
  const [skins, setSkins] = useState<SkinData>(() => skinsRef.current);
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ── Toast + xét mở khoá ─────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);
  const makeCtx = useCallback(
    (): AchievementCtx => ({ ...statsRef.current, islandsCount: islandsRef.current.size }),
    [],
  );
  const announceUnlocks = useCallback(
    (prev: AchievementCtx) => {
      const next = makeCtx();
      const a = ACHIEVEMENTS.find((x) => !x.unlocked(prev) && x.unlocked(next));
      if (a) { showToast(a.emoji, `Mở khoá: ${a.name}`); return; }
      const s = STICKERS.find((x) => !x.unlocked(prev) && x.unlocked(next));
      if (s) showToast(s.emoji, `Sticker mới: ${s.name}`);
    },
    [makeCtx, showToast],
  );

  /* ── Nạp câu hỏi ─────────────────────────────────────────────────────── */
  const loadQuestion = useCallback((isl: Island, diff: number) => {
    const q = generateForIsland(isl, diff);
    setQuestion(q);
    setWrongOptions([]);
    setFeedbackOk(false);
    answeredRef.current = false;
    qStartRef.current = Date.now();
    setHintOption(supportRef.current ? q.answer : null);
    const t = window.setTimeout(() => speak(q.speak, LANG_SPEAK_DEFAULT), 350);
    addTimer(t);
  }, []);

  /* ── Bắt đầu một đảo (Adventure) ─────────────────────────────────────── */
  const startIsland = useCallback((isl: Island, m: Mode) => {
    clearTimers();
    setMode(m);
    setIsland(isl);
    setQIndex(0);
    setScore(0);
    setCombo(0);
    setEnergy(INITIAL_ENERGY);
    setDifficulty(isl.baseDiff);
    setSessionEnd(null);
    setChestReward(null);
    mistakesRef.current = 0;
    correctStreakRef.current = 0;
    wrongStreakRef.current = 0;
    supportRef.current = false;
    setPhase('mission');
    loadQuestion(isl, isl.baseDiff);
  }, [clearTimers, loadQuestion]);

  // Đảo "tổng hợp" dùng cho Thử thách nhanh / Vô tận (chứa mọi loại câu hỏi).
  const finalIsland = ISLANDS[ISLANDS.length - 1];

  /* ── Kết thúc phiên (game over / quick) ──────────────────────────────── */
  const endSession = useCallback((kind: 'gameover' | 'quick') => {
    answeredRef.current = true;
    if (kind === 'quick') {
      confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
      speak('Thử thách xong rồi, bé giỏi quá!', LANG_SPEAK_DEFAULT);
    } else {
      speak('Hết năng lượng rồi! Thử lại nhé.', LANG_SPEAK_DEFAULT);
    }
    setSessionEnd(kind);
    const t = window.setTimeout(() => { setSessionEnd(null); setPhase('map'); }, 2200);
    addTimer(t);
  }, []);

  /* ── Hoàn thành đảo → mở rương ───────────────────────────────────────── */
  const completeIsland = useCallback(() => {
    if (!island) return;
    const prev = makeCtx();
    const next = new Set(islandsRef.current);
    next.add(island.id);
    islandsRef.current = next;
    setIslandsDone(next);
    saveSet(ISLANDS_KEY, next);
    announceUnlocks(prev);
    // Tạo rương theo số lỗi.
    setChestReward(openChest(mistakesRef.current));
    setChestOpened(false);
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    speak('Hoàn thành đảo! Mở rương kho báu nào!', LANG_SPEAK_DEFAULT);
    setPhase('chest');
  }, [island, makeCtx, announceUnlocks]);

  /* ── Mở rương → nhận thưởng (xu/kim cương/skin) ──────────────────────── */
  const openChestNow = () => {
    if (!chestReward || chestOpened) return;
    setChestOpened(true);
    const prev = makeCtx();
    const ns: TreasureStats = {
      ...statsRef.current,
      chests: statsRef.current.chests + 1,
      coins: statsRef.current.coins + chestReward.coins,
      gems: statsRef.current.gems + chestReward.gems,
    };
    statsRef.current = ns;
    setStats(ns);
    saveStats(ns);
    announceUnlocks(prev);

    // Rương huyền thoại → mở khoá skin mới (nếu còn).
    if (chestReward.skin) {
      const locked = SKINS.find((s) => !skinsRef.current.unlocked.includes(s));
      if (locked) {
        const nx = { ...skinsRef.current, unlocked: [...skinsRef.current.unlocked, locked] };
        skinsRef.current = nx;
        setSkins(nx);
        saveSkins(nx);
        showToast(locked, 'Mở khoá skin mới!');
      }
    }
    confetti({ particleCount: 160, spread: 100, startVelocity: 35, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playTing();
    playSfx('snd-correct');
  };

  /* ── Xử lý chọn đáp án ───────────────────────────────────────────────── */
  const handleAnswer = (value: string) => {
    if (!question || answeredRef.current || sessionEnd) return;
    if (wrongOptions.includes(value)) return;

    const ns: TreasureStats = {
      ...statsRef.current,
      attempts: statsRef.current.attempts + 1,
      timeMs: statsRef.current.timeMs + (Date.now() - qStartRef.current),
    };
    const pt = { ...perTypeRef.current };
    const e = pt[question.type] ?? { correct: 0, count: 0 };

    if (value === question.answer) {
      // ===== ĐÚNG =====
      answeredRef.current = true;
      ns.correct += 1;
      ns.missions += 1;
      pt[question.type] = { correct: e.correct + 1, count: e.count + 1 };
      statsRef.current = ns; perTypeRef.current = pt;
      setStats(ns); saveStats(ns); savePerType(pt);
      setFeedbackOk(true);

      playSfx('snd-correct');
      playTing();
      confetti({ particleCount: 34, spread: 60, startVelocity: 26, origin: { y: 0.5 }, colors: CONFETTI_COLORS });

      const fast = Date.now() - qStartRef.current < FAST_SECONDS * 1000;
      const newCombo = combo + 1;
      setCombo(newCombo);
      let gained = SCORE_CORRECT + (fast ? SCORE_FAST_BONUS : 0);
      if (newCombo === COMBO_3) gained += COMBO_3_BONUS;
      if (newCombo === COMBO_5) gained += COMBO_5_BONUS;
      setScore((s) => s + gained);

      // ADAPTIVE: đúng nhiều → tăng độ khó.
      correctStreakRef.current += 1;
      wrongStreakRef.current = 0;
      if (correctStreakRef.current >= ADAPT_UP_STREAK) {
        correctStreakRef.current = 0;
        supportRef.current = false;
        setDifficulty((d) => Math.min(MAX_DIFFICULTY, d + 1));
      }

      // Sang câu kế / hoàn thành đảo / kết thúc quick.
      const t = window.setTimeout(() => {
        if (mode === 'adventure') {
          if (qIndex + 1 >= QUESTIONS_PER_ISLAND) {
            completeIsland();
          } else {
            setQIndex((i) => i + 1);
            setDifficulty((d) => { loadQuestion(island!, d); return d; });
          }
        } else if (mode === 'quick') {
          if (qIndex + 1 >= QUICK_COUNT) endSession('quick');
          else { setQIndex((i) => i + 1); setDifficulty((d) => { loadQuestion(finalIsland, d); return d; }); }
        } else {
          // endless
          setQIndex((i) => i + 1);
          setDifficulty((d) => { loadQuestion(finalIsland, d); return d; });
        }
      }, 1000);
      addTimer(t);
    } else {
      // ===== SAI ===== (−1 năng lượng, cho chọn lại)
      pt[question.type] = { correct: e.correct, count: e.count + 1 };
      statsRef.current = ns; perTypeRef.current = pt;
      setStats(ns); saveStats(ns); savePerType(pt);

      setCombo(0);
      setWrongOptions((w) => [...w, value]);
      mistakesRef.current += 1;
      playSfx('snd-wrong');
      playBip();

      correctStreakRef.current = 0;
      wrongStreakRef.current += 1;
      if (wrongStreakRef.current >= SUPPORT_WRONG_STREAK) {
        supportRef.current = true;
        setHintOption(question.answer);
        setDifficulty((d) => Math.max(MIN_DIFFICULTY, d - 1));
      }

      const ne = energy - 1;
      setEnergy(ne);
      if (ne <= 0) { const t = window.setTimeout(() => endSession('gameover'), 700); addTimer(t); }
    }
  };

  /* ── Chọn skin ───────────────────────────────────────────────────────── */
  const selectSkin = (s: string) => {
    if (!skins.unlocked.includes(s)) return;
    const nx = { ...skinsRef.current, selected: s };
    skinsRef.current = nx; setSkins(nx); saveSkins(nx); playTing();
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const ctx: AchievementCtx = { ...stats, islandsCount: islandsDone.size };
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;
  const isIslandUnlocked = useCallback(
    (idx: number) => idx === 0 || islandsDone.has(ISLANDS[idx - 1].id),
    [islandsDone],
  );

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: ISLAND MAP
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'map') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Bản đồ
        </button>
        <div className="text-center mb-4">
          <div className="text-7xl mb-1 floating">{skins.selected}</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500 bg-clip-text text-transparent">
            Kho Báu Toán Học
          </h2>
          <p className="text-slate-500 text-sm font-bold">Nhà thám hiểm nhí ơi, đi tìm kho báu toán học nào!</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-1.5 rounded-full">🪙 {stats.coins}</span>
          <span className="bg-sky-100 text-sky-700 font-black text-xs px-3 py-1.5 rounded-full">💎 {stats.gems}</span>
          <button onClick={() => startIsland(finalIsland, 'quick')} className="bg-gradient-to-br from-rose-400 to-orange-500 text-white font-black text-xs px-3 py-1.5 rounded-full active:scale-95">⚡ Nhanh</button>
          <button onClick={() => startIsland(finalIsland, 'endless')} className="bg-gradient-to-br from-violet-400 to-purple-500 text-white font-black text-xs px-3 py-1.5 rounded-full active:scale-95">♾️ Vô tận</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={() => setPhase('skins')} className="bg-emerald-100 text-emerald-700 font-black text-xs px-3 py-2.5 rounded-2xl active:scale-95">🧭 Skin</button>
          <button onClick={() => setPhase('collection')} className="bg-pink-100 text-pink-700 font-black text-xs px-3 py-2.5 rounded-2xl active:scale-95">🏅 Thành tích</button>
          <button onClick={() => setPhase('parent')} className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-2.5 rounded-2xl active:scale-95">👨‍👩‍👧 Phụ huynh</button>
        </div>

        <div className="space-y-2">
          {ISLANDS.map((isl, idx) => {
            const unlocked = isIslandUnlocked(idx);
            const done = islandsDone.has(isl.id);
            return (
              <button
                key={isl.id}
                disabled={!unlocked}
                onClick={() => startIsland(isl, 'adventure')}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked ? `bg-gradient-to-br ${isl.gradient}` : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-4xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{unlocked ? isl.emoji : '🔒'}</div>
                <div className="flex-1">
                  <div className={`font-black text-base leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>{unlocked ? isl.name : '???'}</div>
                  <div className={`text-[11px] font-bold mt-0.5 ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>{unlocked ? isl.desc : 'Hoàn thành đảo trước để mở'}</div>
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
   * SCREEN: SKINS
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'skins') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">{skins.selected}</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">Kho Skin Thám Hiểm</h2>
          <p className="text-slate-500 text-xs font-bold mt-1">Mở rương Huyền Thoại để mở khoá skin mới!</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SKINS.map((s) => {
            const unlocked = skins.unlocked.includes(s);
            const selected = skins.selected === s;
            return (
              <button
                key={s}
                disabled={!unlocked}
                onClick={() => selectSkin(s)}
                className={`aspect-square rounded-3xl border-2 flex items-center justify-center text-5xl transition-all active:scale-95 ${
                  selected ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200' : unlocked ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
                }`}
              >
                {unlocked ? s : '🔒'}
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
          <h2 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-sky-500 bg-clip-text text-transparent">Bảng Vinh Danh</h2>
          <p className="text-slate-500 text-xs font-bold mt-1">{islandsDone.size}/{TOTAL_ISLANDS} đảo · {stats.chests} rương · {stats.correct} câu đúng</p>
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
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sticker</h3>
        <div className="grid grid-cols-5 gap-2">
          {STICKERS.map((s) => {
            const got = s.unlocked(ctx);
            return (
              <div key={s.id} className={`aspect-square rounded-2xl flex items-center justify-center border-2 ${got ? 'bg-gradient-to-br from-amber-50 to-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'}`}>
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
    const perType = Object.entries(perTypeRef.current)
      .map(([t, e]) => ({ t: t as QType, acc: Math.round((e.correct / e.count) * 100), count: e.count }))
      .filter((x) => x.count >= 2);
    const strengths = [...perType].sort((a, b) => b.acc - a.acc).slice(0, 3);
    const weaknesses = [...perType].sort((a, b) => a.acc - b.acc).filter((x) => x.acc < 80).slice(0, 3);
    const minutes = Math.round(stats.timeMs / 60000);
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Bảng Phụ Huynh</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Câu đã làm</div>
            <div className="text-2xl font-black text-sky-600">{stats.attempts}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ đúng</div>
            <div className="text-2xl font-black text-emerald-600">{accuracy}%</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian</div>
            <div className="text-2xl font-black text-amber-600">{minutes}′</div>
          </div>
        </div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Điểm mạnh</h3>
        {strengths.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-bold py-3 bg-slate-50 rounded-2xl mb-4">Chơi thêm để có dữ liệu nhé!</div>
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
          <div className="text-center text-slate-400 text-sm font-bold py-3 bg-slate-50 rounded-2xl">Bé làm tốt mọi chủ đề! 🎉</div>
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
   * SCREEN: CHEST (mở rương kho báu)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'chest' && chestReward) {
    return (
      <div className="animate-in zoom-in duration-500 max-w-md mx-auto text-center py-8">
        <h2 className="text-2xl font-black mb-1 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
          {island?.name} hoàn thành! 🎉
        </h2>
        <p className="text-slate-500 text-sm font-bold mb-5">Chạm vào rương để mở kho báu nhé!</p>

        {!chestOpened ? (
          <button onClick={openChestNow} className="text-9xl animate-bounce active:scale-90 transition-transform">
            🧰
          </button>
        ) : (
          <div className="animate-in zoom-in">
            <div className="text-8xl mb-2">{chestReward.emoji}</div>
            <div className="text-xl font-black text-amber-600">{chestReward.label}</div>
            <div className="flex items-center justify-center gap-4 mt-3 text-lg font-black">
              <span className="text-amber-600">🪙 +{chestReward.coins}</span>
              {chestReward.gems > 0 && <span className="text-sky-600">💎 +{chestReward.gems}</span>}
            </div>
            {chestReward.skin && <div className="text-sm font-bold text-violet-500 mt-2">✨ Mở khoá skin mới!</div>}
          </div>
        )}

        {chestOpened && (
          <button onClick={() => setPhase('map')} className="w-full mt-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all">
            🗺️ Về bản đồ
          </button>
        )}

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

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: MISSION (PLAYING)
   * ════════════════════════════════════════════════════════════════════ */
  if (!question) return null;
  const totalQ = mode === 'adventure' ? QUESTIONS_PER_ISLAND : mode === 'quick' ? QUICK_COUNT : Infinity;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* Thanh trạng thái */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { clearTimers(); setPhase('map'); }} className="text-slate-400 font-bold hover:text-slate-600 text-sm">✕ Thoát</button>
        <span className="text-xs font-black text-slate-500">
          {mode === 'adventure' ? `${island?.emoji} ${island?.name}` : mode === 'quick' ? '⚡ Thử thách' : '♾️ Vô tận'}
        </span>
        <span className="text-sm tracking-tighter">
          {Array.from({ length: INITIAL_ENERGY }, (_, i) => (i < energy ? '❤️' : '🤍')).join('')}
        </span>
      </div>
      <div className="flex items-center justify-between mb-2 gap-1 text-xs font-black">
        <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">⭐ {score}</span>
        {Number.isFinite(totalQ) && <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full">Câu {qIndex + 1}/{totalQ}</span>}
        {combo >= 2 && <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">🔥 {combo}</span>}
        <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">{'★'.repeat(difficulty)}</span>
      </div>

      {/* Nhà thám hiểm + câu hỏi */}
      <div className="flex items-start gap-2 mb-3">
        <div className="text-4xl shrink-0 floating">{skins.selected}</div>
        <div className="flex-1 bg-gradient-to-br from-amber-50 to-sky-50 border-2 border-amber-100 rounded-2xl rounded-tl-sm p-3 relative">
          <p className="font-black text-slate-700 text-base leading-snug pr-8">{question.prompt}</p>
          <button onClick={() => speak(question.speak, LANG_SPEAK_DEFAULT)} aria-label="Nghe lại" className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center active:scale-95 text-amber-500">🔊</button>
        </div>
      </div>

      {/* Câu ĐẾM: hiện vật thể */}
      {question.visual && (
        <div className="bg-gradient-to-br from-sky-900 to-indigo-900 rounded-3xl p-4 mb-3 flex flex-wrap gap-2 justify-center items-center min-h-[6rem]">
          {Array.from({ length: question.visual.count }, (_, i) => (
            <span key={i} className="text-4xl animate-in zoom-in" style={{ animationDelay: `${i * 60}ms` }}>{question.visual!.emoji}</span>
          ))}
        </div>
      )}

      {/* Câu HÌNH "đoán tên": hiện 1 hình to */}
      {question.shapeVisual && (
        <div className="bg-slate-50 rounded-3xl p-6 mb-3 flex justify-center items-center">
          <ShapeIcon kind={question.shapeVisual} size={90} />
        </div>
      )}

      {/* Phương án */}
      {question.optionsAreShapes ? (
        // Phương án là các HÌNH (render shape)
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const isWrong = wrongOptions.includes(opt);
            const isCorrect = feedbackOk && opt === question.answer;
            const isHint = hintOption === opt && !isCorrect;
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={answeredRef.current || isWrong}
                className={`h-24 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
                  isCorrect ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200' : isWrong ? 'border-slate-100 bg-slate-50 opacity-40' : isHint ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse' : 'border-sky-100 bg-white shadow-sm'
                }`}
              >
                <ShapeIcon kind={opt as ShapeKind} size={48} />
              </button>
            );
          })}
        </div>
      ) : (
        // Phương án là CHỮ / SỐ
        <div className={`grid gap-2 ${question.type === 'shape' || question.type === 'logic' ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {question.options.map((opt) => {
            const isWrong = wrongOptions.includes(opt);
            const isCorrect = feedbackOk && opt === question.answer;
            const isHint = hintOption === opt && !isCorrect;
            // số → chữ to; chữ (tên hình / phép tính) → cỡ vừa
            const big = /^\d+$/.test(opt);
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={answeredRef.current || isWrong}
                className={`rounded-2xl border-2 flex items-center justify-center font-black transition-all active:scale-95 ${
                  big ? 'h-20 text-4xl' : 'h-16 text-lg px-2 text-center'
                } ${
                  isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-600 ring-4 ring-emerald-200' : isWrong ? 'border-slate-100 bg-slate-50 text-slate-300 opacity-40' : isHint ? 'border-amber-400 bg-amber-50 text-amber-600 ring-4 ring-amber-200 animate-pulse' : 'border-sky-100 bg-white text-slate-700 shadow-sm'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {hintOption && <p className="text-center text-amber-500 text-xs font-bold mt-2">🧭 Gợi ý: thử ô đang sáng nhé!</p>}

      {/* Overlay kết thúc (game over / quick) */}
      {sessionEnd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
            <div className="text-6xl mb-1">{sessionEnd === 'gameover' ? '💔' : '🏆'}</div>
            <div className={`text-xl font-black ${sessionEnd === 'gameover' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {sessionEnd === 'gameover' ? 'Hết năng lượng!' : 'Hoàn thành thử thách!'}
            </div>
            <div className="text-sm font-bold text-slate-500 mt-1">Điểm: {score} ⭐</div>
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
