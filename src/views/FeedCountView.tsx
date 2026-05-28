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
import { playChomp, playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Cho Thú Ăn — Đếm Số Cho Ngoan"
 *
 * Trò chơi tập ĐẾM cho bé 3-5 tuổi. Mỗi vòng, một con vật xuất hiện kèm
 * bong bóng hội thoại: "Hãy cho tớ ăn N quả Y nào!". Bé kéo thả đúng N món
 * ăn (trong số 8-15 món có sẵn ở rổ) vào miệng con vật.
 *
 *   - Không tính điểm trừ, không có timer, không có Game Over — tránh áp
 *     lực cho bé 3-5 tuổi. Hoàn thành = vui vẻ chuyển vòng kế tiếp.
 *   - Mỗi món ăn được "nuốt" → bong bóng số đếm BAY LÊN (1, 2, 3...) màu
 *     xanh lá rồi mờ dần, giúp bé THẤY tiến trình đếm cộng dồn.
 *   - Bé thả thức ăn ra ngoài miệng → món đó BAY MƯỢT (spring physics) về
 *     đúng chỗ cũ trong rổ.
 *
 * KIẾN TRÚC:
 *   React  : phase, vòng chơi hiện tại, cặp loài vật-thức ăn, target/count.
 *   Canvas : vòng lặp đồ hoạ (requestAnimationFrame) → physics + render +
 *            xử lý kéo thả qua Pointer Events (gộp chung mouse/touch).
 *
 * TỔ CHỨC FILE:
 *   1. Hằng số canvas, gameplay.
 *   2. Bộ cặp loài vật ↔ thức ăn.
 *   3. Kiểu dữ liệu nội bộ.
 *   4. Hàm tiện ích nhỏ.
 *   5. React component (state, refs, pointer handlers, RAF, render).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ
 * ========================================================================= */

// Tỷ lệ 16:9 — 800x450 theo doc.
const CANVAS_W = 800;
const CANVAS_H = 450;

// Vị trí + cỡ con vật (em-oji) hiển thị ở giữa-trên canvas.
const ANIMAL_CX = 320;
const ANIMAL_CY = 180;
const ANIMAL_FONT_PX = 150;

// Bán kính HITBOX miệng con vật — nếu thức ăn được thả VÀO vòng tròn này
// quanh tâm con vật thì coi như đã "ăn".
//
// Bé 3-5 tuổi điều khiển chuột/quẹt màn hình chưa chính xác — hitbox cố ý
// vẽ RẤT RỘNG (~170px) thay vì bám sát đầu con vật. Bé chỉ cần kéo thức ăn
// "tới gần mặt" là đã ăn được, tránh trượt - bực bội - nản.
const MOUTH_HITBOX_R = 170;

// Bán kính VÙNG HÚT — rộng hơn hitbox ăn ~60px. Trong vùng này, món ăn
// đang được kéo sẽ tự "trôi" về phía miệng (magnetic snap) với cường độ
// tăng dần khi tiến lại gần tâm → bé cảm thấy như thức ăn được hút vào,
// gameplay mượt mà hơn nhiều.
const MOUTH_ATTRACT_R = 230;

// Cường độ tối đa của lực hút (0 = không hút, 1 = dính chặt vào tâm).
// 0.55 cho cảm giác "trợ giúp" rõ rệt nhưng bé vẫn cảm thấy mình đang
// điều khiển (không phải auto-play).
const MOUTH_PULL_MAX = 0.55;

// Khu rổ thức ăn ở đáy canvas — dải y ∈ [310, 430].
const BASKET_Y_TOP = 305;
const BASKET_Y_BOTTOM = 430;
const BASKET_X_LEFT = 30;
const BASKET_X_RIGHT = CANVAS_W - 30;

// Bán kính chạm cho food (cho việc nhấn vào lấy món ăn).
const FOOD_RADIUS = 30;
const FOOD_FONT_PX = 46;

// Bố cục rổ: tối đa 2 hàng × 8 cột = 16 món; thực tế dùng số ít hơn tuỳ vòng.
const BASKET_COLS = 8;
const BASKET_ROWS = 2;

// Thời lượng mascot "đang nhai" sau khi ăn xong 1 món.
const CHEWING_MS = 700;

// Sau khi đủ số, đợi 2.5 giây rồi chuyển vòng kế tiếp (theo doc).
const SATISFIED_DELAY_MS = 2500;

// Spring physics cho food bay về rổ — càng cao càng cứng.
const SPRING_STIFFNESS = 0.18;
const SPRING_DAMPING = 0.62;

// Cộng điểm cho mỗi món ăn — vừa phải, vì game này khuyến khích bé tập ĐẾM
// chứ không phải đua điểm.
const SCORE_PER_BITE = 5;

const STORAGE_KEY = 'lingoland_feedcount_done'; // số vòng đã hoàn thành (kỷ lục)

// Font stack ưu tiên emoji MÀU của các hệ điều hành — vẽ canvas với 'serif'
// trên macOS/Windows nhiều khi rơi vào font không có glyph emoji → ra mờ /
// đen-trắng. Liệt kê tường minh để mọi nền tảng đều render emoji sắc nét.
const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', " +
  "'Twemoji Mozilla', 'EmojiOne Color', sans-serif";

/* ===========================================================================
 * 2. CẶP LOÀI VẬT ↔ THỨC ĂN
 *
 * Mỗi cặp có:
 *   - id        : khoá duy nhất, dùng tránh trùng vòng kế tiếp.
 *   - animal    : emoji con vật khi đang đợi ăn.
 *   - eating    : emoji khi đang nhai (😋 / 🤤) — đổi tạm 0.7s mỗi miếng.
 *   - happy     : emoji khi đã no (🥳 / 🥰 / 😻).
 *   - food      : emoji món ăn — nhiều món sẽ sinh ra trong rổ.
 *   - foodName  : tên thuần Việt để TTS đọc + hiển thị bong bóng.
 *   - unit      : danh từ đếm tiếng Việt ("quả", "củ", "cái"...).
 * ========================================================================= */

type AnimalPair = {
  id: string;
  animal: string;
  eating: string;
  happy: string;
  food: string;
  foodName: string;
  unit: string;
};

const ANIMAL_PAIRS: AnimalPair[] = [
  { id: 'monkey', animal: '🐵', eating: '😋', happy: '🥳', food: '🍌', foodName: 'chuối', unit: 'quả' },
  { id: 'rabbit', animal: '🐰', eating: '😋', happy: '🥳', food: '🥕', foodName: 'cà rốt', unit: 'củ' },
  { id: 'bear',   animal: '🐻', eating: '🤤', happy: '🥰', food: '🍯', foodName: 'mật ong', unit: 'hũ' },
  { id: 'cat',    animal: '🐱', eating: '😋', happy: '😻', food: '🐟', foodName: 'cá', unit: 'con' },
  { id: 'pig',    animal: '🐷', eating: '😋', happy: '🥰', food: '🍎', foodName: 'táo', unit: 'quả' },
  { id: 'cow',    animal: '🐄', eating: '😋', happy: '🥰', food: '🌿', foodName: 'cỏ', unit: 'bó' },
  { id: 'panda',  animal: '🐼', eating: '😋', happy: '🥰', food: '🎋', foodName: 'tre', unit: 'cây' },
];

/* ===========================================================================
 * 3. KIỂU DỮ LIỆU NỘI BỘ
 * ========================================================================= */

/** Trạng thái 1 món ăn trên canvas. */
type Food = {
  id: number;
  /** Vị trí hiện tại (đang vẽ). */
  x: number;
  y: number;
  /** Vị trí "tổ" trong rổ — món ăn sẽ bay về đây nếu bị thả ngoài miệng. */
  restX: number;
  restY: number;
  /** Vận tốc — dùng cho spring physics khi bay về rổ. */
  vx: number;
  vy: number;
  /** Tỉ lệ vẽ (1 = bình thường). Khi "ăn" sẽ co dần về 0 rồi xoá. */
  scale: number;
  /** Đang bị bé kéo trong tay không. */
  isDragging: boolean;
  /** Đang bay về rổ (spring) không. */
  isReturning: boolean;
  /** Đang chui vào miệng (co lại) không. */
  isEating: boolean;
  emoji: string;
};

/** "+1, +2, +3..." bay lên giữa màn rồi mờ dần. */
type FloatingNum = {
  id: number;
  value: number;
  x: number;
  y: number;
  /** life ∈ [0, 1]; mỗi frame trừ dần → alpha và y giảm theo. */
  life: number;
};

/** State đang kéo 1 món ăn. */
type DragState = {
  foodId: number;
  pointerId: number;
  /** Offset trong food khi nhấn — giữ điểm nhấn cố định so với emoji. */
  offX: number;
  offY: number;
};

type AnimalMood = 'waiting' | 'chewing' | 'happy';
type Phase = 'feeding' | 'satisfied';

/* ===========================================================================
 * 4. HÀM TIỆN ÍCH
 * ========================================================================= */

/** Random int trong [min, max] inclusive. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Bình phương khoảng cách — tránh sqrt khi check va chạm. */
function dist2(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

/** Load số vòng đã hoàn thành (kỷ lục) — dùng cho hiển thị. */
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
    // localStorage hỏng → bỏ qua.
  }
}

