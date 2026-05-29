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
import { playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Cân Trái Cây — Tập Đếm Sức Nặng"
 *
 * Trò chơi tập ĐẾM bằng MÔ HÌNH CÂN BẬP BÊNH cho bé 3-5 tuổi.
 *
 * Cốt truyện: Cân 2 đĩa cổ điển. Đĩa TRÁI khắc một CON SỐ to (Target).
 * Đĩa PHẢI rỗng — bé kéo trái cây từ khay dưới lên đĩa phải. Cân nghiêng
 * theo thời gian thực: thiếu → nghiêng TRÁI, thừa → nghiêng PHẢI, đủ →
 * THĂNG BẰNG hoàn hảo + sao lấp lánh + tự đổi số mới sau 2.5 giây.
 *
 *   - Không tính điểm âm, không game over.
 *   - Bé có thể bốc TRÁI CÂY TỪ ĐĨA ném ra ngoài → giảm count, cân nghiêng
 *     lại ngược.
 *   - Trái cây thả ra ngoài đĩa → spring bay về khay mượt mà.
 *
 * THUẬT TOÁN CÂN:
 *   targetAngle = clamp((count - target) * SENSITIVITY, ±MAX_ANGLE)
 *   - count < target → angle âm  → đĩa TRÁI ĐI XUỐNG (rỗng kéo lên không đủ)
 *   - count > target → angle dương→ đĩa PHẢI ĐI XUỐNG (nặng)
 *   - count === target → angle 0  → thăng bằng
 *
 *   Mỗi frame, currentAngle được cập nhật bằng SPRING-DAMPER (ANGLE_STIFFNESS,
 *   ANGLE_DAMPING) — cân overshoot rồi NẢY LẠI 1-2 nhịp trước khi đứng yên,
 *   giống cân bập bênh thật, kích thích thị giác bé.
 *
 *   Vị trí TÂM 2 đĩa được tính bằng lượng giác từ Pivot:
 *     leftEnd  = Pivot + (-BEAM_LEN·cosθ, -BEAM_LEN·sinθ)
 *     rightEnd = Pivot + ( BEAM_LEN·cosθ,  BEAM_LEN·sinθ)
 *   Đĩa cân HẠ XUỐNG bằng STRING_LEN dọc trục Y (đĩa GIỮ THẲNG, không xoay
 *   theo đòn — đúng vật lý thực).
 *
 * TỔ CHỨC FILE:
 *   1. Hằng số.
 *   2. Bộ trái cây cho các level.
 *   3. Kiểu dữ liệu + helpers.
 *   4. React component.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ
 * ========================================================================= */

const CANVAS_W = 800;
const CANVAS_H = 450;

// Trục cân — Pivot cố định ở giữa-trên canvas.
const PIVOT_X = 400;
const PIVOT_Y = 220;
// Chiều cao trụ đỡ từ mặt đất (đáy) tới pivot.
const PEDESTAL_HEIGHT = 110;

// Đòn cân — dài 2*BEAM_LEN, dày BEAM_THICKNESS.
const BEAM_LEN = 220;
const BEAM_THICKNESS = 16;

// Đĩa cân: dây + đĩa.
const STRING_LEN = 55;
const PLATE_R = 70;          // bán kính ellipse đĩa (theo trục X)
const PLATE_THICKNESS = 10;  // độ dày trông đĩa nhìn nghiêng

// Hitbox vùng "thả trái cây vào đĩa PHẢI" — rộng hơn đĩa 1 chút cho bé dễ.
const RIGHT_HITBOX_R = 95;
// Hitbox click vào TRÁI CÂY (lúc nhặt ra khỏi đĩa hoặc khỏi khay).
const FRUIT_HIT_R = 22;

// ── VẬT LÝ CÂN ─────────────────────────────────────────────────────
const MAX_ANGLE = Math.PI / 12;   // 15° = ±0.262 rad — giới hạn theo doc
const SENSITIVITY = 0.03;          // rad / unit chênh lệch (~17° khi chênh 10)

// SPRING-DAMPER thay vì lerp đơn — khi bé thả 1 quả vào, đòn cân sẽ
// nhún xuống QUÁ vị trí cuối (overshoot) rồi nảy nhẹ lên 1-2 nhịp trước
// khi đứng yên ở góc mục tiêu mới, giống hệt cân bập bênh thật.
//
// Mô hình: mỗi frame
//   accel = (targetAngle - currentAngle) * STIFFNESS  (lực kéo về đích)
//   vel   = (vel + accel) * DAMPING                   (mất bớt vận tốc do ma sát)
//   angle += vel
//
//   - STIFFNESS càng cao → đòn rút về đích càng "rắn", nhịp nhún nhanh.
//   - DAMPING (0..1) càng thấp → vận tốc mất nhanh, ít nhịp nhún hơn.
//   - Cặp (0.12, 0.80) cho ~1-2 nhịp nảy rồi đứng yên — vừa đủ "sống động"
//     mà không lê thê khiến bé sốt ruột.
const ANGLE_STIFFNESS = 0.12;
const ANGLE_DAMPING = 0.80;

// ── KHAY TRÁI CÂY ─────────────────────────────────────────────────
const TRAY_Y = 405;
const TRAY_SLOT_XS = [110, 240, 370, 500, 630, 740];

// Spring physics cho trái cây bay về khay khi thả sai chỗ.
const SPRING_STIFFNESS = 0.20;
const SPRING_DAMPING = 0.62;

// ── BỐ CỤC TRÁI CÂY TRÊN ĐĨA PHẢI ────────────────────────────────
// Tối đa 10 quả → xếp 2 hàng × 5 cột để gọn.
const SLOT_COLS = 5;
const SLOT_CELL_W = 24;
const SLOT_ROW_H = 22;

// Sau khi thăng bằng, giữ trạng thái này 2.5s rồi đổi mục tiêu mới (theo doc).
const BALANCED_HOLD_MS = 2500;

// Cộng điểm cho mỗi lần cân bằng đúng.
const SCORE_PER_BALANCE = 15;

const STORAGE_KEY = 'lingoland_fruitscale_done';

// Font emoji cho mọi OS.
const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', " +
  "'Twemoji Mozilla', 'EmojiOne Color', sans-serif";

const NUM_FONT_FAMILY = "'Nunito', 'Segoe UI', Arial, sans-serif";

/* ===========================================================================
 * 2. BỘ TRÁI CÂY
 *
 * 10 loại trái cây phổ biến — mỗi level chọn ngẫu nhiên 1 loại để cả khay
 * + cả đĩa phải đều cùng loại (tập đếm đơn loại, không phải tổng hợp).
 * ========================================================================= */

type FruitDef = { emoji: string; name: string };

const FRUITS: FruitDef[] = [
  { emoji: '🍓', name: 'dâu' },
  { emoji: '🍇', name: 'nho' },
  { emoji: '🍊', name: 'cam' },
  { emoji: '🍎', name: 'táo' },
  { emoji: '🍌', name: 'chuối' },
  { emoji: '🍉', name: 'dưa hấu' },
  { emoji: '🍑', name: 'đào' },
  { emoji: '🍐', name: 'lê' },
  { emoji: '🥝', name: 'kiwi' },
  { emoji: '🍒', name: 'anh đào' },
];

/* ===========================================================================
 * 3. KIỂU DỮ LIỆU + HELPERS
 * ========================================================================= */

type Point = { x: number; y: number };

/** Trái cây đã đặt CỐ ĐỊNH trên đĩa phải. Chỉ cần biết "có ở đó" để vẽ —
 *  vị trí thực được tính từ rightPlatePos + slot index khi vẽ. */
type PlacedFruit = { id: number };

/** Trái cây BÉ ĐANG CẦM (bị kéo bằng pointer) HOẶC đang bay về khay. */
type Carry = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
  isReturning: boolean;
  /** Toạ độ "nhà" — nơi trái cây spring về nếu thả ngoài đĩa.
   *  Với trái cây từ KHAY: nhà = slot khay đó.
   *  Với trái cây nhặt từ ĐĨA: không spring (xoá luôn khi thả ngoài). */
  homeX: number;
  homeY: number;
  /** Nguồn gốc — quyết định hành vi khi thả ngoài đĩa. */
  source: 'tray' | 'plate';
  pointerId: number | null; // null khi đang return về khay
};

