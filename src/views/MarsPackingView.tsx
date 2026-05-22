import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, playSfx, speak } from '../lib/audio';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Sắp Xếp Hành Lý Đến Sao Hỏa"
 *
 * Trò chơi tư duy logic kiểu xếp hình (polyomino packing) cho trẻ 6-10 tuổi.
 * Người chơi kéo các khối hành lý (nhiều hình dạng) vào khoang tàu vũ trụ sao
 * cho lấp đầy 100% các ô trống. Có thể XOAY khối để vừa khít.
 *
 * KIẾN TRÚC:
 *  - React  : quản lý cấp độ, trạng thái Thắng, danh sách khối, điểm số.
 *  - Canvas : vòng lặp vẽ (requestAnimationFrame) vẽ lưới + khối, xử lý kéo
 *             thả, hút khối vào lưới (grid snapping) và xoay khối.
 *
 * Mọi toạ độ "ô" (cell) dùng quy ước: x = cột (col), y = hàng (row).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. KIỂU DỮ LIỆU
 * ========================================================================= */

type Phase = 'idle' | 'playing' | 'won';

/** Toạ độ một ô nhỏ — cục bộ (so với góc khối) hoặc tuyệt đối (trên lưới). */
type Cell = { x: number; y: number };

/** Định nghĩa tĩnh một khối hành lý trong LEVELS_DATA. */
type PieceDef = {
  /** Mảng toạ độ cục bộ mô tả hình dạng khối (đã chuẩn hoá về gốc 0,0). */
  cells: Cell[];
};

/** Định nghĩa tĩnh một màn chơi. */
type LevelDef = {
  id: string;
  name: string;
  difficulty: string; // nhãn độ khó hiển thị cho phụ huynh
  emoji: string;
  cols: number;
  rows: number;
  /** Danh sách ô bị cản (-1) — không được đặt hành lý lên. */
  blocked: Array<[number, number]>; // [col, row]
  pieces: PieceDef[];
};

/** Bảng màu cho khối — mỗi khối một màu rực rỡ riêng để bé dễ phân biệt. */
type PieceColor = { name: string; light: string; base: string; dark: string };

/** Khối hành lý ở trạng thái runtime (trong lúc chơi). */
type Piece = {
  id: number;
  /** Hình dạng hiện tại (thay đổi mỗi lần xoay), luôn được chuẩn hoá về (0,0). */
  cells: Cell[];
  color: PieceColor;
  emoji: string;
  /** true = đang nằm trong lưới khoang tàu; false = đang ở khay chứa. */
  onGrid: boolean;
  /** Vị trí ô góc trên-trái của khối trên lưới (chỉ dùng khi onGrid = true). */
  gridCol: number;
  gridRow: number;
  /** Chỉ số ô cố định của khối trong khay chứa (không đổi suốt màn chơi). */
  trayIndex: number;
};

/** Thông số bố cục canvas — tính lại mỗi khi vào một màn mới. */
type Layout = {
  cols: number;
  rows: number;
  gridCell: number; // kích thước 1 ô trên lưới khoang tàu (px)
  gridX: number; // toạ độ góc trên-trái của lưới trên canvas
  gridY: number;
  gridW: number;
  gridH: number;
  trayCell: number; // kích thước 1 ô khi vẽ khối trong khay chứa (px)
  traySlots: Array<{ x: number; y: number; w: number; h: number }>;
};

/** Trạng thái kéo thả khối hiện tại. */
type Drag = {
  pieceId: number;
  pointerId: number;
  /** Vị trí con trỏ bên trong khối, tính theo đơn vị "ô" (vd 1.5 = giữa ô số 1). */
  grabLocalX: number;
  grabLocalY: number;
  /** Vị trí con trỏ lúc bắt đầu — dùng để phân biệt "chạm" và "kéo". */
  startX: number;
  startY: number;
  /** Vị trí con trỏ hiện tại (toạ độ canvas). */
  pointerX: number;
  pointerY: number;
  /** Đã di chuyển đủ xa để coi là kéo (drag) hay chưa. */
  moved: boolean;
  /** Khối này đã được chọn từ TRƯỚC khi nhấn xuống hay không. */
  wasSelected: boolean;
};

/** Toàn bộ trạng thái ván chơi — nguồn dữ liệu duy nhất cho vòng lặp vẽ. */
type GameState = {
  level: LevelDef;
  layout: Layout;
  pieces: Piece[];
  /** Tập ô bị cản, key dạng "col,row" — tra cứu nhanh khi kiểm tra hợp lệ. */
  blockedSet: Set<string>;
  /** id khối đang được chọn (để tô sáng + nút "Xoay khối hình" tác động vào). */
  selectedId: number | null;
  drag: Drag | null;
};

/* ===========================================================================
 * 2. HẰNG SỐ
 * ========================================================================= */

