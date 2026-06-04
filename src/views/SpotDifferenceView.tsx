/* ──────────────────────────────────────────────────────────────────────────
 * GAME "THÁM TỬ TÌM ĐIỂM KHÁC BIỆT" (Game Island)
 *
 * Bé đóng vai thám tử nhí, so sánh hai bức tranh (lưới emoji) gần giống nhau và
 * tìm tất cả điểm khác biệt. Có 4 chế độ (Dễ/Thường/Khó/Thử thách), đồng hồ đếm
 * ngược, hệ thống mạng ❤️, gợi ý 💡, combo thưởng điểm, achievement & sticker.
 *
 * GHI CHÚ KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva + 2 ảnh bitmap. Repo này không dùng Konva và
 *     không có pipeline ảnh → mỗi "bức tranh" được dựng bằng LƯỚI EMOJI; bức B
 *     là bản sao bức A với N ô bị biến đổi (xem spotDiffData.generateBoard).
 *     Cách này cho level vô hạn, chạm chính xác từng ô, responsive bằng CSS grid
 *     và đầy đủ hiệu ứng (confetti/particle/highlight) mà không cần asset.
 *   - Thao tác: CHẠM vào ô khác biệt ở một trong hai bức.
 *
 * React quản lý toàn bộ state (score, lives, timer, combo, hint, found, stats).
 *
 * localStorage (prefix `lingoland_` để Profile-reset quét sạch):
 *   - lingoland_spotdiff_stats : JSON {found, levels} — thống kê tích luỹ
 *                                 (dùng để mở khoá achievement/sticker)
 *   - lingoland_spotdiff_hs    : JSON Record<modeId, number> — điểm cao mỗi mode
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  MODES,
  ACHIEVEMENTS,
  STICKERS,
  generateBoard,
  themeForLevel,
  type Board,
  type ModeDef,
  type Tile,
  type DetectiveStats,
} from '../data/spotDiffData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'start' | 'playing' | 'gameover' | 'collection';

const STATS_KEY = 'lingoland_spotdiff_stats';
const HS_KEY = 'lingoland_spotdiff_hs';

const CONFETTI_COLORS = ['#7dd3fc', '#fde68a', '#a7f3d0', '#d8b4fe', '#f9a8d4'];

const {
  INITIAL_LIVES,
  INITIAL_HINTS,
  SCORE_PER_DIFFERENCE,
  WRONG_CLICK_PENALTY,
  COMBO_X3,
  COMBO_X3_BONUS,
  COMBO_X5,
  COMBO_X5_BONUS,
  LEVEL_COMPLETE_BONUS,
  HINT_DURATION,
  LEVEL_COMPLETE_DELAY,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): DetectiveStats => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { found: 0, levels: 0 };
    const p = JSON.parse(raw);
    return {
      found: typeof p?.found === 'number' ? p.found : 0,
      levels: typeof p?.levels === 'number' ? p.levels : 0,
    };
  } catch {
    return { found: 0, levels: 0 };
  }
};
const saveStats = (s: DetectiveStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

type HsMap = Record<string, number>;
const loadHs = (): HsMap => {
  try {
    const raw = localStorage.getItem(HS_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return p && typeof p === 'object' ? (p as HsMap) : {};
  } catch {
    return {};
  }
};
const saveHs = (m: HsMap) => {
  try {
    localStorage.setItem(HS_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};

/* ===========================================================================
 * Tiện ích nhỏ
 * ========================================================================= */

/** Số sao mỗi màn dựa trên số lần sai và số gợi ý đã dùng. */
const starsForBoard = (wrong: number, hints: number): number => {
  if (wrong === 0 && hints === 0) return 3;
  if (wrong <= 2 && hints <= 1) return 2;
  return 1;
};

