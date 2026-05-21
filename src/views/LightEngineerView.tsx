import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx } from '../lib/audio';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Kỹ Sư Ánh Sáng — game tư duy logic cho trẻ 8-10 tuổi.                    ║
// ║                                                                          ║
// ║  Ý tưởng: Trẻ kéo các tấm GƯƠNG từ khay ra Canvas, xoay góc cho phù hợp  ║
// ║  để tia LASER từ nguồn phát phản xạ qua các gương và chạm đến viên NGỌC.║
// ║                                                                          ║
// ║  Kiến trúc:                                                              ║
// ║   - ReactJS quản lý: level hiện tại, danh sách gương, inventory, phase,  ║
// ║     trạng thái nguồn laser (đang bắn / tắt), điểm số.                    ║
// ║   - HTML5 Canvas: vẽ vòng lặp RAF, raycasting + phản xạ vector, drag,    ║
// ║     click xoay, vẽ nguồn / mục tiêu / vật cản / gương / tia sáng neon.   ║
// ║   - Pointer Events: thống nhất chuột + cảm ứng (mobile).                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─── 1. Hằng số kích thước Canvas & vật lý ────────────────────────────────

const CANVAS_W = 800;
const CANVAS_H = 450;

// Gương vẽ dạng đoạn thẳng có độ dài cố định.
const MIRROR_LEN = 70;            // Tổng độ dài đoạn thẳng gương (px)
const MIRROR_HALF = MIRROR_LEN / 2;
const MIRROR_HIT_PAD = 16;        // Bán kính hit-test mở rộng (cho dễ chạm trên mobile)

// Mục tiêu (viên ngọc) là vùng hình tròn.
const TARGET_RADIUS = 22;

// Nguồn phát laser (cố định trên Canvas).
const SOURCE_RADIUS = 18;

// Vật cản tĩnh (hình chữ nhật): tia laser KHÔNG phản xạ — chạm là dừng.
const ROTATE_STEP_DEG = 15;       // Mỗi click chuột xoay thêm 15 độ
const MAX_BOUNCES = 6;            // Giới hạn số lần phản xạ (tránh vòng lặp vô hạn)

// Khay (palette) đặt ở dưới Canvas — vẽ trực tiếp lên canvas để pointer events
// gọn trong 1 element duy nhất.
const TRAY_TOP = 380;
const TRAY_HEIGHT = 70;
const TRAY_SLOT_W = 80;

// ─── 2. Kiểu dữ liệu màn chơi ─────────────────────────────────────────────

type Vec = { x: number; y: number };

type Obstacle = { x: number; y: number; w: number; h: number };

type LevelDef = {
  id: string;
  name: string;
  hint: string;
  source: { x: number; y: number; angleDeg: number };   // angleDeg = hướng phát ban đầu
  target: { x: number; y: number };
  obstacles: Obstacle[];
  mirrorCount: number;                                  // Số gương trong khay
  scoreOnPass: number;
};

// 3 màn chơi đúng spec: 1 gương → 2 gương → 3 gương phối hợp.
const LEVELS: LevelDef[] = [
  {
    id: 'le1',
    name: 'Bẻ tia 90 độ',
    hint: 'Đặt 1 tấm gương vào góc phòng và xoay 45° để bẻ tia sáng trúng viên ngọc 💎 nhé!',
    // Nguồn phát ở giữa-trái, bắn sang phải. Mục tiêu nằm trên-phải.
    source: { x: 80, y: 280, angleDeg: 0 },
    target: { x: 640, y: 110 },
    obstacles: [],
    mirrorCount: 1,
    scoreOnPass: 20,
  },
  {
    id: 'le2',
    name: 'Né vật cản',
    hint: 'Có khối đá 🪨 chắn giữa đường! Dùng 2 gương để đưa tia sáng đi đường vòng nhé.',
    source: { x: 80, y: 230, angleDeg: 0 },
    target: { x: 680, y: 230 },
    obstacles: [
      { x: 340, y: 170, w: 120, h: 120 },                // Khối đá giữa màn
    ],
    mirrorCount: 2,
    scoreOnPass: 30,
  },
  {
    id: 'le3',
    name: 'Khe hẹp lắt léo',
    hint: 'Mục tiêu nằm rất khuất! Phối hợp 3 gương phản xạ liên tiếp để chạm tới viên ngọc.',
    source: { x: 80, y: 90, angleDeg: 0 },
    target: { x: 700, y: 320 },
    obstacles: [
      { x: 220, y: 0,   w: 80, h: 200 },                 // Tường trên
      { x: 220, y: 260, w: 80, h: 200 },                 // Tường dưới (chừa khe ngang giữa)
      { x: 460, y: 0,   w: 80, h: 140 },                 // Tường phải-trên
      { x: 460, y: 220, w: 80, h: 240 },                 // Tường phải-dưới (chừa khe lệch)
    ],
    mirrorCount: 3,
    scoreOnPass: 50,
  },
];