// Độ phân giải nội bộ của canvas. Tỉ lệ ~5:3, canvas được CSS co giãn vừa khung.
const CANVAS_W = 1000;
const CANVAS_H = 600;
// Bề rộng nửa trái dành cho lưới khoang tàu; phần còn lại là khay chứa.
const LEFT_W = 560;

// localStorage: lưu danh sách id màn đã hoàn thành (để hiện dấu ✓ ở màn chọn).
const STORE_KEY = 'lingoland_marspack';

// Ngưỡng (px canvas) để phân biệt một cú "chạm" (xoay) với một cú "kéo" (di chuyển).
const DRAG_THRESHOLD = 9;

// Điểm thưởng khi hoàn thành mỗi màn (cộng vào tổng điểm chung của bé).
const WIN_SCORE = [40, 60, 90];

// Bảng màu khối hành lý: Cam, Hồng, Mint, Tím, Vàng, Xanh dương.
const PIECE_COLORS: PieceColor[] = [
  { name: 'cam', light: '#fdba74', base: '#fb923c', dark: '#c2410c' },
  { name: 'hong', light: '#f9a8d4', base: '#f472b6', dark: '#be185d' },
  { name: 'mint', light: '#6ee7b7', base: '#34d399', dark: '#047857' },
  { name: 'tim', light: '#c4b5fd', base: '#a78bfa', dark: '#6d28d9' },
  { name: 'vang', light: '#fcd34d', base: '#fbbf24', dark: '#b45309' },
  { name: 'xanh', light: '#7dd3fc', base: '#38bdf8', dark: '#0369a1' },
];

// Emoji vật phẩm gắn lên mỗi ô của khối cho sinh động (hành lý lên Sao Hỏa).
const CARGO_EMOJIS = ['📦', '🧪', '🔋', '💧', '🍱', '🧯', '🛰️', '🪫', '🎒', '🛢️', '📡', '🧰'];

/* ===========================================================================
 * 3. HÀM THUẦN (KHÔNG PHỤ THUỘC REACT) — HÌNH HỌC KHỐI
 * ========================================================================= */

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Khoá ô dạng "col,row" để dùng trong Set/Map. */
const cellKey = (col: number, row: number): string => `${col},${row}`;

/**
 * Chuẩn hoá ma trận khối: tịnh tiến toàn bộ ô về gốc toạ độ dương (0,0).
 * Nhờ vậy sau khi xoay, khối không bị "văng" ra toạ độ âm và việc tính
 * bounding-box / kiểm tra hợp lệ luôn nhất quán.
 */
function normalizeCells(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  return cells.map((c) => ({ x: c.x - minX, y: c.y - minY }));
}

/**
 * Xoay khối 90° (theo chiều kim đồng hồ) quanh gốc (0,0).
 * Công thức xoay toạ độ: newX = -y, newY = x. Sau đó chuẩn hoá lại về gốc dương.
 */
function rotateCells(cells: Cell[]): Cell[] {
  const rotated = cells.map((c) => ({ x: -c.y, y: c.x }));
  return normalizeCells(rotated);
}

/** Kích thước khung bao (bounding box) của khối — giả định cells đã chuẩn hoá. */
function bboxOf(cells: Cell[]): { w: number; h: number } {
  return {
    w: Math.max(...cells.map((c) => c.x)) + 1,
    h: Math.max(...cells.map((c) => c.y)) + 1,
  };
}

/* ===========================================================================
 * 4. HỆ THỐNG MÀN CHƠI (LEVELS_DATA)
 *
 * Mỗi màn được thiết kế sao cho TỔNG số ô của các khối ĐÚNG BẰNG số ô trống
 * trong khoang tàu — nghĩa là tồn tại ít nhất một lời giải lấp khít 100%.
 * ========================================================================= */

