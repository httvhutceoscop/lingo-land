import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, playSfx, speak } from '../lib/audio';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Cứu Hộ Sông Sâu"
 *
 * Trò chơi tư duy logic phân loại trạng thái (state-space search) cho trẻ
 * 6-10 tuổi. Cổ điển dạng "Sói - Cừu - Bắp cải": đưa toàn bộ nhân vật từ
 * BỜ TRÁI sang BỜ PHẢI bằng chiếc thuyền nhỏ, không để cặp xung khắc bị
 * bỏ lại một mình.
 *
 * KIẾN TRÚC:
 *  - React  : quản lý cấp độ, vị trí của các nhân vật (left/right/boat),
 *             phía thuyền đang đậu, trạng thái Game Over (kèm lý do), Thắng.
 *  - Canvas : vòng lặp vẽ (requestAnimationFrame) vẽ sông, hai bờ, sóng nước
 *             trôi, và chuyển động tịnh tiến (lerp) của chiếc thuyền khi
 *             "SANG SÔNG".
 *
 * Quy ước toạ độ: x từ 0 (trái) đến CANVAS_W (phải); y từ 0 (trên) đến
 * CANVAS_H (dưới). Sông nằm giữa, hai bờ ở hai bên.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. KIỂU DỮ LIỆU
 * ========================================================================= */

type Phase = 'idle' | 'playing' | 'won';
type Side = 'left' | 'right';
/** Vị trí hiện tại của một nhân vật. */
type Location = 'left' | 'right' | 'boat';

/** Định nghĩa tĩnh một nhân vật trong màn chơi. */
type CharDef = {
  id: string;
  emoji: string;
  name: string;
  /** Hệ số co-giãn khi vẽ emoji (mặc định 1.0). Dùng <1 cho thú con. */
  scale?: number;
  /** Nhãn phân loại — dùng cho cả `isDriver` và hàm kiểm tra an toàn. */
  tags: string[];
};

/** Một dòng "quy tắc an toàn" hiển thị trên giao diện. */
type Rule = { icon: string; text: string };

/**
 * Hàm kiểm tra trạng thái: trả về NULL nếu an toàn, hoặc CHUỖI lý do vi phạm.
 * Chỉ được gọi sau mỗi lần thuyền cập bến (xong animation).
 */
type SafetyCheck = (
  loc: Map<string, Location>,
  boatSide: Side,
  characters: CharDef[],
) => string | null;

/** Định nghĩa một màn chơi. */
type LevelDef = {
  id: string;
  name: string;
  difficulty: string;
  emoji: string;
  characters: CharDef[];
  rules: Rule[];
  /** Sức chứa của thuyền (số chỗ ngồi). */
  boatCapacity: number;
  /** Trả về true nếu nhân vật này biết lái thuyền. */
  isDriver: (c: CharDef) => boolean;
  checkSafety: SafetyCheck;
};

/** Toàn bộ trạng thái ván chơi — đặt trong ref để vòng lặp vẽ truy cập nhanh. */
type Runtime = {
  level: LevelDef;
  /** Vị trí hiện tại của từng nhân vật (theo id). */
  charLoc: Map<string, Location>;
  /** Phía thuyền đang đậu. */
  boatSide: Side;
  /** Hai ghế của thuyền — id của nhân vật, hoặc null nếu trống. */
  boatSeats: Array<string | null>;
  /** Trạng thái animation thuyền sang sông. */
  isAnimating: boolean;
  animStart: number | null; // timestamp ms của frame đầu animation
  animFrom: number; // toạ độ x bắt đầu
  animTo: number; // toạ độ x kết thúc
  boatX: number; // toạ độ x hiện tại của thuyền (cập nhật mỗi frame)
  /** Số lần đã "SANG SÔNG" trong màn — phần nào phản ánh độ tối ưu lời giải. */
  moves: number;
  /** Đã thua hay chưa (khoá tương tác). */
  gameOver: boolean;
};

/* ===========================================================================
 * 2. HẰNG SỐ
 * ========================================================================= */

// Độ phân giải nội bộ canvas (tỉ lệ ~16:9). Canvas được CSS co giãn vừa khung.
const CANVAS_W = 1000;
const CANVAS_H = 560;

// Chiều rộng mỗi bờ (phần đất xanh hai bên), phần giữa là sông.
const BANK_W = 280;
const RIVER_X1 = BANK_W; // 280
const RIVER_X2 = CANVAS_W - BANK_W; // 720

