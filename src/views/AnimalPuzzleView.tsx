/* ──────────────────────────────────────────────────────────────────────────
 * GAME "GHÉP HÌNH ĐỘNG VẬT" (Game Island)
 *
 * Bé kéo các mảnh của một con vật về đúng ô trên khung lưới để hoàn thành bức
 * tranh. 5 chế độ (2×2 → 4×4 + thử thách thời gian), gợi ý 💡, combo, đồng hồ,
 * sticker động vật & achievement.
 *
 * GHI CHÚ KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva + cắt file ảnh. Repo không dùng Konva và không
 *     có ảnh → mỗi con vật là MỘT emoji cỡ lớn (bằng kích thước khung) được "cắt"
 *     thành rows×cols mảnh bằng kỹ thuật CSS overflow + transform. Mỗi mảnh là
 *     một lát thật của bức tranh; xếp đúng ô thì khớp với silhouette mờ phía sau.
 *   - Kéo-thả dùng Pointer Events (gộp chuột + cảm ứng) — đúng tinh thần "phối
 *     hợp tay–mắt" của đề bài, tự co giãn responsive theo bề rộng đo được.
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_animalpuzzle_stats   : JSON {puzzles, totalScore, fastSolve}
 *   - lingoland_animalpuzzle_animals : JSON string[] — id động vật đã mở khoá
 *   - lingoland_animalpuzzle_hs      : number — điểm 1 phiên cao nhất
 * ────────────────────────────────────────────────────────────────────────── */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  MODES,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_ANIMALS,
  animalForLevel,
  generatePieces,
  type Animal,
  type ModeDef,
  type PuzzlePiece,
  type PuzzleStats,
  type AchievementCtx,
} from '../data/animalPuzzleData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'start' | 'playing' | 'gameover' | 'collection';

const STATS_KEY = 'lingoland_animalpuzzle_stats';
const ANIMALS_KEY = 'lingoland_animalpuzzle_animals';
const HS_KEY = 'lingoland_animalpuzzle_hs';

const CONFETTI_COLORS = ['#7dd3fc', '#a7f3d0', '#fde68a', '#fdba74', '#d8b4fe'];
const GAP = 16; // khoảng cách giữa khung ghép và khay (px)
const MAX_BOARD = 360; // giới hạn cạnh khung để không quá to trên desktop

