import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Cân Bằng Sinh Thái — game tư duy logic cho trẻ 5-10 tuổi.               ║
// ║                                                                          ║
// ║  Ý tưởng: Mỗi con vật có "trọng lượng" ẨN. Đĩa cân TRÁI có sẵn đề bài,    ║
// ║  trẻ kéo các con vật từ KHAY phía dưới vào đĩa PHẢI sao cho 2 đĩa cân     ║
// ║  thăng bằng (tổng trọng lượng bằng nhau).                                ║
// ║                                                                          ║
// ║  Kiến trúc:                                                              ║
// ║   - React (useState, useEffect, useRef) quản lý màn chơi, điểm, mạng…    ║
// ║   - HTML5 Canvas vẽ đòn cân xoay góc, đĩa cân, vật phẩm, drag preview    ║
// ║   - Pointer Events thống nhất xử lý chuột + cảm ứng (mobile)             ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─── 1. Dữ liệu con vật & trọng lượng (ẨN với người chơi) ──────────────────

type AnimalKind = 'mouse' | 'cat' | 'fox' | 'dog';

type AnimalDef = {
  kind: AnimalKind;
  emoji: string;
  label: string;   // Tên tiếng Việt (dùng cho a11y, không hiển thị trọng lượng)
  weight: number;  // Trọng lượng ẨN — trẻ phải tự suy luận
};

const ANIMALS: Record<AnimalKind, AnimalDef> = {
  mouse: { kind: 'mouse', emoji: '🐭', label: 'Chuột', weight: 1 },
  cat:   { kind: 'cat',   emoji: '🐱', label: 'Mèo',   weight: 2 },
  fox:   { kind: 'fox',   emoji: '🦊', label: 'Cáo',   weight: 3 },
  dog:   { kind: 'dog',   emoji: '🐶', label: 'Chó',   weight: 4 },
};

// ─── 2. Cấu hình màn chơi (LEVELS_DATA) ────────────────────────────────────

type LevelDef = {
  id: string;
  name: string;
  hint: string;                // Gợi ý hiển thị (hé lộ quan hệ trọng lượng)
  leftItems: AnimalKind[];     // Con vật cố định bên đĩa TRÁI (đề bài)
  inventory: AnimalKind[];     // Loại con vật trẻ có thể kéo từ khay
  scoreOnPass: number;
};

const LEVELS: LevelDef[] = [
  {
    id: 'eco1',
    name: 'Trực quan',
    hint: '🐱 = 2 🐭. Bé hãy kéo các bạn Chuột sang đĩa phải cho cân bằng nhé!',
    leftItems: ['cat'],
    inventory: ['mouse', 'cat'],
    scoreOnPass: 20,
  },
  {
    id: 'eco2',
    name: 'Bắc cầu',
    hint: '🐶 = 2 🐱, và 🐱 = 2 🐭. Bé hãy tự suy luận để cân bằng đĩa nhé!',
    leftItems: ['dog'],
    inventory: ['mouse', 'cat', 'dog'],
    scoreOnPass: 30,
  },
  {
    id: 'eco3',
    name: 'Kết hợp nhiều loài',
    hint: '🦊 nặng giữa 🐱 và 🐶. Bé thử kết hợp nhiều loài bên phải nhé!',
    leftItems: ['dog', 'cat'],
    inventory: ['mouse', 'cat', 'fox', 'dog'],
    scoreOnPass: 50,
  },
];

// ─── 2b. Quy ước trọng lượng minh hoạ cho popup "Xem gợi ý" ───────────────
//
// Mỗi dòng dạng "1 con A = N con B" (vẽ dưới dạng emoji trực quan).
// `needs` liệt kê các loài bắt buộc xuất hiện trong level để dòng này hiện ra
// (tránh khoe quy ước về Cáo ở level chưa có Cáo, dễ gây nhiễu thông tin).

type HintRow = {
  one: AnimalKind;
  equals: AnimalKind[];
  needs: AnimalKind[];
};

const HINT_ROWS: HintRow[] = [
  { one: 'cat', equals: ['mouse', 'mouse'],                           needs: ['cat', 'mouse'] }, // 1 Mèo = 2 Chuột
  { one: 'fox', equals: ['mouse', 'mouse', 'mouse'],                  needs: ['fox', 'mouse'] }, // 1 Cáo = 3 Chuột
  { one: 'dog', equals: ['mouse', 'mouse', 'mouse', 'mouse'],         needs: ['dog', 'mouse'] }, // 1 Chó = 4 Chuột
  { one: 'dog', equals: ['cat', 'cat'],                               needs: ['dog', 'cat'] },   // 1 Chó = 2 Mèo
];

/** Trả về các quy ước phù hợp với level hiện tại (chỉ chứa loài xuất hiện ở level) */
function visibleHintRows(lv: LevelDef): HintRow[] {
  const animals = new Set<AnimalKind>([...lv.leftItems, ...lv.inventory]);
  return HINT_ROWS.filter((r) => r.needs.every((a) => animals.has(a)));
}