// Toạ độ thuyền: y cố định ở giữa sông; x đậu khi bên trái / bên phải.
const BOAT_Y = 380;
const BOAT_LEFT_X = 360; // tâm thuyền khi đậu bờ trái
const BOAT_RIGHT_X = CANVAS_W - 360; // 640 — tâm thuyền khi đậu bờ phải
const BOAT_W = 220;
const BOAT_H = 76;

// Khoảng cách hai ghế thuyền (tính từ tâm thuyền sang trái / phải).
const SEAT_DX = 52;
const SEAT_DY = -28; // ghế hơi cao hơn thân thuyền cho nổi bật

// Thời gian thuyền sang sông (mili giây). Đủ chậm để bé thấy thuyền di chuyển.
const SAIL_DURATION_MS = 1400;

// localStorage: danh sách màn đã hoàn thành (hiện dấu ✓ ở màn chọn).
const STORE_KEY = 'lingoland_riverrescue';

// Điểm thưởng khi hoàn thành mỗi màn.
const WIN_SCORE = [40, 60, 90];

// Toạ độ slot trên mỗi bờ: 2 cột × 3 hàng = 6 slot — đủ chứa màn nhiều nhất.
// Lấy theo TÂM của bờ rồi lệch sang hai cột.
const SLOT_COLS_DX = [-60, 60]; // 2 cột, lệch ±60 từ tâm bờ
const SLOT_ROWS_Y = [150, 290, 430]; // 3 hàng, y cố định

// Phạm vi cảm ứng (px canvas) quanh emoji — rộng để trẻ nhỏ dễ chạm.
const HIT_BANK_HW = 56; // nửa rộng vùng chạm nhân vật trên bờ
const HIT_BANK_HH = 64; // nửa cao
const HIT_BOAT_HW = 48; // nửa rộng vùng chạm nhân vật trên thuyền
const HIT_BOAT_HH = 48;

const SIDES: Side[] = ['left', 'right'];

/* ===========================================================================
 * 3. HÀM THUẦN
 * ========================================================================= */

/** Hàm easing easeInOutQuad — chuyển động mượt mà cảm giác có quán tính. */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Tâm x của một bờ (tính theo trái / phải). */
function bankCenterX(side: Side): number {
  return side === 'left' ? BANK_W / 2 : CANVAS_W - BANK_W / 2;
}

/** Vị trí slot thứ `idx` (0..5) trên một bờ. */
function bankSlot(side: Side, idx: number): { x: number; y: number } {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  return { x: bankCenterX(side) + SLOT_COLS_DX[col], y: SLOT_ROWS_Y[row] };
}

/** Vị trí ghế trên thuyền — theo seat index và toạ độ x hiện tại của thuyền. */
function boatSeatPos(seatIdx: number, boatX: number): { x: number; y: number } {
  const dx = seatIdx === 0 ? -SEAT_DX : SEAT_DX;
  return { x: boatX + dx, y: BOAT_Y + SEAT_DY };
}

/**
 * Tính vị trí canvas hiện tại của một nhân vật (để vẽ + bắt điểm chạm).
 *  - Trên bờ: lấy slot theo vị trí trong `level.characters` (giữ ổn định).
 *  - Trên thuyền: lấy ghế hiện tại + toạ độ x của thuyền.
 */
function charScreenPos(r: Runtime, charId: string): { x: number; y: number } | null {
  const loc = r.charLoc.get(charId);
  if (loc === 'left' || loc === 'right') {
    const idx = r.level.characters.findIndex((c) => c.id === charId);
    return bankSlot(loc, idx);
  }
  if (loc === 'boat') {
    const seat = r.boatSeats.indexOf(charId);
    if (seat < 0) return null;
    return boatSeatPos(seat, r.boatX);
  }
  return null;
}

/** Tìm nhân vật nằm dưới điểm chạm (px, py) trên canvas. */
function charAtPoint(r: Runtime, px: number, py: number): string | null {
  for (const c of r.level.characters) {
    const pos = charScreenPos(r, c.id);
    if (!pos) continue;
    const onBoat = r.charLoc.get(c.id) === 'boat';
    const hw = onBoat ? HIT_BOAT_HW : HIT_BANK_HW;
    const hh = onBoat ? HIT_BOAT_HH : HIT_BANK_HH;
    if (px >= pos.x - hw && px <= pos.x + hw && py >= pos.y - hh && py <= pos.y + hh) {
      return c.id;
    }
  }
  return null;
}

/* ===========================================================================
 * 4. HỆ THỐNG MÀN CHƠI (LEVELS_DATA)
 * ========================================================================= */

