import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, playSfx, speak } from '../lib/audio';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Thám Tử Nhí: Truy Tìm Dấu Vết"
 *
 * Trò chơi tư duy logic kiểu suy luận loại trừ (deductive reasoning) cho trẻ
 * 6-10 tuổi. Mỗi màn có một dãy ngôi nhà; mỗi nhà cần đặt 1 CON VẬT (chủ nhân)
 * và 1 MÓN ĂN yêu thích. Bé đọc các MANH MỐI trong "Sổ tay thám tử", suy luận
 * rồi kéo emoji vào đúng ô của từng ngôi nhà, cuối cùng bấm "PHÁ ÁN".
 *
 * KIẾN TRÚC:
 *  - React  : quản lý câu đố, danh sách manh mối, kiểm tra đáp án, Thắng/Thua.
 *  - Canvas : vòng lặp vẽ (requestAnimationFrame) vẽ khu phố + ngôi nhà, xử lý
 *             kéo thả emoji từ khay đạo cụ vào các ô (slot) của ngôi nhà.
 *
 * Quy ước: nhà được đánh số 0..N-1 từ TRÁI sang PHẢI.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. KIỂU DỮ LIỆU
 * ========================================================================= */

type Phase = 'idle' | 'playing' | 'won';

/** Một ô (slot) của ngôi nhà chứa con vật hoặc chứa món ăn. */
type SlotKind = 'animal' | 'food';

/** Định nghĩa màu sắc + tên một ngôi nhà (vị trí cố định trong màn chơi). */
type HouseDef = {
  colorName: string; // "Đỏ", "Vàng"...
  colorIcon: string; // 🟥 🟨 🟦 🟪 — icon màu dùng trong manh mối
  roof: string; // màu mái nhà
  body: string; // màu thân nhà
};

/** Một emoji đạo cụ (con vật hoặc món ăn). */
type ThingDef = { emoji: string; name: string };

/** Một manh mối hiển thị trong "Sổ tay thám tử". */
type Clue = {
  icons: string[]; // các emoji minh hoạ đứng đầu dòng manh mối
  text: string; // nội dung manh mối bằng tiếng Việt
};

/** Định nghĩa tĩnh một màn chơi. */
type LevelDef = {
  id: string;
  name: string;
  difficulty: string;
  emoji: string;
  houses: HouseDef[]; // 3 hoặc 4 ngôi nhà
  animals: ThingDef[];
  foods: ThingDef[];
  /** Đáp án đúng (ẩn với người chơi): mỗi nhà có 1 con vật + 1 món ăn. */
  solution: Array<{ animal: string; food: string }>;
  clues: Clue[];
};

/** Một emoji đạo cụ ở trạng thái runtime (trong lúc chơi). */
type Item = {
  id: string;
  emoji: string;
  name: string;
  kind: SlotKind;
  /** Nhà đang chứa item (0..N-1); -1 nghĩa là đang nằm trong khay đạo cụ. */
  house: number;
  /** Ô cố định của item trong khay đạo cụ (không đổi suốt màn chơi). */
  trayIndex: number;
  /** Nhà ĐÚNG theo đáp án — tính sẵn để kiểm tra kết quả cho nhanh. */
  correctHouse: number;
};

