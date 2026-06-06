/* ──────────────────────────────────────────────────────────────────────────
 * GAME "MEMORY CARD" — Học Viện Trí Nhớ (Game Island)
 *
 * Lật thẻ tìm cặp giống nhau. 7 chủ đề (động vật/đồ vật/chữ cái/số/màu/hình/hỗn
 * hợp), lưới lớn dần theo level (2×2 → 6×4), có giờ, combo, gợi ý 💡, sao, thành
 * tích, sticker và bảng phụ huynh.
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Repo này có sẵn CSS lật thẻ 3D (.perspective-1000
 *     / .card-inner / .flipped trong index.html) nên dùng HTML/Tailwind là tự
 *     nhiên nhất; particle bằng canvas-confetti. Màu & hình render bằng CSS.
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_memory_stats  : JSON MemoryStats
 *   - lingoland_memory_themes : JSON Record<themeId, soLanChoi> (chủ đề yêu thích)
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  THEMES,
  DIFFICULTIES,
  ACHIEVEMENTS,
  STICKERS,
  MAX_LEVEL,
  buildBoard,
  type Theme,
  type Difficulty,
  type Face,
  type ShapeKind,
  type BoardCard,
  type Grid,
  type MemoryStats,
  type AchievementCtx,
} from '../data/memoryCardData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'home' | 'playing' | 'collection' | 'parent';

const STATS_KEY = 'lingoland_memory_stats';
const THEMES_KEY = 'lingoland_memory_themes';

const CONFETTI_COLORS = ['#7dd3fc', '#a7f3d0', '#fde68a', '#f9a8d4', '#c4b5fd'];

const {
  SCORE_MATCH, SCORE_FAST_BONUS, FAST_SECONDS, COMBO_3, COMBO_3_BONUS, COMBO_5, COMBO_5_BONUS,
  LEVEL_BONUS, INITIAL_HINTS, HINT_DURATION, FLIP_BACK_DELAY, PREVIEW_BASE, PREVIEW_PER_PAIR, PREVIEW_MAX,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): MemoryStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      pairs: p?.pairs || 0, attempts: p?.attempts || 0, levels: p?.levels || 0,
      bestCombo: p?.bestCombo || 0, bestScore: p?.bestScore || 0, fastClear: !!p?.fastClear, timeMs: p?.timeMs || 0,
    };
  } catch {
    return { pairs: 0, attempts: 0, levels: 0, bestCombo: 0, bestScore: 0, fastClear: false, timeMs: 0 };
  }
};
const saveStats = (s: MemoryStats) => { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ } };

type ThemePlays = Record<string, number>;
const loadThemes = (): ThemePlays => {
  try { const p = JSON.parse(localStorage.getItem(THEMES_KEY) ?? '{}'); return p && typeof p === 'object' ? p : {}; }
  catch { return {}; }
};
const saveThemes = (m: ThemePlays) => { try { localStorage.setItem(THEMES_KEY, JSON.stringify(m)); } catch { /* ignore */ } };

const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

/* ===========================================================================
 * Component: render NỘI DUNG mặt thẻ (emoji / chữ / màu / hình)
 * ========================================================================= */

function FaceContent({ face }: { face: Face }) {
  if (face.kind === 'emoji') return <span className="text-3xl sm:text-4xl leading-none">{face.value}</span>;
  if (face.kind === 'text') return <span className="text-3xl sm:text-4xl font-black text-slate-700">{face.value}</span>;
  if (face.kind === 'color') return <div className="w-3/5 h-3/5 rounded-full" style={{ background: face.color }} />;
  // shape — vẽ bằng CSS
  return <ShapeIcon kind={face.shape!} color={face.color!} />;
}

function ShapeIcon({ kind, color }: { kind: ShapeKind; color: string }) {
  const s = 34;
  if (kind === 'circle') return <div style={{ width: s, height: s, background: color, borderRadius: '50%' }} />;
  if (kind === 'square') return <div style={{ width: s, height: s, background: color, borderRadius: 4 }} />;
  if (kind === 'rectangle') return <div style={{ width: s * 1.4, height: s * 0.62, background: color, borderRadius: 4 }} />;
  if (kind === 'oval') return <div style={{ width: s * 1.4, height: s * 0.8, background: color, borderRadius: '50%' }} />;
  if (kind === 'diamond') return <div style={{ width: s * 0.78, height: s * 0.78, background: color, transform: 'rotate(45deg)', borderRadius: 4 }} />;
  // triangle
  return <div style={{ width: 0, height: 0, borderLeft: `${s / 2}px solid transparent`, borderRight: `${s / 2}px solid transparent`, borderBottom: `${s}px solid ${color}` }} />;
}

