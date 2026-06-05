/* ──────────────────────────────────────────────────────────────────────────
 * GAME "BÉ VIẾT CHỮ THẦN TỐC" — Học Viện Chữ Cái (Game Island)
 *
 * Bé luyện viết chữ cái / từ / câu bằng cách TÔ THEO chữ mờ trên canvas. Hệ
 * thống chấm "độ chính xác" (accuracy) → sao, điểm, combo. Có gợi ý 💡, thành
 * tích, sticker và BẢNG PHỤ HUYNH (thời gian học, độ chính xác TB, chữ còn yếu).
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva + stroke template từng chữ. Repo dùng Canvas 2D
 *     (xem TracerKidsView) và không tự vẽ template cho 29+29 chữ + 200 từ.
 *   - "ACCURACY ENGINE theo độ phủ glyph": chữ đích được render bằng font rồi
 *     LẤY MẪU pixel "mực" vào một lưới ô. Nét bé tô cũng đánh dấu các ô. Chấm:
 *         coverage  = % ô-chữ được bé tô trùm  (tô đủ chữ chưa?)
 *         precision = % nét bé nằm trên chữ     (có bám chữ không, hay vẽ bậy?)
 *         accuracy  = 0.65·coverage + 0.35·precision
 *     → áp dụng cho BẤT KỲ chữ/từ/câu nào, không cần template, mở rộng vô hạn.
 *
 *   - React: state game (mode, item, score, combo, hint, stats). Canvas: vẽ chữ
 *     mờ hướng dẫn + nét bút của bé + con trỏ ✏️ (vòng lặp requestAnimationFrame).
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_writeletter_stats    : JSON WriteStats (cho thành tích + bảng PH)
 *   - lingoland_writeletter_alphabet : JSON string[] — chữ HOA đã viết đạt
 *   - lingoland_writeletter_weak     : JSON Record<char,{sum,count}> — chữ còn yếu
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
  UPPER_LETTERS,
  LOWER_LETTERS,
  LETTER_INFO,
  WORDS,
  SENTENCES,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_LETTERS,
  starsForAccuracy,
  type ModeDef,
  type ModeKind,
  type WriteStats,
  type AchievementCtx,
} from '../data/writeLetterData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'start' | 'writing' | 'parent' | 'collection';

/* ── Hằng số canvas + lưới chấm điểm ───────────────────────────────────── */
const CANVAS_W = 800;
const CANVAS_H = 420;
const CELL = 20; // cạnh ô lưới (logical px) — cũng là "độ tha thứ" khi bám nét
const GCOLS = CANVAS_W / CELL; // 40
const GROWS = CANVAS_H / CELL; // 21
const PEN_WIDTH = 22; // bề rộng nét bút của bé
const PEN_COLOR = '#4f46e5'; // indigo-600

const STATS_KEY = 'lingoland_writeletter_stats';
const ALPHABET_KEY = 'lingoland_writeletter_alphabet';
const WEAK_KEY = 'lingoland_writeletter_weak';

const CONFETTI_COLORS = ['#7dd3fc', '#a7f3d0', '#fde68a', '#f9a8d4', '#c4b5fd'];