// ─── 3. Hằng số kích thước & vật lý đòn cân ────────────────────────────────

const CANVAS_W = 800;
const CANVAS_H = 450;

const PIVOT_X = CANVAS_W / 2;
const PIVOT_Y = 170;              // Toạ độ tâm xoay (pivot) của đòn cân
const BEAM_HALF_LEN = 200;        // Nửa chiều dài đòn cân
const ROPE_LEN = 60;              // Khoảng cách thẳng đứng từ đầu đòn → đĩa
const PAN_HALF_W = 90;            // Nửa chiều rộng đĩa
const PAN_HEIGHT = 18;            // Độ dày đĩa cân (vẽ dạng ellipse)

const MAX_TILT_DEG = 15;          // Giới hạn góc nghiêng tối đa (±15°)
const SENSITIVITY = 4;            // Độ nghiêng / 1 đơn vị chênh lệch trọng lượng

// ── Spring physics cho đòn cân ──
// Mô hình lò xo có giảm chấn (damped harmonic oscillator):
//   accel    = STIFFNESS * (target - current)   ← lực kéo về vị trí cân bằng
//   velocity = (velocity + accel) * DAMPING     ← giảm dần (ma sát)
//   current += velocity
// Với DAMPING < 1, vận tốc không tắt ngay → đòn cân vượt qua đích rồi quay lại,
// tạo cảm giác "nhún nhảy" vài nhịp trước khi dừng hẳn.
const SPRING_STIFFNESS = 0.022;   // Độ cứng lò xo (càng cao → phản ứng càng nhanh)
const SPRING_DAMPING = 0.88;      // Hệ số giảm chấn (0..1; < 1 cho phép overshoot/bounce)
const REST_EPSILON = 0.01;        // Nếu cả velocity và độ lệch đều nhỏ hơn → snap về đích

const ITEM_PX = 38;               // Cạnh hitbox / kích cỡ emoji con vật
const ITEMS_PER_ROW = 4;          // Tối đa 4 con/hàng khi xếp chồng trên đĩa
const FIRST_ROW_OFFSET_Y = -20;   // Hàng 1 nằm trên mặt đĩa 20px
const ROW_GAP_Y = -38;            // Hàng sau cao hơn hàng trước 38px

const TRAY_TOP = 360;             // Y của khay chứa (inventory)
const TRAY_HEIGHT = 80;
const TRAY_SIDE_PAD = 30;         // Padding khay so với mép canvas

const STARTING_LIVES = 3;
const PASSED_KEY = 'lingoland_ecobalance_passed';

// ─── 4. Geometry helpers ───────────────────────────────────────────────────

const deg2rad = (d: number) => (d * Math.PI) / 180;

/**
 * Tính toạ độ 2 đầu đòn cân khi đòn xoay 1 góc `theta` (độ) quanh pivot.
 *
 * Quy ước: theta > 0  ⇒ ĐẦU TRÁI ĐI XUỐNG (vì angle = LeftW - RightW;
 *                    khi đĩa trái nặng hơn, nó hạ xuống — trực quan).
 *          theta = 0  ⇒ Đòn cân nằm ngang.
 *
 * Trục y trong canvas tăng theo chiều xuống dưới, nên +sin(theta) là đi xuống.
 */
function beamEnds(theta: number) {
  const t = deg2rad(theta);
  const dx = BEAM_HALF_LEN * Math.cos(t);
  const dy = BEAM_HALF_LEN * Math.sin(t);
  return {
    leftX:  PIVOT_X - dx,
    leftY:  PIVOT_Y + dy,   // +dy = xuống dưới (đĩa trái nặng → hạ xuống)
    rightX: PIVOT_X + dx,
    rightY: PIVOT_Y - dy,   // -dy = lên trên (đĩa phải nhẹ → nâng lên)
  };
}

/**
 * Tâm đĩa cân: luôn ở dưới đầu đòn theo phương THẲNG ĐỨNG.
 * Lý do: trong thực tế, sợi dây + đĩa cân luôn rủ xuống theo trọng lực,
 * nên đĩa giữ phương ngang dù đòn cân có xoay nghiêng.
 */
function panCenter(endX: number, endY: number) {
  return { x: endX, y: endY + ROPE_LEN };
}

/**
 * Toạ độ con vật thứ `idx` (đếm từ 0) trên 1 đĩa cân chứa tổng cộng `total`
 * con vật. Xếp tối đa ITEMS_PER_ROW con/hàng; hàng tiếp theo nằm chồng cao
 * hơn ROW_GAP_Y px.
 */