const LEVELS_DATA: LevelDef[] = [
  // ── Màn 1 (Tập sự): Sói - Cừu - Bắp cải - Đội trưởng ─────────────────────
  {
    id: 'river.1',
    name: 'Sói, Cừu & Bắp cải',
    difficulty: 'Tập sự',
    emoji: '🐺',
    characters: [
      { id: 'captain', emoji: '👨‍🚒', name: 'Đội trưởng', tags: ['captain', 'driver'] },
      { id: 'wolf', emoji: '🐺', name: 'Sói', tags: ['predator'] },
      { id: 'sheep', emoji: '🐑', name: 'Cừu', tags: ['prey'] },
      { id: 'cabbage', emoji: '🥬', name: 'Bắp cải', tags: ['food'] },
    ],
    rules: [
      { icon: '👨‍🚒', text: 'Chỉ Đội trưởng mới biết lái thuyền.' },
      { icon: '🚣', text: 'Thuyền chở được tối đa 2 nhân vật.' },
      { icon: '🐺🐑', text: 'Sói sẽ ăn thịt Cừu nếu Đội trưởng vắng mặt.' },
      { icon: '🐑🥬', text: 'Cừu sẽ ăn hết Bắp cải nếu Đội trưởng vắng mặt.' },
    ],
    boatCapacity: 2,
    isDriver: (c) => c.tags.includes('driver'),
    // Bờ nào không có Đội trưởng → kiểm tra cặp xung khắc.
    checkSafety: (loc, _boatSide, chars) => {
      for (const side of SIDES) {
        const here = chars.filter((c) => loc.get(c.id) === side);
        if (here.some((c) => c.id === 'captain')) continue;
        const ids = new Set(here.map((c) => c.id));
        if (ids.has('wolf') && ids.has('sheep')) return 'Sói đã ăn thịt Cừu mất rồi!';
        if (ids.has('sheep') && ids.has('cabbage')) return 'Cừu đã ăn hết Bắp cải rồi!';
      }
      return null;
    },
  },

  // ── Màn 2 (Nâng cao): Gia đình Gấu và Hổ ─────────────────────────────────
  // Lưu ý đồ hoạ: Gấu Mẹ / Hổ Mẹ vẽ cỡ chuẩn; Gấu Con / Hổ Con thu nhỏ
  // (scale=0.62) để bé phân biệt mẹ-con bằng KÍCH THƯỚC + nhãn tiếng Việt.
  {
    id: 'river.2',
    name: 'Gia đình Gấu và Hổ',
    difficulty: 'Nâng cao',
    emoji: '🐻',
    characters: [
      { id: 'bearmom', emoji: '🐻', name: 'Gấu Mẹ', tags: ['adult', 'bear', 'driver'] },
      { id: 'bearcub', emoji: '🐻', name: 'Gấu Con', scale: 0.62, tags: ['cub', 'bear'] },
      { id: 'tigermom', emoji: '🐯', name: 'Hổ Mẹ', tags: ['adult', 'tiger', 'driver'] },
      { id: 'tigercub', emoji: '🐯', name: 'Hổ Con', scale: 0.62, tags: ['cub', 'tiger'] },
    ],
    rules: [
      { icon: '🐻🐯', text: 'Chỉ Gấu Mẹ và Hổ Mẹ biết lái thuyền.' },
      { icon: '🚣', text: 'Thuyền chở được tối đa 2 con.' },
      { icon: '🐯', text: 'Hổ Mẹ sẽ bắt nạt Gấu Con nếu vắng Gấu Mẹ.' },
      { icon: '🐻', text: 'Gấu Mẹ sẽ bắt nạt Hổ Con nếu vắng Hổ Mẹ.' },
    ],
    boatCapacity: 2,
    isDriver: (c) => c.tags.includes('driver'),
    checkSafety: (loc, _boatSide, chars) => {
      for (const side of SIDES) {
        const here = chars.filter((c) => loc.get(c.id) === side);
        const has = (id: string) => here.some((c) => c.id === id);
        if (has('bearcub') && has('tigermom') && !has('bearmom')) {
          return 'Hổ Mẹ đã bắt nạt Gấu Con mất rồi!';
        }
        if (has('tigercub') && has('bearmom') && !has('tigermom')) {
          return 'Gấu Mẹ đã bắt nạt Hổ Con mất rồi!';
        }
      }
      return null;
    },
  },

  // ── Màn 3 (Kỷ lục): 3 Chú lính + 3 Kẻ trộm ──────────────────────────────
  {
    id: 'river.3',
    name: '3 Chú lính & 3 Kẻ trộm',
    difficulty: 'Kỷ lục',
    emoji: '👮',
    characters: [
      { id: 's1', emoji: '👮', name: 'Lính 1', tags: ['soldier'] },
      { id: 's2', emoji: '👮', name: 'Lính 2', tags: ['soldier'] },
      { id: 's3', emoji: '👮', name: 'Lính 3', tags: ['soldier'] },
      { id: 't1', emoji: '🦹', name: 'Trộm 1', tags: ['thief'] },
      { id: 't2', emoji: '🦹', name: 'Trộm 2', tags: ['thief'] },
      { id: 't3', emoji: '🦹', name: 'Trộm 3', tags: ['thief'] },
    ],
    rules: [
      { icon: '🚣', text: 'Bất kỳ ai cũng biết lái thuyền.' },
      { icon: '👥', text: 'Thuyền chở được tối đa 2 người.' },
      { icon: '🦹', text: 'Bờ nào có Kẻ trộm ĐÔNG HƠN Chú lính → các Chú lính sẽ bị bắt!' },
    ],
    boatCapacity: 2,
    isDriver: () => true,
    checkSafety: (loc, _boatSide, chars) => {
      for (const side of SIDES) {
        const here = chars.filter((c) => loc.get(c.id) === side);
        const soldiers = here.filter((c) => c.tags.includes('soldier')).length;
        const thieves = here.filter((c) => c.tags.includes('thief')).length;
        // Có lính nhưng trộm đông hơn → lính bị bắt. (Bờ chỉ toàn trộm
        // không có lính thì không có ai bị bắt cả → an toàn.)
        if (soldiers > 0 && thieves > soldiers) {
          return 'Kẻ trộm áp đảo, các Chú lính đã bị bắt!';
        }
      }
      return null;
    },
  },
];