const LEVELS_DATA: LevelDef[] = [
  // ── Màn 1 (Dễ): lưới 4×4 hoàn hảo, 4 khối đơn giản vừa khít ──────────────
  {
    id: 'marspack.1',
    name: 'Khởi hành',
    difficulty: 'Dễ',
    emoji: '🌗',
    cols: 4,
    rows: 4,
    blocked: [],
    pieces: [
      // 2 khối vuông 2×2
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      // 2 khối đường thẳng dài 4
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
    ],
  },

  // ── Màn 2 (Trung bình): lưới 5×5 có 3 ô vật cản, 5 khối lắt léo hơn ──────
  {
    id: 'marspack.2',
    name: 'Vành đai thiên thạch',
    difficulty: 'Trung bình',
    emoji: '☄️',
    cols: 5,
    rows: 5,
    blocked: [
      [4, 0], // góc trên-phải
      [2, 2], // chính giữa
      [0, 4], // góc dưới-trái
    ],
    pieces: [
      // Khối chữ J: hàng 4 ô + 1 ô thò xuống ở đầu
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 1 }] },
      // Khối đường thẳng dài 4
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
      // Khối chữ P: ô vuông 2×2 + 1 ô thò ra
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
      // Khối vuông 2×2
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      // Khối đường thẳng dài 4
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }] },
    ],
  },

  // ── Màn 3 (Khó): khoang tàu hình phi thuyền 6×6 cắt 4 góc, 6 khối ───────
  {
    id: 'marspack.3',
    name: 'Hạ cánh Sao Hỏa',
    difficulty: 'Khó',
    emoji: '🪐',
    cols: 6,
    rows: 6,
    // Cắt mỗi góc 3 ô → khoang tàu thành hình bát giác (như mũi phi thuyền).
    blocked: [
      [0, 0], [1, 0], [0, 1], // góc trên-trái
      [4, 0], [5, 0], [5, 1], // góc trên-phải
      [0, 4], [0, 5], [1, 5], // góc dưới-trái
      [5, 4], [4, 5], [5, 5], // góc dưới-phải
    ],
    pieces: [
      // Khối vuông 2×2
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      // 4 khối chữ T (xoay hướng khác nhau khi giải)
      { cells: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
      { cells: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }] },
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }] },
      // Khối vuông 2×2
      { cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
    ],
  },
];

/* ===========================================================================
 * 5. KHỞI TẠO MÀN CHƠI
 * ========================================================================= */

/**
 * Tính bố cục canvas cho một màn: kích thước/vị trí lưới khoang tàu (bên trái)
 * và các ô khay chứa hành lý (bên phải).
 */
function computeLayout(level: LevelDef): Layout {
  const { cols, rows } = level;

  // ── Lưới khoang tàu (nửa trái) ─────────────────────────────────────────
  const PAD = 38; // lề quanh lưới
  const labelH = 50; // chừa chỗ phía trên để vẽ nhãn "KHOANG TÀU"
  const availW = LEFT_W - PAD * 2;
  const availH = CANVAS_H - PAD * 2 - labelH;
  // Ô vuông → lấy cạnh nhỏ hơn; giới hạn 104px để màn nhỏ (4×4) không quá to.
  const gridCell = Math.min(104, Math.floor(Math.min(availW / cols, availH / rows)));
  const gridW = gridCell * cols;
  const gridH = gridCell * rows;
  const gridX = Math.round((LEFT_W - gridW) / 2);
  const gridY = Math.round(labelH + (CANVAS_H - labelH - gridH) / 2);

  // ── Khay chứa hành lý (nửa phải) ───────────────────────────────────────
  const trayLabelH = 50;
  const trayCols = 2; // luôn xếp khay thành 2 cột
  const trayRows = Math.ceil(level.pieces.length / trayCols);
  const slotW = (CANVAS_W - LEFT_W) / trayCols;
  const slotH = (CANVAS_H - trayLabelH) / trayRows;

  // Span lớn nhất (số ô) của mọi khối — để cả khay vẽ chung một tỉ lệ ô.
  // (max(rộng, cao) bất biến với phép xoay nên tính trên hình gốc là đủ.)
  let maxSpan = 1;
  for (const def of level.pieces) {
    const b = bboxOf(def.cells);
    maxSpan = Math.max(maxSpan, b.w, b.h);
  }
  const trayCell = Math.floor(
    Math.min((slotW - 30) / maxSpan, (slotH - 30) / maxSpan),
  );

  const traySlots = level.pieces.map((_, i) => {
    const c = i % trayCols;
    const r = Math.floor(i / trayCols);
    return {
      x: LEFT_W + c * slotW,
      y: trayLabelH + r * slotH,
      w: slotW,
      h: slotH,
    };
  });

  return { cols, rows, gridCell, gridX, gridY, gridW, gridH, trayCell, traySlots };
}

/**
 * Tạo danh sách khối runtime cho một màn. Từ màn 2 trở đi, mỗi khối được xoay
 * ngẫu nhiên lúc khởi đầu để buộc bé phải dùng thao tác XOAY khi giải đố.
 */
function buildPieces(level: LevelDef, levelIdx: number): Piece[] {
  const randomRotate = levelIdx >= 1;
  const emojis = shuffle(CARGO_EMOJIS);
  return level.pieces.map((def, i) => {
    let cells = normalizeCells(def.cells);
    if (randomRotate) {
      const turns = randInt(0, 3);
      for (let t = 0; t < turns; t++) cells = rotateCells(cells);
    }
    return {
      id: i + 1,
      cells,
      color: PIECE_COLORS[i % PIECE_COLORS.length],
      emoji: emojis[i % emojis.length],
      onGrid: false,
      gridCol: 0,
      gridRow: 0,
      trayIndex: i,
    };
  });
}

/* ===========================================================================
 * 6. LOGIC LÕI — VỊ TRÍ, KIỂM TRA HỢP LỆ
 * ========================================================================= */

