import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { playSfx } from '../lib/audio';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Đảo Thần Kỳ 2048 — Tiến Hoá Động Vật (trẻ 5-10 tuổi).                    ║
// ║                                                                          ║
// ║  Kiến trúc:                                                              ║
// ║   - ReactJS quản lý: ma trận 4×4 (mảng tile id → vị trí), điểm hiện tại, ║
// ║     điểm cao, trạng thái Win / GameOver.                                ║
// ║   - HTML5 Canvas: render mỗi frame (RAF). Mỗi tile lưu (gridX, gridY) là ║
// ║     vị trí ĐÍCH và (visualX, visualY) là vị trí HIỂN THỊ. Vòng lặp LERP ║
// ║     visualX/Y → đích cho cảm giác trượt mượt; pop scale cho merge/spawn. ║
// ║   - Input: phím mũi tên (window keydown, có preventDefault) + swipe touch║
// ║   - Persistence: điểm cao trong localStorage (key lingoland_magic2048_hs).║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─── 1. Hằng số kích thước & vật lý animation ─────────────────────────────

const GRID = 4;                    // 4×4
const CELL = 98;                   // px/ô
const GAP = 12;                    // khoảng cách giữa các ô
const PAD = 16;                    // padding khung viền
const CANVAS_SIZE = GRID * CELL + (GRID - 1) * GAP + 2 * PAD; // = 460
const RADIUS = 14;                 // bo góc ô

const ANIM_SPEED = 0.28;           // Hệ số LERP / frame (cao = nhanh tới đích)
const SETTLE_EPS = 0.5;            // px — sai số coi như đã settle
const SPAWN_DECAY = 0.07;          // tốc độ tắt animation spawn (mỗi frame)
const MERGE_DECAY = 0.10;          // tốc độ tắt animation merge pop

const SWIPE_MIN_PX = 28;           // ngưỡng px để coi là swipe (không phải tap)
const SPAWN_4_RATE = 0.1;          // 10% spawn ra ô 🐥 (4), còn lại 🥚 (2)

const HIGH_SCORE_KEY = 'lingoland_magic2048_hs';
// Persist các tier đã khám phá xuyên suốt các lượt chơi → tạo cảm giác "bộ sưu tập"
// tăng dần, không bị mất sau khi Chơi Lại / Thoát game.
const DISCOVERED_KEY = 'lingoland_magic2048_discovered';
// Bộ giá trị MẶC ĐỊNH luôn coi như đã khám phá (vì 2 và 4 tự spawn ngay đầu game).
const INITIAL_DISCOVERED = [2, 4];
const UNLOCK_NOTICE_MS = 2600;        // Thời gian hiển thị banner "Đã mở khoá"

// ─── 2. Chuỗi tiến hoá: 2 → 4 → 8 → ... → 2048 ────────────────────────────

type EvoStage = {
  emoji: string;
  name: string;
  bg: string;      // màu nền ô (pastel khác nhau theo cấp)
  border: string;  // màu viền — đậm hơn nền 1 chút
};

const EVOLUTION: Record<number, EvoStage> = {
  2:    { emoji: '🥚', name: 'Trứng',    bg: '#fef9c3', border: '#fde047' },
  4:    { emoji: '🐥', name: 'Gà con',   bg: '#fde68a', border: '#facc15' },
  8:    { emoji: '🐰', name: 'Thỏ',      bg: '#fdba74', border: '#fb923c' },
  16:   { emoji: '🦊', name: 'Cáo',      bg: '#fb923c', border: '#ea580c' },
  32:   { emoji: '🐵', name: 'Khỉ',      bg: '#c4b5fd', border: '#8b5cf6' },
  64:   { emoji: '🐗', name: 'Heo rừng', bg: '#a78bfa', border: '#7c3aed' },
  128:  { emoji: '🐯', name: 'Hổ',       bg: '#fbbf24', border: '#d97706' },
  256:  { emoji: '🦁', name: 'Sư tử',    bg: '#f59e0b', border: '#b45309' },
  512:  { emoji: '🐻', name: 'Gấu',      bg: '#92400e', border: '#7c2d12' },
  1024: { emoji: '🐘', name: 'Voi',      bg: '#64748b', border: '#475569' },
  2048: { emoji: '🐉', name: 'Rồng',     bg: '#10b981', border: '#047857' },
};