function itemPosOnPan(idx: number, total: number, panX: number, panY: number) {
  const row = Math.floor(idx / ITEMS_PER_ROW);
  const col = idx % ITEMS_PER_ROW;
  // Số con vật thực tế trên hàng này (hàng cuối có thể thiếu)
  const itemsThisRow = Math.min(ITEMS_PER_ROW, total - row * ITEMS_PER_ROW);
  const spacing = 38;
  const xOffset = (col - (itemsThisRow - 1) / 2) * spacing;
  const yOffset = FIRST_ROW_OFFSET_Y + row * ROW_GAP_Y;
  return { x: panX + xOffset, y: panY + yOffset };
}

/** Tổng trọng lượng các con vật trong 1 mảng */
function totalWeight(items: AnimalKind[]) {
  return items.reduce((s, k) => s + ANIMALS[k].weight, 0);
}

/** Hit-test hình vuông cạnh `size` quanh tâm (cx, cy) */
function hitSquare(px: number, py: number, cx: number, cy: number, size: number) {
  const half = size / 2;
  return px >= cx - half && px <= cx + half && py >= cy - half && py <= cy + half;
}

// ─── 5. Khay (inventory) — bố cục các slot ─────────────────────────────────

function inventorySlots(animals: AnimalKind[]) {
  const innerW = CANVAS_W - TRAY_SIDE_PAD * 2;
  const cy = TRAY_TOP + TRAY_HEIGHT / 2 + 6;  // Hơi lệch dưới để chừa chỗ cho label
  const slot = innerW / animals.length;
  return animals.map((animal, i) => ({
    animal,
    x: TRAY_SIDE_PAD + slot * (i + 0.5),
    y: cy,
  }));
}

// ─── 6. Persistence (localStorage) ─────────────────────────────────────────

function loadPassed(): Set<string> {
  try {
    const raw = localStorage.getItem(PASSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((s) => typeof s === 'string'));
  } catch {
    /* ignore */
  }
  return new Set();
}