// ─── 3. Geometry helpers ───────────────────────────────────────────────────

const deg2rad = (d: number) => (d * Math.PI) / 180;

/** Hai điểm đầu mút của 1 gương ở (cx, cy) xoay angleDeg quanh tâm. */
function mirrorEnds(cx: number, cy: number, angleDeg: number) {
  const t = deg2rad(angleDeg);
  const dx = Math.cos(t) * MIRROR_HALF;
  const dy = Math.sin(t) * MIRROR_HALF;
  return { ax: cx - dx, ay: cy - dy, bx: cx + dx, by: cy + dy };
}

/**
 * Giao điểm giữa TIA (ray) xuất phát từ `o` theo hướng `d` (đơn vị) với ĐOẠN
 * THẲNG đầu mút (a, b).
 *
 * Toán: ray  p = o + t * d        (t > 0)
 *       seg  p = a + u * (b - a)  (0 ≤ u ≤ 1)
 * Giải hệ 2 phương trình ⇒ tìm (t, u). Nếu cả 2 thoả mãn ràng buộc trên thì
 * 2 đường giao nhau ngay trong đoạn — chính là điểm va chạm.
 *
 * Trả về `t` (khoảng cách dọc tia) nếu va chạm hợp lệ, hoặc null nếu không.
 */
function raySegmentIntersect(
  ox: number, oy: number, dx: number, dy: number,
  ax: number, ay: number, bx: number, by: number,
): number | null {
  const sx = bx - ax;            // Vector của đoạn thẳng
  const sy = by - ay;
  // Mẫu số = d × s (cross product 2D); = 0 ⇒ song song / trùng nhau
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;

  const ex = ax - ox;            // o → a
  const ey = ay - oy;
  const t = (ex * sy - ey * sx) / denom;   // Khoảng cách dọc tia
  const u = (ex * dy - ey * dx) / denom;   // Tham số dọc đoạn (0..1)
  if (t <= 1e-6) return null;              // Tia đi ngược / chính tại gốc
  if (u < 0 || u > 1) return null;         // Giao ngoài đoạn → không tính
  return t;
}

/**
 * Giao tia với HÌNH CHỮ NHẬT (vật cản): trả về khoảng cách `t` gần nhất, hoặc null.
 * Cách làm: tính giao tia với 4 cạnh của HCN bằng `raySegmentIntersect` rồi lấy min.
 */