/** Hình chữ nhật một ô (slot) trên canvas. */
type SlotRect = {
  house: number;
  kind: SlotKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Hình học một ngôi nhà để vẽ. */
type HouseGeo = {
  x: number;
  w: number;
  roofTop: number;
  roofH: number;
  bodyTop: number;
  bodyH: number;
};

/** Bố cục canvas — tính lại mỗi khi vào một màn mới. */
type Layout = {
  houses: HouseGeo[];
  slots: SlotRect[]; // 2 ô mỗi nhà
  trayPanel: { x: number; y: number; w: number; h: number };
  traySlots: Array<{ x: number; y: number; w: number; h: number }>; // theo trayIndex
  trayTile: number; // cạnh ô "chip" emoji trong khay
};

/** Trạng thái kéo thả hiện tại. */
type Drag = {
  itemId: string;
  pointerId: number;
  /** Vị trí con trỏ trong khung item lúc nhấc lên, tính theo tỉ lệ 0..1. */
  fx: number;
  fy: number;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  /** Đã kéo đủ xa chưa (để phân biệt với một cú chạm vô tình). */
  moved: boolean;
};

/** Toàn bộ trạng thái ván chơi — nguồn dữ liệu duy nhất cho vòng lặp vẽ. */
type GameState = {
  level: LevelDef;
  layout: Layout;
  items: Item[];
  drag: Drag | null;
};

/* ===========================================================================
 * 2. HẰNG SỐ
 * ========================================================================= */

// Độ phân giải nội bộ của canvas (tỉ lệ ~16:9). Canvas được CSS co giãn vừa khung.
const CANVAS_W = 1000;
const CANVAS_H = 560;

// localStorage: lưu danh sách id màn đã phá án thành công (hiện dấu ✓ ở màn chọn).
const STORE_KEY = 'lingoland_detective';

// Ngưỡng (px canvas) để coi là đang KÉO chứ không phải chạm nhầm.
const DRAG_THRESHOLD = 8;

// Cạnh khung khi vẽ emoji lúc đang được kéo theo con trỏ.
const DRAG_TILE = 100;

// Điểm thưởng khi phá án thành công từng màn.
const WIN_SCORE = [40, 60, 90];

/* ===========================================================================
 * 3. HÀM THUẦN (KHÔNG PHỤ THUỘC REACT)
 * ========================================================================= */

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ===========================================================================
 * 4. HỆ THỐNG MÀN CHƠI (LEVELS_DATA)
 *
 * Mỗi màn được thiết kế sao cho bộ manh mối XÁC ĐỊNH DUY NHẤT một lời giải.
 * ========================================================================= */

// Màu sắc dùng lại cho các ngôi nhà.
const HOUSE_RED: HouseDef = { colorName: 'Đỏ', colorIcon: '🟥', roof: '#b91c1c', body: '#fca5a5' };
const HOUSE_YELLOW: HouseDef = { colorName: 'Vàng', colorIcon: '🟨', roof: '#d97706', body: '#fcd34d' };
const HOUSE_BLUE: HouseDef = { colorName: 'Xanh dương', colorIcon: '🟦', roof: '#1d4ed8', body: '#93c5fd' };
const HOUSE_PURPLE: HouseDef = { colorName: 'Tím', colorIcon: '🟪', roof: '#6d28d9', body: '#c4b5fd' };

const LEVELS_DATA: LevelDef[] = [
  // ── Màn 1 (Thám tử tập sự): 3 nhà, manh mối trực tiếp, loại trừ đơn giản ──
  {
    id: 'detective.1',
    name: 'Thám tử tập sự',
    difficulty: 'Dễ',
    emoji: '🔎',
    houses: [HOUSE_RED, HOUSE_YELLOW, HOUSE_BLUE],
    animals: [
      { emoji: '🐶', name: 'chó' },
      { emoji: '🐱', name: 'mèo' },
      { emoji: '🐰', name: 'thỏ' },
    ],
    foods: [
      { emoji: '🦴', name: 'xương' },
      { emoji: '🐟', name: 'cá' },
      { emoji: '🥕', name: 'cà rốt' },
    ],
    // Nhà 0 Đỏ: chó/xương · Nhà 1 Vàng: mèo/cá · Nhà 2 Xanh: thỏ/cà rốt
    solution: [
      { animal: '🐶', food: '🦴' },
      { animal: '🐱', food: '🐟' },
      { animal: '🐰', food: '🥕' },
    ],
    clues: [
      { icons: ['🐱'], text: 'Chú Mèo sống ở ngôi nhà chính giữa.' },
      { icons: ['🐶', '🟥'], text: 'Chú Chó sống ở ngôi nhà màu Đỏ.' },
      { icons: ['🐶', '🦴'], text: 'Chú Chó rất thích gặm Xương.' },
      { icons: ['🐱', '🐟'], text: 'Chú Mèo thì thích ăn Cá.' },
    ],
  },

  // ── Màn 2 (Thám tử tài ba): 3 nhà, manh mối bắc cầu + định vị ────────────
  {
    id: 'detective.2',
    name: 'Thám tử tài ba',
    difficulty: 'Trung bình',
    emoji: '🕵️',
    houses: [HOUSE_RED, HOUSE_YELLOW, HOUSE_BLUE],
    animals: [
      { emoji: '🐶', name: 'chó' },
      { emoji: '🐱', name: 'mèo' },
      { emoji: '🐰', name: 'thỏ' },
    ],
    foods: [
      { emoji: '🦴', name: 'xương' },
      { emoji: '🐟', name: 'cá' },
      { emoji: '🥕', name: 'cà rốt' },
    ],
    // Nhà 0 Đỏ: thỏ/cà rốt · Nhà 1 Vàng: chó/cá · Nhà 2 Xanh: mèo/xương
    solution: [
      { animal: '🐰', food: '🥕' },
      { animal: '🐶', food: '🐟' },
      { animal: '🐱', food: '🦴' },
    ],
    clues: [
      {
        icons: ['🟥', '➡️', '🐟'],
        text: 'Ngôi nhà màu Đỏ nằm ngay bên trái ngôi nhà của bạn thích ăn Cá.',
      },
      { icons: ['🐶', '🐟'], text: 'Chú Chó thích ăn Cá.' },
      { icons: ['🐰', '🚫', '🟦'], text: 'Chú Thỏ KHÔNG sống ở ngôi nhà màu Xanh dương.' },
      { icons: ['🐱', '🦴'], text: 'Chú Mèo thích gặm Xương.' },
    ],
  },

  // ── Màn 3 (Trưởng phòng thám tử): 4 nhà, manh mối đan cài nhiều bước ─────
  {
    id: 'detective.3',
    name: 'Trưởng phòng thám tử',
    difficulty: 'Khó',
    emoji: '🧐',
    houses: [HOUSE_RED, HOUSE_YELLOW, HOUSE_BLUE, HOUSE_PURPLE],
    animals: [
      { emoji: '🐱', name: 'mèo' },
      { emoji: '🐵', name: 'khỉ' },
      { emoji: '🐶', name: 'chó' },
      { emoji: '🐰', name: 'thỏ' },
    ],
    foods: [
      { emoji: '🐟', name: 'cá' },
      { emoji: '🍌', name: 'chuối' },
      { emoji: '🦴', name: 'xương' },
      { emoji: '🥕', name: 'cà rốt' },
    ],
    // Nhà 0 Đỏ: mèo/cá · Nhà 1 Vàng: khỉ/chuối · Nhà 2 Xanh: chó/xương · Nhà 3 Tím: thỏ/cà rốt
    solution: [
      { animal: '🐱', food: '🐟' },
      { animal: '🐵', food: '🍌' },
      { animal: '🐶', food: '🦴' },
      { animal: '🐰', food: '🥕' },
    ],
    clues: [
      { icons: ['🐵', '🍌'], text: 'Chú Khỉ rất thích ăn Chuối.' },
      { icons: ['🍌', '🟨'], text: 'Bạn thích ăn Chuối sống ở ngôi nhà màu Vàng.' },
      { icons: ['🐱', '➡️', '🐵'], text: 'Chú Mèo sống ngay bên trái Chú Khỉ.' },
      { icons: ['🐶', '🟦'], text: 'Chú Chó sống ở ngôi nhà màu Xanh dương.' },
      { icons: ['🐱', '🐟'], text: 'Chú Mèo thích ăn Cá.' },
      {
        icons: ['🐶', '🚫', '🥕', '🐟'],
        text: 'Chú Chó không thích ăn Cà rốt và cũng không thích ăn Cá.',
      },
    ],
  },
];

/* ===========================================================================
 * 5. KHỞI TẠO MÀN CHƠI
 * ========================================================================= */

/** Tính bố cục canvas: vị trí các ngôi nhà, các ô slot và khay đạo cụ. */
function computeLayout(level: LevelDef): Layout {
  const n = level.houses.length;

  // ── Dãy ngôi nhà ───────────────────────────────────────────────────────
  const marginX = 46;
  const gap = n === 3 ? 30 : 24;
  const roofTop = 54;
  const roofH = 60;
  const bodyTop = roofTop + roofH; // 114
  const bodyH = 190; // thân nhà kết thúc ở y = 304
  const houseW = (CANVAS_W - marginX * 2 - gap * (n - 1)) / n;

  const houses: HouseGeo[] = [];
  const slots: SlotRect[] = [];
  const slotPad = 16;
  const slotH = 70;
  for (let i = 0; i < n; i++) {
    const x = marginX + i * (houseW + gap);
    houses.push({ x, w: houseW, roofTop, roofH, bodyTop, bodyH });
    // 2 ô xếp dọc trong thân nhà: ô CON VẬT ở trên, ô MÓN ĂN ở dưới.
    const slotX = x + slotPad;
    const slotW = houseW - slotPad * 2;
    slots.push({ house: i, kind: 'animal', x: slotX, y: bodyTop + 32, w: slotW, h: slotH });
    slots.push({ house: i, kind: 'food', x: slotX, y: bodyTop + 32 + slotH + 8, w: slotW, h: slotH });
  }

  // ── Khay đạo cụ (panel phía dưới) ──────────────────────────────────────
  const trayTop = bodyTop + bodyH + 16; // 320
  const trayPanel = { x: 14, y: trayTop, w: CANVAS_W - 28, h: CANVAS_H - trayTop - 14 };
  const itemCount = level.animals.length + level.foods.length;
  const trayInnerPad = 30;
  const cellW = (CANVAS_W - trayInnerPad * 2) / itemCount;
  const cellTop = trayTop + 40; // chừa chỗ vẽ nhãn "KHAY ĐẠO CỤ"
  const cellH = trayPanel.y + trayPanel.h - cellTop - 14;
  const traySlots = Array.from({ length: itemCount }, (_, i) => ({
    x: trayInnerPad + i * cellW,
    y: cellTop,
    w: cellW,
    h: cellH,
  }));
  // Cạnh ô chip — vuông, vừa trong ô khay, giới hạn để không quá to.
  const trayTile = Math.min(120, Math.floor(Math.min(cellW, cellH) * 0.92));

  return { houses, slots, trayPanel, traySlots, trayTile };
}

/** Tạo danh sách emoji đạo cụ runtime cho một màn (xếp lộn xộn vào khay). */
function buildItems(level: LevelDef): Item[] {
  const raw: Item[] = [];
  for (const a of level.animals) {
    raw.push({
      id: 'a-' + a.emoji,
      emoji: a.emoji,
      name: a.name,
      kind: 'animal',
      house: -1,
      trayIndex: 0,
      correctHouse: level.solution.findIndex((s) => s.animal === a.emoji),
    });
  }
  for (const f of level.foods) {
    raw.push({
      id: 'f-' + f.emoji,
      emoji: f.emoji,
      name: f.name,
      kind: 'food',
      house: -1,
      trayIndex: 0,
      correctHouse: level.solution.findIndex((s) => s.food === f.emoji),
    });
  }
  // Xáo trộn rồi gán ô khay cố định theo thứ tự đã xáo.
  const shuffled = shuffle(raw);
  shuffled.forEach((it, i) => {
    it.trayIndex = i;
  });
  return shuffled;
}

/* ===========================================================================
 * 6. LOGIC LÕI — VỊ TRÍ, BẮT ĐIỂM CHẠM
 * ========================================================================= */

/** Lấy ô slot (house, kind) trong layout. */
function slotOf(layout: Layout, house: number, kind: SlotKind): SlotRect | undefined {
  return layout.slots.find((s) => s.house === house && s.kind === kind);
}

/** Tìm item đang nằm trong một slot (house, kind), bỏ qua item `excludeId`. */
function itemInSlot(items: Item[], house: number, kind: SlotKind, excludeId?: string): Item | undefined {
  return items.find((i) => i.id !== excludeId && i.house === house && i.kind === kind);
}

/** Khung hình chữ nhật hiện tại của một item (đang trong khay hoặc trong slot). */
function itemBox(g: GameState, item: Item): { x: number; y: number; w: number; h: number } {
  if (item.house < 0) {
    // Đang ở khay: chip vuông căn giữa trong ô khay của item.
    const cell = g.layout.traySlots[item.trayIndex];
    const s = g.layout.trayTile;
    return { x: cell.x + (cell.w - s) / 2, y: cell.y + (cell.h - s) / 2, w: s, h: s };
  }
  // Đang trong một ngôi nhà: chiếm trọn ô slot tương ứng.
  const slot = slotOf(g.layout, item.house, item.kind)!;
  return { x: slot.x, y: slot.y, w: slot.w, h: slot.h };
}

/** Tìm item nằm dưới điểm (px, py) — null nếu không trúng item nào. */
function itemAtPoint(g: GameState, px: number, py: number): Item | null {
  for (const it of g.items) {
    // Bỏ qua item đang được kéo (xử lý riêng).
    if (g.drag && g.drag.moved && g.drag.itemId === it.id) continue;
    const b = itemBox(g, it);
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return it;
  }
  return null;
}

/**
 * Tìm slot HỢP LỆ nằm dưới điểm (px, py) cho một item thuộc loại `kind`.
 * Chỉ trả về slot CÙNG LOẠI (con vật chỉ vào ô con vật, món ăn vào ô món ăn).
 */
function slotAtPoint(layout: Layout, px: number, py: number, kind: SlotKind): SlotRect | null {
  for (const s of layout.slots) {
    if (s.kind !== kind) continue;
    if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) return s;
  }
  return null;
}