export default function MemoryCardView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('home');
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [theme, setTheme] = useState<Theme | null>(null);
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [grid, setGrid] = useState<Grid>({ cols: 2, rows: 2 });
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hintsLeft, setHintsLeft] = useState<number>(INITIAL_HINTS);
  const [timeLeft, setTimeLeft] = useState(0);

  const [upIds, setUpIds] = useState<string[]>([]); // thẻ đang lật (≤ 2)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [hintIds, setHintIds] = useState<string[]>([]); // thẻ đang lật do gợi ý
  const [preview, setPreview] = useState(false); // đang xem trước (lật hết)
  const [overlay, setOverlay] = useState<'win' | 'lose' | null>(null);

  const lockRef = useRef(false); // khoá khi đang kiểm tra cặp / preview / transition
  const firstFlipTsRef = useRef(0); // mốc lật thẻ đầu (tính ghép nhanh)
  const levelStartRef = useRef(0);
  const mistakesRef = useRef(0);
  const scoreRef = useRef(0); // mirror của `score` (đọc trong callback, tránh stale)
  scoreRef.current = score;

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<MemoryStats>(loadStats());
  const themesRef = useRef<ThemePlays>(loadThemes());
  const [stats, setStats] = useState<MemoryStats>(() => statsRef.current);
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
  const announceUnlocks = useCallback((prev: AchievementCtx) => {
    const next = statsRef.current;
    const a = ACHIEVEMENTS.find((x) => !x.unlocked(prev) && x.unlocked(next));
    if (a) { showToast(a.emoji, `Mở khoá: ${a.name}`); return; }
    const s = STICKERS.find((x) => !x.unlocked(prev) && x.unlocked(next));
    if (s) showToast(s.emoji, `Sticker mới: ${s.name}`);
  }, [showToast]);

  /* ── Nạp một màn ─────────────────────────────────────────────────────── */
  const loadLevel = useCallback((th: Theme, lv: number, diff: Difficulty) => {
    const { cards: newCards, grid: g } = buildBoard(th, lv);
    setCards(newCards);
    setGrid(g);
    setUpIds([]);
    setMatchedIds(new Set());
    setHintIds([]);
    setHintsLeft(INITIAL_HINTS);
    setOverlay(null);
    setTimeLeft(diff.timer ?? 0);
    mistakesRef.current = 0;
    firstFlipTsRef.current = 0;
    levelStartRef.current = Date.now();
    lockRef.current = true; // khoá trong lúc xem trước

    // Bước 1–2: cho xem trước tất cả thẻ rồi úp lại.
    const pairs = (g.cols * g.rows) / 2;
    const previewMs = Math.min(PREVIEW_MAX, PREVIEW_BASE + pairs * PREVIEW_PER_PAIR);
    setPreview(true);
    const t = window.setTimeout(() => {
      setPreview(false);
      lockRef.current = false;
      levelStartRef.current = Date.now(); // bắt đầu tính giờ sau khi xem trước
    }, previewMs);
    addTimer(t);
  }, []);

  /* ── Bắt đầu chơi 1 chủ đề ───────────────────────────────────────────── */
  const startTheme = useCallback(
    (th: Theme) => {
      clearTimers();
      setTheme(th);
      setLevel(1);
      setScore(0);
      setCombo(0);
      setPhase('playing');
      // Đếm lượt chơi chủ đề (cho "chủ đề yêu thích").
      const tp = { ...themesRef.current, [th.id]: (themesRef.current[th.id] ?? 0) + 1 };
      themesRef.current = tp;
      saveThemes(tp);
      loadLevel(th, 1, difficulty);
    },
    [clearTimers, loadLevel, difficulty],
  );

  /* ── Đồng hồ đếm ngược (chế độ có giờ, không trong lúc preview/overlay) ─ */
  useEffect(() => {
    if (phase !== 'playing' || difficulty.timer === null || preview || overlay) return;
    const id = window.setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase, difficulty, preview, overlay]);

  useEffect(() => {
    if (phase === 'playing' && difficulty.timer !== null && timeLeft === 0 && !preview && !overlay) {
      setOverlay('lose');
      speak('Hết giờ rồi! Thử lại nhé.', LANG_SPEAK_DEFAULT);
      const t = window.setTimeout(() => { setOverlay(null); setPhase('home'); }, 2200);
      addTimer(t);
    }
  }, [timeLeft, phase, difficulty, preview, overlay]);

  /* ── Hoàn thành màn → thưởng, sang màn kế (lớn dần) ─────────────────── */
  const completeLevel = useCallback(() => {
    if (!theme) return;
    lockRef.current = true;
    const elapsedSec = (Date.now() - levelStartRef.current) / 1000;
    const stars = mistakesRef.current === 0 ? 3 : mistakesRef.current <= 3 ? 2 : 1;

    // Điểm thưởng hoàn thành màn (updater THUẦN — an toàn với StrictMode).
    const total = scoreRef.current + LEVEL_BONUS;
    setScore((s) => s + LEVEL_BONUS);

    // Cập nhật thống kê (làm NGOÀI updater để không bị chạy 2 lần trong dev).
    const prev = { ...statsRef.current };
    const ns: MemoryStats = {
      ...statsRef.current,
      levels: statsRef.current.levels + 1,
      bestScore: Math.max(statsRef.current.bestScore, total),
      fastClear: statsRef.current.fastClear || elapsedSec < 30,
      timeMs: statsRef.current.timeMs + (Date.now() - levelStartRef.current),
    };
    statsRef.current = ns;
    setStats(ns);
    saveStats(ns);
    announceUnlocks(prev);

    confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    speak(stars === 3 ? 'Xuất sắc! Trí nhớ tuyệt vời!' : 'Hoàn thành màn rồi, giỏi quá!', LANG_SPEAK_DEFAULT);

    // Sang màn kế (lớn dần; level ≥ MAX_LEVEL giữ lưới lớn nhất = adaptive endless).
    const t = window.setTimeout(() => {
      setLevel((lv) => {
        const next = lv + 1;
        loadLevel(theme, next, difficulty);
        return next;
      });
    }, 1600);
    addTimer(t);
  }, [theme, difficulty, loadLevel, announceUnlocks]);

  /* ── Xử lý lật một thẻ ───────────────────────────────────────────────── */
  const handleCardTap = (cardId: string) => {
    if (lockRef.current || preview || overlay) return;
    if (matchedIds.has(cardId) || upIds.includes(cardId) || upIds.length >= 2) return;

    playPop();
    const nextUp = [...upIds, cardId];
    setUpIds(nextUp);
    if (nextUp.length === 1) firstFlipTsRef.current = Date.now();

    if (nextUp.length === 2) {
      // Lật đủ 2 thẻ → kiểm tra cặp.
      lockRef.current = true;
      // Đếm lượt thử (cho tỷ lệ ghi nhớ).
      const nsAttempt = { ...statsRef.current, attempts: statsRef.current.attempts + 1 };
      statsRef.current = nsAttempt;
      setStats(nsAttempt);
      saveStats(nsAttempt);

      const [a, b] = nextUp;
      const fa = cards.find((c) => c.cardId === a)!.face;
      const fb = cards.find((c) => c.cardId === b)!.face;

      if (fa.id === fb.id) {
        // ===== GHÉP ĐÚNG =====
        const fast = Date.now() - firstFlipTsRef.current < FAST_SECONDS * 1000;
        const newCombo = combo + 1;
        setCombo(newCombo);
        let gained = SCORE_MATCH + (fast ? SCORE_FAST_BONUS : 0);
        if (newCombo === COMBO_3) gained += COMBO_3_BONUS;
        if (newCombo === COMBO_5) gained += COMBO_5_BONUS;
        setScore((s) => s + gained);

        playSfx('snd-correct');
        playTing();
        speak(fa.label, fa.lang === 'en' ? 'en-US' : LANG_SPEAK_DEFAULT);
        confetti({ particleCount: 26, spread: 50, startVelocity: 22, origin: { y: 0.5 }, colors: CONFETTI_COLORS });

        // Cập nhật cặp đã ghép + thống kê.
        const prev = { ...statsRef.current };
        const ns = { ...statsRef.current, pairs: statsRef.current.pairs + 1, bestCombo: Math.max(statsRef.current.bestCombo, newCombo) };
        statsRef.current = ns;
        setStats(ns);
        saveStats(ns);
        announceUnlocks(prev);

        const t = window.setTimeout(() => {
          const nextMatched = new Set(matchedIds);
          nextMatched.add(a);
          nextMatched.add(b);
          setMatchedIds(nextMatched);
          setUpIds([]);
          lockRef.current = false;
          if (nextMatched.size === cards.length) completeLevel();
        }, 350);
        addTimer(t);
      } else {
        // ===== GHÉP SAI ===== (úp lại, đứt combo)
        mistakesRef.current += 1;
        setCombo(0);
        playSfx('snd-wrong');
        playBip();
        const t = window.setTimeout(() => {
          setUpIds([]);
          lockRef.current = false;
        }, FLIP_BACK_DELAY);
        addTimer(t);
      }
    }
  };

  /* ── Gợi ý: mở 1 cặp đúng (chưa ghép) trong vài giây ─────────────────── */
  const useHint = () => {
    if (hintsLeft <= 0 || hintIds.length > 0 || lockRef.current || preview || overlay) return;
    // Tìm một mặt thẻ còn chưa ghép → lấy 2 thẻ của nó.
    const remaining = cards.filter((c) => !matchedIds.has(c.cardId));
    const byFace = new Map<string, string[]>();
    remaining.forEach((c) => {
      const arr = byFace.get(c.face.id) ?? [];
      arr.push(c.cardId);
      byFace.set(c.face.id, arr);
    });
    const pair = [...byFace.values()].find((ids) => ids.length >= 2);
    if (!pair) return;
    setHintsLeft((h) => h - 1);
    playPop();
    setHintIds([pair[0], pair[1]]);
    const t = window.setTimeout(() => setHintIds([]), HINT_DURATION);
    addTimer(t);
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const ctx: AchievementCtx = stats;

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: HOME (chọn độ khó + chủ đề)
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'home') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Bản đồ</button>
        <div className="text-center mb-4">
          <div className="text-7xl mb-1 floating">🧠</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">
            Học Viện Trí Nhớ
          </h2>
          <p className="text-slate-500 text-sm font-bold">Lật thẻ, tìm các cặp giống nhau nào!</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setPhase('collection')} className="bg-amber-100 text-amber-700 font-black text-sm px-3 py-2.5 rounded-2xl active:scale-95">🏅 Thành tích</button>
          <button onClick={() => setPhase('parent')} className="bg-indigo-100 text-indigo-700 font-black text-sm px-3 py-2.5 rounded-2xl active:scale-95">👨‍👩‍👧 Phụ huynh</button>
        </div>

        {/* Chọn độ khó (đồng hồ) */}
        <div className="mb-4">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Độ khó</div>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d)}
                className={`p-2.5 rounded-2xl border-2 font-black text-xs active:scale-95 transition-all ${
                  difficulty.id === d.id ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-600' : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chọn chủ đề */}
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Chủ đề</div>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => startTheme(th)}
              className={`p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-3 text-left bg-gradient-to-br ${th.gradient}`}
            >
              <span className="text-4xl">{th.emoji}</span>
              <span className="font-black text-white text-base leading-tight">{th.name}</span>
            </button>
          ))}
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
        <button onClick={() => setPhase('home')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-fuchsia-500 bg-clip-text text-transparent">Bảng Vinh Danh</h2>
          <p className="text-slate-500 text-xs font-bold mt-1">{stats.pairs} cặp · {stats.levels} màn · combo cao nhất {stats.bestCombo}</p>
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
    const minutes = Math.round(stats.timeMs / 60000);
    const rate = stats.attempts > 0 ? Math.round((stats.pairs / stats.attempts) * 100) : 0;
    // Chủ đề yêu thích = chơi nhiều nhất.
    const favEntry = Object.entries(themesRef.current).sort((a, b) => b[1] - a[1])[0];
    const favTheme = favEntry ? THEMES.find((t) => t.id === favEntry[0]) : undefined;
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('home')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">← Quay lại</button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Bảng Phụ Huynh</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian chơi</div>
            <div className="text-2xl font-black text-sky-600">{minutes} phút</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ ghi nhớ</div>
            <div className="text-2xl font-black text-emerald-600">{rate}%</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm cao nhất</div>
            <div className="text-2xl font-black text-amber-600">{stats.bestScore}</div>
          </div>
          <div className="bg-fuchsia-50 border-2 border-fuchsia-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Chủ đề yêu thích</div>
            <div className="text-lg font-black text-fuchsia-600 mt-1">{favTheme ? `${favTheme.emoji} ${favTheme.name}` : 'Chưa có'}</div>
          </div>
        </div>
        <div className="mt-4 bg-slate-50 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng cặp đã ghép · Số màn hoàn thành</div>
          <div className="text-xl font-black text-slate-700 mt-1">🧩 {stats.pairs} cặp · 🏆 {stats.levels} màn</div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PLAYING
   * ════════════════════════════════════════════════════════════════════ */
  if (!theme) return null;
  const totalPairs = cards.length / 2;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* Thanh trạng thái */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { clearTimers(); setPhase('home'); }} className="text-slate-400 font-bold hover:text-slate-600 text-sm">✕ Thoát</button>
        <span className="text-xs font-black text-slate-500">{theme.emoji} Màn {level} {level >= MAX_LEVEL ? '+' : ''}</span>
        <div className="flex items-center gap-1.5 text-xs font-black">
          <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">⭐ {score}</span>
          {difficulty.timer !== null && (
            <span className={`px-2.5 py-1 rounded-full ${timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-sky-100 text-sky-700'}`}>⏱️ {fmtTime(timeLeft)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mb-3 text-xs font-black">
        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">🧩 {matchedIds.size / 2}/{totalPairs}</span>
        {combo >= 2 && <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">🔥 Combo {combo}</span>}
        {preview && <span className="bg-violet-100 text-violet-600 px-2.5 py-1 rounded-full animate-pulse">👀 Ghi nhớ nhanh!</span>}
      </div>

      {/* Lưới thẻ */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}>
        {cards.map((card) => {
          const isMatched = matchedIds.has(card.cardId);
          const isUp = preview || isMatched || upIds.includes(card.cardId) || hintIds.includes(card.cardId);
          return (
            <button
              key={card.cardId}
              onClick={() => handleCardTap(card.cardId)}
              className="perspective-1000 aspect-square"
              style={{ touchAction: 'manipulation' }}
              aria-label={isUp ? card.face.label : 'Thẻ úp'}
            >
              <div className={`card-inner relative w-full h-full ${isUp ? 'flipped' : ''}`}>
                {/* Mặt úp (cover) */}
                <div className="card-front rounded-xl bg-gradient-to-br from-sky-400 to-fuchsia-500 flex items-center justify-center shadow-sm">
                  <span className="text-2xl sm:text-3xl">🧠</span>
                </div>
                {/* Mặt thẻ (nội dung) */}
                <div
                  className={`card-back rounded-xl flex items-center justify-center border-2 ${
                    isMatched ? 'bg-emerald-50 border-emerald-300' : hintIds.includes(card.cardId) ? 'bg-amber-50 border-amber-300' : 'bg-white border-sky-100'
                  }`}
                >
                  <FaceContent face={card.face} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Nút gợi ý */}
      <button
        onClick={useHint}
        disabled={hintsLeft <= 0 || hintIds.length > 0 || preview}
        className="w-full mt-3 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all disabled:opacity-40"
      >
        💡 Gợi ý ({hintsLeft})
      </button>

      {/* Overlay kết thúc (thắng màn / hết giờ) */}
      {overlay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
            <div className="text-6xl mb-1 animate-bounce">{overlay === 'lose' ? '⏰' : '🏆'}</div>
            <div className={`text-xl font-black ${overlay === 'lose' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {overlay === 'lose' ? 'Hết giờ!' : 'Hoàn thành màn!'}
            </div>
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