/** Toạ độ góc trên-trái (canvas) nơi một khối đang được vẽ. */
function pieceOrigin(g: GameState, p: Piece): { x: number; y: number } {
  const { layout } = g;
  if (p.onGrid) {
    // Khối nằm trên lưới: bám theo ô neo (gridCol, gridRow).
    return {
      x: layout.gridX + p.gridCol * layout.gridCell,
      y: layout.gridY + p.gridRow * layout.gridCell,
    };
  }
  // Khối nằm trong khay: căn giữa khung bao của khối vào ô khay của nó.
  const slot = layout.traySlots[p.trayIndex];
  const b = bboxOf(p.cells);
  return {
    x: slot.x + (slot.w - b.w * layout.trayCell) / 2,
    y: slot.y + (slot.h - b.h * layout.trayCell) / 2,
  };
}

/**
 * Kiểm tra có thể đặt một khối (mảng cells) vào lưới tại ô neo (anchorCol,
 * anchorRow) hay không. Hợp lệ khi MỌI ô của khối đều:
 *   - nằm trong phạm vi lưới,
 *   - không trùng ô vật cản,
 *   - không đè lên khối khác (bỏ qua chính khối đang di chuyển).
 */
function canPlace(
  g: GameState,
  movingId: number,
  cells: Cell[],
  anchorCol: number,
  anchorRow: number,
): boolean {
  // Tập ô đang bị các khối KHÁC chiếm chỗ.
  const occupied = new Set<string>();
  for (const p of g.pieces) {
    if (p.id === movingId || !p.onGrid) continue;
    for (const c of p.cells) {
      occupied.add(cellKey(p.gridCol + c.x, p.gridRow + c.y));
    }
  }
  for (const c of cells) {
    const col = anchorCol + c.x;
    const row = anchorRow + c.y;
    if (col < 0 || row < 0 || col >= g.level.cols || row >= g.level.rows) return false;
    if (g.blockedSet.has(cellKey(col, row))) return false;
    if (occupied.has(cellKey(col, row))) return false;
  }
  return true;
}

/**
 * Kiểm tra điểm (px, py) trên canvas có nhấp TRÚNG một khối hành lý hay không.
 *
 * Hàm duyệt qua TỪNG Ô VUÔNG THỰC TẾ tạo nên khối, KHÔNG kiểm tra theo khung
 * hình chữ nhật bao quanh (bounding box). Lý do: các khối lõm (chữ L, chữ T,
 * chữ J...) có bounding box bao trùm cả những khoảng TRỐNG không thuộc khối.
 * Nếu kiểm tra theo bounding box, bé bấm vào khoảng trống đó sẽ bị tính nhầm
 * là trúng khối — tệ hơn là che mất một khối khác đang nằm lọt trong khoảng
 * trống ấy. Duyệt từng ô vuông giúp việc bắt điểm chạm khớp đúng hình dạng.
 */
function isPointInPiece(g: GameState, piece: Piece, px: number, py: number): boolean {
  const origin = pieceOrigin(g, piece);
  // Khối trên lưới vẽ ở cỡ ô lưới; khối trong khay vẽ ở cỡ ô khay.
  const cell = piece.onGrid ? g.layout.gridCell : g.layout.trayCell;
  for (const c of piece.cells) {
    const cx = origin.x + c.x * cell;
    const cy = origin.y + c.y * cell;
    // Trúng nếu điểm nằm trong phạm vi của riêng ô vuông này.
    if (px >= cx && px <= cx + cell && py >= cy && py <= cy + cell) return true;
  }
  return false;
}

/** Tìm khối nằm dưới điểm (px, py) trên canvas — null nếu không trúng khối nào. */
function hitTestPiece(g: GameState, px: number, py: number): Piece | null {
  for (const p of g.pieces) {
    // Bỏ qua khối đang được kéo (nó được xử lý riêng).
    if (g.drag && g.drag.moved && g.drag.pieceId === p.id) continue;
    if (isPointInPiece(g, p, px, py)) return p;
  }
  return null;
}