/** Hạt sao lấp lánh quanh đĩa phải khi cân thăng bằng. */
type Sparkle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0 → 1, mỗi frame giảm
  size: number;
};

/** SỐ ĐẾM bay lên + mờ dần khi đặt 1 quả vào đĩa.
 *  Hiển thị tổng số quả HIỆN TẠI ngay tại đĩa, giúp bé "nhẩm đếm theo
 *  từng quả" (1, 2, 3...) — tăng cường liên kết động tác ↔ con số. */
type FloatingNum = {
  value: number;
  x: number;
  y: number;
  life: number; // 0 → 1, mỗi frame giảm
};

type Phase = 'playing' | 'balanced';

function dist2(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Math.max(0, Number(raw) || 0) : 0;
  } catch {
    return 0;
  }
}
function saveHighScore(n: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // ignore
  }
}

/** Tính toạ độ slot thứ `slot` (0..9) trên đĩa phải tại (cx, cy_topSurface). */
function slotPos(slot: number, plateCx: number, plateTopY: number): Point {
  const col = slot % SLOT_COLS;
  const row = Math.floor(slot / SLOT_COLS);
  // 5 cột canh giữa: col 0,1,2,3,4 → offset -2..+2
  const offsetCol = col - (SLOT_COLS - 1) / 2;
  return {
    x: plateCx + offsetCol * SLOT_CELL_W,
    y: plateTopY - 10 - row * SLOT_ROW_H,
  };
}