function rayRectIntersect(
  ox: number, oy: number, dx: number, dy: number,
  rx: number, ry: number, rw: number, rh: number,
): number | null {
  const x1 = rx,      y1 = ry;
  const x2 = rx + rw, y2 = ry + rh;
  const edges: Array<[number, number, number, number]> = [
    [x1, y1, x2, y1],   // Cạnh trên
    [x2, y1, x2, y2],   // Cạnh phải
    [x2, y2, x1, y2],   // Cạnh dưới
    [x1, y2, x1, y1],   // Cạnh trái
  ];
  let best: number | null = null;
  for (const [ax, ay, bx, by] of edges) {
    const t = raySegmentIntersect(ox, oy, dx, dy, ax, ay, bx, by);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/**
 * Giao tia với ĐƯỜNG TRÒN (mục tiêu): trả về khoảng cách `t` gần nhất, hoặc null.
 * Giải phương trình bậc 2: |o + t*d - c|² = r²  ⇒  t² + 2(d·oc)t + (|oc|²-r²) = 0
 */
function rayCircleIntersect(
  ox: number, oy: number, dx: number, dy: number,
  cx: number, cy: number, r: number,
): number | null {
  const fx = ox - cx;
  const fy = oy - cy;
  const a = dx * dx + dy * dy;             // = 1 nếu d là unit vector
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  // Hai nghiệm: t1 (vào vòng tròn) ≤ t2 (ra khỏi vòng tròn)
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  if (t1 > 1e-6) return t1;                // Tia chạm vào mặt trước hình tròn
  if (t2 > 1e-6) return t2;                // Hoặc đã ở trong vòng (hiếm)
  return null;
}

/**
 * Phản xạ vector tới `i` qua mặt có pháp tuyến `n` (đã chuẩn hoá).
 * Công thức vật lý phẳng: R = I - 2(I·N)N
 */
function reflect(ix: number, iy: number, nx: number, ny: number): Vec {
  const dot = ix * nx + iy * ny;
  return { x: ix - 2 * dot * nx, y: iy - 2 * dot * ny };
}

/** Chuẩn hoá vector về độ dài 1. */
function normalize(x: number, y: number): Vec {
  const len = Math.hypot(x, y);
  if (len < 1e-9) return { x: 1, y: 0 };
  return { x: x / len, y: y / len };
}

// ─── 4. Gương — kiểu dữ liệu ─────────────────────────────────────────────

type Mirror = {
  id: number;          // ID duy nhất để React-style identity
  x: number;           // Toạ độ tâm
  y: number;
  angleDeg: number;    // Góc xoay (độ)
};

// ─── 5. Thuật toán traceLaser ─────────────────────────────────────────────
//
// Mỗi đoạn của tia laser là 1 segment (điểm bắt đầu → điểm kết thúc).
// Hàm trả về:
//   - segments: danh sách đoạn thẳng để vẽ
//   - hitTarget: tia có chạm mục tiêu hay không

type TraceResult = {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  hitTarget: boolean;
};

function traceLaser(
  source: { x: number; y: number; angleDeg: number },
  target: { x: number; y: number },
  obstacles: Obstacle[],
  mirrors: Mirror[],
  excludeMirrorId: number | null,    // Bỏ qua gương vừa va chạm để tránh "tự đụng"
): TraceResult {
  const segments: TraceResult['segments'] = [];

  // Vị trí + hướng tia hiện tại (cập nhật sau mỗi lần phản xạ)
  let ox = source.x;
  let oy = source.y;
  let dir = normalize(Math.cos(deg2rad(source.angleDeg)), Math.sin(deg2rad(source.angleDeg)));
  let lastMirrorId = excludeMirrorId;

  for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
    // ── (a) Tìm gương va chạm gần nhất ─────────────────────────────────
    let bestT: number | null = null;
    let bestMirror: Mirror | null = null;
    for (const m of mirrors) {
      if (m.id === lastMirrorId) continue;   // Bỏ qua gương vừa bật ra
      const { ax, ay, bx, by } = mirrorEnds(m.x, m.y, m.angleDeg);
      const t = raySegmentIntersect(ox, oy, dir.x, dir.y, ax, ay, bx, by);
      if (t !== null && (bestT === null || t < bestT)) {
        bestT = t;
        bestMirror = m;
      }
    }

    // ── (b) Tìm vật cản va chạm gần nhất ───────────────────────────────
    let obstacleT: number | null = null;
    for (const ob of obstacles) {
      const t = rayRectIntersect(ox, oy, dir.x, dir.y, ob.x, ob.y, ob.w, ob.h);
      if (t !== null && (obstacleT === null || t < obstacleT)) {
        obstacleT = t;
      }
    }

    // ── (c) Kiểm tra va chạm mục tiêu ──────────────────────────────────
    const targetT = rayCircleIntersect(
      ox, oy, dir.x, dir.y,
      target.x, target.y, TARGET_RADIUS,
    );

    // ── (d) So sánh xem va chạm nào tới TRƯỚC ─────────────────────────
    // Quy ước: cái nào có `t` nhỏ nhất → đó là điểm va chạm thật.
    const candidates: Array<{ kind: 'mirror' | 'obstacle' | 'target' | 'edge'; t: number }> = [];
    if (bestT !== null) candidates.push({ kind: 'mirror', t: bestT });
    if (obstacleT !== null) candidates.push({ kind: 'obstacle', t: obstacleT });
    if (targetT !== null) candidates.push({ kind: 'target', t: targetT });
    // Cạnh canvas: dùng làm "tường" để tia luôn dừng trong viewport.
    const edgeT = rayBoundsIntersect(ox, oy, dir.x, dir.y, 0, 0, CANVAS_W, CANVAS_H);
    if (edgeT !== null) candidates.push({ kind: 'edge', t: edgeT });

    if (candidates.length === 0) {
      // Không va chạm gì (hiếm — chỉ xảy ra khi tia thoát ra ngoài canvas
      // mà rayBoundsIntersect cũng trả null, ví dụ nguồn nằm ngoài). An toàn:
      // vẽ tia kéo dài 1 đoạn xa rồi dừng.
      segments.push({ x1: ox, y1: oy, x2: ox + dir.x * 2000, y2: oy + dir.y * 2000 });
      return { segments, hitTarget: false };
    }

    candidates.sort((a, b) => a.t - b.t);
    const winner = candidates[0];
    const hx = ox + dir.x * winner.t;
    const hy = oy + dir.y * winner.t;
    segments.push({ x1: ox, y1: oy, x2: hx, y2: hy });

    if (winner.kind === 'target') {
      return { segments, hitTarget: true };
    }
    if (winner.kind === 'obstacle' || winner.kind === 'edge') {
      return { segments, hitTarget: false };
    }

    // winner.kind === 'mirror' → tính phản xạ và bắn tiếp.
    const m = bestMirror!;
    // Pháp tuyến của gương = vector vuông góc với đoạn thẳng gương.
    // Đoạn thẳng có hướng (cos a, sin a); pháp tuyến là (-sin a, cos a) — đã chuẩn hoá.
    const t = deg2rad(m.angleDeg);
    const n = { x: -Math.sin(t), y: Math.cos(t) };
    // Đảm bảo pháp tuyến hướng VỀ PHÍA tia tới (ngược với dir) — nếu không thì lật.
    if (n.x * dir.x + n.y * dir.y > 0) {
      n.x = -n.x;
      n.y = -n.y;
    }
    const r = reflect(dir.x, dir.y, n.x, n.y);
    ox = hx;
    oy = hy;
    dir = normalize(r.x, r.y);
    lastMirrorId = m.id;
  }

  return { segments, hitTarget: false };
}

/** Giao tia với hình chữ nhật bao Canvas — dùng để dừng tia ở rìa màn. */
function rayBoundsIntersect(
  ox: number, oy: number, dx: number, dy: number,
  x: number, y: number, w: number, h: number,
): number | null {
  // Dùng kỹ thuật slab: tìm giao với 4 đường thẳng x = x / x+w, y = y / y+h.
  const tx1 = dx !== 0 ? (x - ox) / dx : -Infinity;
  const tx2 = dx !== 0 ? (x + w - ox) / dx : Infinity;
  const ty1 = dy !== 0 ? (y - oy) / dy : -Infinity;
  const ty2 = dy !== 0 ? (y + h - oy) / dy : Infinity;
  const tEnter = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2));
  const tExit = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
  if (tExit < 0 || tEnter > tExit) return null;
  // Tia bắt đầu BÊN TRONG canvas (luôn đúng với nguồn của chúng ta), nên dùng tExit
  // — điểm tia thoát ra rìa canvas.
  return tExit > 1e-6 ? tExit : null;
}