/* ===========================================================================
 * 7. COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function MarsPackingView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── Trạng thái React (điều khiển giao diện ngoài canvas) ─────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [levelIdx, setLevelIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [placedCount, setPlacedCount] = useState(0);
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

  // ── Refs (nguồn dữ liệu cho vòng lặp vẽ, không gây render lại) ────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  // Các ngôi sao nền (tạo 1 lần, vị trí cố định để không bị nhấp nháy lộn xộn).
  const starsRef = useRef<Array<{ x: number; y: number; r: number; tw: number }>>([]);

  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      r: 0.6 + Math.random() * 1.8,
      tw: Math.random() * Math.PI * 2, // pha nhấp nháy ngẫu nhiên
    }));
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 7a. ĐỒNG BỘ UI + KIỂM TRA THẮNG
   * ───────────────────────────────────────────────────────────────────── */

  const handleWin = useCallback(() => {
    if (phaseRef.current === 'won') return; // tránh kích hoạt 2 lần
    const g = gameRef.current;
    if (!g) return;
    phaseRef.current = 'won';
    setPhase('won');

    // Lưu màn đã hoàn thành vào localStorage.
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
      particleCount: 200,
      spread: 100,
      startVelocity: 42,
      origin: { y: 0.45 },
      colors: ['#fb923c', '#f472b6', '#34d399', '#a78bfa', '#38bdf8'],
    });
    window.setTimeout(
      () => speak('Tàu vũ trụ đã sẵn sàng bay đến Sao Hỏa', LANG_SPEAK_DEFAULT),
      300,
    );
  }, [addScore, levelIdx]);

  /**
   * Đẩy trạng thái từ gameRef ra React state (để giao diện cập nhật) và kiểm
   * tra điều kiện thắng. Gọi sau mỗi thao tác làm thay đổi vị trí khối.
   */
  const syncUi = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    setSelectedId(g.selectedId);
    setPlacedCount(g.pieces.filter((p) => p.onGrid).length);
    // Thắng khi MỌI khối đều đã nằm trên lưới. Vì tổng ô của các khối được
    // thiết kế đúng bằng số ô trống, đặt hết khối hợp lệ ⇒ lưới đầy 100%.
    if (g.pieces.length > 0 && g.pieces.every((p) => p.onGrid)) {
      handleWin();
    }
  }, [handleWin]);

  /* ─────────────────────────────────────────────────────────────────────
   * 7b. BẮT ĐẦU / RESET MÀN
   * ───────────────────────────────────────────────────────────────────── */

  const startLevel = useCallback((idx: number) => {
    const level = LEVELS_DATA[idx];
    gameRef.current = {
      level,
      layout: computeLayout(level),
      pieces: buildPieces(level, idx),
      blockedSet: new Set(level.blocked.map(([c, r]) => cellKey(c, r))),
      selectedId: null,
      drag: null,
    };
    setLevelIdx(idx);
    setSelectedId(null);
    setPlacedCount(0);
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  /** Xếp lại từ đầu màn hiện tại (mọi khối trở về khay chứa). */
  const resetLevel = useCallback(() => {
    startLevel(levelIdx);
  }, [levelIdx, startLevel]);

  /* ─────────────────────────────────────────────────────────────────────
   * 7c. XOAY KHỐI
   * ───────────────────────────────────────────────────────────────────── */

  const rotatePiece = useCallback(
    (pieceId: number) => {
      const g = gameRef.current;
      if (!g) return;
      const piece = g.pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      const rotated = rotateCells(piece.cells);
      piece.cells = rotated;
      // Nếu khối đang nằm trên lưới mà sau khi xoay không còn vừa vị trí cũ,
      // trả khối về khay chứa để bé sắp xếp lại.
      if (piece.onGrid && !canPlace(g, piece.id, rotated, piece.gridCol, piece.gridRow)) {
        piece.onGrid = false;
      }
      playSfx('snd-correct');
      syncUi();
    },
    [syncUi],
  );

  /** Nút "Xoay khối hình" — xoay khối đang được chọn. */
  const handleRotateButton = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.selectedId == null) return;
    rotatePiece(g.selectedId);
  }, [rotatePiece]);

  /* ─────────────────────────────────────────────────────────────────────
   * 7d. CHUYỂN ĐỔI TOẠ ĐỘ MÀN HÌNH → CANVAS
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
   * 7e. XỬ LÝ KÉO THẢ (Pointer Events — dùng chung cho chuột & cảm ứng)
   * ───────────────────────────────────────────────────────────────────── */

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || phaseRef.current !== 'playing') return;
    const { x, y } = toCanvasCoords(e);
    const piece = hitTestPiece(g, x, y);

    if (!piece) {
      // Chạm vào khoảng trống → bỏ chọn khối.
      g.selectedId = null;
      g.drag = null;
      syncUi();
      return;
    }

    // Bắt giữ con trỏ để vẫn nhận được sự kiện kể cả khi kéo ra ngoài canvas.
    e.currentTarget.setPointerCapture(e.pointerId);

    // Tính vị trí con trỏ bên trong khối theo đơn vị "ô" (bất biến với tỉ lệ vẽ).
    const origin = pieceOrigin(g, piece);
    const currentCell = piece.onGrid ? g.layout.gridCell : g.layout.trayCell;

    g.drag = {
      pieceId: piece.id,
      pointerId: e.pointerId,
      grabLocalX: (x - origin.x) / currentCell,
      grabLocalY: (y - origin.y) / currentCell,
      startX: x,
      startY: y,
      pointerX: x,
      pointerY: y,
      moved: false,
      wasSelected: g.selectedId === piece.id,
    };
    // Chọn khối ngay khi nhấn xuống (để tô sáng + nút Xoay tác động đúng khối).
    g.selectedId = piece.id;
    syncUi();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || !g.drag || g.drag.pointerId !== e.pointerId) return;
    const { x, y } = toCanvasCoords(e);
    g.drag.pointerX = x;
    g.drag.pointerY = y;
    // Vượt ngưỡng dịch chuyển → coi là đang KÉO (không phải chạm để xoay).
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
    const piece = g.pieces.find((p) => p.id === drag.pieceId);
    g.drag = null;
    if (!piece) {
      syncUi();
      return;
    }

    if (!drag.moved) {
      // ── Một cú CHẠM (không kéo) ──────────────────────────────────────
      // Lần chạm đầu chỉ chọn khối; chạm lại khối ĐANG chọn thì xoay nó.
      if (drag.wasSelected) {
        rotatePiece(piece.id);
        return; // rotatePiece đã gọi syncUi
      }
      syncUi();
      return;
    }

    // ── Một cú KÉO — thả khối xuống ─────────────────────────────────────
    // Tính ô neo (col,row): quy đổi góc trên-trái của khối về toạ độ lưới.
    const { gridX, gridY, gridCell } = g.layout;
    const topLeftX = drag.pointerX - drag.grabLocalX * gridCell;
    const topLeftY = drag.pointerY - drag.grabLocalY * gridCell;
    const anchorCol = Math.round((topLeftX - gridX) / gridCell);
    const anchorRow = Math.round((topLeftY - gridY) / gridCell);

    if (canPlace(g, piece.id, piece.cells, anchorCol, anchorRow)) {
      // Hợp lệ → hút khối khít vào lưới (grid snapping).
      piece.onGrid = true;
      piece.gridCol = anchorCol;
      piece.gridRow = anchorRow;
      playSfx('snd-correct');
    } else {
      // Không đặt được → trả khối về khay chứa.
      piece.onGrid = false;
      // Chỉ kêu "sai" khi bé thực sự thả vào vùng khoang tàu mà không khít;
      // còn thả lại vào kho hàng (để sắp lại) thì im lặng, không phải lỗi.
      if (drag.pointerX < LEFT_W) playSfx('snd-wrong');
    }
    syncUi();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || !g.drag || g.drag.pointerId !== e.pointerId) return;
    g.drag = null;
  };

  /* ─────────────────────────────────────────────────────────────────────
   * 7f. VẼ CANVAS
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

  /** Vẽ một ô nhỏ của khối hành lý: nền bo góc + emoji vật phẩm. */
  const drawPieceCell = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: PieceColor,
    emoji: string,
  ) => {
    const gap = size * 0.06; // khe hở nhỏ để các ô trông như khối ghép lại
    const ix = x + gap;
    const iy = y + gap;
    const isz = size - gap * 2;
    const radius = size * 0.2;

    // Nền ô: tô gradient từ màu sáng (trên) xuống màu chuẩn (dưới).
    const grad = ctx.createLinearGradient(ix, iy, ix, iy + isz);
    grad.addColorStop(0, color.light);
    grad.addColorStop(1, color.base);
    roundRectPath(ctx, ix, iy, isz, isz, radius);
    ctx.fillStyle = grad;
    ctx.fill();

    // Viền màu đậm.
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeStyle = color.dark;
    ctx.stroke();

    // Vệt sáng nhẹ phía trên cho cảm giác khối nổi.
    roundRectPath(ctx, ix + isz * 0.14, iy + isz * 0.1, isz * 0.72, isz * 0.22, radius * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();

    // Emoji vật phẩm ở giữa ô.
    ctx.font = `${Math.floor(size * 0.46)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x + size / 2, y + size / 2 + size * 0.02);
  };

  /** Vẽ trọn một khối hành lý tại góc (originX, originY) với cỡ ô `cell`. */
  const drawPiece = (
    ctx: CanvasRenderingContext2D,
    piece: Piece,
    originX: number,
    originY: number,
    cell: number,
    opts: { selected: boolean; lifted: boolean; time: number },
  ) => {
    ctx.save();
    if (opts.lifted) {
      // Khối đang được nhấc lên: đổ bóng đậm tạo cảm giác "nổi" trên mặt phẳng.
      ctx.shadowColor = 'rgba(2,6,23,0.55)';
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 12;
    } else if (opts.selected) {
      // Khối đang chọn: phát sáng trắng nhấp nháy nhẹ để bé biết Xoay khối nào.
      const pulse = 10 + Math.sin(opts.time / 220) * 6;
      ctx.shadowColor = 'rgba(255,255,255,0.95)';
      ctx.shadowBlur = pulse;
    }
    for (const c of piece.cells) {
      drawPieceCell(
        ctx,
        originX + c.x * cell,
        originY + c.y * cell,
        cell,
        piece.color,
        piece.emoji,
      );
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

    // ── Nền vũ trụ ──────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#0b1026');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Các ngôi sao nhấp nháy.
    for (const s of starsRef.current) {
      const a = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(time / 600 + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const { layout } = g;

    // ── Nhãn hai khu vực ────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 26px Nunito, sans-serif';
    ctx.fillText('🚀 KHOANG TÀU', LEFT_W / 2, 28);
    ctx.fillText('🧳 KHO HÀNG', LEFT_W + (CANVAS_W - LEFT_W) / 2, 28);

    // ── Khung lưới khoang tàu với viền neon xanh dương ──────────────────
    const neon = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time / 500));
    ctx.save();
    ctx.shadowColor = `rgba(56,189,248,${neon})`;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    roundRectPath(
      ctx,
      layout.gridX - 8,
      layout.gridY - 8,
      layout.gridW + 16,
      layout.gridH + 16,
      16,
    );
    ctx.stroke();
    ctx.restore();

    // ── Từng ô của lưới ─────────────────────────────────────────────────
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const x = layout.gridX + c * layout.gridCell;
        const y = layout.gridY + r * layout.gridCell;
        if (g.blockedSet.has(cellKey(c, r))) {
          // Ô vật cản: tô nền tối + gạch chéo cảnh báo.
          roundRectPath(ctx, x + 3, y + 3, layout.gridCell - 6, layout.gridCell - 6, 8);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(148,163,184,0.6)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 12, y + 12);
          ctx.lineTo(x + layout.gridCell - 12, y + layout.gridCell - 12);
          ctx.moveTo(x + layout.gridCell - 12, y + 12);
          ctx.lineTo(x + 12, y + layout.gridCell - 12);
          ctx.stroke();
        } else {
          // Ô trống: vẽ nét đứt mờ.
          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = 'rgba(125,211,252,0.4)';
          ctx.lineWidth = 1.5;
          roundRectPath(ctx, x + 3, y + 3, layout.gridCell - 6, layout.gridCell - 6, 8);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ── Khung khay chứa hành lý ─────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRectPath(ctx, LEFT_W + 8, 46, CANVAS_W - LEFT_W - 16, CANVAS_H - 56, 16);
    ctx.fill();
    ctx.restore();
    // Ô khay rỗng (vẽ nét đứt mờ để gợi ý "chỗ cũ" của khối đã lấy đi).
    for (const slot of layout.traySlots) {
      ctx.save();
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, slot.x + 8, slot.y + 8, slot.w - 16, slot.h - 16, 12);
      ctx.stroke();
      ctx.restore();
    }

    // ── Khối đang được kéo (xử lý riêng để vẽ sau cùng, nằm trên hết) ────
    const draggingId =
      g.drag && g.drag.moved ? g.drag.pieceId : null;

    // Vẽ các khối KHÔNG bị kéo (trên lưới + trong khay).
    for (const p of g.pieces) {
      if (p.id === draggingId) continue;
      const origin = pieceOrigin(g, p);
      const cell = p.onGrid ? layout.gridCell : layout.trayCell;
      drawPiece(ctx, p, origin.x, origin.y, cell, {
        selected: g.selectedId === p.id,
        lifted: false,
        time,
      });
    }

    // ── Khối đang kéo: vẽ bóng đặt trước (ghost) + chính khối ────────────
    if (draggingId != null && g.drag) {
      const piece = g.pieces.find((p) => p.id === draggingId);
      if (piece) {
        const { gridX, gridY, gridCell } = layout;
        // Góc trên-trái của khối theo con trỏ (khi kéo, khối vẽ ở cỡ ô lưới).
        const topLeftX = g.drag.pointerX - g.drag.grabLocalX * gridCell;
        const topLeftY = g.drag.pointerY - g.drag.grabLocalY * gridCell;
        const anchorCol = Math.round((topLeftX - gridX) / gridCell);
        const anchorRow = Math.round((topLeftY - gridY) / gridCell);

        // Bóng đặt trước: hiện vị trí khối sẽ "hút" vào nếu thả ngay bây giờ.
        // Xanh lá = đặt được, Đỏ = không đặt được. Chỉ vẽ khi khối chạm vùng lưới.
        const valid = canPlace(g, piece.id, piece.cells, anchorCol, anchorRow);
        const b = bboxOf(piece.cells);
        const touchesGrid =
          anchorCol + b.w > 0 &&
          anchorRow + b.h > 0 &&
          anchorCol < layout.cols &&
          anchorRow < layout.rows;
        if (touchesGrid) {
          ctx.save();
          for (const c of piece.cells) {
            const gx = gridX + (anchorCol + c.x) * gridCell;
            const gy = gridY + (anchorRow + c.y) * gridCell;
            roundRectPath(ctx, gx + 4, gy + 4, gridCell - 8, gridCell - 8, 8);
            ctx.fillStyle = valid ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.3)';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = valid ? '#34d399' : '#f87171';
            ctx.stroke();
          }
          ctx.restore();

          // Preview mờ (opacity 0.3) của chính khối hình tại ô lưới gần nhất —
          // vẽ ngay trong lúc kéo (mousemove) để bé hình dung khối sẽ "hút" vào
          // đâu nếu thả tay ngay bây giờ.
          ctx.save();
          ctx.globalAlpha = 0.3;
          drawPiece(
            ctx,
            piece,
            gridX + anchorCol * gridCell,
            gridY + anchorRow * gridCell,
            gridCell,
            { selected: false, lifted: false, time },
          );
          ctx.restore();
        }

        // Khối thật bám theo con trỏ.
        drawPiece(ctx, piece, topLeftX, topLeftY, gridCell, {
          selected: false,
          lifted: true,
          time,
        });
      }
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
   * 7g. VÒNG LẶP VẼ (Animation Loop) + DỌN DẸP
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
      speak('Hãy xếp tất cả hành lý vào khoang tàu nhé', LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, [phase, levelIdx]);

  /* ─────────────────────────────────────────────────────────────────────
   * 7h. MÀN HÌNH CHỌN CẤP ĐỘ (idle)
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
          <div className="text-7xl mb-4 floating">🚀</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-500 bg-clip-text text-transparent leading-tight">
            Sắp Xếp Hành Lý Đến Sao Hỏa
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Kéo các khối hành lý vào khoang tàu vũ trụ. Xoay khối cho thật khít
            để lấp đầy mọi ô trống nhé!
          </p>

          <div className="bg-gradient-to-br from-indigo-50 via-slate-50 to-orange-50 border-2 border-indigo-100 rounded-3xl p-5 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">✋</span> Kéo khối từ kho hàng vào khoang tàu.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🔄</span> Chạm vào khối đang chọn (hoặc nút
              Xoay) để xoay khối.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🎯</span> Lấp đầy 100% ô trống là chiến thắng!
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
                  className="w-full p-5 bg-gradient-to-br from-slate-800 via-indigo-800 to-slate-900 text-white rounded-3xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-4 text-left border border-indigo-500/30"
                >
                  <div className="text-4xl">{lv.emoji}</div>
                  <div className="flex-1">
                    <div className="font-black text-lg leading-tight">
                      Màn {i + 1}: {lv.name}
                    </div>
                    <div className="text-xs opacity-80 font-bold mt-0.5">
                      Khoang {lv.cols}×{lv.rows} · {lv.pieces.length} khối ·{' '}
                      {lv.difficulty}
                    </div>
                  </div>
                  {done ? (
                    <span className="text-emerald-400 text-xl font-black">✓</span>
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
   * 7i. MÀN HÌNH CHÚC MỪNG (won)
   * ───────────────────────────────────────────────────────────────────── */

  if (phase === 'won') {
    const isLast = levelIdx >= LEVELS_DATA.length - 1;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4 floating">🚀</div>
        <h2 className="text-2xl font-black mb-3 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-500 bg-clip-text text-transparent leading-tight">
          Tàu vũ trụ đã sẵn sàng bay đến Sao Hỏa! 🚀
        </h2>
        <p className="text-slate-500 text-sm mb-5">
          Bé đã xếp khít toàn bộ hành lý vào khoang tàu. Giỏi quá!
        </p>
        <div className="bg-slate-50 rounded-3xl p-5 mb-6">
          <div className="text-4xl font-black bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">
            +{WIN_SCORE[levelIdx] ?? 50} điểm
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Hoàn thành Màn {levelIdx + 1}: {LEVELS_DATA[levelIdx].name}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {!isLast && (
            <button
              onClick={() => startLevel(levelIdx + 1)}
              className="w-full py-4 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all"
            >
              🪐 Màn tiếp theo
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
              onClick={resetLevel}
              className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-slate-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all"
            >
              🔄 Chơi lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 7j. MÀN HÌNH CHƠI (playing)
   * ───────────────────────────────────────────────────────────────────── */

  const level = LEVELS_DATA[levelIdx];

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Thanh trên: thoát + tên màn + số khối đã xếp */}
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
          Đã xếp{' '}
          <span className="text-indigo-500 text-base ml-0.5">
            {placedCount}/{level.pieces.length}
          </span>
        </div>
      </div>

      {/* Canvas trò chơi */}
      <div className="rounded-3xl overflow-hidden border-4 border-indigo-300 shadow-lg shadow-indigo-100">
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
            touchAction: 'none', // chặn cuộn trang khi kéo khối trên cảm ứng
          }}
        />
      </div>

      {/* Nút điều khiển */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleRotateButton}
          disabled={selectedId == null}
          className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
        >
          🔄 Xoay khối hình
        </button>
        <button
          onClick={resetLevel}
          className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
        >
          ♻️ CHƠI LẠI
        </button>
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Kéo khối vào khoang tàu · Chạm khối đang chọn để xoay ·
        Kéo khối đã xếp ra ngoài nếu muốn sắp lại
      </p>
    </div>
  );
}