function savePassed(s: Set<string>) {
  try {
    localStorage.setItem(PASSED_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

// ─── 7. Vẽ 1 con vật (emoji) ───────────────────────────────────────────────

function drawAnimal(
  ctx: CanvasRenderingContext2D,
  kind: AnimalKind,
  x: number,
  y: number,
  size: number,
) {
  ctx.font = `${Math.floor(size)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ANIMALS[kind].emoji, x, y);
}

// ─── 8. Trạng thái drag ────────────────────────────────────────────────────

/**
 * Drag có 2 nguồn:
 *   - 'inventory': nhặt 1 con vật mới từ khay (khay là nguồn vô hạn)
 *   - 'pan':       nhặt 1 con vật đang ở trên đĩa PHẢI (để vứt đi xoá khỏi đĩa)
 */
type DragSource =
  | { kind: 'inventory'; animal: AnimalKind }
  | { kind: 'pan'; animal: AnimalKind };

type DragState = {
  source: DragSource;
  pointerId: number;
  x: number;          // Toạ độ pointer hiện tại (trong hệ canvas)
  y: number;
};

// ─── 9. Component chính ────────────────────────────────────────────────────

type Props = { onBack: () => void };

type Phase = 'playing' | 'won' | 'gameover';

export default function EcoBalanceView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── State React (gây re-render khi đổi) ──────────────────────────────────
  const [passed, setPassed] = useState<Set<string>>(() => loadPassed());
  const [levelIdx, setLevelIdx] = useState<number | null>(null);
  const [rightItems, setRightItems] = useState<AnimalKind[]>([]);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [phase, setPhase] = useState<Phase>('playing');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showHint, setShowHint] = useState(false);
  // dragVersion chỉ để buộc React re-render khi cần (ví dụ disable nút khi kéo)
  // — chính dữ liệu kéo đặt trong dragRef để khỏi re-render mỗi pixel di chuột.
  const [, setDragVersion] = useState(0);

  const level = levelIdx !== null ? LEVELS[levelIdx] : null;

  // ── Refs (vòng lặp RAF đọc trực tiếp giá trị mới nhất) ───────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const rightItemsRef = useRef<AnimalKind[]>([]);
  const levelRef = useRef<LevelDef | null>(null);
  const phaseRef = useRef<Phase>('playing');
  const currentAngleRef = useRef(0);    // Góc nghiêng hiện hiển thị (đã smooth)
  const angleVelocityRef = useRef(0);   // Vận tốc xoay (độ / frame) — dùng cho spring physics

  // Sync state ↔ ref (RAF chỉ đọc ref)
  useEffect(() => { rightItemsRef.current = rightItems; }, [rightItems]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /**
   * Helper: vừa setRightItems vừa cập nhật ref SYNCHRONOUSLY trong cùng callback.
   * Lý do: tránh "lag" 1 khung hình giữa lúc state đổi và lúc effect chạy
   * — giúp đòn cân & layout đĩa cập nhật ngay lập tức.
   */
  const updateRightItems = useCallback(
    (next: AnimalKind[] | ((prev: AnimalKind[]) => AnimalKind[])) => {
      setRightItems((prev) => {
        const computed = typeof next === 'function'
          ? (next as (prev: AnimalKind[]) => AnimalKind[])(prev)
          : next;
        rightItemsRef.current = computed;
        return computed;
      });
    },
    [],
  );

  // ── 9.1 Chọn level / reset ──────────────────────────────────────────────

  const pickLevel = useCallback(
    (idx: number) => {
      const lv = LEVELS[idx];
      if (!lv) return;
      // Bắt buộc phải pass level trước (level 0 mở sẵn)
      const unlocked = idx === 0 || passed.has(LEVELS[idx - 1].id);
      if (!unlocked) return;
      setLevelIdx(idx);
      updateRightItems([]);
      setLives(STARTING_LIVES);
      setPhase('playing');
      setFeedback(null);
      currentAngleRef.current = 0;
      angleVelocityRef.current = 0;
      dragRef.current = null;
    },
    [passed, updateRightItems],
  );

  const resetPan = useCallback(() => {
    updateRightItems([]);
    setFeedback(null);
  }, [updateRightItems]);

  const exitToMenu = useCallback(() => {
    setLevelIdx(null);
    updateRightItems([]);
    setLives(STARTING_LIVES);
    setPhase('playing');
    setFeedback(null);
    dragRef.current = null;
    currentAngleRef.current = 0;
    angleVelocityRef.current = 0;
  }, [updateRightItems]);

  const replayLevel = useCallback(() => {
    updateRightItems([]);
    setLives(STARTING_LIVES);
    setPhase('playing');
    setFeedback(null);
    currentAngleRef.current = 0;
    angleVelocityRef.current = 0;
  }, [updateRightItems]);

  // ── 9.2 Tính góc nghiêng đích (target angle) từ chênh lệch trọng lượng ──

  const computeTargetAngle = useCallback(() => {
    const lv = levelRef.current;
    if (!lv) return 0;
    const leftW = totalWeight(lv.leftItems);
    const rightW = totalWeight(rightItemsRef.current);
    const raw = (leftW - rightW) * SENSITIVITY;
    return Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, raw));
  }, []);

  // ── 9.3 Nút KIỂM TRA ────────────────────────────────────────────────────

  const checkAnswer = useCallback(() => {
    const lv = levelRef.current;
    if (!lv || phaseRef.current !== 'playing') return;
    const leftW = totalWeight(lv.leftItems);
    const rightW = totalWeight(rightItemsRef.current);
    if (rightW === 0) return;  // Chưa kéo gì sang → không cho check (UX)

    if (leftW === rightW) {
      // ✅ THẮNG
      setFeedback('correct');
      setPhase('won');
      playSfx('snd-correct');
      addScore(lv.scoreOnPass);

      // Lưu trạng thái pass nếu chưa có
      if (!passed.has(lv.id)) {
        const next = new Set(passed);
        next.add(lv.id);
        setPassed(next);
        savePassed(next);
      }

      // 🎊 Pháo hoa rực rỡ ăn mừng (3 đợt liên tiếp)
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb7185'],
      });
      window.setTimeout(() => {
        confetti({
          particleCount: 100, spread: 70,
          origin: { x: 0.3, y: 0.6 },
          colors: ['#fde047', '#fb923c', '#f87171'],
        });
      }, 250);
      window.setTimeout(() => {
        confetti({
          particleCount: 100, spread: 70,
          origin: { x: 0.7, y: 0.6 },
          colors: ['#a78bfa', '#60a5fa', '#34d399'],
        });
      }, 500);
    } else {
      // ❌ SAI → mất 1 mạng
      setFeedback('wrong');
      playSfx('snd-wrong');
      setLives((L) => {
        const next = L - 1;
        if (next <= 0) setPhase('gameover');
        return next;
      });
      // Xoá feedback overlay sau 1 giây
      window.setTimeout(() => setFeedback(null), 1000);
    }
  }, [addScore, passed]);

  // ── 9.4 Pointer handlers (drag & drop) ──────────────────────────────────

  /** Chuyển toạ độ pointer trong viewport → toạ độ trong hệ canvas nội bộ */
  const pointerToCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CANVAS_W,
      y: ((e.clientY - r.top) / r.height) * CANVAS_H,
    };
  };

  /**
   * Hit-test: pointer có chạm con vật nào trên ĐĨA PHẢI không?
   * Trả về index của con vật (hoặc -1). Quét NGƯỢC để ưu tiên con vẽ sau (trên cùng).
   */
  const hitTestRightPanItem = (px: number, py: number): number => {
    const ends = beamEnds(currentAngleRef.current);
    const pan = panCenter(ends.rightX, ends.rightY);
    const items = rightItemsRef.current;
    for (let i = items.length - 1; i >= 0; i--) {
      const { x, y } = itemPosOnPan(i, items.length, pan.x, pan.y);
      if (hitSquare(px, py, x, y, ITEM_PX)) return i;
    }
    return -1;
  };

  /** Hit-test khay inventory → trả về loại con vật (hoặc null) */
  const hitTestInventory = (px: number, py: number): AnimalKind | null => {
    const lv = levelRef.current;
    if (!lv) return null;
    if (py < TRAY_TOP || py > TRAY_TOP + TRAY_HEIGHT) return null;
    for (const s of inventorySlots(lv.inventory)) {
      if (hitSquare(px, py, s.x, s.y, ITEM_PX + 8)) return s.animal;
    }
    return null;
  };

  /**
   * Vùng nhận thả ở đĩa PHẢI: rộng hơn đĩa thật để dễ thả trên mobile,
   * và mở rộng phía trên để bao trùm khu vực xếp chồng con vật.
   */
  const isOverRightPan = (px: number, py: number) => {
    const ends = beamEnds(currentAngleRef.current);
    const pan = panCenter(ends.rightX, ends.rightY);
    const left = pan.x - PAN_HALF_W - 12;
    const right = pan.x + PAN_HALF_W + 12;
    const top = pan.y - 150;  // Đủ rộng cho 4 hàng xếp chồng
    const bottom = pan.y + 30;
    return px >= left && px <= right && py >= top && py <= bottom;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const { x, y } = pointerToCanvas(e);

    // 1) Thử nhặt 1 con vật đang nằm trên đĩa PHẢI (để vứt ra ngoài)
    const panIdx = hitTestRightPanItem(x, y);
    if (panIdx >= 0) {
      const animal = rightItemsRef.current[panIdx];
      // Gỡ khỏi đĩa NGAY (đòn cân lập tức rebalance — feedback trực quan)
      updateRightItems((arr) => arr.filter((_, i) => i !== panIdx));
      dragRef.current = { source: { kind: 'pan', animal }, pointerId: e.pointerId, x, y };
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragVersion((v) => v + 1);
      return;
    }

    // 2) Thử nhặt 1 con vật từ khay (nguồn vô hạn)
    const fromInv = hitTestInventory(x, y);
    if (fromInv) {
      dragRef.current = {
        source: { kind: 'inventory', animal: fromInv },
        pointerId: e.pointerId,
        x, y,
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDragVersion((v) => v + 1);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const { x, y } = pointerToCanvas(e);
    // Chỉ ghi vào ref — không gọi setState (RAF sẽ tự đọc & vẽ)
    dragRef.current = { ...d, x, y };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const { x, y } = pointerToCanvas(e);
    const dropOnPan = isOverRightPan(x, y);

    if (d.source.kind === 'inventory') {
      // Thả vào đĩa → thêm; thả ngoài → bỏ qua (khay vô hạn)
      if (dropOnPan) updateRightItems((arr) => [...arr, d.source.animal]);
    } else {
      // Đang kéo từ đĩa: thả vào đĩa → khôi phục; thả ngoài → đã bị xoá
      if (dropOnPan) updateRightItems((arr) => [...arr, d.source.animal]);
    }
    dragRef.current = null;
    setDragVersion((v) => v + 1);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    // Mất kết nối pointer giữa chừng → khôi phục con vật nếu đang kéo từ đĩa
    if (d.source.kind === 'pan') {
      updateRightItems((arr) => [...arr, d.source.animal]);
    }
    dragRef.current = null;
    setDragVersion((v) => v + 1);
  };

  // ── 9.5 Vòng lặp game (requestAnimationFrame) ───────────────────────────

  useEffect(() => {
    if (level === null) return;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // (a) Cập nhật góc nghiêng bằng SPRING PHYSICS có giảm chấn.
      //   Lò xo: accel ∝ (target - current) kéo đòn cân về vị trí cân bằng.
      //   Damping: vận tốc giảm dần mỗi frame → đòn cân nhún nhảy vài nhịp
      //   trước khi dừng hẳn (thay vì trượt mượt một mạch tới đích).
      const tgt = computeTargetAngle();
      const delta = tgt - currentAngleRef.current;
      const accel = SPRING_STIFFNESS * delta;
      angleVelocityRef.current = (angleVelocityRef.current + accel) * SPRING_DAMPING;
      currentAngleRef.current += angleVelocityRef.current;

      // Khi gần như đứng yên (cả vận tốc lẫn độ lệch đều rất nhỏ), snap về đích
      // để tránh tình trạng dao động siêu nhỏ kéo dài vô tận.
      if (
        Math.abs(angleVelocityRef.current) < REST_EPSILON &&
        Math.abs(delta) < REST_EPSILON
      ) {
        currentAngleRef.current = tgt;
        angleVelocityRef.current = 0;
      }
      const angle = currentAngleRef.current;

      // (b) Background gradient (vàng nhạt → xanh cỏ)
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, '#fef9c3');
      bg.addColorStop(1, '#bbf7d0');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Một ít mây + cỏ trang trí cho sinh động
      drawDecor(ctx);

      const lv = levelRef.current!;

      // (c) Cột đỡ trục cân + đế gỗ
      ctx.fillStyle = '#92400e';
      ctx.fillRect(PIVOT_X - 14, PIVOT_Y, 28, CANVAS_H - PIVOT_Y - 30);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(PIVOT_X, CANVAS_H - 30, 95, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // (d) Đòn cân — rotate quanh PIVOT
      ctx.save();
      ctx.translate(PIVOT_X, PIVOT_Y);
      ctx.rotate(deg2rad(angle));
      const beamGrad = ctx.createLinearGradient(0, -10, 0, 10);
      beamGrad.addColorStop(0, '#fbbf24');
      beamGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(-BEAM_HALF_LEN, -8, BEAM_HALF_LEN * 2, 16);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(-BEAM_HALF_LEN, -8, BEAM_HALF_LEN * 2, 16);
      // Trục xoay (nút chốt)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // (e) 2 đĩa cân
      const ends = beamEnds(angle);

      // Vẽ đĩa TRÁI (đề bài) — màu hồng đỏ
      drawPan(
        ctx,
        ends.leftX, ends.leftY,
        lv.leftItems,
        'Đề bài',
        ['#fca5a5', '#ef4444'],
      );

      // Vẽ đĩa PHẢI (của bé) — màu xanh dương; highlight nếu pointer đang ở trên
      const d = dragRef.current;
      const overRightNow = d ? isOverRightPan(d.x, d.y) : false;
      drawPan(
        ctx,
        ends.rightX, ends.rightY,
        rightItemsRef.current,
        'Của bé',
        ['#93c5fd', '#3b82f6'],
        overRightNow,
      );

      // (f) Khay inventory phía dưới
      drawTray(ctx, lv.inventory);

      // (g) Con vật đang được kéo (vẽ trên cùng)
      if (d) {
        // Bóng đổ nhẹ dưới chân
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y + ITEM_PX * 0.55, ITEM_PX * 0.45, ITEM_PX * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        drawAnimal(ctx, d.source.animal, d.x, d.y, ITEM_PX * 1.15);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [level, computeTargetAngle]);

  // ── 9.6 UI: màn hình chọn level ─────────────────────────────────────────

  if (level === null) {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Trò Chơi
        </button>

        <div className="text-center mb-6">
          <div className="text-6xl mb-2 floating">⚖️</div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 bg-clip-text text-transparent leading-tight">
            Cân Bằng Sinh Thái
          </h2>
          <p className="text-slate-500 text-sm font-bold mt-2 max-w-md mx-auto">
            Kéo các con vật từ khay sang đĩa bên phải sao cho cân thăng bằng với
            đĩa bên trái nhé!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LEVELS.map((lv, idx) => {
            const isPassed = passed.has(lv.id);
            const isUnlocked = idx === 0 || passed.has(LEVELS[idx - 1].id);
            return (
              <button
                key={lv.id}
                onClick={() => pickLevel(idx)}
                disabled={!isUnlocked}
                className={`relative p-5 rounded-3xl shadow-lg text-left active:scale-95 transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-emerald-400 via-amber-400 to-rose-500 text-white shadow-emerald-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${
                      isUnlocked ? 'bg-white/25' : 'bg-slate-200'
                    }`}
                  >
                    {isUnlocked ? idx + 1 : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-lg leading-tight">{lv.name}</div>
                    <div
                      className={`text-xs font-bold mt-0.5 ${
                        isUnlocked ? 'opacity-90' : 'opacity-100'
                      }`}
                    >
                      {isUnlocked ? lv.hint : 'Hoàn thành màn trước để mở khoá'}
                    </div>
                  </div>
                  {isPassed && <span className="text-2xl">⭐</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 9.7 UI: màn hình chơi ───────────────────────────────────────────────

  const isLast = levelIdx !== null && levelIdx >= LEVELS.length - 1;

  return (
    <div className="animate-in fade-in duration-300">
      {/* Thanh trên: back, mạng, số màn */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
        >
          ← Đổi màn
        </button>
        <div className="flex items-center gap-3">
          <div className="text-lg" aria-label={`Còn ${lives} mạng`}>
            {Array.from({ length: STARTING_LIVES }).map((_, i) => (
              <span key={i}>{i < lives ? '❤️' : '🤍'}</span>
            ))}
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Màn{' '}
            <span className="text-emerald-500 text-lg ml-1">{(levelIdx ?? 0) + 1}</span>
            /{LEVELS.length}
          </div>
        </div>
      </div>

      {/* Tên & gợi ý màn */}
      <div className="mb-2 text-center">
        <div className="font-black text-slate-700 text-lg">{level.name}</div>
        <div className="text-xs font-bold text-slate-500 max-w-md mx-auto px-2">
          {level.hint}
        </div>
      </div>

      {/* Canvas chứa toàn bộ game */}
      <div className="relative rounded-3xl overflow-hidden border-4 border-emerald-200 shadow-lg bg-slate-50 mb-3">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none',   // Không scroll trang khi kéo trên cảm ứng
            cursor: phase === 'playing' ? 'grab' : 'default',
          }}
        />

        {/* Nút "Xem gợi ý" — floating trên góc canvas */}
        {phase === 'playing' && (
          <button
            onClick={() => setShowHint(true)}
            className="absolute top-3 right-3 z-10 bg-white/95 border-2 border-emerald-300 text-emerald-600 rounded-full px-3 py-1.5 text-xs font-black shadow-md hover:bg-white active:scale-95 transition-all"
          >
            💡 Xem gợi ý
          </button>
        )}

        {/* Banner sai (hiện 1 giây) */}
        {feedback === 'wrong' && phase === 'playing' && (
          <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none animate-in fade-in duration-200">
            <div className="px-5 py-2 bg-rose-500 text-white font-black rounded-full shadow-lg">
              ❌ Chưa cân bằng — thử lại!
            </div>
          </div>
        )}

        {/* Màn hình chiến thắng rực rỡ */}
        {phase === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-6 mx-4 text-center max-w-xs animate-in zoom-in duration-300">
              <div className="text-6xl mb-2">🎉⚖️🎉</div>
              <div className="font-black text-2xl bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 bg-clip-text text-transparent">
                Cân thăng bằng!
              </div>
              <div className="text-xs font-bold text-slate-500 mt-2">
                +{level.scoreOnPass} điểm
              </div>
            </div>
          </div>
        )}

        {/* Màn hình hết mạng */}
        {phase === 'gameover' && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-500/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-5 mx-4 text-center max-w-xs animate-in zoom-in duration-300">
              <div className="text-5xl mb-2">💔</div>
              <div className="font-black text-xl text-rose-600">Hết mạng rồi!</div>
              <div className="text-xs font-bold text-slate-500 mt-1">
                Đừng nản chí — bé thử lại nhé.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nút điều khiển */}
      {phase === 'playing' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={resetPan}
            disabled={rightItems.length === 0}
            className={`py-3 rounded-2xl font-black border-2 active:scale-95 transition-all ${
              rightItems.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-amber-600 border-amber-200'
            }`}
          >
            ↺ CÀI LẠI
          </button>
          <button
            onClick={checkAnswer}
            disabled={rightItems.length === 0}
            className={`py-3 rounded-2xl font-black shadow-lg transition-all ${
              rightItems.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 text-white shadow-emerald-200 active:scale-95'
            }`}
          >
            ✅ KIỂM TRA
          </button>
        </div>
      )}

      {phase === 'gameover' && (
        <button
          onClick={replayLevel}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-rose-200 active:scale-95 transition-all"
        >
          🔄 Chơi lại
        </button>
      )}

      {phase === 'won' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={replayLevel}
            className="py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
          {isLast ? (
            <button
              onClick={exitToMenu}
              className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              🏁 Hoàn tất
            </button>
          ) : (
            <button
              onClick={() => pickLevel((levelIdx ?? 0) + 1)}
              className="py-3 bg-gradient-to-r from-emerald-500 to-amber-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              Tiếp ▶️
            </button>
          )}
        </div>
      )}

      {/* Modal "Xem gợi ý" — minh hoạ quy ước trọng lượng bằng emoji */}
      {showHint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 animate-in fade-in duration-200"
          onClick={() => setShowHint(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">💡⚖️</div>
              <h3 className="text-xl font-black text-slate-800">Quy ước trọng lượng</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Dùng các quan hệ dưới đây để cân bằng đĩa nhé!
              </p>
            </div>

            {/* Mỗi dòng minh hoạ "1 con A = N con B" bằng emoji to */}
            <div className="space-y-3">
              {visibleHintRows(level).map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-3 bg-gradient-to-br from-emerald-50 to-amber-50 rounded-2xl p-3 border-2 border-emerald-100"
                >
                  {/* Vế trái: 1 con */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-400">1×</span>
                    <span className="text-4xl leading-none">{ANIMALS[row.one].emoji}</span>
                  </div>
                  {/* Dấu = */}
                  <span className="text-3xl font-black text-emerald-600">=</span>
                  {/* Vế phải: N con (xếp ngang) */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-400">
                      {row.equals.length}×
                    </span>
                    <div className="flex">
                      {row.equals.map((a, j) => (
                        <span key={j} className="text-3xl leading-none -ml-1 first:ml-0">
                          {ANIMALS[a].emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHint(false)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              👍 Đã hiểu rồi!
            </button>
          </div>
        </div>
      )}

      {/* Modal xác nhận thoát */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 animate-in fade-in duration-200"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">⚖️</div>
              <h3 className="text-xl font-black text-slate-800">Đổi màn khác?</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Tiến trình hiện tại sẽ không được lưu lại nhé.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
              >
                Chơi tiếp
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  exitToMenu();
                }}
                className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
              >
                Đổi màn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 10. Helpers vẽ Canvas (đóng gói trong cùng file) ──────────────────────

/**
 * Vẽ 1 đĩa cân (dây treo + đĩa hình ellipse + con vật xếp trên đó).
 *
 * @param endX,endY   Toạ độ đầu đòn cân (gắn dây treo từ điểm này)
 * @param items       Mảng con vật đang nằm trên đĩa
 * @param label       Nhãn nhỏ "Đề bài" / "Của bé"
 * @param colorStops  [highlight, base] cho gradient đĩa
 * @param highlight   Nếu true → viền sáng (đang được hover khi drag)
 */
function drawPan(
  ctx: CanvasRenderingContext2D,
  endX: number,
  endY: number,
  items: AnimalKind[],
  label: string,
  colorStops: [string, string],
  highlight = false,
) {
  const { x: panX, y: panY } = panCenter(endX, endY);

  // (1) 2 sợi dây treo (luôn thẳng đứng)
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(endX - PAN_HALF_W * 0.7, endY);
  ctx.lineTo(panX - PAN_HALF_W * 0.7, panY - PAN_HEIGHT / 2);
  ctx.moveTo(endX + PAN_HALF_W * 0.7, endY);
  ctx.lineTo(panX + PAN_HALF_W * 0.7, panY - PAN_HEIGHT / 2);
  ctx.stroke();

  // (2) Đĩa cân (hình ellipse phẳng)
  const panGrad = ctx.createLinearGradient(0, panY - PAN_HEIGHT / 2, 0, panY + PAN_HEIGHT / 2);
  panGrad.addColorStop(0, colorStops[0]);
  panGrad.addColorStop(1, colorStops[1]);
  ctx.fillStyle = panGrad;
  ctx.beginPath();
  ctx.ellipse(panX, panY, PAN_HALF_W, PAN_HEIGHT / 2 + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = highlight ? '#10b981' : '#475569';
  ctx.lineWidth = highlight ? 4 : 2;
  ctx.stroke();

  // (3) Vòng tròn nhấn nhá nếu đang highlight (vùng nhận thả)
  if (highlight) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(panX, panY - 60, PAN_HALF_W + 16, 90, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // (4) Nhãn dưới đĩa
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, panX, panY + PAN_HEIGHT / 2 + 14);

  // (5) Con vật xếp lên đĩa
  for (let i = 0; i < items.length; i++) {
    const p = itemPosOnPan(i, items.length, panX, panY);
    drawAnimal(ctx, items[i], p.x, p.y, ITEM_PX);
  }
}

/** Vẽ khay chứa (inventory) phía dưới + các slot con vật */
function drawTray(ctx: CanvasRenderingContext2D, animals: AnimalKind[]) {
  const trayX = TRAY_SIDE_PAD;
  const trayW = CANVAS_W - TRAY_SIDE_PAD * 2;

  // Nền khay (bo góc tròn nếu trình duyệt hỗ trợ)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // roundRect được hỗ trợ trên Chrome 99+/Safari 16+/FF 113+ (mục tiêu hiện đại)
  // — fallback dùng rect thường nếu không có
  const anyCtx = ctx as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
  };
  if (typeof anyCtx.roundRect === 'function') {
    anyCtx.roundRect(trayX, TRAY_TOP, trayW, TRAY_HEIGHT, 16);
  } else {
    ctx.rect(trayX, TRAY_TOP, trayW, TRAY_HEIGHT);
  }
  ctx.fill();
  ctx.stroke();

  // Nhãn khay (góc trái trên)
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('🎒 Khay chứa — kéo lên đĩa phải', trayX + 12, TRAY_TOP + 8);

  // Các con vật trong khay
  for (const s of inventorySlots(animals)) {
    // Vòng nền xanh nhạt cho dễ nhìn
    ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, ITEM_PX / 2 + 6, 0, Math.PI * 2);
    ctx.fill();
    drawAnimal(ctx, s.animal, s.x, s.y, ITEM_PX);
  }
}

/** Trang trí nền: vài đám mây + bụi cỏ (tĩnh, vẽ mỗi khung cũng OK vì nhanh) */
function drawDecor(ctx: CanvasRenderingContext2D) {
  // Mây
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  drawCloud(ctx, 90, 50, 22);
  drawCloud(ctx, 700, 70, 18);
  drawCloud(ctx, 580, 35, 14);

  // Cỏ dưới đáy
  ctx.fillStyle = '#86efac';
  ctx.fillRect(0, CANVAS_H - 16, CANVAS_W, 16);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.9, y + r * 0.2, r * 0.85, 0, Math.PI * 2);
  ctx.arc(x - r * 0.9, y + r * 0.2, r * 0.85, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.5, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
}