/* ===========================================================================
 * 5. KHỞI TẠO MÀN CHƠI
 * ========================================================================= */

/** Tạo trạng thái runtime ban đầu cho một màn: mọi nhân vật ở BỜ TRÁI. */
function buildRuntime(level: LevelDef): Runtime {
  const charLoc = new Map<string, Location>();
  for (const c of level.characters) charLoc.set(c.id, 'left');
  return {
    level,
    charLoc,
    boatSide: 'left',
    boatSeats: Array.from({ length: level.boatCapacity }, () => null),
    isAnimating: false,
    animStart: null,
    animFrom: BOAT_LEFT_X,
    animTo: BOAT_LEFT_X,
    boatX: BOAT_LEFT_X,
    moves: 0,
    gameOver: false,
  };
}

/* ===========================================================================
 * 6. COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function RiverRescueView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── React state (điều khiển giao diện ngoài canvas) ─────────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [levelIdx, setLevelIdx] = useState(0);
  // Bộ đếm vô nghĩa — chỉ để buộc rerender khi runtime trong ref thay đổi.
  const [uiVersion, setUiVersion] = useState(0);
  const bumpUi = useCallback(() => setUiVersion((v) => v + 1), []);
  // Khi có lý do thua → hiện popup "BÁO ĐỘNG".
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === 'string');
        }
      }
    } catch {
      // localStorage hỏng → coi như chưa hoàn thành màn nào
    }
    return [];
  });

  // ── Refs (nguồn dữ liệu cho RAF, không gây render lại) ──────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Runtime | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  // Ref chứa các callback có "vòng đời React" để RAF luôn dùng bản mới nhất
  // mà không phải tái-tạo vòng lặp vẽ.
  const handleWinRef = useRef<() => void>(() => {});

  /* ─────────────────────────────────────────────────────────────────────
   * 6a. BẮT ĐẦU / RESET MÀN
   * ───────────────────────────────────────────────────────────────────── */

  const startLevel = useCallback((idx: number) => {
    const level = LEVELS_DATA[idx];
    gameRef.current = buildRuntime(level);
    setLevelIdx(idx);
    setGameOverReason(null);
    phaseRef.current = 'playing';
    setPhase('playing');
    bumpUi();
  }, [bumpUi]);

  /** Chơi lại từ đầu màn hiện tại — mọi nhân vật về bờ trái, thuyền về trái. */
  const resetLevel = useCallback(() => {
    startLevel(levelIdx);
  }, [levelIdx, startLevel]);

  /* ─────────────────────────────────────────────────────────────────────
   * 6b. CÁC HÀNH ĐỘNG (BOARD / DISEMBARK / SAIL)
   * ───────────────────────────────────────────────────────────────────── */

  /** Trả về true nếu thuyền hiện đủ điều kiện để "SANG SÔNG". */
  const canSail = useCallback((): boolean => {
    const r = gameRef.current;
    if (!r || r.gameOver || r.isAnimating) return false;
    const seated = r.boatSeats.filter((s): s is string => s !== null);
    if (seated.length === 0) return false;
    // Phải có ít nhất một người biết lái thuyền trong số ngồi trên thuyền.
    return seated.some((id) => {
      const c = r.level.characters.find((c) => c.id === id);
      return !!c && r.level.isDriver(c);
    });
  }, []);

  /**
   * Xử lý click vào một nhân vật:
   *  - Đang ở bờ CÙNG với thuyền → lên thuyền (nếu còn ghế trống).
   *  - Đang ở trên thuyền        → xuống thuyền (về bờ thuyền đang đậu).
   *  - Đang ở bờ KHÔNG có thuyền → không làm gì.
   */
  const tapCharacter = useCallback(
    (charId: string) => {
      const r = gameRef.current;
      if (!r || r.gameOver || r.isAnimating) return;
      const loc = r.charLoc.get(charId);
      if (!loc) return;

      if (loc === 'boat') {
        // Xuống thuyền — quay về bờ mà thuyền đang đậu.
        const seat = r.boatSeats.indexOf(charId);
        if (seat >= 0) r.boatSeats[seat] = null;
        r.charLoc.set(charId, r.boatSide);
        playSfx('snd-correct');
        bumpUi();
        return;
      }

      if (loc === r.boatSide) {
        // Lên thuyền — tìm ghế trống đầu tiên.
        const seat = r.boatSeats.indexOf(null);
        if (seat < 0) return; // hết ghế, im lặng bỏ qua
        r.boatSeats[seat] = charId;
        r.charLoc.set(charId, 'boat');
        playSfx('snd-correct');
        bumpUi();
        return;
      }

      // Click vào nhân vật ở bờ đối diện — không thể với tới. Im lặng.
    },
    [bumpUi],
  );

  /** Bấm "SANG SÔNG" → khởi động animation thuyền chạy sang bờ kia. */
  const handleSail = useCallback(() => {
    const r = gameRef.current;
    if (!r || !canSail()) return;
    r.isAnimating = true;
    r.animStart = null; // gán ở frame đầu tiên trong vòng lặp vẽ
    r.animFrom = r.boatX;
    r.animTo = r.boatSide === 'left' ? BOAT_RIGHT_X : BOAT_LEFT_X;
    bumpUi();
  }, [bumpUi, canSail]);

  /** Khi animation kết thúc — cập nhật bờ thuyền, kiểm tra thua / thắng. */
  const finishSail = useCallback(() => {
    const r = gameRef.current;
    if (!r) return;
    // Cập nhật phía thuyền & đóng băng toạ độ x đúng điểm dock.
    r.boatSide = r.boatSide === 'left' ? 'right' : 'left';
    r.boatX = r.boatSide === 'left' ? BOAT_LEFT_X : BOAT_RIGHT_X;
    r.isAnimating = false;
    r.animStart = null;
    r.moves += 1;

    // Kiểm tra an toàn — bờ vừa rời đi (hoặc bất kỳ bờ nào theo level).
    const reason = r.level.checkSafety(r.charLoc, r.boatSide, r.level.characters);
    if (reason) {
      r.gameOver = true;
      setGameOverReason(reason);
      playSfx('snd-wrong');
      window.setTimeout(
        () => speak('Ồ không, ' + reason, LANG_SPEAK_DEFAULT),
        220,
      );
      bumpUi();
      return;
    }

    // Kiểm tra thắng — toàn bộ nhân vật đã ở phía BỜ PHẢI. "Phía bờ phải"
    // bao gồm cả nhân vật đang ngồi trên thuyền lúc thuyền vừa cập bờ phải,
    // vì với câu đố này, cập bờ = đã qua sông (không cần bước xuống thuyền).
    const allRight = r.level.characters.every((c) => {
      const loc = r.charLoc.get(c.id);
      return loc === 'right' || (loc === 'boat' && r.boatSide === 'right');
    });
    if (allRight) {
      handleWinRef.current();
      return;
    }

    bumpUi();
  }, [bumpUi]);

  /* ─────────────────────────────────────────────────────────────────────
   * 6c. THẮNG MÀN
   * ───────────────────────────────────────────────────────────────────── */

  const handleWin = useCallback(() => {
    if (phaseRef.current === 'won') return;
    const r = gameRef.current;
    if (!r) return;
    phaseRef.current = 'won';
    setPhase('won');

    setCompleted((prev) => {
      if (prev.includes(r.level.id)) return prev;
      const next = [...prev, r.level.id];
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // localStorage không khả dụng — bỏ qua
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
      colors: ['#22c55e', '#38bdf8', '#fbbf24', '#f472b6', '#a78bfa'],
    });
    window.setTimeout(
      () => speak('Xuất sắc! Đội cứu hộ đã hoàn thành nhiệm vụ', LANG_SPEAK_DEFAULT),
      300,
    );
  }, [addScore, levelIdx]);

  // Cập nhật ref khi handleWin thay đổi (do levelIdx, addScore thay đổi) — RAF
  // dùng ref này nên không cần khởi tạo lại vòng lặp vẽ.
  useEffect(() => {
    handleWinRef.current = handleWin;
  }, [handleWin]);

  /* ─────────────────────────────────────────────────────────────────────
   * 6d. CHUYỂN ĐỔI TOẠ ĐỘ MÀN HÌNH → CANVAS + XỬ LÝ POINTER
   * ───────────────────────────────────────────────────────────────────── */

  const toCanvasCoords = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = gameRef.current;
    if (!r || phaseRef.current !== 'playing' || r.gameOver || r.isAnimating) return;
    const { x, y } = toCanvasCoords(e);
    const id = charAtPoint(r, x, y);
    if (id) tapCharacter(id);
  };

  /* ─────────────────────────────────────────────────────────────────────
   * 6e. VẼ CANVAS
   * ───────────────────────────────────────────────────────────────────── */

  /** Vẽ một hình chữ nhật bo góc (dùng arcTo cho tương thích trình duyệt cũ). */
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

  /** Vẽ một emoji có scale (canh giữa tại cx, cy). */
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

  /** Vẽ tên tiếng Việt nhỏ dưới một nhân vật (giúp bé học từ vựng). */
  const drawNameLabel = (
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
  ) => {
    ctx.font = '700 13px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Vệt nền trắng mờ phía sau cho dễ đọc.
    const w = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRectPath(ctx, cx - w / 2 - 6, cy - 2, w + 12, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillText(text, cx, cy);
  };

  /** Vẽ chiếc thuyền (thân + viền + 2 ghế) tại tâm (boatX, BOAT_Y). */
  const drawBoat = (ctx: CanvasRenderingContext2D, boatX: number) => {
    const x = boatX - BOAT_W / 2;
    const y = BOAT_Y - BOAT_H / 2;
    // Bóng đổ dưới thuyền (phản chiếu lờ mờ trên mặt nước).
    ctx.save();
    ctx.fillStyle = 'rgba(15,23,42,0.18)';
    ctx.beginPath();
    ctx.ellipse(boatX, BOAT_Y + BOAT_H / 2 + 6, BOAT_W / 2 + 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Thân thuyền: gradient nâu, bo tròn đáy như chiếc canoe.
    ctx.beginPath();
    ctx.moveTo(x + 14, y);
    ctx.lineTo(x + BOAT_W - 14, y);
    ctx.quadraticCurveTo(x + BOAT_W + 18, y + BOAT_H / 2, x + BOAT_W - 14, y + BOAT_H);
    ctx.lineTo(x + 14, y + BOAT_H);
    ctx.quadraticCurveTo(x - 18, y + BOAT_H / 2, x + 14, y);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, y, 0, y + BOAT_H);
    grad.addColorStop(0, '#a16207');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#451a03';
    ctx.stroke();

    // Dải sáng phía trên thân thuyền — hiệu ứng nổi 3D nhẹ.
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 6);
    ctx.lineTo(x + BOAT_W - 22, y + 6);
    ctx.strokeStyle = 'rgba(254,243,199,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  /** Vẽ một frame: nền + sông + bờ + nhân vật + thuyền. */
  const drawScene = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const r = gameRef.current;
    if (!canvas || !r) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── BƯỚC ANIMATION (nếu thuyền đang sang sông) ─────────────────────
    if (r.isAnimating) {
      if (r.animStart === null) r.animStart = time;
      const t = Math.min(1, (time - r.animStart) / SAIL_DURATION_MS);
      r.boatX = r.animFrom + (r.animTo - r.animFrom) * easeInOutQuad(t);
      if (t >= 1) {
        // KẾT THÚC animation — gọi handler để cập nhật trạng thái + kiểm tra.
        // (finishSail tự đặt isAnimating=false và bumpUi.)
        finishSail();
      }
    }

    // ── BẦU TRỜI ───────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, '#bae6fd');
    sky.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── HAI BỜ (đất xanh) ──────────────────────────────────────────────
    const drawBank = (x: number) => {
      const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#86efac');
      g.addColorStop(1, '#15803d');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, BANK_W, CANVAS_H);
      // Đường mép bờ (chỗ tiếp giáp nước) — viền vàng cát mỏng.
      ctx.fillStyle = '#fde68a';
      if (x === 0) ctx.fillRect(BANK_W - 6, 0, 6, CANVAS_H);
      else ctx.fillRect(x, 0, 6, CANVAS_H);
    };
    drawBank(0);
    drawBank(RIVER_X2);

    // ── SÔNG ───────────────────────────────────────────────────────────
    const river = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    river.addColorStop(0, '#3b82f6');
    river.addColorStop(1, '#1e40af');
    ctx.fillStyle = river;
    ctx.fillRect(RIVER_X1, 0, RIVER_X2 - RIVER_X1, CANVAS_H);

    // Sóng nước: vài đường nét đứt trắng trôi sang phải theo thời gian.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 36]);
    const waveOffset = (time * 0.04) % 60; // dài 1 chu kỳ = 60px
    const waveYs = [80, 160, 240, 320, 460, 520];
    for (const wy of waveYs) {
      ctx.lineDashOffset = -waveOffset;
      ctx.beginPath();
      ctx.moveTo(RIVER_X1 + 6, wy);
      ctx.lineTo(RIVER_X2 - 6, wy);
      ctx.stroke();
    }
    ctx.restore();

    // ── TIÊU ĐỀ ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 22px Nunito, sans-serif';
    ctx.fillText('🚢 CỨU HỘ SÔNG SÂU', CANVAS_W / 2, 32);

    // ── THUYỀN ─────────────────────────────────────────────────────────
    drawBoat(ctx, r.boatX);

    // ── NHÂN VẬT (trên bờ + trên thuyền) ───────────────────────────────
    for (const c of r.level.characters) {
      const pos = charScreenPos(r, c.id);
      if (!pos) continue;
      const scale = c.scale ?? 1;
      const size = 64 * scale;
      // Hào quang nhẹ cho dễ phân biệt với nền — vòng tròn trắng mờ phía sau.
      const onBoat = r.charLoc.get(c.id) === 'boat';
      if (!onBoat) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 38 * scale + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      drawEmoji(ctx, c.emoji, pos.x, pos.y, size);
      // Tên hiển thị chỉ khi đứng trên bờ (trên thuyền chật chỗ).
      if (!onBoat) {
        drawNameLabel(ctx, c.name, pos.x, pos.y + 34 * scale);
      }
    }
  }, [finishSail]);

  /* ─────────────────────────────────────────────────────────────────────
   * 6f. VÒNG LẶP VẼ (Animation Loop) + DỌN DẸP
   * ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing') return;
    const loop = (ts: number) => {
      drawScene(ts);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, drawScene]);

  // Lời nhắc giọng nói khi vào màn chơi.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = window.setTimeout(() => {
      speak('Hãy đưa tất cả nhân vật sang bờ kia mà không gặp nguy hiểm nhé', LANG_SPEAK_DEFAULT);
    }, 400);
    return () => window.clearTimeout(t);
  }, [phase, levelIdx]);

  /* ─────────────────────────────────────────────────────────────────────
   * 6g. MÀN HÌNH CHỌN CẤP ĐỘ (idle)
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
          <div className="text-7xl mb-4 floating">🚢</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent leading-tight">
            Cứu Hộ Sông Sâu
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Đưa tất cả nhân vật qua sông an toàn — đừng để ai bị ăn thịt hay bị
            bắt nạt khi không có người canh giữ nhé!
          </p>

          <div className="bg-gradient-to-br from-sky-50 to-emerald-50 border-2 border-sky-200 rounded-3xl p-5 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">👆</span> Chạm vào nhân vật để cho lên thuyền.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🚣</span> Bấm "SANG SÔNG" để thuyền chạy qua.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">📜</span> Đọc kỹ Quy tắc an toàn cho từng màn.
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
                  className="w-full p-5 bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-white rounded-3xl shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center gap-4 text-left"
                >
                  <div className="text-4xl">{lv.emoji}</div>
                  <div className="flex-1">
                    <div className="font-black text-lg leading-tight">
                      Màn {i + 1}: {lv.name}
                    </div>
                    <div className="text-xs opacity-90 font-bold mt-0.5">
                      {lv.characters.length} nhân vật · {lv.difficulty}
                    </div>
                  </div>
                  {done ? (
                    <span className="text-yellow-300 text-xl font-black">✓</span>
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
   * 6h. MÀN HÌNH CHÚC MỪNG (won)
   * ───────────────────────────────────────────────────────────────────── */

  if (phase === 'won') {
    const isLast = levelIdx >= LEVELS_DATA.length - 1;
    const moves = gameRef.current?.moves ?? 0;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4 floating">🚢</div>
        <h2 className="text-2xl font-black mb-2 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent leading-tight">
          Xuất sắc! Đội cứu hộ đã hoàn thành nhiệm vụ! 🎉
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Tất cả nhân vật đã qua sông bình an. Hoan hô thuyền trưởng nhí!
        </p>

        <div className="bg-slate-50 rounded-3xl p-4 mb-6">
          <div className="text-4xl font-black bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
            +{WIN_SCORE[levelIdx] ?? 50} điểm
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Hoàn thành sau {moves} chuyến đò
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!isLast && (
            <button
              onClick={() => startLevel(levelIdx + 1)}
              className="w-full py-4 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-sky-200 active:scale-95 transition-all"
            >
              🌊 Màn tiếp theo
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
              className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 active:scale-95 transition-all"
            >
              🔄 Chơi lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 6i. MÀN HÌNH CHƠI (playing)
   * ───────────────────────────────────────────────────────────────────── */

  const level = LEVELS_DATA[levelIdx];
  const r = gameRef.current;
  // Đếm số nhân vật đã đến bờ phải để hiển thị tiến độ.
  const onRightCount = r
    ? level.characters.filter((c) => r.charLoc.get(c.id) === 'right').length
    : 0;
  const sailEnabled = canSail();

  return (
    // `uiVersion` chỉ để buộc rerender khi runtime trong ref đổi — không dùng
    // thực tế trong cây JSX.
    <div
      data-ui-version={uiVersion}
      className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none"
    >
      {/* Thanh trên: thoát + tên màn + tiến độ */}
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
          Đã qua sông{' '}
          <span className="text-sky-600 text-base ml-0.5">
            {onRightCount}/{level.characters.length}
          </span>
        </div>
      </div>

      {/* Khu vực hiển thị "Quy tắc an toàn" cho màn hiện tại */}
      <div className="bg-gradient-to-br from-sky-50 to-emerald-50 border-2 border-sky-200 rounded-3xl p-4 mb-3 shadow-inner">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-dashed border-sky-300">
          <span className="text-2xl">📜</span>
          <h3 className="font-black text-sky-900">Quy tắc an toàn</h3>
        </div>
        <ul className="space-y-1.5">
          {level.rules.map((rule, i) => (
            <li key={i} className="flex gap-2 items-start text-sm font-semibold text-sky-900 leading-snug">
              <span className="text-base align-middle">{rule.icon}</span>
              <span className="flex-1">{rule.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Canvas dòng sông + hai bờ + thuyền */}
      <div className="relative rounded-3xl overflow-hidden border-4 border-sky-300 shadow-lg shadow-sky-100">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={onPointerDown}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none',
          }}
        />

        {/* Popup BÁO ĐỘNG khi vi phạm quy tắc — đè lên canvas, có animation. */}
        {gameOverReason && (
          <div className="absolute inset-0 bg-rose-900/45 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white border-4 border-rose-500 rounded-3xl p-6 mx-6 text-center shadow-2xl animate-pulse max-w-xs">
              <div className="text-5xl mb-2">🚨</div>
              <div className="text-rose-600 font-black text-xl mb-1">
                BÁO ĐỘNG!
              </div>
              <div className="text-slate-700 font-bold text-base mb-4 leading-snug">
                {gameOverReason}
              </div>
              <button
                onClick={resetLevel}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-rose-200 active:scale-95 transition-all"
              >
                🔄 Thử lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nút điều khiển: SANG SÔNG (chính) + CHƠI LẠI + ĐỔI MÀN */}
      <button
        onClick={handleSail}
        disabled={!sailEnabled}
        className="w-full mt-3 py-4 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-sky-200 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
      >
        🚢 CHO THUYỀN SANG SÔNG
      </button>
      <div className="flex gap-3 mt-3">
        <button
          onClick={resetLevel}
          className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
        >
          🔄 CHƠI LẠI
        </button>
        <button
          onClick={() => {
            phaseRef.current = 'idle';
            setPhase('idle');
            setGameOverReason(null);
          }}
          className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
        >
          🗺️ ĐỔI MÀN
        </button>
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Chạm nhân vật ở bờ có thuyền để lên thuyền · Chạm lại để rời thuyền
      </p>
    </div>
  );
}