const EVOLUTION_ORDER = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

// ─── 3. Kiểu dữ liệu Tile ─────────────────────────────────────────────────

/**
 * Mỗi ô có giá trị (luỹ thừa 2) trên lưới được biểu diễn bằng 1 đối tượng Tile.
 *
 * Phân biệt vị trí ĐÍCH vs vị trí HIỂN THỊ:
 *   - gridX, gridY: ô đích trên lưới (sau khi áp dụng nước đi).
 *   - visualX, visualY: toạ độ pixel TÂM hiện đang vẽ. Mỗi frame LERP về
 *     `gridToPx(gridX/Y)` để tạo hiệu ứng trượt mượt.
 *
 * Cờ animation:
 *   - removeAfterSlide: tile "nguồn" của 1 merge — slide vào ô của tile đích
 *     rồi BIẾN MẤT khi tất cả tile đã settle.
 *   - pendingMergePop: tile "đích" của 1 merge — sau khi settle sẽ kích hoạt
 *     mergeT để vẽ pop scale.
 *   - mergeT: 1 → 0, dùng cho hiệu ứng "to lên rồi nhỏ lại" khi vừa gộp.
 *   - spawnT: 1 → 0, dùng cho hiệu ứng "lớn dần từ tâm" khi mới xuất hiện.
 */
type Tile = {
  id: number;
  value: number;
  gridX: number;
  gridY: number;
  visualX: number;
  visualY: number;
  removeAfterSlide: boolean;
  pendingMergePop: boolean;
  mergeT: number;
  spawnT: number;
};

// ─── 4. Helpers toạ độ & lưới ─────────────────────────────────────────────

/** Toạ độ tâm pixel của ô (gx, gy) trên canvas. */
const gridToPx = (g: number) => PAD + g * (CELL + GAP) + CELL / 2;

/** Khởi tạo 1 tile mới ở vị trí (gx, gy) — visualX/Y đặt sẵn ở đúng ô. */
function makeTile(id: number, value: number, gx: number, gy: number): Tile {
  return {
    id, value,
    gridX: gx, gridY: gy,
    visualX: gridToPx(gx),
    visualY: gridToPx(gy),
    removeAfterSlide: false,
    pendingMergePop: false,
    mergeT: 0,
    spawnT: 1,    // bắt đầu = 1 → animate "pop in" cho tới khi về 0
  };
}

/** Tìm 1 ô trống ngẫu nhiên, hoặc null nếu lưới đầy. */
function pickEmptyCell(tiles: Tile[]): { x: number; y: number } | null {
  const occupied = new Set<string>();
  for (const t of tiles) {
    if (!t.removeAfterSlide) occupied.add(`${t.gridX},${t.gridY}`);
  }
  const empties: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(`${x},${y}`)) empties.push({ x, y });
    }
  }
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}

/** Sinh thêm 1 tile vào ô trống — 90% là 🥚 (2), 10% là 🐥 (4). */
function spawnTile(tiles: Tile[], nextId: { current: number }): Tile | null {
  const cell = pickEmptyCell(tiles);
  if (!cell) return null;
  const value = Math.random() < SPAWN_4_RATE ? 4 : 2;
  return makeTile(nextId.current++, value, cell.x, cell.y);
}

// ─── 5. Thuật toán 2048: slide & merge ────────────────────────────────────

type Dir = 'L' | 'R' | 'U' | 'D';

/**
 * Áp dụng nước đi theo hướng `dir`:
 *   - Mỗi tile trượt xa nhất có thể về phía đích.
 *   - 2 tile cùng giá trị, NẰM SÁT NHAU trên hướng di chuyển sẽ gộp thành
 *     tile với giá trị x2. Mỗi tile chỉ được gộp 1 lần / lượt.
 *
 * Trả về:
 *   - changed:    Có tile nào thực sự di chuyển / gộp không (để bỏ qua move
 *                 vô hiệu — không spawn tile mới).
 *   - scoreGain:  Tổng giá trị các tile sinh ra do gộp trong lượt này.
 *   - reached2048:Lần đầu xuất hiện tile 2048 (để hiển thị màn hình Win).
 *
 * Ý tưởng:
 *   1. Dựng lưới (Tile|null)[][] từ danh sách tiles.
 *   2. Duyệt cells theo thứ tự "GẦN ĐÍCH NHẤT TRƯỚC" — đảm bảo khi 1 tile
 *      đang trượt, các tile phía trước đã được đặt vào vị trí cuối cùng.
 *   3. Với mỗi tile: trượt cho đến khi đụng tường HOẶC tile khác. Nếu tile
 *      khác cùng giá trị & CHƯA gộp lần này → gộp; ngược lại dừng kế bên.
 *   4. Cập nhật gridX/gridY của các tile (visualX/Y giữ nguyên → RAF LERP).
 */