const {
  INITIAL_HINTS,
  SCORE_PER_PIECE,
  SCORE_PER_PUZZLE,
  COMBO_X3,
  COMBO_X3_BONUS,
  COMBO_X5,
  COMBO_X5_BONUS,
  HINT_DURATION,
  LEVEL_COMPLETE_DELAY,
  SPEED_SOLVE_SECONDS,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): PuzzleStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      puzzles: typeof p?.puzzles === 'number' ? p.puzzles : 0,
      totalScore: typeof p?.totalScore === 'number' ? p.totalScore : 0,
      fastSolve: !!p?.fastSolve,
    };
  } catch {
    return { puzzles: 0, totalScore: 0, fastSolve: false };
  }
};
const saveStats = (s: PuzzleStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const loadAnimals = (): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(ANIMALS_KEY) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveAnimals = (s: Set<string>) => {
  try {
    localStorage.setItem(ANIMALS_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

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

/** Định dạng giây → "m:ss". */
const fmtTime = (sec: number): string => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

/** Hình học của bàn chơi suy ra từ bề rộng đo được + lưới của mode. */
interface Geometry {
  board: number; // cạnh khung ghép (vuông)
  pieceW: number;
  pieceH: number;
  trayTop: number; // y bắt đầu khay
  stageW: number;
  stageH: number;
  rows: number;
  cols: number;
}

export default function AnimalPuzzleView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('start');
  const [mode, setMode] = useState<ModeDef | null>(null);

  /* ── State một phiên ─────────────────────────────────────────────────── */
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [sessionPuzzles, setSessionPuzzles] = useState(0);

  /* ── State một puzzle ────────────────────────────────────────────────── */
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [hintsLeft, setHintsLeft] = useState<number>(INITIAL_HINTS);
  const [hintId, setHintId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  /* ── State kéo-thả ────────────────────────────────────────────────────── */
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  /* ── Tiến độ lưu lại ─────────────────────────────────────────────────── */
  const statsRef = useRef<PuzzleStats>(loadStats());
  const animalsRef = useRef<Set<string>>(loadAnimals());
  const [stats, setStats] = useState<PuzzleStats>(() => statsRef.current);
  const [animals, setAnimals] = useState<Set<string>>(() => animalsRef.current);
  const [hs, setHs] = useState<number>(() => loadHs());
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Đo bề rộng để responsive ────────────────────────────────────────── */
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(320);

  /* ── Refs phục vụ kéo-thả (đọc giá trị mới nhất, tránh stale closure) ──── */
  const geoRef = useRef<Geometry | null>(null);
  const piecesRef = useRef<PuzzlePiece[]>([]);
  const dragIdRef = useRef<string | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const transitioningRef = useRef(false);
  const startTsRef = useRef(0); // mốc thời gian bắt đầu puzzle (cho thành tích tốc độ)

  /* ── Timer setTimeout cleanup ─────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  // Giữ các ref đồng bộ với state mỗi lần render.
  transitioningRef.current = transitioning;
  piecesRef.current = pieces;
  dragPosRef.current = dragPos;

  /* ── Đo bề rộng khung chứa ────────────────────────────────────────────── */
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setAvail(el.clientWidth || 320);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  /* ── Tính hình học theo bề rộng + mode ───────────────────────────────── */
  const geo: Geometry | null = useMemo(() => {
    if (!mode) return null;
    const board = Math.min(avail, MAX_BOARD);
    const pieceW = board / mode.cols;
    const pieceH = board / mode.rows;
    const trayTop = board + GAP;
    const stageH = trayTop + mode.rows * pieceH; // khay = lưới giống khung, đặt bên dưới
    return { board, pieceW, pieceH, trayTop, stageW: board, stageH, rows: mode.rows, cols: mode.cols };
  }, [avail, mode]);
  geoRef.current = geo;

  /* ── Vị trí pixel của một mảnh (suy ra từ trạng thái + hình học) ──────── */
  const posOf = useCallback(
    (p: PuzzlePiece, g: Geometry): { x: number; y: number } => {
      if (p.locked) return { x: p.c * g.pieceW, y: p.r * g.pieceH }; // ô đúng trên khung
      if (dragId === p.id && dragPos) return dragPos; // đang kéo
      // Ô khay (mặc định): khay là lưới cols cột đặt dưới khung.
      const col = p.trayIndex % g.cols;
      const row = Math.floor(p.trayIndex / g.cols);
      return { x: col * g.pieceW, y: g.trayTop + row * g.pieceH };
    },
    [dragId, dragPos],
  );

  /* ── Cập nhật pieces (đồng bộ luôn ref) ──────────────────────────────── */
  const setPiecesSynced = useCallback((updater: (prev: PuzzlePiece[]) => PuzzlePiece[]) => {
    setPieces((prev) => {
      const next = updater(prev);
      piecesRef.current = next;
      return next;
    });
  }, []);

  /* ── Toast mở khoá ────────────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);

  /**
   * Cập nhật thống kê + động vật mở khoá; phát hiện achievement/sticker MỚI.
   * Dùng ref làm mốc so sánh để tránh side-effect trong updater của setState.
   */
  const recordCompletion = useCallback(
    (animal: Animal, gainedScore: number, solveSeconds: number) => {
      const prevStats = statsRef.current;
      const prevAnimals = animalsRef.current;
      const prevCtx: AchievementCtx = { ...prevStats, animalsUnlocked: prevAnimals.size };

      // Thống kê mới.
      const nextStats: PuzzleStats = {
        puzzles: prevStats.puzzles + 1,
        totalScore: prevStats.totalScore + gainedScore,
        fastSolve: prevStats.fastSolve || solveSeconds < SPEED_SOLVE_SECONDS,
      };
      const nextAnimals = new Set(prevAnimals);
      const isNewAnimal = !nextAnimals.has(animal.id);
      nextAnimals.add(animal.id);

      statsRef.current = nextStats;
      animalsRef.current = nextAnimals;
      setStats(nextStats);
      setAnimals(nextAnimals);
      saveStats(nextStats);
      saveAnimals(nextAnimals);

      const nextCtx: AchievementCtx = { ...nextStats, animalsUnlocked: nextAnimals.size };

      // Báo achievement mới (ưu tiên) → nếu không, báo sticker động vật mới.
      const newAch = ACHIEVEMENTS.find((a) => !a.unlocked(prevCtx) && a.unlocked(nextCtx));
      if (newAch) {
        showToast(newAch.emoji, `Mở khoá: ${newAch.name}`);
      } else if (isNewAnimal && STICKERS.some((s) => s.animalId === animal.id)) {
        showToast(animal.emoji, `Sticker mới: ${animal.name}`);
      }
    },
    [showToast],
  );

  /* ── Nạp puzzle cho một level ─────────────────────────────────────────── */
  const loadLevel = useCallback(
    (m: ModeDef) => {
      const newPieces = generatePieces(m.rows, m.cols);
      setPieces(newPieces);
      piecesRef.current = newPieces;
      setHintsLeft(INITIAL_HINTS);
      setHintId(null);
      setWrongId(null);
      setTimeLeft(m.timer ?? 0);
      setTransitioning(false);
      transitioningRef.current = false;
      setDragId(null);
      setDragPos(null);
      dragIdRef.current = null;
      dragPosRef.current = null;
      startTsRef.current = Date.now();
    },
    [],
  );

  /* ── Bắt đầu một chế độ ───────────────────────────────────────────────── */
  const startMode = useCallback(
    (m: ModeDef) => {
      clearTimers();
      setMode(m);
      setLevel(1);
      setScore(0);
      setCombo(0);
      setBestCombo(0);
      setSessionPuzzles(0);
      setPhase('playing');
      loadLevel(m);
    },
    [clearTimers, loadLevel],
  );

  /* ── Kết thúc game ────────────────────────────────────────────────────── */
  const endGame = useCallback(() => {
    speak('Hết giờ rồi!', LANG_SPEAK_DEFAULT);
    setPhase('gameover');
  }, []);

  // Lưu kỷ lục điểm phiên (mỗi khi điểm tăng).
  useEffect(() => {
    if (score > hs) {
      setHs(score);
      saveHs(score);
    }
  }, [score, hs]);

  /* ── Đồng hồ đếm ngược (mode có timer & không chuyển màn) ─────────────── */
  useEffect(() => {
    if (phase !== 'playing' || !mode || mode.timer === null || transitioning) return;
    const id = window.setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase, mode, transitioning]);

  useEffect(() => {
    if (phase === 'playing' && mode?.timer != null && timeLeft === 0 && !transitioning) endGame();
  }, [timeLeft, phase, mode, transitioning, endGame]);

  /* ── Hoàn thành puzzle ────────────────────────────────────────────────── */
  const completeLevel = useCallback(() => {
    if (!mode) return;
    setTransitioning(true);
    transitioningRef.current = true;

    const animal = animalForLevel(level);
    const solveSeconds = (Date.now() - startTsRef.current) / 1000;

    // Cộng điểm hoàn thành + cập nhật thống kê.
    setScore((s) => {
      const total = s + SCORE_PER_PUZZLE;
      recordCompletion(animal, SCORE_PER_PUZZLE + SCORE_PER_PIECE * mode.rows * mode.cols, solveSeconds);
      return total;
    });
    setSessionPuzzles((n) => n + 1);

    // Pháo hoa + chúc mừng + đọc tên con vật.
    confetti({ particleCount: 200, spread: 110, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    const tv = window.setTimeout(() => speak(animal.name, LANG_SPEAK_DEFAULT), 400);
    addTimer(tv);

    // Sang con vật kế tiếp.
    const t = window.setTimeout(() => {
      setLevel((lv) => {
        loadLevel(mode);
        return lv + 1;
      });
    }, LEVEL_COMPLETE_DELAY);
    addTimer(t);
  }, [mode, level, recordCompletion, loadLevel]);

  /* ─────────────────────────────────────────────────────────────────────
   * KÉO–THẢ bằng Pointer Events
   * ───────────────────────────────────────────────────────────────────── */

  const onPiecePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, piece: PuzzlePiece) => {
      const g = geoRef.current;
      if (!g || piece.locked || transitioningRef.current) return;
      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const pos = posOf(piece, g); // vị trí hiện tại (khay)
      dragOffsetRef.current = { dx: px - pos.x, dy: py - pos.y };

      dragIdRef.current = piece.id;
      dragPosRef.current = pos;
      setDragId(piece.id);
      setDragPos(pos);

      // setPointerCapture → mọi move/up tiếp theo về đúng phần tử này.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* một số trình duyệt có thể ném — bỏ qua */
      }
      playPop(); // âm "nhấc mảnh"
    },
    [posOf],
  );

  const onPiecePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const id = dragIdRef.current;
    const g = geoRef.current;
    const stage = stageRef.current;
    if (!id || !g || !stage) return;

    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffsetRef.current.dx;
    const y = e.clientY - rect.top - dragOffsetRef.current.dy;
    // Kẹp nhẹ trong khu vực sân khấu để mảnh không lạc ra ngoài.
    const cx = Math.max(-g.pieceW * 0.4, Math.min(g.stageW - g.pieceW * 0.6, x));
    const cy = Math.max(-g.pieceH * 0.4, Math.min(g.stageH - g.pieceH * 0.6, y));
    const next = { x: cx, y: cy };
    dragPosRef.current = next;
    setDragPos(next);
  }, []);

  const onPiecePointerUp = useCallback(() => {
    const id = dragIdRef.current;
    const g = geoRef.current;
    const pos = dragPosRef.current;
    if (!id || !g || !pos) {
      dragIdRef.current = null;
      setDragId(null);
      setDragPos(null);
      return;
    }
    const piece = piecesRef.current.find((p) => p.id === id);

    // Dọn trạng thái kéo trước (mảnh sẽ tự về khay nếu không snap).
    dragIdRef.current = null;
    setDragId(null);
    setDragPos(null);

    if (!piece) return;

    // Tâm mảnh khi thả.
    const center = { x: pos.x + g.pieceW / 2, y: pos.y + g.pieceH / 2 };

    // Nếu thả trong khu vực khung (theo trục y) → tìm ô gần nhất.
    if (center.y < g.board + g.pieceH * 0.3) {
      const nc = Math.max(0, Math.min(g.cols - 1, Math.round((center.x - g.pieceW / 2) / g.pieceW)));
      const nr = Math.max(0, Math.min(g.rows - 1, Math.round((center.y - g.pieceH / 2) / g.pieceH)));
      const slotCenter = { x: nc * g.pieceW + g.pieceW / 2, y: nr * g.pieceH + g.pieceH / 2 };
      const d = Math.hypot(center.x - slotCenter.x, center.y - slotCenter.y);

      if (d < g.pieceW * 0.45) {
        if (nr === piece.r && nc === piece.c) {
          // ===== GHÉP ĐÚNG → snap & khoá =====
          setPiecesSynced((prev) => prev.map((p) => (p.id === id ? { ...p, locked: true } : p)));
          playSfx('snd-correct');
          playTing();

          const newCombo = combo + 1;
          setCombo(newCombo);
          setBestCombo((b) => Math.max(b, newCombo));
          let gained = SCORE_PER_PIECE;
          if (newCombo === COMBO_X3) gained += COMBO_X3_BONUS;
          if (newCombo === COMBO_X5) gained += COMBO_X5_BONUS;
          setScore((s) => s + gained);

          // Sparkle nhỏ ngay tại chỗ.
          confetti({ particleCount: 18, spread: 45, startVelocity: 22, origin: { y: 0.5 }, colors: CONFETTI_COLORS });

          // Đủ mảnh → hoàn thành puzzle.
          const allLocked = piecesRef.current.every((p) => p.id === id || p.locked);
          if (allLocked) completeLevel();
          return;
        }
        // ===== Ô SAI → rung, trả về khay, đứt combo =====
        setCombo(0);
        setWrongId(id);
        playBip();
        const t = window.setTimeout(() => setWrongId((w) => (w === id ? null : w)), 450);
        addTimer(t);
        return;
      }
    }
    // Thả ngoài mọi ô → lặng lẽ trả về khay (không phạt, không đứt combo).
  }, [combo, completeLevel, setPiecesSynced]);

  /* ── Gợi ý: làm sáng một mảnh CHƯA ghép + ô đích của nó ───────────────── */
  const useHint = useCallback(() => {
    if (hintsLeft <= 0 || hintId || transitioning) return;
    const remaining = piecesRef.current.filter((p) => !p.locked && p.id !== dragIdRef.current);
    if (remaining.length === 0) return;
    const target = remaining[Math.floor(Math.random() * remaining.length)];
    setHintId(target.id);
    setHintsLeft((h) => h - 1);
    playPop();
    const t = window.setTimeout(() => setHintId((h) => (h === target.id ? null : h)), HINT_DURATION);
    addTimer(t);
  }, [hintsLeft, hintId, transitioning]);

  /* ── Dữ liệu suy ra (dùng cho màn Bộ sưu tập) ───────────────────────── */
  const achievementCtx: AchievementCtx = { ...stats, animalsUnlocked: animals.size };

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: START
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'start') {
    return (
      <div ref={outerRef} className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>

        <div className="text-center mb-5">
          <div className="text-7xl mb-2 floating">🧩</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500 bg-clip-text text-transparent">
            Ghép Hình Động Vật
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            Kéo các mảnh về đúng chỗ để giúp bạn thú hiện ra nhé!
          </p>
        </div>

        <button
          onClick={() => setPhase('collection')}
          className="w-full mb-4 bg-gradient-to-r from-amber-100 to-pink-100 text-amber-700 font-black text-sm px-3 py-2.5 rounded-2xl active:scale-95 transition-all"
        >
          🏅 Bộ sưu tập ({animals.size}/{TOTAL_ANIMALS} con vật)
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
              <span className="text-white text-xl">▶️</span>
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
        <button
          onClick={() => setPhase('start')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>

        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-500 to-purple-500 bg-clip-text text-transparent">
            Bộ Sưu Tập
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            Đã mở khoá {animals.size}/{TOTAL_ANIMALS} con vật · {stats.puzzles} puzzle hoàn thành
          </p>
        </div>

        {/* Thành tích */}
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

        {/* Sticker động vật tiêu biểu */}
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sticker</h3>
        <div className="grid grid-cols-4 gap-2">
          {STICKERS.map((s) => {
            const got = animals.has(s.animalId);
            return (
              <div
                key={s.animalId}
                onClick={() => got && speak(s.name, LANG_SPEAK_DEFAULT)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 ${
                  got ? 'bg-gradient-to-br from-amber-50 to-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-25'}`}>{got ? s.emoji : '🔒'}</span>
                <span className={`text-[9px] font-bold mt-0.5 ${got ? 'text-slate-600' : 'text-slate-300'}`}>
                  {got ? s.name : '???'}
                </span>
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
    return (
      <div className="text-center py-6 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-2 floating">🧩</div>
        <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500 bg-clip-text text-transparent">
          Hết giờ!
        </h2>
        <p className="text-slate-600 text-sm font-bold mb-4">Chế độ {mode.label}</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm</div>
            <div className="text-2xl font-black text-sky-600">{score}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Puzzle</div>
            <div className="text-2xl font-black text-emerald-600">{sessionPuzzles}</div>
          </div>
          <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Combo</div>
            <div className="text-2xl font-black text-purple-600">{bestCombo}</div>
          </div>
        </div>

        {score >= hs && score > 0 && (
          <div className="inline-block bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-sm px-4 py-1.5 rounded-full mb-4">
            🎉 Kỷ lục mới!
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setPhase('start')}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            🏠 Chế độ
          </button>
          <button
            onClick={() => startMode(mode)}
            className="flex-1 py-4 bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 active:scale-95 transition-all"
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
  if (!mode || !geo) {
    // Trong lúc đo bề rộng / chưa có hình học: vẫn render outerRef để đo được.
    return <div ref={outerRef} className="max-w-md mx-auto min-h-[60vh]" />;
  }

  const animal = animalForLevel(level);
  const lockedCount = pieces.filter((p) => p.locked).length;
  // font-size của bức tranh = ~80% cạnh khung (emoji nằm gọn trong khung).
  const artFont = geo.board * 0.8;

  return (
    <div ref={outerRef} className="max-w-md mx-auto">
      {/* ── Thanh trạng thái ───────────────────────────────────────────── */}
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
          {animal.emoji} {animal.name} · Màn {level}
        </span>
        {mode.timer !== null ? (
          <span
            className={`font-black text-xs px-2.5 py-1 rounded-full ${
              timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-sky-100 text-sky-700'
            }`}
          >
            ⏱️ {fmtTime(timeLeft)}
          </span>
        ) : (
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">
            ⭐ {score}
          </span>
        )}
      </div>

      {/* ── Hàng phụ: điểm (nếu chỗ trên đã hiện giờ) + combo + tiến độ ──── */}
      <div className="flex items-center justify-between mb-2 gap-2">
        {mode.timer !== null && (
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">
            ⭐ {score}
          </span>
        )}
        <span className="bg-emerald-100 text-emerald-700 font-black text-xs px-2.5 py-1 rounded-full">
          🧩 {lockedCount}/{pieces.length}
        </span>
        {combo >= COMBO_X3 && (
          <span className="bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">
            🔥 Combo {combo}
          </span>
        )}
        <span className="text-[11px] font-bold text-slate-400 ml-auto">Kéo mảnh vào khung ☝️</span>
      </div>

      {/* ── SÂN KHẤU: khung ghép (trên) + khay (dưới) ──────────────────── */}
      <div
        ref={stageRef}
        className="relative mx-auto touch-none select-none"
        style={{ width: geo.stageW, height: geo.stageH }}
      >
        {/* Nền khung + silhouette mờ của con vật (gợi ý tổng thể) */}
        <div
          className="absolute rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border-2 border-sky-100 overflow-hidden"
          style={{ left: 0, top: 0, width: geo.board, height: geo.board }}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ fontSize: artFont, opacity: 0.12, filter: 'grayscale(1)' }}
          >
            {animal.emoji}
          </div>
        </div>

        {/* Lưới ô đích (đường kẻ mờ) */}
        {Array.from({ length: geo.rows * geo.cols }, (_, i) => {
          const r = Math.floor(i / geo.cols);
          const c = i % geo.cols;
          const isHintSlot =
            hintId != null && pieces.find((p) => p.id === hintId)?.r === r && pieces.find((p) => p.id === hintId)?.c === c;
          return (
            <div
              key={`slot-${i}`}
              className={`absolute rounded-lg border-2 border-dashed pointer-events-none ${
                isHintSlot ? 'border-amber-400 bg-amber-100/40 animate-pulse' : 'border-sky-200/70'
              }`}
              style={{ left: c * geo.pieceW + 2, top: r * geo.pieceH + 2, width: geo.pieceW - 4, height: geo.pieceH - 4 }}
            />
          );
        })}

        {/* Nhãn khay */}
        <div
          className="absolute text-[10px] font-black text-slate-300 text-center w-full"
          style={{ top: geo.board + 1 }}
        >
          — Khay mảnh ghép —
        </div>

        {/* Các mảnh ghép */}
        {pieces.map((p) => {
          const pos = posOf(p, geo);
          const isDragging = dragId === p.id;
          const isHint = hintId === p.id;
          const isWrong = wrongId === p.id;
          return (
            <div
              key={p.id}
              onPointerDown={(e) => onPiecePointerDown(e, p)}
              onPointerMove={onPiecePointerMove}
              onPointerUp={onPiecePointerUp}
              onPointerCancel={onPiecePointerUp}
              className={`absolute rounded-lg overflow-hidden ${p.locked ? '' : 'cursor-grab active:cursor-grabbing'} ${
                isWrong ? 'shake-x' : ''
              }`}
              style={{
                left: pos.x,
                top: pos.y,
                width: geo.pieceW,
                height: geo.pieceH,
                // Trong lúc kéo: KHÔNG transition để bám ngón tay; ngược lại có
                // transition để snap/return mượt.
                transition: isDragging ? 'none' : 'left 0.2s ease, top 0.2s ease',
                zIndex: isDragging ? 50 : isHint ? 30 : p.locked ? 5 : 10,
                touchAction: 'none',
                boxShadow: isHint
                  ? '0 0 0 3px #fbbf24, 0 0 14px 4px rgba(251,191,36,0.7)'
                  : p.locked
                    ? 'none'
                    : '0 2px 6px rgba(0,0,0,0.15)',
                // Mảnh chưa khoá nổi trên nền trắng để dễ phân biệt với silhouette.
                background: p.locked ? 'transparent' : 'rgba(255,255,255,0.9)',
              }}
            >
              {/* Lát emoji: render con vật cỡ khung rồi dịch để lộ đúng ô (r,c) */}
              <div
                className="flex items-center justify-center"
                style={{
                  width: geo.board,
                  height: geo.board,
                  fontSize: artFont,
                  transform: `translate(${-p.c * geo.pieceW}px, ${-p.r * geo.pieceH}px)`,
                }}
              >
                {animal.emoji}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Nút gợi ý ──────────────────────────────────────────────────── */}
      <button
        onClick={useHint}
        disabled={hintsLeft <= 0 || hintId !== null}
        className="w-full mt-3 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all disabled:opacity-40"
      >
        💡 Gợi ý ({hintsLeft})
      </button>

      {/* ── Banner hoàn thành (con vật nhảy múa) ───────────────────────── */}
      {transitioning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-in zoom-in">
            <div className="text-7xl mb-1 floating">{animal.emoji}</div>
            <div className="text-xl font-black text-slate-700">{animal.name}!</div>
            <div className="text-xs font-bold text-emerald-500 mt-1">+{SCORE_PER_PUZZLE} điểm 🎉</div>
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