// ─── 6. Helpers Drag / Hit-test ───────────────────────────────────────────

function distToMirror(px: number, py: number, m: Mirror): number {
  const { ax, ay, bx, by } = mirrorEnds(m.x, m.y, m.angleDeg);
  // Khoảng cách từ điểm đến đoạn thẳng AB.
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = Math.max(0, Math.min(1, c2 > 0 ? c1 / c2 : 0));
  const projx = ax + vx * t;
  const projy = ay + vy * t;
  return Math.hypot(px - projx, py - projy);
}

// ─── 7. Component chính ───────────────────────────────────────────────────

type Props = { onBack: () => void };

type Phase = 'playing' | 'won';

const PASSED_KEY = 'lingoland_lightengineer_passed';

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

/**
 * Drag có 2 nguồn:
 *  - 'tray': nhặt 1 gương mới từ khay (chưa ở trên canvas)
 *  - 'placed': nhặt 1 gương đã đặt (di chuyển)
 *
 * Threshold: nếu pointer-down chạm gương đã đặt mà KÉO < 5px thì coi là click
 *            → xoay 15° (không phải drag).
 */
type DragState =
  | { kind: 'tray'; pointerId: number; x: number; y: number }
  | {
      kind: 'placed';
      pointerId: number;
      mirrorId: number;
      grabOffsetX: number;             // Lệch giữa pointer và tâm gương lúc bắt đầu
      grabOffsetY: number;
      startX: number;                  // Toạ độ pointer-down (để đo threshold)
      startY: number;
      moved: boolean;                  // Đã vượt threshold để chuyển sang "đang kéo" chưa?
    };

