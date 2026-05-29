import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, speak } from '../lib/audio';
import { playMiss, playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Nối Điểm Thần Kỳ"
 *
 * Trò chơi nối số 1→2→...→10 cho bé 3-5 tuổi. Mỗi màn là 10 chấm tròn đánh
 * số rải trên canvas, kết nối theo đúng thứ tự sẽ ra một hình quen thuộc
 * (ngôi sao, trái tim, con cá, ngôi nhà, quả táo). Khi nối xong dòng cuối,
 * polygon tự đóng (10 → 1), tô màu đầy bên trong, hiện emoji khổng lồ +
 * pháo hoa.
 *
 *   - Không phạt khi nối sai → chỉ chấm tiếp theo nhấp nháy gợi ý.
 *   - Hitbox 35px (rộng hơn doc khuyến nghị 25 chút) — bé chạm ngón tay dễ.
 *   - Mỗi lần đúng, đọc to số mới (TTS) → bé vừa nối vừa học đếm.
 *
 * KIẾN TRÚC:
 *   React  : levelIdx, activeDotIndex, phase, passed levels (localStorage).
 *   Canvas : RAF loop để pulse chấm next + rubber-band line theo tay bé.
 *            Pointer Events gộp mouse+touch.
 *
 * TỔ CHỨC FILE:
 *   1. Hằng số.
 *   2. Bộ dữ liệu MÀN CHƠI — 5 hình cơ bản, mỗi hình có 10 điểm chốt.
 *   3. Kiểu dữ liệu + helpers.
 *   4. React component.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ
 * ========================================================================= */

const CANVAS_W = 800;
const CANVAS_H = 500;

// Bán kính vẽ chấm tròn (visual). Doc khuyến nghị 20px đường kính = 10px
// bán kính, ở đây dùng 14 để dễ nhìn + có chỗ vẽ số bên trong.
const DOT_RADIUS = 14;

// Bán kính HITBOX khi check chạm đúng/sai. Doc khuyến nghị 25, dùng 35 để
// bé 3-5 tuổi (chưa chính xác) dễ nối trúng.
const HIT_RADIUS = 35;

// Độ dày nét vẽ.
const LINE_WIDTH = 8;
const RUBBER_LINE_WIDTH = 6;

// Thời lượng nhấp nháy chấm tiếp theo khi bé nối sai (ms).
const BLINK_MS = 700;

// Thời lượng animation hoàn thành (fill polygon + emoji to dần).
const COMPLETE_ANIM_MS = 900;

// localStorage key — danh sách id màn đã thắng (số nguyên).
const STORAGE_KEY = 'lingoland_connectdots_passed';

// Font emoji tường minh cho mọi OS (xem chi tiết ở FeedCountView).
const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', " +
  "'Twemoji Mozilla', 'EmojiOne Color', sans-serif";

const NUM_FONT_FAMILY = "'Nunito', 'Segoe UI', Arial, sans-serif";

// Cộng điểm cho mỗi lần nối đúng (game này nhẹ, mỗi cú đúng +5).
const SCORE_PER_LINK = 5;

/* ===========================================================================
 * 2. BỘ DỮ LIỆU MÀN CHƠI
 *
 * Mỗi level có 10 chấm. Nối lần lượt 1→2→...→10 ra hình. Sau khi nối xong
 * line cuối (9→10), hệ thống tự vẽ thêm line đóng 10→1 + tô màu polygon
 * + hiện emoji to ở chính giữa polygon.
 *
 * Toạ độ chọn sao cho hình NẰM GỌN trong canvas 800x500, có khoảng cách giữa
 * các chấm đủ thoáng (>= 80px) để hitbox không trùng nhau.
 * ========================================================================= */

type Point = { x: number; y: number };

type Level = {
  id: number;
  name: string;
  emoji: string;
  /** Mảng đúng 10 điểm — thứ tự bé phải nối. */
  points: Point[];
  /** Màu đường nối + tô bên trong. */
  lineColor: string;
  fillColor: string;
  /** Gradient Tailwind cho card level selector. */
  gradient: string;
};

const LEVELS: Level[] = [
  // ── Level 1: NGÔI SAO ⭐ ─────────────────────────────────────────────
  // 5 đỉnh ngoài + 5 đỉnh trong xen kẽ, tâm (400, 280).
  {
    id: 1,
    name: 'Ngôi sao',
    emoji: '⭐',
    lineColor: '#f59e0b',
    fillColor: 'rgba(250, 204, 21, 0.85)',
    gradient: 'from-amber-400 via-yellow-500 to-orange-500',
    points: [
      { x: 400, y: 120 }, // 1. đỉnh trên
      { x: 441, y: 223 }, // 2. trong trên-phải
      { x: 552, y: 231 }, // 3. ngoài phải
      { x: 467, y: 302 }, // 4. trong phải
      { x: 494, y: 409 }, // 5. ngoài dưới-phải
      { x: 400, y: 350 }, // 6. trong dưới
      { x: 306, y: 409 }, // 7. ngoài dưới-trái
      { x: 333, y: 302 }, // 8. trong trái
      { x: 248, y: 231 }, // 9. ngoài trái
      { x: 359, y: 223 }, // 10. trong trên-trái
    ],
  },

  // ── Level 2: TRÁI TIM ❤️ ───────────────────────────────────────────
  {
    id: 2,
    name: 'Trái tim',
    emoji: '❤️',
    lineColor: '#ef4444',
    fillColor: 'rgba(239, 68, 68, 0.8)',
    gradient: 'from-rose-400 via-red-500 to-pink-500',
    points: [
      { x: 400, y: 410 }, // 1. đỉnh dưới (mũi tim)
      { x: 500, y: 320 }, // 2. mé phải đi lên
      { x: 555, y: 250 }, // 3. trên-phải
      { x: 520, y: 180 }, // 4. đỉnh bướu phải
      { x: 455, y: 175 }, // 5. giữa bướu phải và lõm
      { x: 400, y: 230 }, // 6. lõm chính giữa
      { x: 345, y: 175 }, // 7. giữa lõm và bướu trái
      { x: 280, y: 180 }, // 8. đỉnh bướu trái
      { x: 245, y: 250 }, // 9. trên-trái
      { x: 300, y: 320 }, // 10. mé trái đi xuống
    ],
  },

  // ── Level 3: QUẢ TÁO 🍎 ────────────────────────────────────────────
  {
    id: 3,
    name: 'Quả táo',
    emoji: '🍎',
    lineColor: '#dc2626',
    fillColor: 'rgba(220, 38, 38, 0.78)',
    gradient: 'from-red-400 via-rose-500 to-pink-600',
    points: [
      { x: 400, y: 140 }, // 1. đỉnh táo
      { x: 470, y: 160 }, // 2. trên-phải
      { x: 530, y: 220 }, // 3. vai phải
      { x: 540, y: 300 }, // 4. má phải
      { x: 490, y: 380 }, // 5. dưới-phải
      { x: 400, y: 410 }, // 6. đáy
      { x: 310, y: 380 }, // 7. dưới-trái
      { x: 260, y: 300 }, // 8. má trái
      { x: 270, y: 220 }, // 9. vai trái
      { x: 330, y: 160 }, // 10. trên-trái
    ],
  },

  // ── Level 4: CON CÁ 🐟 ─────────────────────────────────────────────
  // Cá quay đầu sang PHẢI: thân ở giữa, đuôi bên trái, mõm bên phải.
  {
    id: 4,
    name: 'Con cá',
    emoji: '🐟',
    lineColor: '#0ea5e9',
    fillColor: 'rgba(14, 165, 233, 0.78)',
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    points: [
      { x: 180, y: 280 }, // 1. mép đuôi giữa
      { x: 250, y: 200 }, // 2. đuôi trên
      { x: 320, y: 270 }, // 3. eo trên (nối đuôi-thân)
      { x: 450, y: 200 }, // 4. lưng cá
      { x: 580, y: 240 }, // 5. đỉnh đầu
      { x: 620, y: 290 }, // 6. mõm
      { x: 580, y: 340 }, // 7. dưới đầu
      { x: 450, y: 380 }, // 8. bụng cá
      { x: 320, y: 310 }, // 9. eo dưới
      { x: 250, y: 380 }, // 10. đuôi dưới
    ],
  },

  // ── Level 5: NGÔI NHÀ 🏠 ──────────────────────────────────────────
  // Có cửa hình chữ nhật cắt vào cạnh đáy. Line đóng 10→1 sẽ tạo đường
  // chéo từ góc cửa-trên-trái về góc nhà-dưới-trái — chấp nhận được vì
  // hình vẫn nhận diện rõ là ngôi nhà.
  {
    id: 5,
    name: 'Ngôi nhà',
    emoji: '🏠',
    lineColor: '#16a34a',
    fillColor: 'rgba(22, 163, 74, 0.72)',
    gradient: 'from-emerald-400 via-green-500 to-teal-600',
    points: [
      { x: 270, y: 420 }, // 1. góc dưới-trái nhà
      { x: 270, y: 250 }, // 2. mép trên tường trái
      { x: 200, y: 250 }, // 3. mái hiên trái
      { x: 400, y: 110 }, // 4. đỉnh mái
      { x: 600, y: 250 }, // 5. mái hiên phải
      { x: 530, y: 250 }, // 6. mép trên tường phải
      { x: 530, y: 420 }, // 7. góc dưới-phải nhà
      { x: 450, y: 420 }, // 8. mép dưới cánh cửa phải
      { x: 450, y: 320 }, // 9. mép trên cánh cửa phải
      { x: 360, y: 320 }, // 10. mép trên cánh cửa trái
    ],
  },
];

/* ===========================================================================
 * 3. KIỂU DỮ LIỆU NỘI BỘ + HELPERS
 * ========================================================================= */

type Phase = 'playing' | 'completed';

function dist2(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function loadPassed(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch {
    return new Set();
  }
}
function savePassed(s: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
  } catch {
    // ignore
  }
}

/* ===========================================================================
 * 4. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function ConnectDotsView({ onBack }: Props) {
  const { addScore } = useGame();

  /* ─── React state ──────────────────────────────────────────────────── */

  const [levelIdx, setLevelIdx] = useState(0);
  /**
   * activeDotIndex = INDEX của chấm "đang đứng" — bé sẽ kéo TỪ chấm này
   * đến chấm `activeDotIndex + 1`. Khởi tạo 0 = chấm số 1.
   * Khi đạt `LEVELS[idx].points.length - 1` (= 9) tức là đã nối xong toàn
   * bộ → phase = 'completed'.
   */
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [passed, setPassed] = useState<Set<number>>(() => loadPassed());
  /** Hiển thị/ẩn modal đổi hình (Level Selector). */
  const [pickerOpen, setPickerOpen] = useState(false);

  /* ─── Refs — gameplay state tốc độ cao ────────────────────────────── */

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  /** Vị trí pointer hiện tại — dùng để vẽ rubber-band line theo tay bé. */
  const pointerPosRef = useRef<Point | null>(null);
  /** performance.now() lúc nối SAI gần nhất — để nhấp nháy chấm tiếp theo. */
  const blinkAtRef = useRef(-99999);
  /** performance.now() lúc level vừa hoàn thành — để chạy animation fill. */
  const completedAtRef = useRef(-99999);

  // Mirror state vào ref cho RAF/pointer handlers đọc nhanh.
  const levelRef = useRef<Level>(LEVELS[0]);
  useEffect(() => { levelRef.current = LEVELS[levelIdx]; }, [levelIdx]);
  const activeDotRef = useRef(0);
  useEffect(() => { activeDotRef.current = activeDotIndex; }, [activeDotIndex]);
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* ─── Reset / chọn level ──────────────────────────────────────────── */

  const startLevel = useCallback((idx: number) => {
    setLevelIdx(idx);
    setActiveDotIndex(0);
    setPhase('playing');
    blinkAtRef.current = -99999;
    completedAtRef.current = -99999;
    drawingRef.current = false;
    pointerPosRef.current = null;
    setPickerOpen(false);
    // Đọc to tên hình cho bé biết sắp nối gì.
    window.setTimeout(() => {
      speak(`Hãy nối các số để tạo thành hình ${LEVELS[idx].name}`, LANG_SPEAK_DEFAULT);
    }, 250);
  }, []);

  // Lúc mount: đọc gợi ý cho level mặc định.
  useEffect(() => {
    const t = window.setTimeout(() => {
      speak(`Hãy nối các số để tạo thành hình ${LEVELS[0].name}`, LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, []);

  /* ─── Pointer handlers ────────────────────────────────────────────── */

  const toCanvasPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
      };
    },
    [],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const lvl = levelRef.current;
    const ai = activeDotRef.current;
    // Đã nối hết — không cho phép thao tác thêm.
    if (ai >= lvl.points.length - 1) return;

    const p = toCanvasPoint(e);
    const fromDot = lvl.points[ai];
    if (dist2(p.x, p.y, fromDot.x, fromDot.y) <= HIT_RADIUS * HIT_RADIUS) {
      drawingRef.current = true;
      pointerPosRef.current = p;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    pointerPosRef.current = toCanvasPoint(e);
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }
    drawingRef.current = false;
    const p = toCanvasPoint(e);
    pointerPosRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    const lvl = levelRef.current;
    const ai = activeDotRef.current;
    const nextIdx = ai + 1;
    if (nextIdx >= lvl.points.length) return; // an toàn — không có chấm kế.

    const target = lvl.points[nextIdx];
    const ok = dist2(p.x, p.y, target.x, target.y) <= HIT_RADIUS * HIT_RADIUS;

    if (ok) {
      // ── NỐI ĐÚNG ────────────────────────────────────────────────────
      addScore(SCORE_PER_LINK);
      playTing();
      // Đọc to số chấm vừa nối tới (2, 3, ..., 10) để bé tập đếm.
      speak(String(nextIdx + 1), LANG_SPEAK_DEFAULT);
      const newActive = nextIdx;
      activeDotRef.current = newActive;
      setActiveDotIndex(newActive);

      // Hoàn thành hình → bật phase 'completed' + lưu kỷ lục + pháo hoa.
      if (newActive >= lvl.points.length - 1) {
        completedAtRef.current = performance.now();
        setPhase('completed');
        setPassed((prev) => {
          if (prev.has(lvl.id)) return prev;
          const next = new Set(prev);
          next.add(lvl.id);
          savePassed(next);
          return next;
        });
        confetti({
          particleCount: 220,
          spread: 100,
          origin: { y: 0.45 },
          colors: ['#facc15', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'],
        });
        window.setTimeout(() => speak(`Hoàn thành! Đây là hình ${lvl.name}`, LANG_SPEAK_DEFAULT), 300);
      }
    } else {
      // ── NỐI SAI — không phạt, chỉ nhấp nháy chấm tiếp theo gợi ý ─────
      blinkAtRef.current = performance.now();
      playMiss();
    }
  };

  /* ─── RAF loop — chỉ vẽ, không có physics (tĩnh) ─────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI scaling — chấm tròn + số sắc nét trên Retina.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let rafId = 0;
    const step = () => {
      drawFrame(ctx);
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  // RAF tạo 1 lần lúc mount. State mới đều đọc qua refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Hàm vẽ ──────────────────────────────────────────────────────── */

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = CANVAS_W;
    const h = CANVAS_H;
    const lvl = levelRef.current;
    const ai = activeDotRef.current;
    const isCompleted = phaseRef.current === 'completed';
    const now = performance.now();

    // (a) NỀN — gradient pastel dịu mắt.
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#fef9c3'); // yellow-100
    bg.addColorStop(1, '#dbeafe'); // blue-100
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // (b) HÌNH HOÀN THÀNH — fill polygon + emoji to dần.
    let completeT = 0;
    if (isCompleted) {
      completeT = Math.min(1, (now - completedAtRef.current) / COMPLETE_ANIM_MS);
      // Fill polygon dần dần (alpha → 1 trong COMPLETE_ANIM_MS).
      ctx.save();
      ctx.fillStyle = lvl.fillColor;
      ctx.globalAlpha = completeT;
      ctx.beginPath();
      ctx.moveTo(lvl.points[0].x, lvl.points[0].y);
      for (let i = 1; i < lvl.points.length; i++) {
        ctx.lineTo(lvl.points[i].x, lvl.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // (c) ĐƯỜNG NỐI CỐ ĐỊNH — từ chấm 0 → ai (đã nối thành công).
    ctx.save();
    ctx.strokeStyle = lvl.lineColor;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (ai >= 1) {
      ctx.beginPath();
      ctx.moveTo(lvl.points[0].x, lvl.points[0].y);
      for (let i = 1; i <= ai; i++) {
        ctx.lineTo(lvl.points[i].x, lvl.points[i].y);
      }
      ctx.stroke();
    }
    // Line đóng polygon (10 → 1) — chỉ vẽ khi đã hoàn thành.
    if (isCompleted) {
      ctx.beginPath();
      const last = lvl.points[lvl.points.length - 1];
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(lvl.points[0].x, lvl.points[0].y);
      ctx.stroke();
    }
    ctx.restore();

    // (d) RUBBER-BAND LINE — vẽ đường tạm từ chấm hiện tại tới pointer.
    if (drawingRef.current && pointerPosRef.current && !isCompleted) {
      const from = lvl.points[ai];
      const p = pointerPosRef.current;
      ctx.save();
      ctx.strokeStyle = lvl.lineColor;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = RUBBER_LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    }

    // (e) CÁC CHẤM TRÒN — vẽ sau line để chấm nằm trên line.
    for (let i = 0; i < lvl.points.length; i++) {
      const p = lvl.points[i];
      const num = i + 1;
      const isDone = i <= ai;
      const isCurrent = i === ai && !isCompleted;
      const isNext = i === ai + 1 && !isCompleted;

      // Halo nhấp nháy quanh chấm KẾ TIẾP — luôn có (gợi ý nhẹ), MẠNH HƠN
      // nếu vừa nối sai trong BLINK_MS gần đây.
      if (isNext) {
        const blinkElapsed = now - blinkAtRef.current;
        const isBlinking = blinkElapsed < BLINK_MS;
        const t = now / 1000;
        // Halo "thường" — pulse nhẹ 12%.
        const idle = 1 + Math.sin(t * 4) * 0.12;
        // Halo "nhấp nháy" — pulse 30% trong BLINK_MS.
        const blink = isBlinking
          ? 1 + Math.sin(blinkElapsed / 30) * 0.30 * (1 - blinkElapsed / BLINK_MS)
          : 1;
        const haloScale = isBlinking ? Math.max(idle, blink) : idle;
        ctx.save();
        ctx.globalAlpha = isBlinking ? 0.55 : 0.35;
        ctx.fillStyle = isBlinking ? '#ef4444' : lvl.lineColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, DOT_RADIUS * 2.4 * haloScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Chấm chính.
      ctx.save();
      if (isDone) {
        // Đã nối — xanh lá rực, viền xanh đậm.
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#15803d';
      } else if (isCurrent) {
        // Đang đứng — vàng rực, viền cam.
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#b45309';
      } else {
        // Chưa tới — trắng nền, viền theo màu line.
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = lvl.lineColor;
      }
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Số bên trong chấm (cho chấm chưa nối) hoặc ✓ (cho chấm đã nối).
      if (isDone && !isCurrent && i !== ai) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 14px ${NUM_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', p.x, p.y + 1);
      } else {
        ctx.fillStyle = isCurrent ? '#7c2d12' : '#0f172a';
        ctx.font = `900 16px ${NUM_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(num), p.x, p.y + 1);
      }
      ctx.restore();

      // Nhãn số PHỤ bên cạnh chấm — to hơn, dễ đọc với bé.
      // Vẽ chếch xuống-phải so với chấm để không che line.
      if (!isCompleted) {
        ctx.save();
        ctx.fillStyle = isDone ? 'rgba(22, 101, 52, 0.55)' : '#0f172a';
        ctx.font = `900 20px ${NUM_FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        const lx = p.x + DOT_RADIUS + 4;
        const ly = p.y + DOT_RADIUS - 4;
        ctx.strokeText(String(num), lx, ly);
        ctx.fillText(String(num), lx, ly);
        ctx.restore();
      }
    }

    // (f) EMOJI KHỔNG LỒ Ở GIỮA POLYGON — khi hoàn thành.
    if (isCompleted) {
      const cx = lvl.points.reduce((s, p) => s + p.x, 0) / lvl.points.length;
      const cy = lvl.points.reduce((s, p) => s + p.y, 0) / lvl.points.length;
      // Scale từ 0 → 1 với easing back.easeOut.
      const t = completeT;
      const ease = 1 + Math.sin(t * Math.PI * 0.5 + Math.PI) * 0.5; // 0→1
      const overshoot = 1 - Math.pow(1 - ease, 3); // smoothing
      const scale = overshoot * (t > 0.85 ? 1 + Math.sin((now / 1000) * 4) * 0.05 : 1);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.font = `200px ${EMOJI_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lvl.emoji, 0, 10);
      ctx.restore();
    }
  }, []);

  /* ─── JSX ─────────────────────────────────────────────────────────── */

  const lvl = LEVELS[levelIdx];
  const dotsLinked = activeDotIndex; // số đường đã nối thành công

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Thanh trên */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          ✨ Nối Điểm Thần Kỳ
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          🏆 {passed.size} / {LEVELS.length}
        </div>
      </div>

      {/* HUD: hình hiện tại · tiến độ */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Hình
          </div>
          <div className="text-2xl font-black leading-none">
            {lvl.emoji} {lvl.name}
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Đã nối
          </div>
          <div className="text-2xl font-black">
            {dotsLinked}
            <span className="opacity-60 text-sm"> / {lvl.points.length - 1}</span>
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Tiếp theo
          </div>
          <div className="text-2xl font-black">
            {phase === 'completed' ? '🎉' : `Số ${dotsLinked + 2 <= lvl.points.length ? dotsLinked + 2 : '✓'}`}
          </div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="relative rounded-3xl overflow-hidden border-4 border-amber-300 shadow-lg shadow-amber-100 bg-amber-50">
        <canvas
          ref={canvasRef}
          className="block w-full aspect-[8/5] touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        />
        {/* Pop-up CHÚC MỪNG khi hoàn thành — nửa trong suốt, không chặn click */}
        {phase === 'completed' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-white/95 border-4 border-yellow-300 rounded-3xl px-6 py-3 shadow-xl animate-in zoom-in duration-300">
              <div className="text-2xl font-black bg-gradient-to-r from-pink-500 via-amber-500 to-emerald-500 bg-clip-text text-transparent text-center">
                🎉 Hoàn thành {lvl.name}!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nút điều khiển TO — CHƠI LẠI + ĐỔI HÌNH (siêu to, dễ chạm) */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => startLevel(levelIdx)}
          className="py-4 bg-gradient-to-br from-sky-500 to-indigo-500 text-white rounded-2xl font-black text-base shadow-md active:scale-95 transition-all"
        >
          🔄 Chơi lại
        </button>
        <button
          onClick={() => setPickerOpen(true)}
          className="py-4 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl font-black text-base shadow-md active:scale-95 transition-all"
        >
          🖼️ Đổi hình
        </button>
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Kéo từ số 1 đến số 2, rồi tiếp tục đến hết · Bấm sai không sao, thử lại nhé!
      </p>

      {/* Modal chọn hình */}
      {pickerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-5 max-w-md w-full animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-black text-slate-800">🖼️ Chọn hình</div>
              <button
                onClick={() => setPickerOpen(false)}
                className="text-slate-400 font-bold text-sm hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {LEVELS.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => startLevel(idx)}
                  className={`p-4 bg-gradient-to-br ${l.gradient} text-white rounded-2xl shadow-md active:scale-95 transition-all flex flex-col items-center gap-1 relative`}
                >
                  {passed.has(l.id) && (
                    <span className="absolute top-2 right-2 text-xs bg-white text-emerald-700 font-black px-2 py-0.5 rounded-full shadow-sm">
                      ✓
                    </span>
                  )}
                  <div className="text-5xl">{l.emoji}</div>
                  <div className="font-black text-sm leading-tight">{l.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