/** Định dạng giây → "m:ss". */
const fmtTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function SpotDifferenceView({ onBack }: Props) {
  /* ── State điều hướng ─────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('start');
  const [mode, setMode] = useState<ModeDef | null>(null);

  /* ── State một phiên chơi ─────────────────────────────────────────────── */
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState<number>(INITIAL_LIVES);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  /* ── State một bàn (board) ────────────────────────────────────────────── */
  const [board, setBoard] = useState<Board | null>(null);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [hintsLeft, setHintsLeft] = useState<number>(INITIAL_HINTS);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState<{ side: 'left' | 'right'; index: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [transitioning, setTransitioning] = useState(false); // dừng giữa 2 màn
  const [boardStars, setBoardStars] = useState(0); // sao của màn vừa xong (banner)

  // Số lần sai / gợi ý ĐÃ DÙNG trong màn hiện tại — để tính sao.
  const wrongThisBoardRef = useRef(0);
  const hintsThisBoardRef = useRef(0);

  /* ── Tiến độ lưu lại ─────────────────────────────────────────────────── */
  const statsRef = useRef<DetectiveStats>(loadStats()); // nguồn sự thật để so sánh mở khoá
  const [stats, setStats] = useState<DetectiveStats>(() => statsRef.current);
  const [hsMap, setHsMap] = useState<HsMap>(() => loadHs());
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Quản lý timer setTimeout để cleanup ─────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]); // unmount → dọn sạch

  /* ── Hiện toast mở khoá (achievement/sticker) trong ~2.6s ────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);

  /**
   * Cập nhật thống kê tích luỹ + phát hiện achievement/sticker MỚI mở khoá.
   * Dùng statsRef làm mốc so sánh để tránh side-effect trong updater của setState.
   */
  const bumpStats = useCallback(
    (deltaFound: number, deltaLevels: number) => {
      const prev = statsRef.current;
      const next: DetectiveStats = {
        found: prev.found + deltaFound,
        levels: prev.levels + deltaLevels,
      };
      statsRef.current = next;
      setStats(next);
      saveStats(next);

      // Ưu tiên báo achievement; nếu không có thì báo sticker mới.
      const newAch = ACHIEVEMENTS.find((a) => !a.unlocked(prev) && a.unlocked(next));
      if (newAch) {
        showToast(newAch.emoji, `Mở khoá: ${newAch.name}`);
        return;
      }
      const newStk = STICKERS.find((s) => !s.unlocked(prev) && s.unlocked(next));
      if (newStk) showToast(newStk.emoji, `Sticker mới: ${newStk.name}`);
    },
    [showToast],
  );

  /* ── Nạp một bàn chơi mới ─────────────────────────────────────────────── */
  const loadBoard = useCallback((m: ModeDef, forLevel: number) => {
    const theme = themeForLevel(forLevel);
    setBoard(generateBoard(theme.pool, m.cols, m.rows, m.diffs));
    setFound(new Set());
    setHintsLeft(INITIAL_HINTS);
    setHintIndex(null);
    setWrongFlash(null);
    setTimeLeft(m.timer ?? 0);
    setTransitioning(false);
    setBoardStars(0);
    wrongThisBoardRef.current = 0;
    hintsThisBoardRef.current = 0;
  }, []);

  /* ── Bắt đầu một chế độ ───────────────────────────────────────────────── */
  const startMode = useCallback(
    (m: ModeDef) => {
      clearTimers();
      setMode(m);
      setLevel(1);
      setScore(0);
      setLives(INITIAL_LIVES);
      setCombo(0);
      setBestCombo(0);
      setPhase('playing');
      loadBoard(m, 1);
    },
    [clearTimers, loadBoard],
  );

  /* ── Kết thúc game → lưu kỷ lục theo mode ─────────────────────────────── */
  const endGame = useCallback(() => {
    if (!mode) return;
    setHsMap((prev) => {
      const best = Math.max(prev[mode.id] ?? 0, score);
      const next = { ...prev, [mode.id]: best };
      saveHs(next);
      return next;
    });
    speak('Hết giờ làm thám tử rồi!', LANG_SPEAK_DEFAULT);
    setPhase('gameover');
  }, [mode, score]);

  /* ── Đồng hồ đếm ngược (chỉ khi mode có timer & không đang chuyển màn) ── */
  useEffect(() => {
    if (phase !== 'playing' || !mode || mode.timer === null || transitioning) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, mode, transitioning]);

  // Hết giờ → game over.
  useEffect(() => {
    if (phase === 'playing' && mode?.timer != null && timeLeft === 0 && !transitioning) {
      endGame();
    }
  }, [timeLeft, phase, mode, transitioning, endGame]);

  /* ── Hoàn thành một màn ───────────────────────────────────────────────── */
  const completeLevel = useCallback(() => {
    if (!mode) return;
    setTransitioning(true);

    const stars = starsForBoard(wrongThisBoardRef.current, hintsThisBoardRef.current);
    setBoardStars(stars);
    setScore((s) => s + LEVEL_COMPLETE_BONUS);
    bumpStats(0, 1); // +1 màn hoàn thành

    // Confetti + pháo hoa ăn mừng.
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    speak('Giỏi quá! Tìm hết rồi!', LANG_SPEAK_DEFAULT);

    // Sau khoảng nghỉ → sang màn kế tiếp (cùng phiên, level tăng).
    const t = window.setTimeout(() => {
      setLevel((lv) => {
        const nextLv = lv + 1;
        loadBoard(mode, nextLv);
        return nextLv;
      });
    }, LEVEL_COMPLETE_DELAY);
    addTimer(t);
  }, [mode, bumpStats, loadBoard]);

  /* ── Xử lý chạm một ô (side = bức A hay B, index = vị trí ô) ──────────── */
  const handleTap = useCallback(
    (side: 'left' | 'right', index: number) => {
      if (!board || !mode || phase !== 'playing' || transitioning) return;
      if (found.has(index)) return; // ô khác biệt đã tìm thấy → bỏ qua

      const isDiff = board.diffs.includes(index);

      if (isDiff) {
        // ===== TÌM ĐÚNG =====
        const nextFound = new Set(found);
        nextFound.add(index);
        setFound(nextFound);

        const newCombo = combo + 1;
        setCombo(newCombo);
        setBestCombo((b) => Math.max(b, newCombo));

        // Điểm cơ bản + thưởng combo tại mốc 3 / 5.
        let gained = SCORE_PER_DIFFERENCE;
        if (newCombo === COMBO_X3) gained += COMBO_X3_BONUS;
        if (newCombo === COMBO_X5) gained += COMBO_X5_BONUS;
        setScore((s) => s + gained);

        bumpStats(1, 0); // +1 điểm khác biệt tìm được

        playSfx('snd-correct');
        playTing();
        confetti({
          particleCount: 24,
          spread: 55,
          startVelocity: 26,
          origin: { y: 0.5 },
          colors: CONFETTI_COLORS,
        });
        if (newCombo === COMBO_X3 || newCombo === COMBO_X5) speak('Tuyệt vời', LANG_SPEAK_DEFAULT);

        // Tìm đủ → hoàn thành màn.
        if (nextFound.size === board.diffs.length) {
          completeLevel();
        }
      } else {
        // ===== CHẠM SAI =====
        setScore((s) => Math.max(0, s - WRONG_CLICK_PENALTY));
        setCombo(0);
        wrongThisBoardRef.current += 1;
        setWrongFlash({ side, index });
        const tf = window.setTimeout(
          () => setWrongFlash((w) => (w && w.index === index && w.side === side ? null : w)),
          500,
        );
        addTimer(tf);

        playSfx('snd-wrong');
        playBip();

        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          const te = window.setTimeout(endGame, 700);
          addTimer(te);
        }
      }
    },
    [board, mode, phase, transitioning, found, combo, lives, bumpStats, completeLevel, endGame],
  );

  /* ── Dùng gợi ý: highlight một điểm khác biệt CHƯA tìm thấy ──────────── */
  const useHint = useCallback(() => {
    if (!board || hintsLeft <= 0 || hintIndex !== null || transitioning) return;
    const remaining = board.diffs.filter((i) => !found.has(i));
    if (remaining.length === 0) return;
    const target = remaining[Math.floor(Math.random() * remaining.length)];
    setHintIndex(target);
    setHintsLeft((h) => h - 1);
    hintsThisBoardRef.current += 1;
    playPop();
    const t = window.setTimeout(() => setHintIndex(null), HINT_DURATION);
    addTimer(t);
  }, [board, hintsLeft, hintIndex, transitioning, found]);

  /* ── Dữ liệu suy ra cho màn hình ─────────────────────────────────────── */
  const unlockedAchievements = useMemo(() => ACHIEVEMENTS.filter((a) => a.unlocked(stats)), [stats]);
  const unlockedStickers = useMemo(() => STICKERS.filter((s) => s.unlocked(stats)), [stats]);

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: START — chọn chế độ
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

        <div className="text-center mb-5">
          <div className="text-7xl mb-2 floating">🕵️</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Thám Tử Tìm Điểm Khác Biệt
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            So sánh hai bức tranh và tìm tất cả điểm khác biệt nhé, thám tử nhí!
          </p>
        </div>

        <button
          onClick={() => setPhase('collection')}
          className="w-full mb-4 bg-gradient-to-r from-amber-100 to-pink-100 text-amber-700 font-black text-sm px-3 py-2.5 rounded-2xl active:scale-95 transition-all"
        >
          🏅 Thành tích & Sticker ({unlockedAchievements.length + unlockedStickers.length}/
          {ACHIEVEMENTS.length + STICKERS.length})
        </button>

        <div className="space-y-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => startMode(m)}
              className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left bg-gradient-to-br ${m.gradient}`}
            >
              <div className="text-5xl">{m.emoji}</div>
              <div className="flex-1 text-white">
                <div className="font-black text-lg leading-tight">{m.label}</div>
                <div className="text-[11px] font-bold opacity-90 mt-0.5">{m.desc}</div>
              </div>
              {/* Kỷ lục điểm theo mode (nếu có) */}
              {hsMap[m.id] ? (
                <div className="text-right text-white">
                  <div className="text-[9px] font-bold opacity-80 uppercase">Kỷ lục</div>
                  <div className="font-black">{hsMap[m.id]}</div>
                </div>
              ) : (
                <span className="text-white text-xl">▶️</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: COLLECTION — thành tích & sticker
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'collection') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('start')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>

        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Phòng Thám Tử
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            Đã tìm {stats.found} điểm khác biệt · hoàn thành {stats.levels} màn
          </p>
        </div>

        {/* Thành tích */}
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thành tích</h3>
        <div className="space-y-2 mb-5">
          {ACHIEVEMENTS.map((a) => {
            const got = a.unlocked(stats);
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

        {/* Sticker */}
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sticker</h3>
        <div className="grid grid-cols-5 gap-2">
          {STICKERS.map((s) => {
            const got = s.unlocked(stats);
            return (
              <div
                key={s.id}
                onClick={() => got && speak(s.name, LANG_SPEAK_DEFAULT)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 ${
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
   * SCREEN: GAME OVER
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'gameover' && mode) {
    const isRecord = score >= (hsMap[mode.id] ?? 0) && score > 0;
    return (
      <div className="text-center py-6 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-2 floating">🔍</div>
        <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Kết thúc điều tra!
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-4">
          Chế độ {mode.label} · đến màn {level}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm</div>
            <div className="text-2xl font-black text-sky-600">{score}</div>
          </div>
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Màn</div>
            <div className="text-2xl font-black text-indigo-600">{level}</div>
          </div>
          <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Combo</div>
            <div className="text-2xl font-black text-purple-600">{bestCombo}</div>
          </div>
        </div>

        {isRecord && (
          <div className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-sm px-4 py-1.5 rounded-full mb-4">
            🎉 Kỷ lục mới chế độ {mode.label}!
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setPhase('start')}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            🏠 Chọn chế độ
          </button>
          <button
            onClick={() => startMode(mode)}
            className="flex-1 py-4 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all"
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
  if (!board || !mode) return null;

  const theme = themeForLevel(level);
  const remaining = board.diffs.length - found.size;

  return (
    <div className={`max-w-md mx-auto ${wrongFlash ? 'shake-x' : ''}`}>
      {/* ── Thanh trạng thái: thoát · màn/chủ đề · mạng ─────────────────── */}
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
        <span className="text-xs font-black text-slate-500">
          {theme.emoji} Màn {level} · {mode.label}
        </span>
        <span className="text-sm tracking-tight">
          {Array.from({ length: INITIAL_LIVES }, (_, i) => (i < lives ? '❤️' : '🤍')).join('')}
        </span>
      </div>

      {/* ── Hàng thông tin: điểm · còn lại · đồng hồ ────────────────────── */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">
          ⭐ {score}
        </span>
        <span className="bg-emerald-100 text-emerald-700 font-black text-xs px-2.5 py-1 rounded-full">
          🔎 Còn {remaining}
        </span>
        {combo >= COMBO_X3 && (
          <span className="bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">
            🔥 Combo {combo}
          </span>
        )}
        {mode.timer !== null && (
          <span
            className={`font-black text-xs px-2.5 py-1 rounded-full ${
              timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-sky-100 text-sky-700'
            }`}
          >
            ⏱️ {fmtTime(timeLeft)}
          </span>
        )}
      </div>

      {/* ── Tiến độ tìm (số ô khác biệt) ───────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-3">
        {board.diffs.map((d, i) => (
          <div
            key={d}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < found.size ? 'bg-emerald-400' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* ── Hai bức tranh: A trên / B dưới (desktop: cạnh nhau) ─────────── */}
      <div className="flex flex-col md:flex-row gap-3 mb-3">
        {renderBoard('left', board.left, 'A')}
        {renderBoard('right', board.right, 'B')}
      </div>

      {/* ── Nút gợi ý ──────────────────────────────────────────────────── */}
      <button
        onClick={useHint}
        disabled={hintsLeft <= 0 || hintIndex !== null}
        className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all disabled:opacity-40"
      >
        💡 Gợi ý ({hintsLeft})
      </button>

      {/* ── Banner hoàn thành màn (sao) ────────────────────────────────── */}
      {transitioning && (
        <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
            <div className="text-xl font-black text-slate-700 mb-2">🎉 Hoàn thành màn {level}!</div>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`text-4xl ${i < boardStars ? '' : 'grayscale opacity-25'}`}>
                  ⭐
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast mở khoá achievement / sticker ────────────────────────── */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-30 bg-white border-2 border-amber-200 rounded-3xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom">
          <span className="text-4xl">{toast.emoji}</span>
          <div className="text-left">
            <div className="text-[10px] font-bold text-amber-500 uppercase">Chúc mừng!</div>
            <div className="font-black text-slate-700">{toast.text}</div>
          </div>
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────
   * HÀM RENDER MỘT BỨC TRANH (lưới ô)
   * (function declaration → hoisted, đọc state/handler ở closure phía trên)
   * ───────────────────────────────────────────────────────────────────── */
  function renderBoard(side: 'left' | 'right', tiles: Tile[], label: string) {
    if (!board) return null;
    return (
      <div className="flex-1">
        <div className="text-[11px] font-black text-slate-400 mb-1 text-center">Bức {label}</div>
        <div
          className="bg-gradient-to-br from-sky-50 to-indigo-50 border-2 border-sky-100 rounded-2xl p-1.5 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}
        >
          {tiles.map((tile, i) => {
            const isFound = found.has(i) && board.diffs.includes(i);
            const isHint = hintIndex === i; // gợi ý hiện cả 2 bức cùng index
            const isWrong = wrongFlash?.side === side && wrongFlash.index === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleTap(side, i)}
                aria-label={`Bức ${label}, ô ${Math.floor(i / board.cols) + 1}-${(i % board.cols) + 1}`}
                className={`relative aspect-square rounded-lg flex items-center justify-center active:scale-90 transition-transform ${
                  isFound ? 'bg-emerald-100' : 'hover:bg-white/60'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {/* Nội dung ô (emoji) — có thể được biến đổi (transform/filter) ở bức B */}
                {tile.emoji && (
                  <span
                    className="text-xl sm:text-2xl leading-none select-none"
                    style={{ transform: tile.transform, filter: tile.filter }}
                  >
                    {tile.emoji}
                  </span>
                )}

                {/* Vòng tròn xanh đánh dấu đã tìm đúng */}
                {isFound && (
                  <span className="absolute inset-0.5 rounded-full border-[3px] border-emerald-500 animate-in zoom-in pointer-events-none" />
                )}

                {/* Gợi ý: vòng nhấp nháy vàng */}
                {isHint && !isFound && (
                  <span className="absolute inset-0.5 rounded-full border-[3px] border-amber-400 animate-pulse pointer-events-none" />
                )}

                {/* Chạm sai: dấu X đỏ */}
                {isWrong && (
                  <span className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-2xl animate-in zoom-in pointer-events-none">
                    ✕
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
}