function applyMove(
  tiles: Tile[],
  dir: Dir,
): { changed: boolean; scoreGain: number; reached2048: boolean } {
  // 5.1 Dựng lưới tra cứu nhanh theo toạ độ
  const grid: (Tile | null)[][] = Array.from({ length: GRID }, () =>
    Array<Tile | null>(GRID).fill(null),
  );
  for (const t of tiles) {
    if (!t.removeAfterSlide) grid[t.gridY][t.gridX] = t;
  }

  // 5.2 Vector hướng + thứ tự duyệt
  const dx = dir === 'L' ? -1 : dir === 'R' ? +1 : 0;
  const dy = dir === 'U' ? -1 : dir === 'D' ? +1 : 0;
  // "Gần đích trước": với hướng +, duyệt index lớn → nhỏ; với hướng -, ngược lại.
  const xs = dx === +1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
  const ys = dy === +1 ? [3, 2, 1, 0] : [0, 1, 2, 3];

  let changed = false;
  let scoreGain = 0;
  let reached2048 = false;
  const mergedIds = new Set<number>();   // ID những tile đã gộp lần này

  for (const y of ys) {
    for (const x of xs) {
      const tile = grid[y][x];
      if (!tile) continue;

      // Tìm vị trí trượt xa nhất + có gộp không
      let nx = x, ny = y;
      let mergeWith: Tile | null = null;
      for (;;) {
        const tx = nx + dx;
        const ty = ny + dy;
        if (tx < 0 || tx >= GRID || ty < 0 || ty >= GRID) break;
        const occ = grid[ty][tx];
        if (!occ) {
          // Ô trống — trượt thêm 1 bước
          nx = tx; ny = ty;
          continue;
        }
        // Đụng tile khác — chỉ gộp nếu cùng giá trị & cả 2 đều chưa gộp lần này
        if (occ.value === tile.value && !mergedIds.has(occ.id) && !mergedIds.has(tile.id)) {
          mergeWith = occ;
          nx = tx; ny = ty;
        }
        break;
      }

      // Không thay đổi vị trí → bỏ qua
      if (nx === x && ny === y) continue;
      changed = true;

      // Cập nhật lưới + tile
      grid[y][x] = null;
      if (mergeWith) {
        // Gộp: tile "nguồn" sẽ trượt vào ô của mergeWith rồi biến mất.
        mergeWith.value *= 2;
        mergeWith.pendingMergePop = true;
        mergedIds.add(mergeWith.id);
        scoreGain += mergeWith.value;
        if (mergeWith.value === 2048) reached2048 = true;
        // tile "nguồn" — giữ lại để vẽ slide animation, sau đó remove.
        tile.gridX = nx;
        tile.gridY = ny;
        tile.removeAfterSlide = true;
        // KHÔNG đặt grid[ny][nx] = tile — tile đã "vô hình" về mặt logic.
      } else {
        // Chỉ trượt, không gộp
        grid[ny][nx] = tile;
        tile.gridX = nx;
        tile.gridY = ny;
      }
    }
  }

  return { changed, scoreGain, reached2048 };
}

/** Có thể đi thêm nước nào không (còn ô trống HOẶC còn cặp kề cùng giá trị). */
function hasAnyMove(tiles: Tile[]): boolean {
  const grid: (Tile | null)[][] = Array.from({ length: GRID }, () =>
    Array<Tile | null>(GRID).fill(null),
  );
  for (const t of tiles) {
    if (!t.removeAfterSlide) grid[t.gridY][t.gridX] = t;
  }
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const t = grid[y][x];
      if (!t) return true;                                   // Còn ô trống
      if (x + 1 < GRID && grid[y][x + 1]?.value === t.value) return true;
      if (y + 1 < GRID && grid[y + 1][x]?.value === t.value) return true;
    }
  }
  return false;
}