/* ===========================================================================
 * 4. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function FruitScaleView({ onBack }: Props) {
  const { addScore } = useGame();

  /* ─── React state ──────────────────────────────────────────────────── */

  const [fruitDef, setFruitDef] = useState<FruitDef>(() => pick(FRUITS));
  const [target, setTarget] = useState<number>(() => randInt(2, 6));
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [roundNo, setRoundNo] = useState(1);
  const [highScore, setHighScore] = useState<number>(() => loadHighScore());

  /* ─── Refs — gameplay state tốc độ cao ────────────────────────────── */

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Trái cây đang nằm trên đĩa phải (chỉ id để track; vẽ theo thứ tự index). */
  const placedRef = useRef<PlacedFruit[]>([]);
  /** Trái cây đang được kéo / đang spring về khay. */
  const carryRef = useRef<Carry[]>([]);
  /** ID counter cho carry/placed. */
  const idGenRef = useRef(0);

  // Sao lấp lánh khi thăng bằng.
  const sparklesRef = useRef<Sparkle[]>([]);
  // Số đếm tiến trình bay lên mỗi lần thả thành công (1, 2, 3...).
  const floatingNumsRef = useRef<FloatingNum[]>([]);

  // Góc cân hiện tại (rad) + vận tốc góc (rad/frame) cho spring-damper.
  // Cả 2 đều lưu trong refs vì cập nhật mỗi frame, không cần re-render.
  const angleRef = useRef(0);
  const angleVelRef = useRef(0);

  // Mirror state cho RAF/pointer.
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; }, [target]);
  const countRef = useRef(count);
  useEffect(() => { countRef.current = count; }, [count]);
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const fruitDefRef = useRef(fruitDef);
  useEffect(() => { fruitDefRef.current = fruitDef; }, [fruitDef]);

  // Timer cho phase 'balanced' (chuyển sang round mới).
  const balanceTimerRef = useRef<number | null>(null);

  /* ─── Bắt đầu round mới ───────────────────────────────────────────── */

  const startRound = useCallback(() => {
    // Random target 2-9 (tránh 1 quá dễ và 10 chật đĩa).
    const newTarget = randInt(2, 9);
    // Random fruit khác fruit hiện tại để đa dạng.
    let newFruit = pick(FRUITS);
    if (FRUITS.length > 1) {
      while (newFruit.emoji === fruitDefRef.current.emoji) newFruit = pick(FRUITS);
    }
    setTarget(newTarget);
    setFruitDef(newFruit);
    setCount(0);
    placedRef.current = [];
    carryRef.current = [];
    sparklesRef.current = [];
    floatingNumsRef.current = [];
    setPhase('playing');
    setRoundNo((r) => r + 1);
    window.setTimeout(() => {
      speak(
        `Hãy đặt ${newTarget} quả ${newFruit.name} lên đĩa để cân thăng bằng nhé`,
        LANG_SPEAK_DEFAULT,
      );
    }, 300);
  }, []);

  // Lúc mount: đọc lời mời cho round đầu.
  useEffect(() => {
    const t = window.setTimeout(() => {
      speak(
        `Hãy đặt ${target} quả ${fruitDef.name} lên đĩa để cân thăng bằng nhé`,
        LANG_SPEAK_DEFAULT,
      );
    }, 400);
    return () => window.clearTimeout(t);
  // chỉ chạy 1 lần lúc mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Khi count đổi → kiểm tra thăng bằng ────────────────────────── */

  useEffect(() => {
    if (phaseRef.current !== 'playing') return;
    if (count === target && count > 0) {
      // CÂN THĂNG BẰNG!
      setPhase('balanced');
      addScore(SCORE_PER_BALANCE);
      playTing();
      setHighScore((prev) => {
        const next = prev + 1;
        saveHighScore(next);
        return next;
      });
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#facc15', '#fde047', '#fb923c', '#a78bfa', '#22c55e'],
      });
      window.setTimeout(() => speak('Hoan hô! Cân thăng bằng rồi!', LANG_SPEAK_DEFAULT), 250);
      // Sinh sao lấp lánh quanh đĩa phải LIÊN TỤC trong RAF — flag bật phase.
      // Sau BALANCED_HOLD_MS → chuyển round mới.
      balanceTimerRef.current = window.setTimeout(() => {
        startRound();
      }, BALANCED_HOLD_MS);
    }
    return () => {
      // Nếu count thay đổi giữa chừng (vd bé nhấc trái cây ra) → huỷ timer.
      if (balanceTimerRef.current !== null) {
        // Chỉ clear nếu chưa cân bằng nữa (handler dưới sẽ xử lý).
      }
    };
  // target & startRound stable; addScore stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, target]);

  // Nếu phase chuyển từ 'balanced' → 'playing' (vì bé bốc trái cây ra) → huỷ timer.
  useEffect(() => {
    if (phase === 'playing' && balanceTimerRef.current !== null) {
      window.clearTimeout(balanceTimerRef.current);
      balanceTimerRef.current = null;
    }
  }, [phase]);

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

  /** Tính vị trí TÂM đĩa phải hiện tại theo currentAngle. */
  const getRightPlateCenter = useCallback((): Point => {
    const a = angleRef.current;
    const endX = PIVOT_X + BEAM_LEN * Math.cos(a);
    const endY = PIVOT_Y + BEAM_LEN * Math.sin(a);
    return { x: endX, y: endY + STRING_LEN };
  }, []);

  /** Kiểm tra (x,y) có nằm trong vùng đĩa phải không. */
  const isInRightPlate = useCallback((x: number, y: number): boolean => {
    const c = getRightPlateCenter();
    return dist2(x, y, c.x, c.y) <= RIGHT_HITBOX_R * RIGHT_HITBOX_R;
  }, [getRightPlateCenter]);

  /**
   * Kiểm tra pointer có chạm 1 TRÁI CÂY trên đĩa phải không.
   * Trả về index trong placedRef nếu có, -1 nếu không.
   */
  const findPlacedAt = useCallback((x: number, y: number): number => {
    const c = getRightPlateCenter();
    const plateTopY = c.y - PLATE_THICKNESS;
    // Quét NGƯỢC index vì slot lớn vẽ trên cao (hàng 2), ưu tiên chọn fruit
    // gần mặt nhìn — quét từ cao xuống.
    for (let i = placedRef.current.length - 1; i >= 0; i--) {
      const sp = slotPos(i, c.x, plateTopY);
      if (dist2(x, y, sp.x, sp.y) <= FRUIT_HIT_R * FRUIT_HIT_R) return i;
    }
    return -1;
  }, [getRightPlateCenter]);

  /**
   * Kiểm tra pointer có chạm 1 SLOT KHAY trái cây không (tray).
   * Trả về index slot 0..N-1, hoặc -1.
   */
  const findTraySlotAt = useCallback((x: number, y: number): number => {
    if (Math.abs(y - TRAY_Y) > 28) return -1;
    for (let i = 0; i < TRAY_SLOT_XS.length; i++) {
      if (Math.abs(x - TRAY_SLOT_XS[i]) <= 28) return i;
    }
    return -1;
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // Cả 2 phase 'playing' và 'balanced' đều cho phép nhặt — nếu bé bốc ra
    // sau khi đã cân bằng thì cân sẽ lệch lại + huỷ timer chuyển round.
    const p = toCanvasPoint(e);

    // (1) Ưu tiên: trái cây ĐANG trên đĩa? → bốc ra.
    const placedIdx = findPlacedAt(p.x, p.y);
    if (placedIdx >= 0) {
      // Bốc 1 quả: remove khỏi placed, decrement count, tạo carry mới.
      placedRef.current.splice(placedIdx, 1);
      setCount((c) => c - 1);
      // Nếu đang ở 'balanced' và bé bốc ra → quay lại 'playing'.
      if (phaseRef.current === 'balanced') setPhase('playing');
      e.currentTarget.setPointerCapture(e.pointerId);
      carryRef.current.push({
        id: ++idGenRef.current,
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        isDragging: true,
        isReturning: false,
        homeX: p.x,
        homeY: p.y,
        source: 'plate',
        pointerId: e.pointerId,
      });
      return;
    }

    // (2) Nếu không, kiểm tra slot khay.
    const traySlot = findTraySlotAt(p.x, p.y);
    if (traySlot >= 0) {
      e.currentTarget.setPointerCapture(e.pointerId);
      carryRef.current.push({
        id: ++idGenRef.current,
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        isDragging: true,
        isReturning: false,
        homeX: TRAY_SLOT_XS[traySlot],
        homeY: TRAY_Y,
        source: 'tray',
        pointerId: e.pointerId,
      });
      return;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // Tìm carry đang bám pointer này.
    const c = carryRef.current.find((cf) => cf.pointerId === e.pointerId && cf.isDragging);
    if (!c) return;
    const p = toCanvasPoint(e);
    c.x = p.x;
    c.y = p.y;
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = carryRef.current.find((cf) => cf.pointerId === e.pointerId && cf.isDragging);
    if (!c) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }
    c.isDragging = false;
    c.pointerId = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (isInRightPlate(c.x, c.y)) {
      // ĐẶT ĐƯỢC vào đĩa phải.
      placedRef.current.push({ id: c.id });
      // Số mới = placedRef.length (vừa push xong) — dùng cho cả floating num
      // và setCount để đồng bộ.
      const newCount = placedRef.current.length;
      setCount((cur) => cur + 1);

      // ── PHẢN HỒI "tiến trình đếm" ──────────────────────────────────
      // 1) "Ting" leng keng → phản hồi âm tích cực mỗi lần đặt đúng vào
      //    đĩa, dù chưa đạt mục tiêu. Tăng dopamine vẫn còn chỗ chỗ điểm.
      // 2) Chữ SỐ ĐẾM bay lên + mờ dần tại tâm đĩa phải → mắt + tai
      //    cùng nhận đếm: bé NHÌN số "1, 2, 3..." vừa NGHE Ting → tự
      //    nhẩm đếm theo từng quả.
      playTing();
      const plateC = getRightPlateCenter();
      floatingNumsRef.current.push({
        value: newCount,
        x: plateC.x,
        y: plateC.y - 75, // bắt đầu hơi cao hơn mặt đĩa
        life: 1,
      });

      // Xoá khỏi carryRef ngay (animation snap sẽ "biến" vào đĩa).
      carryRef.current = carryRef.current.filter((cf) => cf.id !== c.id);
    } else {
      // Thả ngoài.
      if (c.source === 'tray') {
        // Spring về khay (chuyển sang isReturning, RAF spring).
        c.isReturning = true;
      } else {
        // Bốc từ đĩa rồi quăng ra ngoài → xoá luôn (count đã decrement).
        carryRef.current = carryRef.current.filter((cf) => cf.id !== c.id);
      }
    }
  };

  /* ─── RAF LOOP — physics đòn cân + spring + sparkles + draw ─────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let rafId = 0;

    const step = () => {
      const now = performance.now();

      // (1) Vật lý đòn cân — SPRING-DAMPER cho cảm giác "nhún nhảy" thực.
      //
      // Mỗi frame:
      //   accel = (targetAngle - angle) * STIFFNESS  → lực kéo về đích
      //   vel   = (vel + accel) * DAMPING            → giảm dần do ma sát
      //   angle += vel
      //
      // Khi bé vừa thả 1 quả → targetAngle nhảy sang giá trị mới → đòn
      // tích tốc, vượt QUÁ đích (overshoot), rồi spring kéo về, đảo
      // chiều vận tốc → nảy nhẹ lên. Sau 1-2 nhịp, DAMPING làm vel ≈ 0,
      // đòn đứng yên tại góc mục tiêu mới.
      const diff = countRef.current - targetRef.current;
      const targetAngle = clamp(diff * SENSITIVITY, -MAX_ANGLE, MAX_ANGLE);
      const accel = (targetAngle - angleRef.current) * ANGLE_STIFFNESS;
      angleVelRef.current = (angleVelRef.current + accel) * ANGLE_DAMPING;
      angleRef.current += angleVelRef.current;

      // (2) Spring trái cây carry đang isReturning về khay.
      const arr = carryRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const cf = arr[i];
        if (cf.isReturning && !cf.isDragging) {
          const ax = (cf.homeX - cf.x) * SPRING_STIFFNESS;
          const ay = (cf.homeY - cf.y) * SPRING_STIFFNESS;
          cf.vx = (cf.vx + ax) * SPRING_DAMPING;
          cf.vy = (cf.vy + ay) * SPRING_DAMPING;
          cf.x += cf.vx;
          cf.y += cf.vy;
          if (
            Math.abs(cf.x - cf.homeX) < 0.5 && Math.abs(cf.y - cf.homeY) < 0.5 &&
            Math.abs(cf.vx) < 0.3 && Math.abs(cf.vy) < 0.3
          ) {
            // Đã về tới khay → xoá khỏi carryRef (slot khay luôn render fresh
            // emoji riêng nên không cần lưu).
            arr.splice(i, 1);
          }
        }
      }

      // (3) Sparkles — chỉ sinh khi 'balanced'.
      if (phaseRef.current === 'balanced') {
        // Sinh 2-3 sao/frame quanh đĩa phải.
        const rc = (function getRightPlate() {
          const a = angleRef.current;
          const endX = PIVOT_X + BEAM_LEN * Math.cos(a);
          const endY = PIVOT_Y + BEAM_LEN * Math.sin(a);
          return { x: endX, y: endY + STRING_LEN };
        })();
        for (let k = 0; k < 2; k++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 50 + Math.random() * 40;
          sparklesRef.current.push({
            x: rc.x + Math.cos(ang) * r,
            y: rc.y + Math.sin(ang) * r,
            vx: Math.cos(ang) * 0.8,
            vy: Math.sin(ang) * 0.8 - 0.8, // hơi bay lên
            life: 1,
            size: 4 + Math.random() * 4,
          });
        }
      }
      // Update + dọn sparkles.
      const sp = sparklesRef.current;
      for (let i = sp.length - 1; i >= 0; i--) {
        const s = sp[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.05;
        s.life -= 0.025;
        if (s.life <= 0) sp.splice(i, 1);
      }

      // Update + dọn FLOATING NUMBERS — bay lên + mờ dần ~900ms.
      const fn = floatingNumsRef.current;
      for (let i = fn.length - 1; i >= 0; i--) {
        const f = fn[i];
        f.y -= 1.4;          // bay LÊN 1.4px/frame
        f.life -= 0.018;     // ~55 frame = ~900ms
        if (f.life <= 0) fn.splice(i, 1);
      }

      drawFrame(ctx, now);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  // RAF 1-shot — đọc state qua refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Hàm vẽ ─────────────────────────────────────────────────────── */

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    const w = CANVAS_W;
    const h = CANVAS_H;
    const angle = angleRef.current;
    const ph = phaseRef.current;
    const fruit = fruitDefRef.current;
    const tgt = targetRef.current;

    // (a) NỀN PASTEL — gradient hồng → xanh dịu mắt.
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#fce7f3'); // pink-100
    bg.addColorStop(1, '#dbeafe'); // blue-100
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // (b) MẶT ĐẤT mờ ở đáy cho cảm giác có "sàn".
    ctx.fillStyle = 'rgba(120, 53, 15, 0.08)';
    ctx.fillRect(0, h - 60, w, 60);

    // (c) TRỤ ĐỠ + ĐẾ — gỗ vàng đồng (vẽ TRƯỚC để cân nằm trên).
    // Đế chân
    ctx.fillStyle = '#92400e'; // amber-800
    roundRect(ctx, PIVOT_X - 70, PIVOT_Y + PEDESTAL_HEIGHT - 10, 140, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#a16207'; // amber-700
    roundRect(ctx, PIVOT_X - 70, PIVOT_Y + PEDESTAL_HEIGHT - 10, 140, 6, 4);
    ctx.fill();
    // Trụ dọc
    ctx.fillStyle = '#b45309'; // amber-700
    roundRect(ctx, PIVOT_X - 14, PIVOT_Y, 28, PEDESTAL_HEIGHT, 6);
    ctx.fill();
    // Tam giác pivot trên đỉnh trụ (điểm xoay đòn cân)
    ctx.fillStyle = '#fbbf24'; // amber-400 (vàng đồng)
    ctx.beginPath();
    ctx.moveTo(PIVOT_X, PIVOT_Y - 14);
    ctx.lineTo(PIVOT_X - 18, PIVOT_Y + 6);
    ctx.lineTo(PIVOT_X + 18, PIVOT_Y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // (d) ĐÒN CÂN — vẽ rotated quanh PIVOT.
    ctx.save();
    ctx.translate(PIVOT_X, PIVOT_Y);
    ctx.rotate(angle);
    // Thân đòn (vàng đồng)
    ctx.fillStyle = '#f59e0b'; // amber-500
    roundRect(ctx, -BEAM_LEN, -BEAM_THICKNESS / 2, BEAM_LEN * 2, BEAM_THICKNESS, 6);
    ctx.fill();
    // Highlight dải sáng trên đòn
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(ctx, -BEAM_LEN + 6, -BEAM_THICKNESS / 2 + 2, BEAM_LEN * 2 - 12, 3, 2);
    ctx.fill();
    // 2 núm tròn ở 2 đầu đòn (móc dây)
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(-BEAM_LEN, 0, 6, 0, Math.PI * 2);
    ctx.arc(BEAM_LEN, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // (e) Tính ENDPOINTS đòn ngoài world coords (đã rotated).
    const leftEndX = PIVOT_X - BEAM_LEN * Math.cos(angle);
    const leftEndY = PIVOT_Y - BEAM_LEN * Math.sin(angle);
    const rightEndX = PIVOT_X + BEAM_LEN * Math.cos(angle);
    const rightEndY = PIVOT_Y + BEAM_LEN * Math.sin(angle);

    // Đĩa cân HẠ XUỐNG DỌC THẲNG ĐỨNG bằng STRING_LEN (giữ phương đứng).
    const leftPlateX = leftEndX;
    const leftPlateY = leftEndY + STRING_LEN;
    const rightPlateX = rightEndX;
    const rightPlateY = rightEndY + STRING_LEN;

    // (f) DÂY treo đĩa — vẽ 2 đường thẳng đứng từ endpoint xuống mặt đĩa.
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(leftEndX, leftEndY);
    ctx.lineTo(leftPlateX, leftPlateY - PLATE_THICKNESS);
    ctx.moveTo(rightEndX, rightEndY);
    ctx.lineTo(rightPlateX, rightPlateY - PLATE_THICKNESS);
    ctx.stroke();

    // (g) 2 ĐĨA CÂN — ellipse dày, gỗ vàng đồng. KHÔNG xoay (đứng yên).
    drawPlate(ctx, leftPlateX, leftPlateY);
    drawPlate(ctx, rightPlateX, rightPlateY);

    // (h) SỐ MỤC TIÊU trên đĩa TRÁI — chữ siêu to, đậm, màu đỏ rực.
    const targetWobble = ph === 'balanced' ? Math.sin(now / 120) * 0.06 : 0;
    ctx.save();
    ctx.translate(leftPlateX, leftPlateY - PLATE_THICKNESS - 38);
    ctx.scale(1 + targetWobble, 1 + targetWobble);
    ctx.font = `900 92px ${NUM_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Stroke trắng dày để tách số khỏi nền pastel.
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(String(tgt), 0, 0);
    ctx.fillStyle = '#dc2626'; // red-600
    ctx.fillText(String(tgt), 0, 0);
    ctx.restore();

    // (i) TRÁI CÂY ĐÃ ĐẶT trên đĩa phải — vẽ theo slot index.
    const placedCount = placedRef.current.length;
    const plateTopY = rightPlateY - PLATE_THICKNESS;
    for (let i = 0; i < placedCount; i++) {
      const sp = slotPos(i, rightPlateX, plateTopY);
      ctx.save();
      ctx.font = `34px ${EMOJI_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, sp.x, sp.y);
      ctx.restore();
    }

    // (j) HIỂN THỊ COUNT trên đĩa phải (góc trên) cho bé thấy tiến độ.
    if (placedCount > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      const badgeW = 50;
      const badgeH = 26;
      const bx = rightPlateX - badgeW / 2;
      const by = rightPlateY - PLATE_THICKNESS - 90;
      roundRect(ctx, bx, by, badgeW, badgeH, 13);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.font = `900 18px ${NUM_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${placedCount}/${tgt}`, rightPlateX, by + badgeH / 2);
      ctx.restore();
    }

    // (k) KHAY trái cây — basket gỗ dài + emoji vô hạn.
    ctx.save();
    // Đáy khay
    ctx.fillStyle = '#92400e';
    roundRect(ctx, 40, TRAY_Y - 26, w - 80, 52, 18);
    ctx.fill();
    // Mặt trên khay (sáng hơn)
    ctx.fillStyle = '#b45309';
    roundRect(ctx, 40, TRAY_Y - 26, w - 80, 10, 8);
    ctx.fill();
    // Nhãn khay
    ctx.fillStyle = 'rgba(255,251,235,0.85)';
    ctx.font = `900 12px ${NUM_FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🧺 Kéo ${fruit.name} lên đĩa phải`, 56, TRAY_Y - 14);
    // Emoji ở mỗi slot
    ctx.font = `40px ${EMOJI_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const sx of TRAY_SLOT_XS) {
      ctx.fillText(fruit.emoji, sx, TRAY_Y + 5);
    }
    ctx.restore();

    // (l) HIGHLIGHT HITBOX đĩa phải khi đang carry — gợi ý chỗ thả.
    const anyDragging = carryRef.current.some((cf) => cf.isDragging);
    if (anyDragging) {
      const c = { x: rightPlateX, y: rightPlateY };
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.65)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(c.x, c.y, RIGHT_HITBOX_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // (m) Vẽ CARRY (trái cây đang được cầm hoặc đang spring về khay).
    for (const cf of carryRef.current) {
      ctx.save();
      ctx.translate(cf.x, cf.y);
      if (cf.isDragging) {
        ctx.scale(1.15, 1.15);
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 5;
      }
      ctx.font = `40px ${EMOJI_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, 0, 0);
      ctx.restore();
    }

    // (n) SPARKLES quanh đĩa phải khi thăng bằng.
    for (const s of sparklesRef.current) {
      ctx.save();
      ctx.globalAlpha = clamp(s.life, 0, 1);
      drawStar(ctx, s.x, s.y, s.size, '#fde047');
      ctx.restore();
    }

    // (n-bis) FLOATING SỐ ĐẾM — vẽ SAU sparkles để luôn nằm trên cùng.
    // Cỡ chữ scale lên theo life ở đầu (pop-in feel), rồi giữ nguyên.
    for (const f of floatingNumsRef.current) {
      const alpha = clamp(f.life, 0, 1);
      // Pop scale: ở life=1 vừa spawn → scale 0.7→1.0 trong 100ms đầu
      // (life 1.0 → 0.92), sau đó giữ scale 1.0.
      const popT = clamp((1 - f.life) / 0.08, 0, 1);
      const scale = 0.7 + 0.3 * popT;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(f.x, f.y);
      ctx.scale(scale, scale);
      ctx.font = `900 56px ${NUM_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(String(f.value), 0, 0);
      ctx.fillStyle = '#16a34a'; // green-600 — phản hồi tích cực
      ctx.fillText(String(f.value), 0, 0);
      ctx.restore();
    }

    // (o) Mũi tên / Chỉ số chênh lệch (gợi ý nhẹ phía trên cân).
    if (ph === 'playing') {
      const cnt = countRef.current;
      let hintText = '';
      let hintColor = '#0f172a';
      if (cnt < tgt) {
        hintText = `Cần thêm ${tgt - cnt} quả nữa!`;
        hintColor = '#2563eb';
      } else if (cnt > tgt) {
        hintText = `Thừa ${cnt - tgt} quả — bốc ra bớt!`;
        hintColor = '#dc2626';
      }
      if (hintText) {
        ctx.save();
        ctx.font = `900 18px ${NUM_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(hintText, PIVOT_X, 40);
        ctx.fillStyle = hintColor;
        ctx.fillText(hintText, PIVOT_X, 40);
        ctx.restore();
      }
    } else if (ph === 'balanced') {
      ctx.save();
      ctx.font = `900 22px ${NUM_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      const txt = '🎉 Cân thăng bằng — Giỏi quá!';
      ctx.strokeText(txt, PIVOT_X, 40);
      ctx.fillStyle = '#16a34a';
      ctx.fillText(txt, PIVOT_X, 40);
      ctx.restore();
    }
  }, []);

  /* ─── JSX ─────────────────────────────────────────────────────────── */

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
          ⚖️ Cân Trái Cây
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          🏆 {highScore}
        </div>
      </div>

      {/* HUD */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Vòng</div>
          <div className="text-2xl font-black">{roundNo}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Cần</div>
          <div className="text-2xl font-black">{target}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Đang có</div>
          <div className="text-2xl font-black">{count}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Quả</div>
          <div className="text-2xl">{fruitDef.emoji}</div>
        </div>
      </div>

      {/* Canvas */}
      <div className="rounded-3xl overflow-hidden border-4 border-amber-300 shadow-lg shadow-amber-100 bg-pink-50">
        <canvas
          ref={canvasRef}
          className="block w-full aspect-[16/9] touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        />
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Kéo trái cây từ khay lên đĩa phải · Đặt đúng <b>{target}</b> quả để cân thăng bằng nhé!
      </p>
    </div>
  );
}

/* ===========================================================================
 * 5. HÀM VẼ PHỤ
 * ========================================================================= */

/** Vẽ đĩa cân — ellipse phẳng có độ dày, gỗ vàng đồng. */
function drawPlate(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  // Cạnh sườn đĩa (đáy tối)
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(cx, cy, PLATE_R, PLATE_R * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mặt trên đĩa (sáng hơn) — nâng lên PLATE_THICKNESS
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(cx, cy - PLATE_THICKNESS, PLATE_R, PLATE_R * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cạnh phải sườn — nối 2 ellipse bằng path
  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.moveTo(cx - PLATE_R, cy);
  ctx.lineTo(cx - PLATE_R, cy - PLATE_THICKNESS);
  ctx.ellipse(cx, cy - PLATE_THICKNESS, PLATE_R, PLATE_R * 0.3, 0, Math.PI, 0, true);
  ctx.lineTo(cx + PLATE_R, cy);
  ctx.ellipse(cx, cy, PLATE_R, PLATE_R * 0.3, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  // Viền mặt trên cho rõ
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - PLATE_THICKNESS, PLATE_R, PLATE_R * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Vẽ ngôi sao 5 cánh tại (cx, cy) với "size" = bán kính ngoài. */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Rounded rect helper — Safari cũ chưa có ctx.roundRect tự nhiên. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