/* ===========================================================================
 * 7. COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function DetectiveCluesView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── Trạng thái React (giao diện ngoài canvas) ───────────────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [levelIdx, setLevelIdx] = useState(0);
  const [placedCount, setPlacedCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  // Thông báo kết quả sau khi bấm "PHÁ ÁN".
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [checkTone, setCheckTone] = useState<'wrong' | 'info'>('info');
  const [completed, setCompleted] = useState<string[]>(() => {
    // Đọc danh sách màn đã hoàn thành từ localStorage.
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === 'string');
        }
      }
    } catch {
      // dữ liệu hỏng → coi như chưa hoàn thành màn nào
    }
    return [];
  });

  // ── Refs (nguồn dữ liệu cho vòng lặp vẽ, không gây render lại) ───────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  // Mây trắng trôi (tạo 1 lần, để vị trí ổn định giữa các frame).
  const cloudsRef = useRef<Array<{ x: number; y: number; scale: number; speed: number }>>([]);

  if (cloudsRef.current.length === 0) {
    cloudsRef.current = [
      { x: 130, y: 70, scale: 1.0, speed: 7 },
      { x: 430, y: 44, scale: 0.8, speed: 5 },
      { x: 720, y: 80, scale: 1.15, speed: 9 },
      { x: 900, y: 40, scale: 0.7, speed: 6 },
    ];
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 7a. BẮT ĐẦU / RESET MÀN
   * ───────────────────────────────────────────────────────────────────── */

  const startLevel = useCallback((idx: number) => {
    const level = LEVELS_DATA[idx];
    gameRef.current = {
      level,
      layout: computeLayout(level),
      items: buildItems(level),
      drag: null,
    };
    setLevelIdx(idx);
    setPlacedCount(0);
    setHintCount(0);
    setCheckMsg(null);
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  /** Đồng bộ vài chỉ số ra React để giao diện cập nhật. */
  const syncUi = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    setPlacedCount(g.items.filter((i) => i.house >= 0).length);
    // Bàn chơi vừa thay đổi → xoá kết quả "PHÁ ÁN" cũ cho khỏi gây hiểu nhầm.
    setCheckMsg(null);
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
   * 7b. PHÁ ÁN / GỢI Ý / XÓA HẾT
   * ───────────────────────────────────────────────────────────────────── */

  const handleWin = useCallback(() => {
    if (phaseRef.current === 'won') return; // tránh kích hoạt 2 lần
    const g = gameRef.current;
    if (!g) return;
    phaseRef.current = 'won';
    setPhase('won');

    // Lưu màn đã phá án thành công.
    setCompleted((prev) => {
      if (prev.includes(g.level.id)) return prev;
      const next = [...prev, g.level.id];
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // bỏ qua nếu localStorage không khả dụng
      }
      return next;
    });

    addScore(WIN_SCORE[levelIdx] ?? 50);
    playSfx('snd-correct');
    confetti({
      particleCount: 220,
      spread: 110,
      startVelocity: 45,
      origin: { y: 0.45 },
      colors: ['#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#fbbf24'],
    });
    window.setTimeout(() => speak('Phá án thành công! Thám tử nhí giỏi quá', LANG_SPEAK_DEFAULT), 300);
  }, [addScore, levelIdx]);

  /** Nút "PHÁ ÁN" — so khớp các vị trí đã đặt với ma trận đáp án đúng. */
  const handleSolve = useCallback(() => {
    const g = gameRef.current;
    if (!g || phaseRef.current !== 'playing') return;

    // Phải đặt đủ con vật + món ăn cho mọi ngôi nhà mới kiểm tra được.
    if (g.items.some((i) => i.house < 0)) {
      setCheckTone('info');
      setCheckMsg('Hãy đặt đủ con vật và món ăn vào tất cả ngôi nhà rồi mới phá án nhé!');
      playSfx('snd-wrong');
      return;
    }

    // Đếm số vị trí chưa khớp đáp án.
    const wrong = g.items.filter((i) => i.house !== i.correctHouse).length;
    if (wrong === 0) {
      handleWin();
    } else {
      setCheckTone('wrong');
      setCheckMsg(`Chưa đúng rồi! Còn ${wrong} vị trí chưa chính xác — xem lại manh mối nhé.`);
      playSfx('snd-wrong');
    }
  }, [handleWin]);

  /** Nút "GỢI Ý" — đặt đúng giúp bé MỘT vị trí còn sai/còn trống. */
  const handleHint = useCallback(() => {
    const g = gameRef.current;
    if (!g || phaseRef.current !== 'playing') return;

    // Tìm item đầu tiên đang nằm sai nhà (hoặc còn ở khay).
    const target = g.items.find((i) => i.house !== i.correctHouse);
    if (!target) return; // đã đúng hết — không cần gợi ý

    // Nếu ô đích đang bị một item khác chiếm sai chỗ → trả item đó về khay.
    const occupant = itemInSlot(g.items, target.correctHouse, target.kind, target.id);
    if (occupant) occupant.house = -1;
    target.house = target.correctHouse; // đặt item vào đúng nhà

    playSfx('snd-correct');
    setHintCount((c) => c + 1);
    syncUi();
  }, [syncUi]);

  /** Nút "XÓA HẾT MÀN" — trả mọi emoji về khay đạo cụ. */
  const handleClearAll = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    for (const it of g.items) it.house = -1;
    syncUi();
  }, [syncUi]);

  /* ─────────────────────────────────────────────────────────────────────
   * 7c. CHUYỂN ĐỔI TOẠ ĐỘ MÀN HÌNH → CANVAS
   * ───────────────────────────────────────────────────────────────────── */

  const toCanvasCoords = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Canvas có độ phân giải nội bộ cố định nhưng bị CSS co giãn → quy đổi lại.
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  /* ─────────────────────────────────────────────────────────────────────
   * 7d. XỬ LÝ KÉO THẢ (Pointer Events — dùng chung cho chuột & cảm ứng)
   * ───────────────────────────────────────────────────────────────────── */

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || phaseRef.current !== 'playing') return;
    const { x, y } = toCanvasCoords(e);
    const item = itemAtPoint(g, x, y);
    if (!item) return;

    // Bắt giữ con trỏ để vẫn nhận sự kiện kể cả khi kéo ra ngoài canvas.
    e.currentTarget.setPointerCapture(e.pointerId);

    // Vị trí con trỏ trong khung item, quy về tỉ lệ 0..1 (bất biến với cỡ vẽ).
    const box = itemBox(g, item);
    g.drag = {
      itemId: item.id,
      pointerId: e.pointerId,
      fx: (x - box.x) / box.w,
      fy: (y - box.y) / box.h,
      startX: x,
      startY: y,
      pointerX: x,
      pointerY: y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || !g.drag || g.drag.pointerId !== e.pointerId) return;
    const { x, y } = toCanvasCoords(e);
    g.drag.pointerX = x;
    g.drag.pointerY = y;
    if (
      !g.drag.moved &&
      Math.hypot(x - g.drag.startX, y - g.drag.startY) > DRAG_THRESHOLD
    ) {
      g.drag.moved = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || !g.drag || g.drag.pointerId !== e.pointerId) return;
    const drag = g.drag;
    const item = g.items.find((i) => i.id === drag.itemId);
    g.drag = null;
    if (!item) return;

    // Một cú chạm (không kéo) → không làm gì cả.
    if (!drag.moved) return;

    // Tâm của emoji lúc thả tay = nơi quyết định emoji rơi vào ô nào.
    const centerX = drag.pointerX - drag.fx * DRAG_TILE + DRAG_TILE / 2;
    const centerY = drag.pointerY - drag.fy * DRAG_TILE + DRAG_TILE / 2;
    const slot = slotAtPoint(g.layout, centerX, centerY, item.kind);

    if (slot) {
      // Thả trúng một ô hợp lệ → nếu ô đã có đồ cũ, đồ cũ bay về khay.
      const occupant = itemInSlot(g.items, slot.house, item.kind, item.id);
      if (occupant) occupant.house = -1;
      item.house = slot.house;
      playSfx('snd-correct');
    } else {
      // Thả ra ngoài (hoặc trúng ô sai loại) → emoji quay về khay đạo cụ.
      item.house = -1;
    }
    syncUi();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || !g.drag || g.drag.pointerId !== e.pointerId) return;
    g.drag = null;
  };

  /* ─────────────────────────────────────────────────────────────────────
   * 7e. VẼ CANVAS
   * ───────────────────────────────────────────────────────────────────── */

  /** Vẽ một hình chữ nhật bo góc (tự dựng path để chạy trên mọi trình duyệt). */
  const roundRectPath = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };

  /** Vẽ một emoji căn giữa tại (cx, cy) với cỡ chữ `size`. */
  const drawEmoji = (
    ctx: CanvasRenderingContext2D,
    emoji: string,
    cx: number,
    cy: number,
    size: number,
  ) => {
    ctx.font = `${Math.floor(size)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy);
  };

  /** Vẽ một đám mây trắng đơn giản (chùm hình tròn). */
  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (const [dx, dy, r] of [
      [0, 0, 26],
      [24, 6, 20],
      [-24, 6, 20],
      [4, -14, 18],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /** Vẽ một cái cây xanh mờ (trang trí nền). */
  const drawTree = (ctx: CanvasRenderingContext2D, x: number, baseY: number) => {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x - 7, baseY - 54, 14, 54);
    ctx.fillStyle = '#16a34a';
    for (const [dx, dy, r] of [
      [0, -78, 34],
      [-22, -58, 26],
      [22, -58, 26],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, baseY + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /** Vẽ toàn bộ khung hình — gọi mỗi frame bởi vòng lặp requestAnimationFrame. */
  const drawScene = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const g = gameRef.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { layout, level } = g;

    // ── Bầu trời ────────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, '#7dd3fc');
    sky.addColorStop(0.55, '#e0f2fe');
    sky.addColorStop(1, '#fef9c3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Mây trắng trôi chậm sang phải, ra khỏi mép thì vòng lại.
    for (const c of cloudsRef.current) {
      const x = ((c.x + time * 0.001 * c.speed) % (CANVAS_W + 160)) - 80;
      drawCloud(ctx, x, c.y, c.scale);
    }

    // ── Mặt đất + cây xanh (nằm sau dãy nhà) ────────────────────────────
    const groundY = layout.houses[0].bodyTop + layout.houses[0].bodyH;
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, groundY - 34, CANVAS_W, layout.trayPanel.y - (groundY - 34) + 10);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, groundY - 34, CANVAS_W, 6);
    drawTree(ctx, 30, groundY);
    drawTree(ctx, CANVAS_W - 28, groundY);

    // ── Tiêu đề khu phố ─────────────────────────────────────────────────
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 24px Nunito, sans-serif';
    ctx.fillText('🔍 KHU PHỐ BÍ ẨN', CANVAS_W / 2, 26);

    // ── Từng ngôi nhà ───────────────────────────────────────────────────
    for (let i = 0; i < layout.houses.length; i++) {
      const h = layout.houses[i];
      const def = level.houses[i];

      // Thân nhà (hình chữ nhật bo góc dưới).
      roundRectPath(ctx, h.x, h.bodyTop, h.w, h.bodyH, 10);
      ctx.fillStyle = def.body;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = def.roof;
      ctx.stroke();

      // Mái nhà (hình tam giác, hơi nhô ra hai bên thân).
      ctx.beginPath();
      ctx.moveTo(h.x - 10, h.bodyTop + 2);
      ctx.lineTo(h.x + h.w / 2, h.roofTop);
      ctx.lineTo(h.x + h.w + 10, h.bodyTop + 2);
      ctx.closePath();
      ctx.fillStyle = def.roof;
      ctx.fill();

      // Ống khói nhỏ trên mái cho sinh động.
      ctx.fillStyle = def.roof;
      ctx.fillRect(h.x + h.w * 0.7, h.roofTop + 6, 12, 22);

      // Nhãn "Nhà số i — màu" ở đầu thân nhà.
      ctx.fillStyle = 'rgba(15,23,42,0.78)';
      ctx.font = '800 14px Nunito, sans-serif';
      ctx.fillText(`Nhà ${i + 1} · ${def.colorName}`, h.x + h.w / 2, h.bodyTop + 18);
    }

    // ── Các ô slot ──────────────────────────────────────────────────────
    // Tâm emoji lúc kéo — để tô sáng ô đích bên dưới con trỏ.
    let hoverSlot: SlotRect | null = null;
    if (g.drag && g.drag.moved) {
      const dragItem = g.items.find((it) => it.id === g.drag!.itemId);
      if (dragItem) {
        const cx = g.drag.pointerX - g.drag.fx * DRAG_TILE + DRAG_TILE / 2;
        const cy = g.drag.pointerY - g.drag.fy * DRAG_TILE + DRAG_TILE / 2;
        hoverSlot = slotAtPoint(layout, cx, cy, dragItem.kind);
      }
    }

    for (const s of layout.slots) {
      const occupant = itemInSlot(g.items, s.house, s.kind);
      const isHover = hoverSlot === s;
      if (occupant && !(g.drag && g.drag.moved && g.drag.itemId === occupant.id)) {
        // Ô đã có đồ: vẽ nền trắng nổi bật.
        roundRectPath(ctx, s.x, s.y, s.w, s.h, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#94a3b8';
        ctx.stroke();
      } else {
        // Ô trống: vẽ nét đứt + emoji gợi ý mờ (🐾 cho con vật, 🍽️ cho món ăn).
        ctx.save();
        ctx.setLineDash([7, 6]);
        ctx.lineWidth = isHover ? 4 : 2.5;
        ctx.strokeStyle = isHover ? '#22c55e' : 'rgba(15,23,42,0.4)';
        roundRectPath(ctx, s.x, s.y, s.w, s.h, 12);
        if (isHover) {
          ctx.fillStyle = 'rgba(34,197,94,0.18)';
          ctx.fill();
        }
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 0.28;
        drawEmoji(ctx, s.kind === 'animal' ? '🐾' : '🍽️', s.x + s.w / 2, s.y + s.h / 2, s.h * 0.62);
        ctx.globalAlpha = 1;
      }
    }

    // ── Khay đạo cụ ─────────────────────────────────────────────────────
    roundRectPath(ctx, layout.trayPanel.x, layout.trayPanel.y, layout.trayPanel.w, layout.trayPanel.h, 18);
    ctx.fillStyle = '#78350f';
    ctx.fill();
    roundRectPath(
      ctx,
      layout.trayPanel.x + 6,
      layout.trayPanel.y + 6,
      layout.trayPanel.w - 12,
      layout.trayPanel.h - 12,
      14,
    );
    ctx.fillStyle = '#b45309';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '900 18px Nunito, sans-serif';
    ctx.fillText('🧰 KHAY ĐẠO CỤ', CANVAS_W / 2, layout.trayPanel.y + 24);

    // ── Vẽ tất cả item (trừ item đang được kéo) ─────────────────────────
    const draggingId = g.drag && g.drag.moved ? g.drag.itemId : null;
    for (const it of g.items) {
      if (it.id === draggingId) continue;
      const box = itemBox(g, it);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      if (it.house < 0) {
        // Trong khay: vẽ "chip" trắng bo góc làm nền cho emoji.
        roundRectPath(ctx, box.x, box.y, box.w, box.h, 14);
        ctx.fillStyle = '#fffbeb';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fcd34d';
        ctx.stroke();
        drawEmoji(ctx, it.emoji, cx, cy, box.w * 0.6);
      } else {
        // Trong slot: vẽ emoji to chiếm gần trọn ô.
        drawEmoji(ctx, it.emoji, cx, cy, box.h * 0.74);
      }
    }

    // ── Item đang được kéo (vẽ sau cùng, nằm trên hết) ──────────────────
    if (draggingId && g.drag) {
      const it = g.items.find((i) => i.id === draggingId);
      if (it) {
        const x = g.drag.pointerX - g.drag.fx * DRAG_TILE;
        const y = g.drag.pointerY - g.drag.fy * DRAG_TILE;
        ctx.save();
        ctx.shadowColor = 'rgba(15,23,42,0.45)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        roundRectPath(ctx, x, y, DRAG_TILE, DRAG_TILE, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        drawEmoji(ctx, it.emoji, x + DRAG_TILE / 2, y + DRAG_TILE / 2, DRAG_TILE * 0.64);
      }
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
   * 7f. VÒNG LẶP VẼ (Animation Loop) + DỌN DẸP
   * ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    // Chỉ chạy vòng lặp vẽ khi đang trong màn chơi.
    if (phase !== 'playing') return;
    const loop = (ts: number) => {
      drawScene(ts);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    // Hàm dọn dẹp: huỷ vòng lặp khi rời màn chơi hoặc component unmount.
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, drawScene]);

  // Lời nhắc bằng giọng nói khi vừa vào màn chơi.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = window.setTimeout(() => {
      speak('Đọc kỹ manh mối rồi suy luận xem ai sống ở đâu nhé', LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, [phase, levelIdx]);

  /* ─────────────────────────────────────────────────────────────────────
   * 7g. MÀN HÌNH CHỌN CẤP ĐỘ (idle)
   * ───────────────────────────────────────────────────────────────────── */

  if (phase === 'idle') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Trò Chơi
        </button>
        <div className="text-center py-4 max-w-md mx-auto">
          <div className="text-7xl mb-4 floating">🔍</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 bg-clip-text text-transparent leading-tight">
            Thám Tử Nhí: Truy Tìm Dấu Vết
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Đọc các manh mối trong sổ tay, suy luận xem con vật nào sống ở ngôi
            nhà nào và thích ăn món gì nhé!
          </p>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-5 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">📖</span> Đọc manh mối trong "Sổ tay thám tử".
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">✋</span> Kéo con vật và món ăn vào đúng ngôi nhà.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🔦</span> Bấm "PHÁ ÁN" để kiểm tra kết quả.
            </div>
          </div>

          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Chọn cấp độ
          </p>
          <div className="space-y-3">
            {LEVELS_DATA.map((lv, i) => {
              const done = completed.includes(lv.id);
              return (
                <button
                  key={lv.id}
                  onClick={() => startLevel(i)}
                  className="w-full p-5 bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-600 text-white rounded-3xl shadow-lg shadow-amber-200 active:scale-95 transition-all flex items-center gap-4 text-left"
                >
                  <div className="text-4xl">{lv.emoji}</div>
                  <div className="flex-1">
                    <div className="font-black text-lg leading-tight">
                      Màn {i + 1}: {lv.name}
                    </div>
                    <div className="text-xs opacity-90 font-bold mt-0.5">
                      {lv.houses.length} ngôi nhà · {lv.clues.length} manh mối ·{' '}
                      {lv.difficulty}
                    </div>
                  </div>
                  {done ? (
                    <span className="text-emerald-200 text-xl font-black">✓</span>
                  ) : (
                    <span className="text-xl">▶️</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 7h. MÀN HÌNH CHÚC MỪNG (won) — hiệu ứng kính lúp phóng to + pháo hoa
   * ───────────────────────────────────────────────────────────────────── */

  if (phase === 'won') {
    const level = LEVELS_DATA[levelIdx];
    const isLast = levelIdx >= LEVELS_DATA.length - 1;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        {/* Kính lúp phóng to dần — lớp lớn mờ phía sau + biểu tượng nảy lên */}
        <div className="relative h-28 mb-2 flex items-center justify-center">
          <div className="absolute text-9xl opacity-10 animate-in zoom-in duration-700">
            🔍
          </div>
          <div className="text-7xl floating animate-in zoom-in duration-500">🔍</div>
        </div>
        <h2 className="text-2xl font-black mb-2 bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 bg-clip-text text-transparent leading-tight">
          Phá án thành công! 🎉
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Thám tử nhí đã tìm ra ai sống ở đâu. Quá xuất sắc!
        </p>

        {/* Bảng tổng kết lời giải của vụ án */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 mb-4">
          <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">
            Hồ sơ vụ án · Màn {levelIdx + 1}
          </div>
          <div className="space-y-1.5">
            {level.solution.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700"
              >
                <span className="text-base">{level.houses[i].colorIcon}</span>
                <span>Nhà {i + 1}:</span>
                <span className="text-xl">{s.animal}</span>
                <span className="text-slate-400">thích ăn</span>
                <span className="text-xl">{s.food}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-3xl p-4 mb-6">
          <div className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
            +{WIN_SCORE[levelIdx] ?? 50} điểm
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {hintCount > 0 ? `Đã dùng ${hintCount} gợi ý` : 'Không dùng gợi ý — siêu đỉnh!'}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!isLast && (
            <button
              onClick={() => startLevel(levelIdx + 1)}
              className="w-full py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all"
            >
              🕵️ Vụ án tiếp theo
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
            >
              Quay lại
            </button>
            <button
              onClick={() => startLevel(levelIdx)}
              className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 active:scale-95 transition-all"
            >
              🔄 Chơi lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 7i. MÀN HÌNH CHƠI (playing)
   * ───────────────────────────────────────────────────────────────────── */

  const level = LEVELS_DATA[levelIdx];
  const totalSlots = level.houses.length * 2;

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Thanh trên: thoát + tên màn + số ô đã đặt */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          {level.emoji} Màn {levelIdx + 1}: {level.name}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Đã đặt{' '}
          <span className="text-amber-600 text-base ml-0.5">
            {placedCount}/{totalSlots}
          </span>
        </div>
      </div>

      {/* Sổ tay thám tử — danh sách manh mối */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-4 mb-3 shadow-inner">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-dashed border-amber-300">
          <span className="text-2xl">📒</span>
          <h3 className="font-black text-amber-900">Sổ tay thám tử</h3>
          <span className="text-[10px] font-bold text-amber-500 ml-auto uppercase tracking-widest">
            Manh mối
          </span>
        </div>
        <ol className="space-y-2">
          {level.clues.map((clue, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 text-sm font-semibold text-amber-900 leading-snug">
                <span className="mr-1 text-base align-middle">{clue.icons.join(' ')}</span>
                {clue.text}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Canvas khu phố + khay đạo cụ */}
      <div className="rounded-3xl overflow-hidden border-4 border-amber-300 shadow-lg shadow-amber-100">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none', // chặn cuộn trang khi kéo emoji trên cảm ứng
          }}
        />
      </div>

      {/* Thông báo kết quả sau khi bấm PHÁ ÁN */}
      {checkMsg && (
        <div
          className={`mt-3 rounded-2xl px-4 py-3 text-sm font-bold text-center animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            checkTone === 'wrong'
              ? 'bg-rose-50 text-rose-600 border-2 border-rose-200'
              : 'bg-sky-50 text-sky-600 border-2 border-sky-200'
          }`}
        >
          {checkMsg}
        </div>
      )}

      {/* Nút điều khiển: PHÁ ÁN (chính) + GỢI Ý + XÓA HẾT MÀN */}
      <button
        onClick={handleSolve}
        className="w-full mt-3 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-amber-200 active:scale-95 transition-all"
      >
        🔦 PHÁ ÁN
      </button>
      <div className="flex gap-3 mt-3">
        <button
          onClick={handleHint}
          className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 active:scale-95 transition-all"
        >
          💡 GỢI Ý{hintCount > 0 ? ` (${hintCount})` : ''}
        </button>
        <button
          onClick={handleClearAll}
          className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
        >
          🧹 XÓA HẾT MÀN
        </button>
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Kéo emoji từ khay vào ô của ngôi nhà · Kéo emoji ra ngoài để xoá
      </p>
    </div>
  );
}