// ─── 6. Canvas drawing helpers ────────────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ─── 7. Persistence: localStorage ─────────────────────────────────────────

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(n: number) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

/** Đọc tập hợp các tier (giá trị) bé đã từng khám phá. Luôn bao gồm 2 & 4. */
function loadDiscovered(): Set<number> {
  const out = new Set<number>(INITIAL_DISCOVERED);
  try {
    const raw = localStorage.getItem(DISCOVERED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const n of arr) {
          if (typeof n === 'number' && Number.isFinite(n)) out.add(n);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

function saveDiscovered(s: Set<number>) {
  try {
    localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

// ─── 8. Component chính ───────────────────────────────────────────────────

type Props = { onBack: () => void };
type Phase = 'playing' | 'won' | 'gameover';

export default function MagicIsland2048View({ onBack }: Props) {
  // ── React state ─────────────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => loadHighScore());
  const [phase, setPhase] = useState<Phase>('playing');
  const [winShown, setWinShown] = useState(false);     // đã hiện màn Win lần đầu chưa
  const [isAnimating, setIsAnimating] = useState(false); // KHOÁ input khi tile đang trượt
  const [, forceTick] = useState(0);                   // bump để rerender UI khi cần
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Tập hợp các tier (luỹ thừa 2) bé đã khám phá. Hiển thị mờ → sáng trong Evolution Guide.
  const [discovered, setDiscovered] = useState<Set<number>>(() => loadDiscovered());
  // Banner "Đã mở khoá loài vật mới" — null khi không hiện.
  const [unlockNotice, setUnlockNotice] = useState<EvoStage | null>(null);

  // ── Refs (RAF / handlers đọc trực tiếp giá trị mới nhất) ────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tilesRef = useRef<Tile[]>([]);
  const nextIdRef = useRef(1);
  const phaseRef = useRef<Phase>('playing');
  // Ref song song với state isAnimating — để RAF & keydown handler đọc tức thời,
  // không phải chờ React re-render. Hai biến luôn được set qua `setAnimating()` bên dưới.
  const isAnimatingRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  // Bản ref của `discovered` để tryMove (gọi đồng bộ trong handler) đọc giá trị
  // mới nhất mà không phụ thuộc vào closure cũ.
  const discoveredRef = useRef<Set<number>>(discovered);
  // Timeout id của banner "Đã mở khoá" — clear khi tier mới hơn xuất hiện.
  const unlockTimerRef = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { discoveredRef.current = discovered; }, [discovered]);

  // Dọn timer khi unmount (tránh setUnlockNotice vào component đã unmount)
  useEffect(() => {
    return () => {
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Hiện banner "Đã mở khoá loài vật mới" trong UNLOCK_NOTICE_MS, kèm pháo hoa.
   * Nếu đang có banner cũ → ghi đè + reset timer (tránh chồng nhiều timeout).
   */
  const showUnlockNotice = useCallback((evo: EvoStage) => {
    setUnlockNotice(evo);
    playSfx('snd-correct');
    confetti({
      particleCount: 90, spread: 80, origin: { y: 0.35 },
      colors: ['#fde047', '#fbbf24', '#10b981', '#a78bfa'],
    });
    if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => {
      setUnlockNotice(null);
      unlockTimerRef.current = null;
    }, UNLOCK_NOTICE_MS);
  }, []);

  /**
   * Đặt cờ "đang animating" cho CẢ ref lẫn state trong một lần gọi.
   *   - ref dùng cho handler / RAF (đọc đồng bộ, không cần đợi React).
   *   - state dùng để UI có thể phản ứng nếu muốn (ví dụ dim chỉ báo điểm).
   *
   * Quy ước:
   *   - Bật `true` ngay khi tryMove() phát hiện nước đi hợp lệ → các tile sắp slide.
   *   - Bật `false` trong vòng lặp RAF KHI tất cả tile đã settle về đích.
   */
  const setAnimating = useCallback((v: boolean) => {
    isAnimatingRef.current = v;
    setIsAnimating(v);
  }, []);

  // ── 8.1 Khởi tạo / Restart ─────────────────────────────────────────────

  const resetGame = useCallback(() => {
    nextIdRef.current = 1;
    const t1 = spawnTile([], nextIdRef);
    const t2 = t1 ? spawnTile([t1], nextIdRef) : null;
    tilesRef.current = [t1, t2].filter(Boolean) as Tile[];
    setAnimating(false);
    setScore(0);
    setPhase('playing');
    setWinShown(false);
    forceTick((n) => n + 1);
  }, [setAnimating]);

  // Khởi tạo lần đầu khi mount (deps rỗng — chỉ chạy 1 lần)
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật high score mỗi khi score vượt
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      saveHighScore(score);
    }
  }, [score, highScore]);

  // ── 8.2 Hàm di chuyển ───────────────────────────────────────────────────

  const tryMove = useCallback((dir: Dir) => {
    // KHOÁ input khi đang animating — tránh việc bé bấm phím dồn dập làm rối
    // logic slide/merge (tile chưa kịp settle thì state đã bị mutate tiếp).
    if (isAnimatingRef.current) return;
    if (phaseRef.current === 'gameover') return;

    const result = applyMove(tilesRef.current, dir);
    if (!result.changed) return;   // nước đi vô hiệu → không spawn

    setScore((s) => s + result.scoreGain);
    // Bật cờ KHOÁ — sẽ được mở lại trong RAF khi tất cả tile đã settle.
    setAnimating(true);

    // Quét tile sau move để tìm tier MỚI khám phá (chưa có trong discoveredRef).
    // Lưu ý: applyMove đã cập nhật `value` của tile gộp tại chỗ — đọc tilesRef
    // ngay sau đây sẽ thấy giá trị mới nhất.
    const cur = discoveredRef.current;
    const newTiers: number[] = [];
    for (const t of tilesRef.current) {
      if (t.removeAfterSlide) continue;
      if (!cur.has(t.value) && !newTiers.includes(t.value)) newTiers.push(t.value);
    }
    if (newTiers.length > 0) {
      const updated = new Set(cur);
      for (const v of newTiers) updated.add(v);
      discoveredRef.current = updated;
      setDiscovered(updated);
      saveDiscovered(updated);
      // Hiện banner cho tier CAO NHẤT vừa khám phá (đỉnh thành tích lượt này).
      // Trường hợp đặc biệt: tier 2048 — bỏ qua banner vì màn Win đã có pháo hoa to hơn.
      const highest = newTiers.reduce((a, b) => Math.max(a, b));
      if (highest !== 2048) {
        const evo = EVOLUTION[highest];
        if (evo) showUnlockNotice(evo);
      }
    }

    // Lần đầu chạm 2048 → màn Win + pháo hoa
    if (result.reached2048 && !winShown) {
      setWinShown(true);
      setPhase('won');
      playSfx('snd-correct');
      confetti({
        particleCount: 200, spread: 120, origin: { y: 0.4 },
        colors: ['#10b981', '#34d399', '#fbbf24', '#f97316', '#60a5fa', '#a78bfa'],
      });
      window.setTimeout(() => {
        confetti({
          particleCount: 100, spread: 80,
          origin: { x: 0.25, y: 0.5 },
          colors: ['#fbbf24', '#10b981'],
        });
      }, 250);
      window.setTimeout(() => {
        confetti({
          particleCount: 100, spread: 80,
          origin: { x: 0.75, y: 0.5 },
          colors: ['#f97316', '#60a5fa'],
        });
      }, 500);
    } else if (result.scoreGain > 0) {
      // Có merge nhưng chưa thắng → tiếng hài lòng nhẹ
      playSfx('snd-correct');
    }

    forceTick((n) => n + 1);
  }, [winShown, setAnimating, showUnlockNotice]);

  // ── 8.3 Bàn phím (window keydown + preventDefault để không cuộn trang) ─

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let dir: Dir | null = null;
      if (e.key === 'ArrowUp') dir = 'U';
      else if (e.key === 'ArrowDown') dir = 'D';
      else if (e.key === 'ArrowLeft') dir = 'L';
      else if (e.key === 'ArrowRight') dir = 'R';
      if (!dir) return;
      e.preventDefault();   // tránh cuộn trang khi bé bấm mũi tên
      tryMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tryMove]);

  // ── 8.4 Swipe (Pointer Events — thống nhất chuột + cảm ứng) ────────────

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      tryMove(dx > 0 ? 'R' : 'L');
    } else {
      tryMove(dy > 0 ? 'D' : 'U');
    }
  };
  const onPointerCancel = () => { swipeStartRef.current = null; };

  // ── 8.5 Tiếp tục sau khi Win — tiếp tục phá kỷ lục ─────────────────────

  const continuePlay = useCallback(() => {
    setPhase('playing');
  }, []);

  // ── 8.6 Vòng lặp render Canvas (RAF) ───────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // 8.6.1 Nền & viền khung lưới
      // Đảo xanh: gradient navy → emerald đậm
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
      bg.addColorStop(0, '#064e3b');
      bg.addColorStop(1, '#022c22');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Khung lưới (lớp nền các ô — vẽ ngay cả ô trống cho dễ định hướng)
      ctx.fillStyle = '#0f766e';
      drawRoundedRect(ctx, 4, 4, CANVAS_SIZE - 8, CANVAS_SIZE - 8, RADIUS + 4);
      ctx.fill();

      // 8.6.2 Ô trống (background slots)
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const px = PAD + x * (CELL + GAP);
          const py = PAD + y * (CELL + GAP);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          drawRoundedRect(ctx, px, py, CELL, CELL, RADIUS);
          ctx.fill();
        }
      }

      // 8.6.3 LERP visualX/Y → đích & cập nhật bộ đếm animation
      // Đồng thời kiểm tra xem TẤT CẢ tile đã "settle" (đến đích) hay chưa.
      let allSettled = true;
      for (const t of tilesRef.current) {
        const tx = gridToPx(t.gridX);
        const ty = gridToPx(t.gridY);
        t.visualX += (tx - t.visualX) * ANIM_SPEED;
        t.visualY += (ty - t.visualY) * ANIM_SPEED;
        if (Math.abs(t.visualX - tx) > SETTLE_EPS || Math.abs(t.visualY - ty) > SETTLE_EPS) {
          allSettled = false;
        } else {
          // Snap chính xác để khỏi "rung" số thập phân
          t.visualX = tx; t.visualY = ty;
        }
        if (t.spawnT > 0) t.spawnT = Math.max(0, t.spawnT - SPAWN_DECAY);
        if (t.mergeT > 0) t.mergeT = Math.max(0, t.mergeT - MERGE_DECAY);
      }

      // 8.6.4 Vẽ tiles (tile nguồn đang biến mất vẽ trước → tile đích đè lên)
      const drawList = [
        ...tilesRef.current.filter((t) => t.removeAfterSlide),
        ...tilesRef.current.filter((t) => !t.removeAfterSlide),
      ];
      for (const t of drawList) {
        const evo = EVOLUTION[t.value] ?? EVOLUTION[2];
        // Scale tổng hợp từ spawn pop + merge pop:
        // - spawn: 1 - spawnT^2 → ease-out từ 0 → 1
        // - merge: 1 + 0.25 * sin((1 - mergeT) * π) → bật to 1.25 rồi về 1
        let scale = 1;
        if (t.spawnT > 0) scale = 1 - t.spawnT * t.spawnT;
        if (t.mergeT > 0) scale = 1 + Math.sin((1 - t.mergeT) * Math.PI) * 0.25;

        const w = CELL * scale;
        const h = CELL * scale;
        // Ô nền
        ctx.fillStyle = evo.bg;
        drawRoundedRect(ctx, t.visualX - w / 2, t.visualY - h / 2, w, h, RADIUS);
        ctx.fill();
        // Viền đậm — tăng độ nổi của ô cấp cao
        ctx.strokeStyle = evo.border;
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, t.visualX - w / 2, t.visualY - h / 2, w, h, RADIUS);
        ctx.stroke();
        // Đốm sáng nhẹ cho tile 2048 — viên rồng huyền thoại
        if (t.value === 2048) {
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 24;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3;
          drawRoundedRect(ctx, t.visualX - w / 2, t.visualY - h / 2, w, h, RADIUS);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // Emoji con vật ở giữa
        const emojiPx = Math.floor(CELL * 0.62 * scale);
        ctx.font = `${emojiPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(evo.emoji, t.visualX, t.visualY - 2);
        // Số nhỏ ở góc dưới — giúp bé học luỹ thừa của 2
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.font = `bold ${Math.floor(14 * Math.min(scale, 1.05))}px system-ui, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(t.value), t.visualX + w / 2 - 6, t.visualY + h / 2 - 4);
      }

      // 8.6.5 Khi tất cả đã settle & đang chờ "post-move cleanup":
      //   - Xoá tile nguồn (removeAfterSlide)
      //   - Bật mergeT cho tile đích merge
      //   - Spawn 1 tile mới (luôn nằm trong nước đi hợp lệ vì changed=true)
      //   - Kiểm tra Game Over
      //   - MỞ KHOÁ input (isAnimating = false) — bé có thể bấm phím tiếp.
      if (allSettled && isAnimatingRef.current) {
        // Lọc bỏ tile đã merge xong
        const next = tilesRef.current.filter((t) => !t.removeAfterSlide);
        // Bật pop animation cho các tile đích
        for (const t of next) {
          if (t.pendingMergePop) {
            t.pendingMergePop = false;
            t.mergeT = 1;
          }
        }
        // Spawn tile mới
        const newTile = spawnTile(next, nextIdRef);
        if (newTile) next.push(newTile);
        tilesRef.current = next;
        // Kiểm tra game over (chỉ khi không đang ở màn Win)
        if (phaseRef.current === 'playing' && !hasAnyMove(next)) {
          setPhase('gameover');
          playSfx('snd-wrong');
        }
        // Mở khoá: bé có thể bấm phím / vuốt nước đi tiếp theo.
        isAnimatingRef.current = false;
        setIsAnimating(false);
        forceTick((n) => n + 1);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // ── 8.7 Render UI ──────────────────────────────────────────────────────

  return (
    <div className="py-4 animate-in fade-in duration-300">
      {/* Thanh trên: nút thoát, tên game, nút chơi lại */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold text-sm transition-colors"
        >
          ✕ Thoát
        </button>
        <div className="text-center">
          <div className="text-[10px] text-emerald-700 font-black tracking-widest">ĐẢO THẦN KỲ</div>
          <div className="font-black text-slate-800">🐉 2048</div>
        </div>
        <button
          onClick={resetGame}
          className="px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-xl text-amber-700 font-bold text-sm transition-colors"
          title="Chơi lại"
        >
          🔄
        </button>
      </div>

      {/* Bảng điểm */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md">
          <div className="text-[10px] font-black tracking-widest opacity-80">ĐIỂM</div>
          <div className="font-black text-2xl">{score}</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-md">
          <div className="text-[10px] font-black tracking-widest opacity-80">KỶ LỤC</div>
          <div className="font-black text-2xl">{highScore}</div>
        </div>
      </div>

      {/* Hint */}
      <div className="mb-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-2xl text-sm text-slate-700 font-bold">
        💡 Bấm <span className="text-emerald-700">phím mũi tên</span> hoặc <span className="text-emerald-700">vuốt</span> để gộp các con thú — tiến hoá tới 🐉 Rồng huyền thoại!
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/20 border-4 border-emerald-900 mx-auto"
        style={{ maxWidth: CANVAS_SIZE }}
        aria-busy={isAnimating}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className={[
            'w-full block touch-none select-none transition-[filter] duration-150',
            // Khi animating: hơi giảm sáng để bé cảm nhận game đang "bận"
            isAnimating ? 'brightness-95' : '',
          ].join(' ')}
          style={{ aspectRatio: '1 / 1' }}
        />

        {/* Banner "Đã mở khoá loài vật mới" — nổi giữa-trên Canvas, tự ẩn sau ~2.6s */}
        {unlockNotice && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2.5 bg-white rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 max-w-[92%] animate-in slide-in-from-top-4 fade-in duration-300"
            style={{ boxShadow: '0 12px 32px rgba(251, 191, 36, 0.45)' }}
          >
            <div
              className="text-4xl flex items-center justify-center rounded-xl w-12 h-12 border-2"
              style={{ background: unlockNotice.bg, borderColor: unlockNotice.border }}
            >
              {unlockNotice.emoji}
            </div>
            <div className="leading-tight">
              <div className="text-[10px] text-amber-600 font-black tracking-widest">
                ✨ ĐÃ MỞ KHOÁ LOÀI VẬT MỚI!
              </div>
              <div className="text-sm font-black text-slate-800">
                {unlockNotice.name} đã xuất hiện trên đảo
              </div>
            </div>
          </div>
        )}

        {/* Overlay WIN — cho phép tiếp tục */}
        {phase === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900/80 backdrop-blur-sm">
            <div className="text-7xl mb-2 floating">🐉</div>
            <div className="text-3xl font-black text-white mb-1">RỒNG HUYỀN THOẠI!</div>
            <div className="text-emerald-200 font-bold mb-5 text-sm">Bé đã tiến hoá tới đỉnh!</div>
            <div className="flex gap-3">
              <button
                onClick={continuePlay}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-500/40"
              >
                ▶️ Chơi tiếp
              </button>
              <button
                onClick={resetGame}
                className="px-5 py-3 bg-white text-slate-800 font-black rounded-2xl active:scale-95 transition-all shadow-lg"
              >
                🔄 Chơi lại
              </button>
            </div>
          </div>
        )}

        {/* Overlay GAME OVER */}
        {phase === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="text-7xl mb-2">😿</div>
            <div className="text-3xl font-black text-white mb-1">Hết nước đi!</div>
            <div className="text-slate-300 font-bold mb-1 text-sm">Điểm: <span className="text-amber-300">{score}</span></div>
            {score >= highScore && score > 0 && (
              <div className="text-amber-300 font-black mb-3 text-xs">⭐ Kỷ lục mới!</div>
            )}
            <button
              onClick={resetGame}
              className="mt-3 px-5 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg"
            >
              🔄 Chơi lại
            </button>
          </div>
        )}
      </div>

      {/* Bảng tiến hoá (Evolution Guide) — cuộn ngang trên mobile.
          Loài chưa khám phá hiển thị MỜ + bóng mờ ảo (blur + grayscale) để
          kích thích tò mò: bé thấy có "cái gì đó" nhưng chưa rõ là con gì. */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-xs font-black text-slate-500 tracking-widest">CHUỖI TIẾN HOÁ</div>
          <div className="text-[10px] font-black text-emerald-600">
            {discovered.size}/{EVOLUTION_ORDER.length} đã khám phá
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-2 px-2">
          {EVOLUTION_ORDER.map((v, i) => {
            const evo = EVOLUTION[v];
            const isDisc = discovered.has(v);
            return (
              <div key={v} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={[
                    'flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 shrink-0 transition-all duration-300',
                    isDisc ? '' : 'opacity-70',
                  ].join(' ')}
                  style={{
                    background: isDisc ? evo.bg : '#e2e8f0',
                    borderColor: isDisc ? evo.border : '#cbd5e1',
                  }}
                  title={isDisc ? `${v} — ${evo.name}` : 'Loài bí ẩn — chưa khám phá'}
                  aria-label={isDisc ? `${evo.name} ${v}` : 'Chưa khám phá'}
                >
                  <div
                    className="text-2xl leading-none"
                    style={{
                      // Mờ + grayscale + tối: trẻ thấy "silhouette" mơ hồ.
                      filter: isDisc ? 'none' : 'blur(3px) grayscale(1) brightness(0.55)',
                    }}
                  >
                    {evo.emoji}
                  </div>
                  <div className="text-[9px] font-black text-slate-700 mt-0.5">
                    {isDisc ? v : '???'}
                  </div>
                </div>
                {i < EVOLUTION_ORDER.length - 1 && (
                  <div className="text-slate-300 font-black shrink-0">›</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm thoát */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-5xl text-center mb-3">🤔</div>
            <div className="font-black text-lg text-center text-slate-800 mb-1">
              Thoát game?
            </div>
            <div className="text-sm text-slate-500 text-center font-bold mb-5">
              Tiến độ lượt chơi hiện tại sẽ không được lưu (kỷ lục vẫn giữ).
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-slate-700 transition-colors"
              >
                Ở lại
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); onBack(); }}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black transition-colors"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