export default function LightEngineerView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── React state (kích hoạt re-render) ───────────────────────────────────
  const [passed, setPassed] = useState<Set<string>>(() => loadPassed());
  const [levelIdx, setLevelIdx] = useState<number | null>(null);
  const [mirrors, setMirrors] = useState<Mirror[]>([]);
  const [trayLeft, setTrayLeft] = useState(0);            // Số gương còn lại trong khay
  const [phase, setPhase] = useState<Phase>('playing');
  const [, forceTick] = useState(0);                      // Bump tick để buộc re-render khi xoay/kéo
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const level = levelIdx !== null ? LEVELS[levelIdx] : null;

  // ── Refs (vòng lặp RAF / pointer handler đọc trực tiếp giá trị mới nhất) ─
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const mirrorsRef = useRef<Mirror[]>([]);
  const trayLeftRef = useRef(0);
  const phaseRef = useRef<Phase>('playing');
  const levelRef = useRef<LevelDef | null>(null);
  const nextMirrorIdRef = useRef(1);
  const animPhaseRef = useRef(0);    // Cho hiệu ứng nhấp nháy / phát sáng tia laser

  // Sync state ↔ ref
  useEffect(() => { mirrorsRef.current = mirrors; }, [mirrors]);
  useEffect(() => { trayLeftRef.current = trayLeft; }, [trayLeft]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { levelRef.current = level; }, [level]);

  // ── 7.1 Chọn / reset level ──────────────────────────────────────────────

  const pickLevel = useCallback(
    (idx: number) => {
      const lv = LEVELS[idx];
      if (!lv) return;
      // Level 0 mở sẵn; level n cần pass level n-1.
      const unlocked = idx === 0 || passed.has(LEVELS[idx - 1].id);
      if (!unlocked) return;
      setLevelIdx(idx);
      setMirrors([]);
      setTrayLeft(lv.mirrorCount);
      setPhase('playing');
      nextMirrorIdRef.current = 1;
    },
    [passed],
  );

  const replayLevel = useCallback(() => {
    if (!level) return;
    setMirrors([]);
    setTrayLeft(level.mirrorCount);
    setPhase('playing');
    nextMirrorIdRef.current = 1;
  }, [level]);

  const exitToMenu = useCallback(() => {
    setLevelIdx(null);
    setMirrors([]);
    setTrayLeft(0);
    setPhase('playing');
  }, []);

  // ── 7.2 Bấm "BẮN LASER" → kiểm tra trúng đích & ăn mừng ─────────────────
  //
  // Lưu ý: tia laser được vẽ LIÊN TỤC (real-time) trong vòng lặp RAF — trẻ
  // đã thấy ngay kết quả khi vừa xoay/kéo gương. Nút này chỉ dùng để "chốt"
  // câu trả lời, kích hoạt pháo hoa, ghi điểm và mở khoá màn tiếp theo.

  const fireLaser = useCallback(() => {
    if (!levelRef.current || phaseRef.current !== 'playing') return;
    const lv = levelRef.current;
    // Tính lại 1 lần để xác định kết quả tại đúng thời điểm bấm.
    const result = traceLaser(
      lv.source, lv.target, lv.obstacles, mirrorsRef.current, null,
    );
    if (result.hitTarget) {
      // ✅ Thắng level — pháo hoa + ghi điểm + lưu pass.
      playSfx('snd-correct');
      addScore(lv.scoreOnPass);
      setPhase('won');
      if (!passed.has(lv.id)) {
        const next = new Set(passed);
        next.add(lv.id);
        setPassed(next);
        savePassed(next);
      }
      confetti({
        particleCount: 150, spread: 90, origin: { y: 0.5 },
        colors: ['#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#34d399'],
      });
      window.setTimeout(() => {
        confetti({
          particleCount: 80, spread: 70, origin: { x: 0.3, y: 0.5 },
          colors: ['#fb923c', '#fde047'],
        });
      }, 220);
      window.setTimeout(() => {
        confetti({
          particleCount: 80, spread: 70, origin: { x: 0.7, y: 0.5 },
          colors: ['#a78bfa', '#34d399'],
        });
      }, 440);
    } else {
      // ❌ Chưa trúng — phát SFX báo sai, để trẻ tự sửa.
      playSfx('snd-wrong');
    }
  }, [addScore, passed]);

  // ── 7.3 Pointer handlers ────────────────────────────────────────────────

  /** Chuyển toạ độ pointer trong viewport → toạ độ trong hệ canvas nội bộ */
  const pointerToCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CANVAS_W,
      y: ((e.clientY - r.top) / r.height) * CANVAS_H,
    };
  };

  /** Toạ độ tâm slot khay thứ `idx` (0-based) trong inventory. */
  const traySlotCenter = (idx: number, total: number) => {
    const totalW = total * TRAY_SLOT_W;
    const startX = CANVAS_W / 2 - totalW / 2 + TRAY_SLOT_W / 2;
    return { x: startX + idx * TRAY_SLOT_W, y: TRAY_TOP + TRAY_HEIGHT / 2 };
  };

  /** Hit-test gương đã đặt — quét NGƯỢC để ưu tiên gương vẽ sau (lớp trên). */
  const hitTestPlacedMirror = (px: number, py: number): Mirror | null => {
    const list = mirrorsRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (distToMirror(px, py, m) <= MIRROR_HIT_PAD) return m;
    }
    return null;
  };

  /** Hit-test slot khay (trả về true nếu pointer đang trong vùng khay & còn gương). */
  const hitTestTray = (_px: number, py: number): boolean => {
    if (trayLeftRef.current <= 0) return false;
    if (py < TRAY_TOP || py > TRAY_TOP + TRAY_HEIGHT) return false;
    // Bất kỳ slot nào còn lại đều coi là "có thể nhặt" — vẽ là 1 chồng nên test thô.
    return true;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const { x, y } = pointerToCanvas(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    // Ưu tiên 1: chạm gương đã đặt → bắt đầu drag (sẽ phân biệt rotate vs move).
    const placed = hitTestPlacedMirror(x, y);
    if (placed) {
      dragRef.current = {
        kind: 'placed',
        pointerId: e.pointerId,
        mirrorId: placed.id,
        grabOffsetX: x - placed.x,
        grabOffsetY: y - placed.y,
        startX: x,
        startY: y,
        moved: false,
      };
      return;
    }

    // Ưu tiên 2: chạm khay → bắt đầu kéo gương mới ra ngoài.
    if (hitTestTray(x, y)) {
      dragRef.current = { kind: 'tray', pointerId: e.pointerId, x, y };
      return;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const { x, y } = pointerToCanvas(e);

    if (drag.kind === 'tray') {
      drag.x = x;
      drag.y = y;
      forceTick((n) => n + 1);
      return;
    }

    // 'placed' — cập nhật vị trí gương theo pointer. Nếu vượt threshold thì
    // đánh dấu `moved = true` (sẽ KHÔNG xoay khi nhả pointer).
    const dist = Math.hypot(x - drag.startX, y - drag.startY);
    if (dist > 5) drag.moved = true;
    if (drag.moved) {
      const list = mirrorsRef.current.map((m) =>
        m.id === drag.mirrorId
          ? { ...m, x: clamp(x - drag.grabOffsetX, 0, CANVAS_W), y: clamp(y - drag.grabOffsetY, 0, TRAY_TOP - 10) }
          : m,
      );
      mirrorsRef.current = list;
      setMirrors(list);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const { x, y } = pointerToCanvas(e);

    if (drag.kind === 'tray') {
      // Thả gương mới vào canvas — nếu thả trên vùng khay thì huỷ thả.
      if (y < TRAY_TOP - 10 && trayLeftRef.current > 0) {
        const id = nextMirrorIdRef.current++;
        const list: Mirror[] = [
          ...mirrorsRef.current,
          { id, x: clamp(x, 0, CANVAS_W), y: clamp(y, 0, TRAY_TOP - 10), angleDeg: 45 },
        ];
        mirrorsRef.current = list;
        setMirrors(list);
        setTrayLeft((n) => n - 1);
      }
      dragRef.current = null;
      forceTick((n) => n + 1);
      return;
    }

    // 'placed': nếu KHÔNG di chuyển (chỉ tap) → xoay 15°.
    if (!drag.moved) {
      const list = mirrorsRef.current.map((m) =>
        m.id === drag.mirrorId
          ? { ...m, angleDeg: (m.angleDeg + ROTATE_STEP_DEG) % 180 }
          : m,
      );
      mirrorsRef.current = list;
      setMirrors(list);
    } else {
      // Đã kéo: nếu thả VÀO vùng khay → trả gương về kho.
      if (y >= TRAY_TOP) {
        const list = mirrorsRef.current.filter((m) => m.id !== drag.mirrorId);
        mirrorsRef.current = list;
        setMirrors(list);
        setTrayLeft((n) => n + 1);
      }
    }
    dragRef.current = null;
  };

  // ── 7.4 Vòng lặp vẽ Canvas (RAF) ────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || levelIdx === null) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animPhaseRef.current += 0.06;
      const lv = levelRef.current;
      if (!lv) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // ── Nền tối làm nổi bật tia neon ─────────────────────────────────
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#0b1220');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Lưới mờ tạo cảm giác phòng thí nghiệm.
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, TRAY_TOP);
        ctx.stroke();
      }
      for (let y = 0; y < TRAY_TOP; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // ── Vẽ vật cản ──────────────────────────────────────────────────
      for (const ob of lv.obstacles) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x + 1, ob.y + 1, ob.w - 2, ob.h - 2);
        // Icon đá ở giữa khối
        ctx.font = '36px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪨', ob.x + ob.w / 2, ob.y + ob.h / 2);
      }

      // ── Vẽ mục tiêu (viên ngọc) ─────────────────────────────────────
      // Vầng hào quang nhấp nháy
      const pulse = 0.7 + 0.3 * Math.sin(animPhaseRef.current * 2);
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 18 * pulse;
      ctx.beginPath();
      ctx.arc(lv.target.x, lv.target.y, TARGET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = '28px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💎', lv.target.x, lv.target.y);

      // ── Vẽ nguồn phát laser ─────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(lv.source.x, lv.source.y, SOURCE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '24px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.fillText('🔦', lv.source.x, lv.source.y);

      // ── Vẽ gương đã đặt ─────────────────────────────────────────────
      for (const m of mirrorsRef.current) {
        const { ax, ay, bx, by } = mirrorEnds(m.x, m.y, m.angleDeg);
        // Vầng sáng nhẹ quanh gương
        ctx.shadowColor = '#a5f3fc';
        ctx.shadowBlur = 8;
        // Mặt phản xạ — gradient bạc
        const mg = ctx.createLinearGradient(ax, ay, bx, by);
        mg.addColorStop(0, '#94a3b8');
        mg.addColorStop(0.5, '#e2e8f0');
        mg.addColorStop(1, '#94a3b8');
        ctx.strokeStyle = mg;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Hai đầu mút làm "núm xoay" nhỏ
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
      }

      // ── Vẽ tia laser — REAL-TIME ────────────────────────────────────
      // Trace mỗi frame để khi trẻ xoay / kéo gương, tia phản xạ cập nhật
      // ngay lập tức (không cần bấm "BẮN LASER" để xem trước).
      //
      // Vẽ glow 2 lớp: lớp ngoài DÀY + alpha thấp (halo), lớp trong MẢNH +
      // alpha cao (lõi sáng). Màu xanh = trúng đích, đỏ = chưa trúng.
      // Khi tia chạm đích thì bật `shadowBlur` cao hơn cho hiệu ứng "nóng rực".
      const trace = traceLaser(
        lv.source, lv.target, lv.obstacles, mirrorsRef.current, null,
      );
      const laserColor = trace.hitTarget ? '#34d399' : '#f43f5e';
      // Nhịp đập sáng nhẹ theo thời gian — tia trông "sống" hơn dù gương đứng yên.
      const beat = trace.hitTarget
        ? 0.85 + 0.15 * Math.sin(animPhaseRef.current * 4)
        : 0.7  + 0.1  * Math.sin(animPhaseRef.current * 3);
      ctx.shadowColor = laserColor;
      ctx.shadowBlur = (trace.hitTarget ? 22 : 14) * beat;
      ctx.lineCap = 'round';
      ctx.strokeStyle = laserColor;
      // Lớp halo
      ctx.globalAlpha = 0.4 * beat;
      ctx.lineWidth = 10;
      for (const s of trace.segments) {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
      // Lớp lõi
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3;
      for (const s of trace.segments) {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // ── Vẽ khay (palette) ─────────────────────────────────────────
      // Khung khay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, TRAY_TOP, CANVAS_W, TRAY_HEIGHT);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0.5, TRAY_TOP + 0.5, CANVAS_W - 1, TRAY_HEIGHT - 1);
      // Nhãn khay
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Khay gương (còn ${trayLeftRef.current})`, 12, TRAY_TOP + 12);

      // Vẽ các gương còn trong khay (dùng tray slot)
      const total = lv.mirrorCount;
      for (let i = 0; i < trayLeftRef.current; i++) {
        const c = traySlotCenter(i, total);
        // Vẽ gương ngang trong slot
        const ax = c.x - MIRROR_HALF, ay = c.y;
        const bx = c.x + MIRROR_HALF, by = c.y;
        const mg = ctx.createLinearGradient(ax, ay, bx, by);
        mg.addColorStop(0, '#94a3b8');
        mg.addColorStop(0.5, '#e2e8f0');
        mg.addColorStop(1, '#94a3b8');
        ctx.strokeStyle = mg;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // Vẽ "ghost" gương đang được kéo từ khay
      const drag = dragRef.current;
      if (drag && drag.kind === 'tray') {
        ctx.globalAlpha = 0.7;
        const ax = drag.x - MIRROR_HALF, ay = drag.y;
        const bx = drag.x + MIRROR_HALF, by = drag.y;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [levelIdx]);

  // ── 7.5 Render: menu / màn chơi ─────────────────────────────────────────

  // ── Menu chọn level ──
  if (levelIdx === null) {
    return (
      <div className="py-4 animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Trò Chơi
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-black mb-1 bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 bg-clip-text text-transparent">
            🔦 Kỹ Sư Ánh Sáng
          </h2>
          <p className="text-slate-500 text-sm font-bold">
            Đặt gương — bẻ tia laser để chạm tới viên ngọc 💎
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LEVELS.map((lv, i) => {
            const unlocked = i === 0 || passed.has(LEVELS[i - 1].id);
            const cleared = passed.has(lv.id);
            return (
              <button
                key={lv.id}
                onClick={() => pickLevel(i)}
                disabled={!unlocked}
                className={[
                  'p-5 rounded-3xl text-left transition-all border-2',
                  unlocked
                    ? 'bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 border-cyan-400/60 hover:border-cyan-300 active:scale-95 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={['text-xs font-black tracking-wider', unlocked ? 'text-cyan-300' : 'text-slate-400'].join(' ')}>
                    MÀN {i + 1}
                  </div>
                  <div>
                    {!unlocked ? '🔒' : cleared ? '✅' : '✨'}
                  </div>
                </div>
                <div className={['font-black text-lg mb-1', unlocked ? 'text-white' : 'text-slate-500'].join(' ')}>
                  {lv.name}
                </div>
                <div className={['text-xs font-bold', unlocked ? 'text-slate-300' : 'text-slate-400'].join(' ')}>
                  {lv.mirrorCount} gương · {lv.scoreOnPass}⭐
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Màn chơi ──
  return (
    <div className="py-4 animate-in fade-in duration-300">
      {/* Thanh trên: nút thoát + tên màn + nút chơi lại */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold text-sm transition-colors"
        >
          ✕ Thoát
        </button>
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-black tracking-widest">MÀN {levelIdx + 1}</div>
          <div className="font-black text-slate-800">{level!.name}</div>
        </div>
        <button
          onClick={replayLevel}
          className="px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-xl text-amber-700 font-bold text-sm transition-colors"
          title="Đặt lại màn"
        >
          🔄
        </button>
      </div>

      {/* Hint */}
      <div className="mb-3 p-3 bg-gradient-to-r from-cyan-50 to-indigo-50 border-2 border-cyan-100 rounded-2xl text-sm text-slate-700 font-bold">
        💡 {level!.hint}
      </div>

      {/* Canvas */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 border-4 border-slate-800">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="w-full block touch-none select-none"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        />

        {/* Overlay khi thắng */}
        {phase === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm">
            <div className="text-7xl mb-3 floating">🎉</div>
            <div className="text-3xl font-black text-white mb-2">Trúng đích!</div>
            <div className="text-cyan-200 font-bold mb-5 text-sm">
              +{level!.scoreOnPass}⭐ Tuyệt vời rồi đó!
            </div>
            <div className="flex gap-3">
              <button
                onClick={replayLevel}
                className="px-5 py-3 bg-white text-slate-800 font-black rounded-2xl hover:bg-slate-100 active:scale-95 transition-all shadow-lg"
              >
                🔄 Chơi lại
              </button>
              {levelIdx + 1 < LEVELS.length ? (
                <button
                  onClick={() => pickLevel(levelIdx + 1)}
                  className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-black rounded-2xl hover:from-cyan-400 hover:to-indigo-400 active:scale-95 transition-all shadow-lg shadow-cyan-500/40"
                >
                  Màn sau ▶️
                </button>
              ) : (
                <button
                  onClick={exitToMenu}
                  className="px-5 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black rounded-2xl active:scale-95 transition-all shadow-lg"
                >
                  🏠 Menu
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Thanh điều khiển: hướng dẫn + nút BẮN LASER */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-bold leading-tight">
          🖐️ Kéo gương — tia laser cập nhật ngay<br/>
          👆 Chạm gương để xoay 15° · Bấm BẮN để chốt
        </div>
        <button
          onClick={fireLaser}
          disabled={phase !== 'playing'}
          className={[
            'px-6 py-3 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-all',
            phase === 'playing'
              ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 shadow-rose-500/40 hover:shadow-rose-500/60'
              : 'bg-slate-300 cursor-not-allowed shadow-none',
          ].join(' ')}
        >
          ⚡ BẮN LASER
        </button>
      </div>

      {/* Confirm thoát */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-5xl text-center mb-3">🤔</div>
            <div className="font-black text-lg text-center text-slate-800 mb-1">
              Thoát màn chơi?
            </div>
            <div className="text-sm text-slate-500 text-center font-bold mb-5">
              Tiến độ hiện tại sẽ không được lưu.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-slate-700 transition-colors"
              >
                Ở lại
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); exitToMenu(); }}
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

// ─── 8. Util ──────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