const {
  INITIAL_HINTS,
  SCORE_PASS,
  SCORE_EXCELLENT_BONUS,
  SCORE_LESSON_COMPLETE,
  COMBO_N,
  COMBO_BONUS,
  HINT_DURATION,
  PASS_ACCURACY,
  EXCELLENT_ACCURACY,
  COMBO_ACCURACY,
  AUTO_COMPLETE_COVERAGE,
  ADVANCE_DELAY,
} = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): WriteStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return {
      lessonsDone: p?.lessonsDone || 0,
      wordsDone: p?.wordsDone || 0,
      excellentCount: p?.excellentCount || 0,
      accSum: p?.accSum || 0,
      accCount: p?.accCount || 0,
      timeMs: p?.timeMs || 0,
    };
  } catch {
    return { lessonsDone: 0, wordsDone: 0, excellentCount: 0, accSum: 0, accCount: 0, timeMs: 0 };
  }
};
const saveStats = (s: WriteStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

const loadAlphabet = (): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(ALPHABET_KEY) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveAlphabet = (s: Set<string>) => {
  try {
    localStorage.setItem(ALPHABET_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

type WeakMap = Record<string, { sum: number; count: number }>;
const loadWeak = (): WeakMap => {
  try {
    const p = JSON.parse(localStorage.getItem(WEAK_KEY) ?? '{}');
    return p && typeof p === 'object' ? (p as WeakMap) : {};
  } catch {
    return {};
  }
};
const saveWeak = (m: WeakMap) => {
  try {
    localStorage.setItem(WEAK_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};

/* ===========================================================================
 * Tiện ích lưới ô
 * ========================================================================= */

type Point = { x: number; y: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Khoá ô (số) chứa điểm (x,y). */
const cellKey = (x: number, y: number): number => {
  const cx = clamp(Math.floor(x / CELL), 0, GCOLS - 1);
  const cy = clamp(Math.floor(y / CELL), 0, GROWS - 1);
  return cy * GCOLS + cx;
};

/** Ô `key` hoặc một trong 8 ô lân cận có nằm trong `set` không? (độ tha thứ 1 ô) */
const neighborHit = (set: Set<number>, key: number): boolean => {
  const cx = key % GCOLS;
  const cy = Math.floor(key / GCOLS);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= GCOLS || ny < 0 || ny >= GROWS) continue;
      if (set.has(ny * GCOLS + nx)) return true;
    }
  }
  return false;
};

/** Mô tả một item luyện viết. */
interface Item {
  display: string; // chuỗi hiển thị/tô
  speak: string; // câu đọc TTS
  emoji?: string; // emoji minh hoạ (learn/word)
  example?: string; // từ ví dụ (learn)
  isLetter: boolean; // là 1 chữ cái đơn?
  upper?: string; // dạng HOA (để ghi nhận "đã học chữ X")
}

/** Lấy danh sách item theo chế độ. */
function itemsForMode(kind: ModeKind): Item[] {
  switch (kind) {
    case 'learn':
      return UPPER_LETTERS.map((L) => ({
        display: L,
        speak: LETTER_INFO[L].name,
        emoji: LETTER_INFO[L].emoji,
        example: LETTER_INFO[L].example,
        isLetter: true,
        upper: L,
      }));
    case 'upper':
      return UPPER_LETTERS.map((L) => ({ display: L, speak: LETTER_INFO[L].name, isLetter: true, upper: L }));
    case 'lower':
      return LOWER_LETTERS.map((l, i) => ({
        display: l,
        speak: LETTER_INFO[UPPER_LETTERS[i]].name,
        isLetter: true,
        upper: UPPER_LETTERS[i],
      }));
    case 'word':
      return WORDS.map((w) => ({ display: w.text, speak: w.read, emoji: w.emoji, isLetter: false }));
    case 'sentence':
      return SENTENCES.map((s) => ({ display: s.text, speak: s.read, isLetter: false }));
  }
}

export default function WriteLetterView({ onBack }: Props) {
  /* ── Điều hướng ───────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>('start');
  const [mode, setMode] = useState<ModeDef | null>(null);
  const items = useMemo<Item[]>(() => (mode ? itemsForMode(mode.id) : []), [mode]);
  const [itemIndex, setItemIndex] = useState(0);

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hintsLeft, setHintsLeft] = useState<number>(INITIAL_HINTS);
  const [hintActive, setHintActive] = useState(false);
  const [coverage, setCoverage] = useState(0); // %độ phủ hiện tại (cho thanh đo)
  const [resultInfo, setResultInfo] = useState<{ acc: number; stars: number; pass: boolean } | null>(null);

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<WriteStats>(loadStats());
  const alphabetRef = useRef<Set<string>>(loadAlphabet());
  const weakRef = useRef<WeakMap>(loadWeak());
  const [stats, setStats] = useState<WriteStats>(() => statsRef.current);
  const [alphabet, setAlphabet] = useState<Set<string>>(() => alphabetRef.current);
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Refs canvas / nét vẽ / accuracy engine ──────────────────────────── */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<Point[][]>([]); // các polyline bé đã vẽ (để render)
  const userCellsRef = useRef<Set<number>>(new Set()); // ô bé đã tô
  const cursorRef = useRef<Point | null>(null);
  const inkCellsRef = useRef<Set<number>>(new Set()); // ô "mực" của chữ đích
  const targetFontRef = useRef(200); // cỡ font chữ đích (đã fit theo bề rộng)
  const phaseRef = useRef<Phase>('start'); // cho vòng RAF
  const hintActiveRef = useRef(false);
  const itemStartRef = useRef(0); // mốc thời gian bắt đầu item (đo thời gian học)
  const evaluatingRef = useRef(false); // đang ở overlay kết quả → khoá input

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  // Đồng bộ ref dùng trong RAF.
  phaseRef.current = phase;
  hintActiveRef.current = hintActive;

  const current: Item | undefined = items[itemIndex];

  /* ─────────────────────────────────────────────────────────────────────
   * ACCURACY ENGINE — dựng "ô mực" của chữ đích bằng cách render rồi lấy mẫu
   * ───────────────────────────────────────────────────────────────────── */
  const buildTargetInk = useCallback((text: string) => {
    const off = document.createElement('canvas');
    off.width = CANVAS_W;
    off.height = CANVAS_H;
    const ctx = off.getContext('2d');
    const inkCells = new Set<number>();
    if (!ctx) {
      inkCellsRef.current = inkCells;
      return;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Fit cỡ font: cao tối đa ~78% canvas, rộng tối đa ~88% canvas.
    let size = Math.min(300, Math.floor(CANVAS_H * 0.78));
    for (; size > 40; size -= 6) {
      ctx.font = `900 ${size}px 'Nunito', 'Segoe UI', sans-serif`;
      if (ctx.measureText(text).width <= CANVAS_W * 0.88) break;
    }
    targetFontRef.current = size;

    ctx.fillStyle = '#000';
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);

    // Lấy mẫu: với mỗi ô, kiểm vài điểm bên trong; có pixel mực → ô "mực".
    const img = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
    const isInk = (px: number, py: number) => img[(py * CANVAS_W + px) * 4 + 3] > 64;
    for (let cy = 0; cy < GROWS; cy++) {
      for (let cx = 0; cx < GCOLS; cx++) {
        const bx = cx * CELL;
        const by = cy * CELL;
        if (
          isInk(bx + CELL / 2, by + CELL / 2) ||
          isInk(bx + 5, by + 5) ||
          isInk(bx + CELL - 5, by + 5) ||
          isInk(bx + 5, by + CELL - 5) ||
          isInk(bx + CELL - 5, by + CELL - 5)
        ) {
          inkCells.add(cy * GCOLS + cx);
        }
      }
    }
    inkCellsRef.current = inkCells;
  }, []);

  /** %độ phủ: phần ô-chữ được bé tô trùm (có nét bé trong vùng lân cận). */
  const computeCoverage = useCallback((): number => {
    const ink = inkCellsRef.current;
    const user = userCellsRef.current;
    if (ink.size === 0) return 0;
    let covered = 0;
    ink.forEach((c) => {
      if (neighborHit(user, c)) covered++;
    });
    return covered / ink.size;
  }, []);

  /** %độ bám: phần nét bé nằm trên/sát chữ (không vẽ lung tung ra ngoài). */
  const computePrecision = useCallback((): number => {
    const ink = inkCellsRef.current;
    const user = userCellsRef.current;
    if (user.size === 0) return 0;
    let onInk = 0;
    user.forEach((c) => {
      if (neighborHit(ink, c)) onInk++;
    });
    return onInk / user.size;
  }, []);

  /* ── Reset nét vẽ cho item mới ───────────────────────────────────────── */
  const resetWriting = useCallback(() => {
    strokesRef.current = [];
    userCellsRef.current = new Set();
    cursorRef.current = null;
    drawingRef.current = false;
    evaluatingRef.current = false;
    setCoverage(0);
    setResultInfo(null);
    setHintsLeft(INITIAL_HINTS);
    setHintActive(false);
  }, []);

  /* ── Khi đổi item: dựng chữ đích, reset, đọc mẫu ─────────────────────── */
  useEffect(() => {
    if (phase !== 'writing' || !current) return;
    buildTargetInk(current.display);
    resetWriting();
    itemStartRef.current = Date.now();
    const t = window.setTimeout(() => speak(current.speak, LANG_SPEAK_DEFAULT), 300);
    addTimer(t);
  }, [phase, itemIndex, current, buildTargetInk, resetWriting]);

  /* ── Toast mở khoá ────────────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);

  /* ── Ghi nhận kết quả 1 lượt viết (cập nhật thống kê + thành tích) ───── */
  const recordResult = useCallback(
    (item: Item, acc: number, elapsedMs: number) => {
      const prevStats = statsRef.current;
      const prevCtx: AchievementCtx = { ...prevStats, alphabetSize: alphabetRef.current.size };

      // Số "từ" tăng theo chế độ (câu = số tiếng trong câu).
      const wordDelta = item.isLetter ? 0 : item.display.trim().split(/\s+/).length;

      const nextStats: WriteStats = {
        lessonsDone: prevStats.lessonsDone + 1,
        wordsDone: prevStats.wordsDone + wordDelta,
        excellentCount: prevStats.excellentCount + (acc >= 95 ? 1 : 0),
        accSum: prevStats.accSum + acc,
        accCount: prevStats.accCount + 1,
        timeMs: prevStats.timeMs + elapsedMs,
      };
      statsRef.current = nextStats;
      setStats(nextStats);
      saveStats(nextStats);

      // Ghi nhận chữ HOA đã học (cho thành tích "đủ bảng chữ cái").
      if (item.isLetter && item.upper) {
        const next = new Set(alphabetRef.current);
        next.add(item.upper);
        alphabetRef.current = next;
        setAlphabet(next);
        saveAlphabet(next);
      }

      // Cập nhật "chữ còn yếu" (chỉ với chữ cái đơn) cho bảng phụ huynh.
      if (item.isLetter) {
        const w = { ...weakRef.current };
        const key = item.display;
        const e = w[key] ?? { sum: 0, count: 0 };
        w[key] = { sum: e.sum + acc, count: e.count + 1 };
        weakRef.current = w;
        saveWeak(w);
      }

      // Phát hiện achievement/sticker mới mở khoá.
      const nextCtx: AchievementCtx = { ...nextStats, alphabetSize: alphabetRef.current.size };
      const newAch = ACHIEVEMENTS.find((a) => !a.unlocked(prevCtx) && a.unlocked(nextCtx));
      if (newAch) {
        showToast(newAch.emoji, `Mở khoá: ${newAch.name}`);
      } else {
        const newStk = STICKERS.find((s) => !s.unlocked(prevCtx) && s.unlocked(nextCtx));
        if (newStk) showToast(newStk.emoji, `Sticker mới: ${newStk.name}`);
      }
    },
    [showToast],
  );

  /* ── Sang item kế tiếp / hoàn thành chế độ ───────────────────────────── */
  const advance = useCallback(() => {
    setResultInfo(null);
    evaluatingRef.current = false;
    if (itemIndex + 1 < items.length) {
      setItemIndex((i) => i + 1);
    } else {
      // Hết danh sách → hoàn thành chế độ.
      setScore((s) => s + SCORE_LESSON_COMPLETE);
      confetti({ particleCount: 220, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
      speak('Hoàn thành bài học! Bé giỏi quá!', LANG_SPEAK_DEFAULT);
      const t = window.setTimeout(() => setPhase('start'), 1600);
      addTimer(t);
    }
  }, [itemIndex, items.length]);

  /* ── Chấm điểm lượt viết hiện tại ────────────────────────────────────── */
  const finalize = useCallback(() => {
    if (!current || evaluatingRef.current) return;
    evaluatingRef.current = true;

    const cov = computeCoverage();
    const prec = computePrecision();
    const acc = Math.round(100 * (0.65 * cov + 0.35 * prec));
    const stars = starsForAccuracy(acc);
    const pass = acc >= PASS_ACCURACY;
    setResultInfo({ acc, stars, pass });

    if (pass) {
      playSfx('snd-correct');
      playTing();
      const elapsed = Date.now() - itemStartRef.current;
      recordResult(current, acc, elapsed);

      // Điểm + combo.
      const newCombo = acc >= COMBO_ACCURACY ? combo + 1 : 0;
      setCombo(newCombo);
      let gained = SCORE_PASS;
      if (acc >= EXCELLENT_ACCURACY) gained += SCORE_EXCELLENT_BONUS;
      if (newCombo > 0 && newCombo % COMBO_N === 0) gained += COMBO_BONUS;
      setScore((s) => s + gained);

      // Particle theo mức sao.
      confetti({
        particleCount: stars >= 3 ? 160 : 70,
        spread: stars >= 3 ? 110 : 70,
        origin: { y: 0.5 },
        colors: CONFETTI_COLORS,
      });
      speak(stars >= 3 ? 'Xuất sắc!' : stars >= 2 ? 'Tốt lắm!' : 'Đạt rồi!', LANG_SPEAK_DEFAULT);

      // Sang chữ kế tiếp.
      const t = window.setTimeout(advance, ADVANCE_DELAY);
      addTimer(t);
    } else {
      // Chưa đạt → khích lệ tô thêm, cho làm lại (không trừ gì).
      playBip();
      setCombo(0);
      speak('Tô thêm một chút nữa nhé!', LANG_SPEAK_DEFAULT);
      const t = window.setTimeout(() => {
        // Xoá nét cũ để bé tô lại từ đầu.
        strokesRef.current = [];
        userCellsRef.current = new Set();
        setCoverage(0);
        setResultInfo(null);
        evaluatingRef.current = false;
      }, 1400);
      addTimer(t);
    }
  }, [current, combo, computeCoverage, computePrecision, recordResult, advance]);

  /* ── Bắt đầu một chế độ ───────────────────────────────────────────────── */
  const startMode = useCallback((m: ModeDef) => {
    clearTimers();
    setMode(m);
    setItemIndex(0);
    setScore(0);
    setCombo(0);
    setPhase('writing');
  }, [clearTimers]);

  /* ─────────────────────────────────────────────────────────────────────
   * POINTER HANDLERS — chung chuột + cảm ứng + bút cảm ứng
   * ───────────────────────────────────────────────────────────────────── */
  const toCanvasPoint = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const addPoint = (p: Point) => {
    const cur = strokesRef.current[strokesRef.current.length - 1];
    if (cur) cur.push(p);
    userCellsRef.current.add(cellKey(p.x, p.y));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'writing' || evaluatingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvasPoint(e);
    cursorRef.current = p;
    drawingRef.current = true;
    strokesRef.current.push([p]); // mở polyline mới
    userCellsRef.current.add(cellKey(p.x, p.y));
    playPop();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = toCanvasPoint(e);
    cursorRef.current = p;
    if (!drawingRef.current || phaseRef.current !== 'writing' || evaluatingRef.current) return;
    addPoint(p);
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Cập nhật thanh đo độ phủ; nếu đã tô gần đủ → tự động chấm.
    const cov = computeCoverage();
    setCoverage(cov);
    if (cov >= AUTO_COMPLETE_COVERAGE && phaseRef.current === 'writing' && !evaluatingRef.current) {
      finalize();
    }
  };

  /* ── Nút điều khiển ──────────────────────────────────────────────────── */
  const handleClear = () => {
    if (evaluatingRef.current) return;
    strokesRef.current = [];
    userCellsRef.current = new Set();
    setCoverage(0);
  };
  const handleDone = () => {
    if (phaseRef.current === 'writing' && !evaluatingRef.current) finalize();
  };
  const useHint = useCallback(() => {
    if (hintsLeft <= 0 || hintActive || evaluatingRef.current) return;
    setHintActive(true);
    setHintsLeft((h) => h - 1);
    if (current) speak(current.speak, LANG_SPEAK_DEFAULT);
    const t = window.setTimeout(() => setHintActive(false), HINT_DURATION);
    addTimer(t);
  }, [hintsLeft, hintActive, current]);

  /* ─────────────────────────────────────────────────────────────────────
   * VÒNG LẶP VẼ CANVAS
   * ───────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== 'writing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    let rafId = 0;
    const draw = () => {
      // 1. Nền giấy ô ly nhẹ.
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.lineWidth = 1;
      // đường kẻ ngang giữa (dòng kẻ tập viết)
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H / 2);
      ctx.lineTo(CANVAS_W, CANVAS_H / 2);
      ctx.stroke();

      // 2. Chữ mờ hướng dẫn (đậm hơn khi đang gợi ý).
      const text = current?.display ?? '';
      if (text) {
        ctx.save();
        ctx.font = `900 ${targetFontRef.current}px 'Nunito', 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const strong = hintActiveRef.current;
        ctx.fillStyle = strong ? 'rgba(99,102,241,0.30)' : 'rgba(100,116,139,0.16)';
        ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]); // nét đứt để bé tô theo
        ctx.strokeStyle = strong ? 'rgba(79,70,229,0.7)' : 'rgba(100,116,139,0.35)';
        ctx.strokeText(text, CANVAS_W / 2, CANVAS_H / 2);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 3. Nét bút của bé.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = PEN_WIDTH;
      ctx.strokeStyle = PEN_COLOR;
      ctx.fillStyle = PEN_COLOR;
      for (const stroke of strokesRef.current) {
        if (stroke.length === 0) continue;
        if (stroke.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke[0].x, stroke[0].y, PEN_WIDTH / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 4. Con trỏ bút ✏️.
      const c = cursorRef.current;
      if (c) {
        ctx.save();
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✏️', c.x + 8, c.y - 12);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [phase, current]);

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const achievementCtx: AchievementCtx = { ...stats, alphabetSize: alphabet.size };
  const avgAccuracy = stats.accCount > 0 ? Math.round(stats.accSum / stats.accCount) : 0;

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: START
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
          <div className="text-7xl mb-2 floating">✍️</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Bé Viết Chữ Thần Tốc
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-xs mx-auto leading-relaxed">
            Chào mừng đến Học Viện Chữ Cái! Tô theo chữ mờ để luyện viết nhé.
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

        <div className="space-y-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => startMode(m)}
              className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left bg-gradient-to-br ${m.gradient}`}
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/25 flex items-center justify-center text-3xl font-black text-white">
                {m.emoji}
              </div>
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
   * SCREEN: COLLECTION (thành tích + sticker)
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
            Bảng Vinh Danh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            {stats.lessonsDone} bài · {alphabet.size}/{TOTAL_LETTERS} chữ cái · TB {avgAccuracy}%
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
    // Tính các chữ còn yếu: trung bình accuracy thấp nhất (đã viết ≥1 lần).
    const weakList = Object.entries(weakRef.current)
      .map(([ch, e]) => ({ ch, avg: Math.round(e.sum / e.count), count: e.count }))
      .filter((x) => x.avg < 70)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 6);
    const minutes = Math.round(stats.timeMs / 60000);

    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button
          onClick={() => setPhase('start')}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Bảng Phụ Huynh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">Theo dõi tiến độ học của bé</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian học</div>
            <div className="text-2xl font-black text-sky-600">{minutes} phút</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Bài hoàn thành</div>
            <div className="text-2xl font-black text-emerald-600">{stats.lessonsDone}</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Chính xác TB</div>
            <div className="text-2xl font-black text-amber-600">{avgAccuracy}%</div>
          </div>
          <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Chữ đã học</div>
            <div className="text-2xl font-black text-purple-600">
              {alphabet.size}/{TOTAL_LETTERS}
            </div>
          </div>
        </div>

        {/* Thanh tiến độ bảng chữ cái */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
            <span>Tiến độ bảng chữ cái</span>
            <span>{Math.round((alphabet.size / TOTAL_LETTERS) * 100)}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all"
              style={{ width: `${(alphabet.size / TOTAL_LETTERS) * 100}%` }}
            />
          </div>
        </div>

        {/* Các chữ còn yếu */}
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Chữ còn yếu</h3>
        {weakList.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-bold py-4 bg-slate-50 rounded-2xl">
            Chưa có dữ liệu — hoặc bé viết chữ nào cũng tốt! 🎉
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weakList.map((w) => (
              <div
                key={w.ch}
                className="flex items-center gap-2 bg-rose-50 border-2 border-rose-200 rounded-2xl px-3 py-2"
              >
                <span className="text-2xl font-black text-rose-600">{w.ch}</span>
                <div className="text-[10px] font-bold text-rose-400 leading-tight">
                  {w.avg}%<br />
                  {w.count} lần
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: WRITING
   * ════════════════════════════════════════════════════════════════════ */
  if (!mode || !current) return null;

  const coveragePct = Math.round(coverage * 100);

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* ── Thanh trạng thái ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2 gap-2">
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
          {mode.emoji} {mode.label} · {itemIndex + 1}/{items.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">
            ⭐ {score}
          </span>
          {combo >= 2 && (
            <span className="bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">
              🔥 {combo}
            </span>
          )}
        </div>
      </div>

      {/* ── Thẻ chữ đang học (+ ví dụ nếu chế độ Học Chữ Cái) ───────────── */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center text-4xl font-black shadow-md">
          {current.display}
        </div>
        <div className="flex-1">
          {current.example ? (
            <div className="text-sm font-black text-slate-700">
              {current.emoji} {current.display} như trong "{current.example}"
            </div>
          ) : (
            <div className="text-sm font-black text-slate-700">
              {current.emoji ? `${current.emoji} ` : ''}Tô theo nét chữ mờ nhé!
            </div>
          )}
          {/* Thanh đo độ phủ (tiến độ tô) */}
          <div className="mt-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full transition-all duration-200"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
          <div className="text-[10px] font-bold text-slate-400 mt-0.5">Đã tô {coveragePct}%</div>
        </div>
        {/* Nút nghe đọc lại */}
        <button
          type="button"
          onClick={() => speak(current.speak, LANG_SPEAK_DEFAULT)}
          aria-label="Nghe đọc"
          className="w-11 h-11 rounded-full bg-sky-50 border-2 border-sky-200 flex items-center justify-center active:scale-95 text-sky-500 text-xl"
        >
          🔊
        </button>
      </div>

      {/* ── CANVAS viết ────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border-4 border-indigo-200 shadow-lg shadow-indigo-100">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        />

        {/* Overlay kết quả (sao + accuracy) */}
        {resultInfo && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm animate-in fade-in">
            <div className="text-center">
              {resultInfo.pass ? (
                <>
                  <div className="flex justify-center gap-1 mb-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`text-5xl ${i < resultInfo.stars ? '' : 'grayscale opacity-25'}`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  <div className="text-2xl font-black text-emerald-600">{resultInfo.acc}%</div>
                  <div className="text-sm font-bold text-slate-500">
                    {resultInfo.acc >= EXCELLENT_ACCURACY ? 'Xuất sắc! 🎉' : resultInfo.acc >= 70 ? 'Tốt lắm!' : 'Đạt rồi!'}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-1">✏️</div>
                  <div className="text-lg font-black text-slate-700">Tô thêm chút nữa nhé!</div>
                  <div className="text-sm font-bold text-slate-400">Mới được {resultInfo.acc}%</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Nút điều khiển ─────────────────────────────────────────────── */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={handleClear}
          className="py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm active:scale-95 transition-all"
        >
          🧽 Xoá
        </button>
        <button
          onClick={useHint}
          disabled={hintsLeft <= 0 || hintActive}
          className="py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-40"
        >
          💡 Gợi ý ({hintsLeft})
        </button>
        <button
          onClick={handleDone}
          className="py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all"
        >
          ✓ Xong
        </button>
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-2 leading-relaxed">
        Dùng ngón tay hoặc bút cảm ứng tô đè lên chữ mờ · Tô đủ chữ sẽ tự chấm điểm! ✨
      </p>

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