/**
 * Sinh rổ thức ăn cho 1 vòng. Vị trí các món sắp theo lưới 2 hàng × N cột,
 * có offset ngẫu nhiên nhỏ để bớt cứng nhắc.
 *  - target: số bé phải đếm → quyết định số lượng món tối thiểu.
 *  - emoji : emoji thức ăn theo cặp loài vật hiện tại.
 */
function spawnFoods(target: number, emoji: string): Food[] {
  // Sinh nhiều hơn target một chút để bé tha hồ chọn (theo doc — vd target 5
  // thì rổ có ~10-12 món). Cap 16 cho khỏi quá đông.
  const extras = randInt(3, 6);
  const total = Math.min(16, target + extras);

  // Khoảng cách cột tự co theo total để vừa khít rổ.
  const cols = Math.min(BASKET_COLS, Math.ceil(total / BASKET_ROWS));
  const usableW = BASKET_X_RIGHT - BASKET_X_LEFT - 60;
  const colStep = cols > 1 ? usableW / (cols - 1) : 0;
  const rowStep = (BASKET_Y_BOTTOM - BASKET_Y_TOP - 60) / Math.max(1, BASKET_ROWS - 1);

  const foods: Food[] = [];
  for (let i = 0; i < total; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Nudge ngẫu nhiên ±6px để vị trí trông tự nhiên hơn.
    const rx = BASKET_X_LEFT + 30 + col * colStep + randInt(-6, 6);
    const ry = BASKET_Y_TOP + 30 + row * rowStep + randInt(-4, 4);
    foods.push({
      id: i,
      x: rx,
      y: ry,
      restX: rx,
      restY: ry,
      vx: 0,
      vy: 0,
      scale: 1,
      isDragging: false,
      isReturning: false,
      isEating: false,
      emoji,
    });
  }
  return foods;
}

/* ===========================================================================
 * 5. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function FeedCountView({ onBack }: Props) {
  const { addScore } = useGame();

  /* ─── React state — chỉ chứa thứ cần re-render UI ─────────────────────── */

  // Cặp loài vật hiện tại (index trong ANIMAL_PAIRS).
  const [pairIdx, setPairIdx] = useState(() => randInt(0, ANIMAL_PAIRS.length - 1));
  // Số mục tiêu cần đếm (1-10).
  const [target, setTarget] = useState(() => randInt(2, 5));
  // Số đã ăn được tới hiện tại.
  const [count, setCount] = useState(0);
  // Phase: feeding (đang chờ ăn) | satisfied (đã no, chờ chuyển vòng).
  const [phase, setPhase] = useState<Phase>('feeding');
  // Vòng đã chơi (chỉ để hiển thị "Vòng 1, 2, 3...").
  const [roundNo, setRoundNo] = useState(1);
  // Tâm trạng con vật — dùng cho việc chọn emoji vẽ ra canvas.
  const [mood, setMood] = useState<AnimalMood>('waiting');
  // Kỷ lục số vòng đã hoàn thành (lifetime, persist localStorage).
  const [highScore, setHighScore] = useState<number>(() => loadHighScore());

  /* ─── Refs — state tốc độ cao + reference cho RAF loop ────────────────── */

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dữ liệu food trong rổ — đọc/ghi mỗi frame ⇒ dùng ref để tránh re-render.
  const foodsRef = useRef<Food[]>([]);
  // Floating "+1, +2, +3..." bay lên rồi mờ.
  const floatingRef = useRef<FloatingNum[]>([]);
  // Đang kéo món nào.
  const dragRef = useRef<DragState | null>(null);
  // ID đếm tăng cho floating num (tránh trùng key).
  const floatingIdRef = useRef(0);
  // Thời điểm con vật nên thoát trạng thái "chewing".
  const chewUntilRef = useRef(0);
  // Mirror phase/mood/pair cho RAF loop & pointer handlers đọc nhanh.
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const moodRef = useRef(mood);
  useEffect(() => { moodRef.current = mood; }, [mood]);
  const pair = ANIMAL_PAIRS[pairIdx];
  const pairRef = useRef(pair);
  useEffect(() => { pairRef.current = pair; }, [pair]);

  // Bond `target` cũng vào ref cho pointer handler đọc đúng giá trị mới nhất.
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; }, [target]);

  /* ─── Khởi tạo + reset cho mỗi vòng ───────────────────────────────────── */

  const initRound = useCallback((nextPairIdx: number, nextTarget: number) => {
    foodsRef.current = spawnFoods(nextTarget, ANIMAL_PAIRS[nextPairIdx].food);
    floatingRef.current = [];
    dragRef.current = null;
    chewUntilRef.current = 0;
    setCount(0);
    setMood('waiting');
    setPhase('feeding');
  }, []);

  // Vòng đầu tiên (mount).
  useEffect(() => {
    initRound(pairIdx, target);
    // Đọc lời mời cho vòng đầu — chậm 400ms để TTS engine sẵn sàng.
    const t = window.setTimeout(() => {
      speak(
        `Hãy cho tớ ăn ${target} ${ANIMAL_PAIRS[pairIdx].unit} ${ANIMAL_PAIRS[pairIdx].foodName} nào`,
        LANG_SPEAK_DEFAULT,
      );
    }, 400);
    return () => window.clearTimeout(t);
  // Chỉ chạy 1 lần lúc mount. Vòng sau dùng goNextRound() bên dưới.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Chuyển vòng kế tiếp (gọi sau khi bé no 2.5s) ────────────────────── */

  const goNextRound = useCallback(() => {
    // Chọn cặp mới — tránh trùng cặp vừa rồi để bé thấy đa dạng.
    let nextPair = randInt(0, ANIMAL_PAIRS.length - 1);
    if (ANIMAL_PAIRS.length > 1) {
      while (nextPair === pairIdx) {
        nextPair = randInt(0, ANIMAL_PAIRS.length - 1);
      }
    }
    // Số target tăng dần theo vòng để bé đi từ dễ → khó.
    // Vòng 1-3: 2-4; Vòng 4-6: 3-6; Vòng 7+: 4-9.
    const nextTarget =
      roundNo < 3 ? randInt(2, 4) :
      roundNo < 6 ? randInt(3, 6) :
      randInt(4, 9);

    setPairIdx(nextPair);
    setTarget(nextTarget);
    setRoundNo((r) => r + 1);
    initRound(nextPair, nextTarget);
    window.setTimeout(() => {
      speak(
        `Hãy cho tớ ăn ${nextTarget} ${ANIMAL_PAIRS[nextPair].unit} ${ANIMAL_PAIRS[nextPair].foodName} nào`,
        LANG_SPEAK_DEFAULT,
      );
    }, 350);
  }, [initRound, pairIdx, roundNo]);

  /* ─── Xử lý "ăn 1 món" + chuyển sang satisfied khi đủ ─────────────────── */

  const onBite = useCallback((food: Food) => {
    // Đánh dấu món này đang ăn — RAF loop sẽ co dần scale rồi xoá.
    food.isEating = true;
    food.isDragging = false;
    food.isReturning = false;

    // Con vật chuyển sang "đang nhai" 0.7 giây.
    setMood('chewing');
    chewUntilRef.current = Date.now() + CHEWING_MS;

    // Cộng điểm + âm thanh đúng.
    //   - playTing(): chuông trong trẻo (tần số cao A5+E6) — báo "ăn đúng".
    //   - playChomp(): tiếng nhai "chomp chomp" — delay 80ms để nhường Ting
    //     vang lên trước rồi mới tới tiếng nhai, tạo cảm giác "ting → munch".
    addScore(SCORE_PER_BITE);
    playTing();
    window.setTimeout(playChomp, 80);

    // Tăng count + sinh floating number theo doc — "Bé thả quả thứ 3,
    // hiện chữ '3' bay lên rồi mờ dần". Floating SỐ ĐẾM (giá trị mới).
    setCount((c) => {
      const next = c + 1;

      // Floating spawn ngay tại miệng con vật, hơi lệch ngẫu nhiên.
      floatingRef.current.push({
        id: ++floatingIdRef.current,
        value: next,
        x: ANIMAL_CX + randInt(-10, 10),
        y: ANIMAL_CY - 30,
        life: 1,
      });

      // Đã đủ — chuyển satisfied.
      if (next >= targetRef.current) {
        setPhase('satisfied');
        setMood('happy');
        confetti({
          particleCount: 180,
          spread: 100,
          origin: { y: 0.45 },
          colors: ['#facc15', '#22c55e', '#3b82f6', '#ec4899', '#f97316', '#a855f7'],
        });
        // Lưu kỷ lục — tăng lên 1.
        setHighScore((prev) => {
          const nv = prev + 1;
          saveHighScore(nv);
          return nv;
        });
        window.setTimeout(() => speak('Giỏi quá! Bé đếm chuẩn lắm!', LANG_SPEAK_DEFAULT), 250);
        // Sau 2.5s chuyển vòng kế tiếp.
        window.setTimeout(() => {
          goNextRound();
        }, SATISFIED_DELAY_MS);
      } else {
        // Đọc to số mới — bé nghe + thấy + đếm.
        window.setTimeout(() => speak(String(next), LANG_SPEAK_DEFAULT), 80);
      }
      return next;
    });
  }, [addScore, goNextRound]);

  /* ─── POINTER HANDLERS ────────────────────────────────────────────────── */

  /** Quy đổi event.clientX/Y sang toạ độ canvas 800x450. */
  const toCanvasPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
      };
    },
    [],
  );

  /**
   * Tìm món ăn (topmost — gần đầu mảng = vẽ trên) ở vị trí pointer cho việc
   * nhấn-để-cầm-lên. Chỉ xét food còn "sống" (chưa ăn).
   */
  const findFoodAt = useCallback((x: number, y: number): Food | null => {
    const foods = foodsRef.current;
    // Quét ngược cuối → đầu vì các món thêm sau có thể vẽ trên.
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      if (f.isEating) continue;
      // Bán kính nhấn rộng hơn món 1 chút cho dễ chạm bằng ngón tay.
      if (dist2(x, y, f.x, f.y) <= (FOOD_RADIUS + 8) ** 2) return f;
    }
    return null;
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'feeding') return;
    const p = toCanvasPoint(e);
    const food = findFoodAt(p.x, p.y);
    if (!food) return;

    // Bắt đầu kéo món này.
    e.currentTarget.setPointerCapture(e.pointerId);
    food.isDragging = true;
    food.isReturning = false; // huỷ spring nếu đang quay về.
    food.vx = 0;
    food.vy = 0;
    dragRef.current = {
      foodId: food.id,
      pointerId: e.pointerId,
      offX: p.x - food.x,
      offY: p.y - food.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toCanvasPoint(e);
    const food = foodsRef.current.find((f) => f.id === d.foodId);
    if (!food) return;

    // Vị trí RAW theo chính xác ngón tay/chuột (chưa hút).
    const rawX = p.x - d.offX;
    const rawY = p.y - d.offY;

    // ── MAGNETIC SNAP — "hút" món ăn về phía miệng khi vào vùng hấp dẫn ─
    // Tính khoảng cách từ vị trí raw đến tâm miệng. Càng gần thì cường độ
    // hút càng mạnh (ease-in quadratic) — bé chỉ cần đến GẦN mặt con vật
    // là thức ăn tự "trượt" vào miệng.
    const dx = ANIMAL_CX - rawX;
    const dy = ANIMAL_CY - rawY;
    const d2raw = dx * dx + dy * dy;
    if (d2raw < MOUTH_ATTRACT_R * MOUTH_ATTRACT_R) {
      const dRaw = Math.sqrt(d2raw);
      // t ∈ [0, 1] — 0 ở rìa vùng hút, 1 tại tâm miệng.
      const t = 1 - dRaw / MOUTH_ATTRACT_R;
      // t*t cho ease-in: ở rìa gần như 0 (không jump), càng gần càng mạnh.
      const pull = t * t * MOUTH_PULL_MAX;
      food.x = rawX + dx * pull;
      food.y = rawY + dy * pull;
    } else {
      // Ngoài vùng hút → bám chính xác theo tay.
      food.x = rawX;
      food.y = rawY;
    }
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const food = foodsRef.current.find((f) => f.id === d.foodId);
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (!food) return;

    // Kiểm tra có trúng miệng con vật không.
    if (dist2(food.x, food.y, ANIMAL_CX, ANIMAL_CY) <= MOUTH_HITBOX_R * MOUTH_HITBOX_R) {
      onBite(food);
    } else {
      // Ngoài miệng → spring về rổ.
      food.isDragging = false;
      food.isReturning = true;
    }
  };

  /* ─── VÒNG LẶP RAF (physics + draw) ──────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── HIGH-DPI SCALING ────────────────────────────────────────────────
    // Trước đây canvas có pixel buffer 800x450 rồi CSS scale up → mờ trên
    // màn Retina/4K (DPR 2-3x). Sửa: tăng pixel buffer theo devicePixelRatio
    // rồi ctx.scale để toạ độ vẽ bên dưới vẫn là 800x450 "logic" — emoji con
    // vật và mặt nhai sẽ sắc nét, đúng pixel màn hình.
    //
    // Cap DPR ≤ 3 để tránh canvas quá lớn trên màn 5K (~10 megapixel, có
    // thể tụt FPS trên iPad cũ).
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform trước khi scale
    ctx.scale(dpr, dpr);
    // Chất lượng smoothing tốt nhất cho emoji.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let rafId = 0;

    const step = () => {
      const now = Date.now();

      /* ---- 1) Cập nhật mood: chewing → waiting khi hết thời gian nhai. ---- */
      if (
        moodRef.current === 'chewing' &&
        now >= chewUntilRef.current &&
        phaseRef.current === 'feeding'
      ) {
        setMood('waiting');
      }

      /* ---- 2) Physics: spring return + eat shrink ---- */
      const foods = foodsRef.current;
      for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        if (f.isEating) {
          // Co dần về 0 rồi xoá. Khi đã đủ no → vẫn co.
          f.scale -= 0.08;
          if (f.scale <= 0) {
            foods.splice(i, 1);
          }
          continue;
        }
        if (f.isReturning && !f.isDragging) {
          // Spring tới (restX, restY).
          const ax = (f.restX - f.x) * SPRING_STIFFNESS;
          const ay = (f.restY - f.y) * SPRING_STIFFNESS;
          f.vx = (f.vx + ax) * SPRING_DAMPING;
          f.vy = (f.vy + ay) * SPRING_DAMPING;
          f.x += f.vx;
          f.y += f.vy;
          // Đã rất gần → snap & dừng.
          if (Math.abs(f.x - f.restX) < 0.5 && Math.abs(f.y - f.restY) < 0.5 &&
              Math.abs(f.vx) < 0.3 && Math.abs(f.vy) < 0.3) {
            f.x = f.restX;
            f.y = f.restY;
            f.vx = 0;
            f.vy = 0;
            f.isReturning = false;
          }
        }
      }

      /* ---- 3) Floating numbers: bay lên + mờ dần ---- */
      const floats = floatingRef.current;
      for (let i = floats.length - 1; i >= 0; i--) {
        const fn = floats[i];
        fn.y -= 1.4;
        fn.life -= 0.015;
        if (fn.life <= 0) floats.splice(i, 1);
      }

      /* ---- 4) Vẽ ---- */
      drawFrame(ctx, now);

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  // RAF chỉ tạo 1 lần lúc mount; mọi state mới đều đọc qua refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── HÀM VẼ MỖI FRAME ────────────────────────────────────────────────── */

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    const w = CANVAS_W;
    const h = CANVAS_H;
    const pairNow = pairRef.current;
    const moodNow = moodRef.current;

    /* (a) NỀN — gradient pastel vàng-xanh mint. */
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fef3c7'); // amber-100
    grad.addColorStop(1, '#d1fae5'); // emerald-100
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    /* (b) Mặt đất — đường cong nhẹ phía dưới (~y=290) cho cảm giác đứng trên đất. */
    ctx.fillStyle = 'rgba(110, 231, 183, 0.45)'; // emerald-300 / 45
    ctx.beginPath();
    ctx.moveTo(0, 290);
    ctx.quadraticCurveTo(w / 2, 270, w, 290);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    /* (c) RỔ THỨC ĂN — hộp chữ nhật mờ ở đáy. */
    ctx.fillStyle = 'rgba(120, 53, 15, 0.18)'; // amber-900 mờ
    roundRect(ctx, BASKET_X_LEFT - 6, BASKET_Y_TOP - 8, BASKET_X_RIGHT - BASKET_X_LEFT + 12, BASKET_Y_BOTTOM - BASKET_Y_TOP + 18, 22);
    ctx.fill();
    // Viền rổ
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
    ctx.lineWidth = 3;
    roundRect(ctx, BASKET_X_LEFT - 6, BASKET_Y_TOP - 8, BASKET_X_RIGHT - BASKET_X_LEFT + 12, BASKET_Y_BOTTOM - BASKET_Y_TOP + 18, 22);
    ctx.stroke();
    // Nhãn rổ
    ctx.fillStyle = 'rgba(120, 53, 15, 0.7)';
    ctx.font = "900 14px 'Nunito', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🧺 Rổ thức ăn — kéo thả vào miệng nhé!', BASKET_X_LEFT + 2, BASKET_Y_TOP - 28);

    /* (d) CON VẬT — vẽ ở giữa-trên, kèm bob khi waiting / dance khi happy. */
    const t = now / 1000;
    let bobY = 0;
    let extraScale = 1;
    if (moodNow === 'waiting') {
      // Lắc nhẹ lên xuống mỗi giây.
      bobY = Math.sin(t * 2) * 3;
    } else if (moodNow === 'chewing') {
      // Rung nhẹ nhanh hơn (nhai).
      bobY = Math.sin(t * 14) * 2;
    } else if (moodNow === 'happy') {
      // Nhảy múa — biên độ lớn hơn.
      bobY = Math.sin(t * 6) * 14;
      extraScale = 1 + Math.sin(t * 6) * 0.08;
    }

    // Bóng đất dưới chân con vật.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(ANIMAL_CX, ANIMAL_CY + ANIMAL_FONT_PX * 0.45, 90, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Emoji con vật — đổi theo mood.
    const animalChar =
      moodNow === 'chewing' ? pairNow.eating :
      moodNow === 'happy'   ? pairNow.happy  :
      pairNow.animal;

    ctx.save();
    ctx.translate(ANIMAL_CX, ANIMAL_CY + bobY);
    ctx.scale(extraScale, extraScale);
    // Emoji font stack tường minh → trên mọi OS đều render glyph emoji MÀU,
    // không bị fallback sang serif đen-trắng / glyph mờ.
    ctx.font = `${ANIMAL_FONT_PX}px ${EMOJI_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(animalChar, 0, 0);
    ctx.restore();

    /* (e) BONG BÓNG HỘI THOẠI — phía trên-phải con vật. */
    // Vị trí bong bóng (góc trái-trên).
    const bubbleX = ANIMAL_CX + 110;
    const bubbleY = 30;
    const bubbleW = 320;
    const bubbleH = 130;

    // Vẽ nền bubble trắng có viền dày.
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 24);
    ctx.fill();
    ctx.stroke();

    // Đuôi bong bóng (tail) chỉ về con vật.
    ctx.beginPath();
    ctx.moveTo(bubbleX + 30, bubbleY + bubbleH);
    ctx.lineTo(bubbleX, bubbleY + bubbleH + 28);
    ctx.lineTo(bubbleX + 60, bubbleY + bubbleH - 2);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bubbleX + 30, bubbleY + bubbleH);
    ctx.lineTo(bubbleX, bubbleY + bubbleH + 28);
    ctx.moveTo(bubbleX, bubbleY + bubbleH + 28);
    ctx.lineTo(bubbleX + 60, bubbleY + bubbleH - 2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (phaseRef.current === 'satisfied') {
      // ĐÃ NO → bong bóng hiển thị ✅ to.
      ctx.fillStyle = '#16a34a'; // green-600
      ctx.font = "900 80px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✅', bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
    } else {
      // Yêu cầu: "Cho tớ ăn" + SỐ THẬT TO + emoji thức ăn.
      ctx.fillStyle = '#1e293b';
      ctx.font = "900 18px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Cho tớ ăn', bubbleX + bubbleW / 2, bubbleY + 28);

      // Số to ở giữa bong bóng — nhịp đập nhẹ.
      const numScale = 1 + Math.sin(t * 4) * 0.05;
      ctx.save();
      ctx.translate(bubbleX + bubbleW / 2 - 50, bubbleY + bubbleH / 2 + 12);
      ctx.scale(numScale, numScale);
      ctx.font = "900 64px 'Nunito', sans-serif";
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(targetRef.current), 0, 0);
      ctx.restore();

      // Emoji thức ăn to bên cạnh số — dùng emoji font stack cho sắc nét.
      ctx.font = `60px ${EMOJI_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pairNow.food, bubbleX + bubbleW / 2 + 50, bubbleY + bubbleH / 2 + 12);

      // Đơn vị + tên thức ăn nhỏ ở đáy bong bóng.
      ctx.fillStyle = '#475569';
      ctx.font = "700 14px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pairNow.unit} ${pairNow.foodName} nhé!`, bubbleX + bubbleW / 2, bubbleY + bubbleH - 18);
    }

    /* (f) MIỆNG HITBOX — vẽ vòng tròn KHI có food đang được kéo gần.
       Có 2 lớp để bé thấy rõ phản hồi:
         - Vòng ngoài (attract zone): xanh dương nhạt — vào đây thức ăn bắt
           đầu bị "hút" về miệng.
         - Vòng trong (eat hitbox)  : xanh lá đậm — chắc chắn ăn được khi
           thả ra tại đây.
       Chỉ hiện khi food đã vào trong vùng hút để tránh rối nhìn. */
    const drag = dragRef.current;
    if (drag) {
      const food = foodsRef.current.find((f) => f.id === drag.foodId);
      if (food) {
        const d2 = dist2(food.x, food.y, ANIMAL_CX, ANIMAL_CY);
        const inAttract = d2 <= MOUTH_ATTRACT_R * MOUTH_ATTRACT_R;
        if (inAttract) {
          const inEat = d2 <= MOUTH_HITBOX_R * MOUTH_HITBOX_R;
          ctx.save();

          // Vòng ngoài — vùng HÚT (nhẹ, gợi ý).
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)'; // blue-500/35
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.arc(ANIMAL_CX, ANIMAL_CY, MOUTH_ATTRACT_R, 0, Math.PI * 2);
          ctx.stroke();

          // Vòng trong — vùng ĂN (rõ, đậm). Đổi màu xanh lá khi đã trong.
          ctx.strokeStyle = inEat
            ? 'rgba(34, 197, 94, 0.85)' // green-500
            : 'rgba(59, 130, 246, 0.6)'; // blue-500
          ctx.lineWidth = 6;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.arc(ANIMAL_CX, ANIMAL_CY, MOUTH_HITBOX_R, 0, Math.PI * 2);
          ctx.stroke();

          // Khi đã vào vùng ăn — fill nhẹ vòng trong cho cảm giác "snap".
          if (inEat) {
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
            ctx.beginPath();
            ctx.arc(ANIMAL_CX, ANIMAL_CY, MOUTH_HITBOX_R, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }
    }

    /* (g) THỨC ĂN trong rổ + đang kéo + đang co lại để vào miệng. */
    for (const f of foodsRef.current) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.scale, f.scale);
      if (f.isDragging) {
        // Đang cầm: phóng to 1.15x + bóng đổ nhẹ.
        ctx.scale(1.15, 1.15);
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
      }
      ctx.font = `${FOOD_FONT_PX}px ${EMOJI_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.emoji, 0, 0);
      ctx.restore();
    }

    /* (h) FLOATING SỐ ĐẾM — bay lên, mờ dần, theo doc. */
    for (const fn of floatingRef.current) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fn.life));
      ctx.fillStyle = '#16a34a'; // green-600
      ctx.font = "900 56px 'Nunito', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(String(fn.value), fn.x, fn.y);
      ctx.fillText(String(fn.value), fn.x, fn.y);
      ctx.restore();
    }
  }, []);

  /* ─── JSX ─────────────────────────────────────────────────────────────── */

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Thanh trên: thoát + tiêu đề + kỷ lục */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          🍽️ Cho Thú Ăn — Đếm Số
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          🏆 {highScore}
        </div>
      </div>

      {/* HUD: vòng · target · current count · animal name */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Vòng</div>
          <div className="text-2xl font-black">{roundNo}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Cần</div>
          <div className="text-2xl font-black">{target}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Đã ăn</div>
          <div className="text-2xl font-black">
            {count}
            <span className="opacity-60 text-base"> / {target}</span>
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Bạn ấy</div>
          <div className="text-2xl">{pair.animal}</div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="rounded-3xl overflow-hidden border-4 border-amber-300 shadow-lg shadow-amber-100 bg-amber-50">
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
        Kéo thức ăn vào miệng con vật · Đếm thật chuẩn theo số trong bong bóng nhé!
      </p>
    </div>
  );
}

/* ===========================================================================
 * Tiện ích vẽ — roundRect cho canvas (cũ không hỗ trợ tự nhiên trên Safari).
 * ========================================================================= */

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
