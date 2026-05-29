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
import { playPop, playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Bong Bóng Chữ Cái — Tìm Cặp Trùng Nhau"
 *
 * Trò chơi luyện nhận diện CHỮ CÁI cho bé 3-5 tuổi. Chú voi 🐘 ở góc dưới
 * thổi ra các bong bóng trong suốt mang theo từng chữ cái khác nhau, bay
 * chậm rãi lên trên. Bé tìm và CHỌC VỠ những bong bóng có CHỮ TRÙNG với
 * Chữ Mục Tiêu (hiển thị ở HUD).
 *
 *   - Không phạt điểm khi bấm sai → bé không bị áp lực.
 *   - Mỗi bong bóng vỡ đều có hiệu ứng hạt màu bay tỏa ra → bé luôn được
 *     phản hồi vui tai vui mắt, kể cả khi bấm sai.
 *   - Đủ 3 lần đúng → đổi sang chữ mục tiêu mới + pop-up chúc mừng.
 *
 * KIẾN TRÚC:
 *   React  : phase, chủ đề (HOA/thường/số), chữ mục tiêu, điểm, đếm đúng.
 *   Canvas : RAF loop, mảng `bubbles` và `particles` — refs chứ KHÔNG state,
 *            tránh re-render mỗi frame. Pointer Events gộp chung mouse+touch.
 *
 * QUẢN LÝ BỘ NHỚ:
 *   - Bong bóng bay quá cạnh trên (`y + radius < 0`) → splice khỏi mảng.
 *   - Particle hết life → splice khỏi mảng.
 *   - Pop animation hoàn tất → splice bubble khỏi mảng.
 *   Quét ngược cuối-đầu để splice không ảnh hưởng index.
 *
 * TỔ CHỨC FILE:
 *   1. Hằng số canvas, gameplay, font.
 *   2. Bảng chữ cái + chủ đề.
 *   3. Kiểu dữ liệu nội bộ.
 *   4. Hàm tiện ích.
 *   5. React component.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ
 * ========================================================================= */

// Tỷ lệ 16:9 (theo doc).
const CANVAS_W = 800;
const CANVAS_H = 450;

// Tần suất sinh bong bóng — random trong khoảng này (ms). Theo doc 1.2-1.8s.
const SPAWN_MIN_MS = 1200;
const SPAWN_MAX_MS = 1800;

// 40% bong bóng mang chữ MỤC TIÊU (đúng), 60% mang chữ NHIỄU (sai).
const TARGET_PROB = 0.4;

// Sau bao nhiêu lần đúng thì đổi sang chữ mới + chúc mừng. Doc gợi ý 3 hoặc 5;
// chọn 3 cho bé 3-5 tuổi để chu kỳ thưởng diễn ra thường xuyên hơn.
const TARGETS_PER_LEVEL = 3;

// Bán kính bong bóng — random.
const BUBBLE_R_MIN = 36;
const BUBBLE_R_MAX = 52;

// Tốc độ bay LÊN của bong bóng (px/frame).
const BUBBLE_SPEED_MIN = 0.55;
const BUBBLE_SPEED_MAX = 1.15;

// Vị trí + cỡ chú voi (góc dưới-trái). Bong bóng sinh ra ở miệng voi.
const ELEPHANT_X = 95;
const ELEPHANT_Y = 380;
const ELEPHANT_FONT_PX = 86;

// Vị trí điểm "miệng vòi" voi — nơi bong bóng được sinh ra. Đặt hơi lệch
// phải-trên so với tâm emoji (mặc định emoji là 1 hình vuông centered).
const SPOUT_DX = 50;
const SPOUT_DY = -10;

// Cộng điểm cho mỗi lần đúng.
const SCORE_PER_HIT = 10;

// Thời lượng animation "nổ" (pop scale → 0).
const POP_MS = 200;

// Thời lượng "puff" — voi phình lên rồi xẹp xuống mỗi lần thổi 1 bong bóng.
// 380ms vừa đủ để mắt nhận ra "ô, chú voi đang thổi", không quá lâu.
const PUFF_MS = 380;

// localStorage — kỷ lục điểm cao nhất 1 lượt chơi.
const STORAGE_KEY = 'lingoland_bubbleletter_hs';

// Font emoji tường minh cho mọi OS (xem chi tiết ở FeedCountView).
const EMOJI_FONT_STACK =
  "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', " +
  "'Twemoji Mozilla', 'EmojiOne Color', sans-serif";

// Font chữ cái trong bong bóng — sans-serif đậm dễ đọc cho bé.
const LETTER_FONT_FAMILY = "'Nunito', 'Segoe UI', Arial, sans-serif";

// Các màu sắc rực rỡ dùng cho particles nổ + tint bong bóng.
const BUBBLE_HUES = [200, 280, 320, 340, 30, 50, 140, 180]; // HSL hue 0-360
const PARTICLE_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#facc15', // yellow
];

/* ===========================================================================
 * 2. BẢNG CHỮ CÁI + CHỦ ĐỀ
 * ========================================================================= */

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');
const NUMBERS = '0123456789'.split('');

type Topic = 'upper' | 'lower' | 'numbers';

type TopicDef = {
  key: Topic;
  label: string;
  emoji: string;
  chars: string[];
  gradient: string; // Tailwind gradient cho card chọn chủ đề
};

const TOPICS: TopicDef[] = [
  {
    key: 'upper',
    label: 'Chữ HOA  A — Z',
    emoji: '🔠',
    chars: UPPER,
    gradient: 'from-sky-500 via-blue-500 to-indigo-500',
  },
  {
    key: 'lower',
    label: 'chữ thường  a — z',
    emoji: '🔡',
    chars: LOWER,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
  {
    key: 'numbers',
    label: 'Chữ số  0 — 9',
    emoji: '🔢',
    chars: NUMBERS,
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
  },
];

/* ===========================================================================
 * 3. KIỂU DỮ LIỆU NỘI BỘ
 * ========================================================================= */

/** Một bong bóng đang bay trên canvas. */
type Bubble = {
  id: number;
  x: number;
  y: number;
  radius: number;
  letter: string;
  /** Lưu lại sẵn xem bubble này có phải mục tiêu không — tránh so chuỗi mỗi frame. */
  isTarget: boolean;
  /** Tốc độ ngang — luôn DƯƠNG, làm bong bóng trôi CHÉO sang phải khi
   *  bay lên. Nhờ đó cụm bong bóng trải rộng ra cả canvas thay vì bám
   *  sát mép trái nơi voi đứng. Kết hợp với sin(y) ở RAF loop → vừa
   *  lắc lư vừa toả ra. */
  vx: number;
  /** Tốc độ đứng — luôn âm (bay lên trên). */
  vy: number;
  /** OFFSET PHA cho hàm sin — gán random [0, 2π) lúc spawn. Nhờ đó, dù
   *  cùng dùng công thức `sin(y / 30)`, mỗi bong bóng vẫn lắc lư LỆCH
   *  PHA với bong bóng khác → cụm bong bóng không "đồng pha" cứng nhắc. */
  phaseOffset: number;
  /** Hue HSL cho gradient tint bong bóng. */
  hue: number;
  /** Đang ở animation "nổ" không. */
  popping: boolean;
  /** 0 → 1 trong animation pop (dùng để scale + alpha). */
  popT: number;
};

/** Một hạt bay tỏa khi bong bóng nổ. */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** life ∈ [0, 1] — mỗi frame trừ dần. */
  life: number;
  color: string;
  size: number;
};

/** Mây trôi nền — chỉ trang trí. */
type Cloud = {
  x: number;
  y: number;
  scale: number;
  speed: number;
};

type Phase = 'idle' | 'playing' | 'celebrating';

/* ===========================================================================
 * 4. HÀM TIỆN ÍCH
 * ========================================================================= */

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Bình phương khoảng cách. */
function dist2(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
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

/**
 * Sinh 1 bong bóng mới ở miệng vòi voi.
 *  - targetChar    : chữ mục tiêu hiện tại — 40% bong bóng sẽ MANG chữ này.
 *  - charset       : bộ chữ thuộc chủ đề hiện tại (HOA / thường / số).
 *  - idGen         : tham chiếu counter để cấp id duy nhất.
 *  - chooseTarget? : ép buộc bubble này là target (true) hoặc không (false).
 *                    Nếu undefined → random theo TARGET_PROB.
 */
function spawnBubble(
  targetChar: string,
  charset: string[],
  idGen: { current: number },
  chooseTarget?: boolean,
): Bubble {
  const isTarget =
    chooseTarget !== undefined ? chooseTarget : Math.random() < TARGET_PROB;

  // Nếu không phải target → chọn 1 chữ KHÁC target. Loop tới khi ra chữ khác
  // (rất nhanh vì alphabet >= 10 phần tử).
  let letter = targetChar;
  if (!isTarget) {
    while (letter === targetChar) {
      letter = pick(charset);
    }
  }

  const radius = randRange(BUBBLE_R_MIN, BUBBLE_R_MAX);
  return {
    id: ++idGen.current,
    // Sinh tại miệng vòi voi, lệch ngang ngẫu nhiên ±20px để không xếp chồng.
    x: ELEPHANT_X + SPOUT_DX + randRange(-20, 20),
    y: ELEPHANT_Y + SPOUT_DY,
    radius,
    letter,
    isTarget,
    // Trôi CHÉO sang phải — vx luôn dương để bong bóng dạt khỏi mép trái
    // (nơi voi đứng) và lan ra cả canvas. Random [0.35, 0.85] px/frame.
    // Cộng thêm sin(y) ở RAF loop để vừa trôi vừa lắc lư tự nhiên.
    vx: randRange(0.35, 0.85),
    vy: -randRange(BUBBLE_SPEED_MIN, BUBBLE_SPEED_MAX),
    // Random [0, 2π) — mỗi bong bóng có pha xuất phát khác nhau cho đỡ
    // đồng pha với các bong bóng lân cận.
    phaseOffset: Math.random() * Math.PI * 2,
    hue: pick(BUBBLE_HUES),
    popping: false,
    popT: 0,
  };
}

/** Sinh chùm particle khi 1 bong bóng nổ. */
function spawnParticles(
  arr: Particle[],
  cx: number,
  cy: number,
  isCorrect: boolean,
) {
  // Đúng → nhiều hạt + bay xa hơn cho cảm giác thưởng.
  const count = isCorrect ? randInt(14, 18) : randInt(8, 12);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = randRange(2.2, 4.5) * (isCorrect ? 1.2 : 1);
    arr.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: pick(PARTICLE_COLORS),
      size: randRange(3, 6),
    });
  }
}

/** Sinh bộ mây ngẫu nhiên cho nền — gọi 1 lần. */
function spawnClouds(): Cloud[] {
  const out: Cloud[] = [];
  for (let i = 0; i < 5; i++) {
    out.push({
      x: randRange(0, CANVAS_W),
      y: randRange(20, 140),
      scale: randRange(0.7, 1.3),
      speed: randRange(0.05, 0.18),
    });
  }
  return out;
}

/* ===========================================================================
 * 5. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function BubbleLettersView({ onBack }: Props) {
  const { addScore } = useGame();

  /* ─── React state ───────────────────────────────────────────────────── */

  const [phase, setPhase] = useState<Phase>('idle');
  const [topicKey, setTopicKey] = useState<Topic>('upper');
  const [targetChar, setTargetChar] = useState<string>('A');
  const [score, setScore] = useState(0);
  // Số lần đã chọc đúng cho chữ mục tiêu hiện tại (0 → TARGETS_PER_LEVEL).
  const [collected, setCollected] = useState(0);
  // Tổng số chữ đã hoàn thành mục tiêu (chuyển sang chữ mới). Hiển thị HUD.
  const [levelsCleared, setLevelsCleared] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => loadHighScore());
  // Hiển thị popup chúc mừng giữa các level.
  const [celebrateText, setCelebrateText] = useState<string | null>(null);

  /* ─── Refs — gameplay state tốc độ cao ─────────────────────────────── */

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cloudsRef = useRef<Cloud[]>(spawnClouds());
  const idGenRef = useRef(0);
  const lastSpawnAtRef = useRef(0);
  const nextSpawnDelayRef = useRef(SPAWN_MIN_MS);
  // Thời điểm voi BẮT ĐẦU puff (thổi bong bóng) lần gần nhất. Khởi tạo rất
  // sâu trong quá khứ để puff animation không tự kích hoạt lúc mount.
  const puffStartRef = useRef(-99999);
  // Mirror các state cho RAF loop / pointer handlers đọc đúng giá trị mới nhất.
  const targetRef = useRef(targetChar);
  useEffect(() => { targetRef.current = targetChar; }, [targetChar]);
  const topicRef = useRef<TopicDef>(TOPICS[0]);
  useEffect(() => {
    topicRef.current = TOPICS.find((t) => t.key === topicKey) ?? TOPICS[0];
  }, [topicKey]);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* ─── Khởi tạo / khởi động ván chơi ────────────────────────────────── */

  const startGame = useCallback((tk: Topic) => {
    const t = TOPICS.find((x) => x.key === tk) ?? TOPICS[0];
    topicRef.current = t;
    const firstTarget = pick(t.chars);
    bubblesRef.current = [];
    particlesRef.current = [];
    idGenRef.current = 0;
    lastSpawnAtRef.current = performance.now();
    nextSpawnDelayRef.current = randRange(SPAWN_MIN_MS, SPAWN_MAX_MS);

    setTopicKey(tk);
    setTargetChar(firstTarget);
    setScore(0);
    setCollected(0);
    setLevelsCleared(0);
    setCelebrateText(null);
    setPhase('playing');

    // Đọc to gợi ý cho bé khởi đầu.
    window.setTimeout(() => {
      speak(`Hãy chọc các bong bóng có chữ ${firstTarget}`, LANG_SPEAK_DEFAULT);
    }, 300);
  }, []);

  /* ─── Chuyển sang chữ mục tiêu mới sau khi đủ TARGETS_PER_LEVEL lần đúng ─ */

  const advanceTarget = useCallback(() => {
    const t = topicRef.current;
    // Chọn 1 chữ KHÁC chữ vừa rồi.
    let next = targetRef.current;
    if (t.chars.length > 1) {
      while (next === targetRef.current) next = pick(t.chars);
    }

    // Pop-up chúc mừng — câu cổ vũ ngẫu nhiên.
    const cheers = ['Bé giỏi quá! 🎉', 'Tuyệt vời! 🌟', 'Xuất sắc! 💖', 'Đỉnh! 👏'];
    setCelebrateText(pick(cheers));
    setPhase('celebrating');
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.45 },
      colors: PARTICLE_COLORS,
    });
    window.setTimeout(() => speak(pick(cheers), LANG_SPEAK_DEFAULT), 200);

    // Sau 1.6s ẩn pop-up, đổi chữ, tiếp tục.
    window.setTimeout(() => {
      setTargetChar(next);
      setCollected(0);
      setLevelsCleared((n) => n + 1);
      setCelebrateText(null);
      setPhase('playing');
      window.setTimeout(() => {
        speak(`Tiếp theo, chữ ${next}`, LANG_SPEAK_DEFAULT);
      }, 250);
    }, 1600);
  }, []);

  /* ─── Xử lý click/tap → chọc vỡ bong bóng ──────────────────────────── */

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

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    const p = toCanvasPoint(e);

    // Duyệt NGƯỢC để các bong bóng sinh sau (vẽ trên) được ưu tiên pop trước.
    const arr = bubblesRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      if (b.popping) continue;
      // Tăng nhẹ bán kính hit (+6) để bé dễ chạm bằng ngón tay.
      if (dist2(p.x, p.y, b.x, b.y) <= (b.radius + 6) ** 2) {
        // ── VA CHẠM TRẢ VỀ TRUE ─────────────────────────────────────────
        // Phát NGAY tiếng "BÓC!" bong bóng nổ — sine sweep 1400→350Hz
        // (~90ms) qua WebAudio. Phát BẤT KỂ chữ đúng hay sai vì trẻ con
        // cực thích cảm giác chọc bong bóng nổ → khuyến khích bé tiếp tục
        // tìm và chọc thêm.
        playPop();

        // Trúng bong bóng này.
        b.popping = true;
        b.popT = 0;

        // Sinh particle bay tỏa — đúng nhiều/sặc sỡ hơn sai.
        spawnParticles(particlesRef.current, b.x, b.y, b.isTarget);

        if (b.isTarget) {
          // ĐÚNG chữ mục tiêu — cộng điểm + chuông leng keng (chồng lên
          // tiếng pop để cảm giác "BÓC! ✨ leng keng" rất phấn khích).
          playTing();
          addScore(SCORE_PER_HIT);
          setScore((s) => {
            const next = s + SCORE_PER_HIT;
            // Cập nhật kỷ lục nếu vượt qua.
            setHighScore((prev) => {
              if (next > prev) {
                saveHighScore(next);
                return next;
              }
              return prev;
            });
            return next;
          });
          setCollected((c) => {
            const next = c + 1;
            if (next >= TARGETS_PER_LEVEL) {
              // Đủ rồi → chuyển chữ mới.
              advanceTarget();
              return 0;
            }
            return next;
          });
        }
        // Mỗi lần click chỉ pop 1 bong bóng.
        break;
      }
    }
  };

  /* ─── VÒNG LẶP RAF (spawn + update + draw) ─────────────────────────── */

  useEffect(() => {
    if (phase === 'idle') return; // chưa vào ván
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI scaling — emoji + chữ trong bong bóng sắc nét trên màn Retina.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let rafId = 0;
    let lastFrameAt = performance.now();

    const step = (now: number) => {
      const dt = now - lastFrameAt;
      lastFrameAt = now;

      // ── (1) SPAWN ─────────────────────────────────────────────────────
      if (
        phaseRef.current === 'playing' &&
        now - lastSpawnAtRef.current >= nextSpawnDelayRef.current
      ) {
        lastSpawnAtRef.current = now;
        nextSpawnDelayRef.current = randRange(SPAWN_MIN_MS, SPAWN_MAX_MS);
        bubblesRef.current.push(
          spawnBubble(targetRef.current, topicRef.current.chars, idGenRef),
        );

        // ĐỒNG BỘ ANIMATION VOI — đánh dấu thời điểm bắt đầu "puff" để
        // drawFrame phình voi to lên 8% rồi xẹp xuống trong PUFF_MS, tạo
        // cảm giác chú voi vừa hít vào rồi thở mạnh ra → bong bóng xuất hiện.
        puffStartRef.current = now;

        // Chùm KHÓI TRẮNG nhỏ ở miệng vòi — tái sử dụng pipeline particle:
        // 4 hạt trắng mờ, bay nhẹ lên-phải, gravity sẽ kéo dần xuống. Vừa
        // đủ thấy "ô có hơi thở ra", không che lấp bong bóng vừa sinh.
        for (let k = 0; k < 4; k++) {
          particlesRef.current.push({
            x: ELEPHANT_X + SPOUT_DX + randRange(-4, 4),
            y: ELEPHANT_Y + SPOUT_DY + randRange(-2, 2),
            vx: randRange(0.6, 1.8),
            vy: randRange(-1.4, -0.4),
            life: 1,
            color: 'rgba(255, 255, 255, 0.85)',
            size: randRange(3, 5),
          });
        }
      }

      // ── (2) UPDATE BUBBLES ────────────────────────────────────────────
      const bubbles = bubblesRef.current;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.popping) {
          // Animation nổ — scale + alpha về 0 trong POP_MS.
          b.popT += dt / POP_MS;
          if (b.popT >= 1) {
            bubbles.splice(i, 1);
          }
          continue;
        }
        // ── CHUYỂN ĐỘNG NGANG = DRIFT CHÉO + SWAY SIN ──────────────────
        // (1) b.vx (luôn dương) → bong bóng trôi chéo dần sang PHẢI khi
        //     bay lên, lan toả ra khắp canvas thay vì chụm bên trái nơi
        //     voi đứng — bé thấy không gian "rộng rãi" hơn.
        // (2) Math.sin(b.y / 30 + phaseOffset) * 0.5 → vẫn giữ chuyển
        //     động lắt léo (zig-zag) chồng lên drift, để chuyển động trông
        //     y hệt bong bóng xà phòng thật. phaseOffset random làm mỗi
        //     bong bóng lệch pha, không lắc đều như duyệt binh.
        b.x += b.vx + Math.sin(b.y / 30 + b.phaseOffset) * 0.5;
        b.y += b.vy;
        // DỌN khi bay quá đỉnh HOẶC trôi quá mép phải (memory cleanup).
        if (b.y + b.radius < 0 || b.x - b.radius > CANVAS_W) {
          bubbles.splice(i, 1);
        }
      }

      // ── (3) UPDATE PARTICLES ─────────────────────────────────────────
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity nhẹ
        p.vx *= 0.985;
        p.life -= 0.022;
        if (p.life <= 0) parts.splice(i, 1);
      }

      // ── (4) UPDATE CLOUDS ────────────────────────────────────────────
      for (const c of cloudsRef.current) {
        c.x += c.speed;
        if (c.x - 60 * c.scale > CANVAS_W) {
          // Trôi khỏi mép phải → wrap về mép trái với y mới.
          c.x = -60 * c.scale;
          c.y = randRange(20, 140);
        }
      }

      // ── (5) DRAW ────────────────────────────────────────────────────
      drawFrame(ctx);

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  // RAF tạo lại khi chuyển từ idle → playing. Các state mới đều đọc qua ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ─── HÀM VẼ MỖI FRAME ─────────────────────────────────────────────── */

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = CANVAS_W;
    const h = CANVAS_H;

    // (a) NỀN BẦU TRỜI — gradient xanh dương → xanh nhạt.
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#bae6fd'); // sky-200
    sky.addColorStop(0.7, '#e0f2fe'); // sky-100
    sky.addColorStop(1, '#a7f3d0'); // emerald-200 (đáy = cỏ mờ)
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // (b) MÂY TRẮNG — vẽ blob cluster mờ ở mỗi cloud.
    for (const c of cloudsRef.current) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      // Cluster 4 vòng tròn tạo hình mây xù xì.
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.arc(20, -6, 18, 0, Math.PI * 2);
      ctx.arc(38, 2, 22, 0, Math.PI * 2);
      ctx.arc(18, 10, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // (c) MẶT CỎ — dải xanh lá ở đáy canvas.
    ctx.fillStyle = '#86efac'; // emerald-300
    ctx.fillRect(0, h - 50, w, 50);
    ctx.fillStyle = '#4ade80'; // emerald-400
    ctx.fillRect(0, h - 50, w, 6);

    // (d) BONG BÓNG (vẽ trước voi để voi che bong bóng vừa sinh).
    const bubbles = bubblesRef.current;
    for (const b of bubbles) {
      ctx.save();
      // Animation nổ: scale to 1.4 → 0 + alpha → 0
      let scale = 1;
      let alpha = 1;
      if (b.popping) {
        scale = 1 + b.popT * 0.4;
        alpha = 1 - b.popT;
      }
      ctx.globalAlpha = alpha;
      ctx.translate(b.x, b.y);
      ctx.scale(scale, scale);

      // Radial gradient cho hiệu ứng "xà phòng": trắng mờ ở giữa, hue mờ ở rìa.
      const grad = ctx.createRadialGradient(
        -b.radius * 0.3, -b.radius * 0.3, b.radius * 0.1,
        0, 0, b.radius,
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.5, `hsla(${b.hue}, 80%, 75%, 0.55)`);
      grad.addColorStop(1, `hsla(${b.hue}, 80%, 60%, 0.25)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Viền mỏng tròn — gợi mép bong bóng.
      ctx.strokeStyle = `hsla(${b.hue}, 80%, 50%, 0.45)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Highlight nhỏ ở góc trên-trái cho cảm giác bóng loáng.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(-b.radius * 0.4, -b.radius * 0.4, b.radius * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Chữ ở giữa — chỉ vẽ nếu chưa nổ quá nhiều (giữ đọc được khi bắt đầu pop).
      if (!b.popping || b.popT < 0.6) {
        const letterAlpha = b.popping ? 1 - b.popT : 1;
        ctx.globalAlpha = alpha * letterAlpha;
        const fs = Math.round(b.radius * 0.95);
        ctx.font = `900 ${fs}px ${LETTER_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Stroke trắng dày + fill đậm để chữ nổi bật bất kể màu bong bóng.
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(b.letter, 0, 2);
        ctx.fillStyle = `hsl(${b.hue}, 75%, 30%)`;
        ctx.fillText(b.letter, 0, 2);
      }
      ctx.restore();
    }

    // (e) PARTICLES — chấm tròn nhỏ bay tỏa.
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // (f) CHÚ VOI — vẽ SAU bong bóng để che phần bong bóng vừa sinh.
    //
    // Có 3 lớp animation chồng lên nhau, tạo cảm giác "đang sống và đang
    // thổi bong bóng":
    //
    //   (1) BOB — nhún lên xuống ±2px theo sin(t * 1.7), luôn diễn ra.
    //   (2) BREATH — hít thở nhịp nhàng, body scale ±2.5% theo sin(t * 1.5).
    //       Tần số chậm hơn bob → nhìn không bị "co giật" đồng pha.
    //   (3) PUFF — burst riêng mỗi lần spawn bong bóng. Trong PUFF_MS, body
    //       phình lên 8% rồi xẹp xuống theo nửa chu kỳ sin (0 → 1 → 0), và
    //       dạt nhẹ về phía sau (trái) như bị phản lực do thổi mạnh.
    const nowMs = performance.now();
    const t = nowMs / 1000;
    const elephantBob = Math.sin(t * 1.7) * 2;
    const breath = 1 + Math.sin(t * 1.5) * 0.025;

    // Tính puff progress 0 → 1, sau đó nửa chu kỳ sin → giá trị peak ở 0.5.
    const puffElapsed = nowMs - puffStartRef.current;
    const puffT = Math.max(0, Math.min(1, puffElapsed / PUFF_MS));
    const puffCurve = puffT < 1 ? Math.sin(puffT * Math.PI) : 0;
    const bodyScale = breath * (1 + puffCurve * 0.08);
    const puffLeanX = -puffCurve * 5; // dạt nhẹ sang TRÁI (= sau lưng voi)

    // Bóng đất dưới chân voi — bóng phình nhẹ theo body scale cho khớp.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(
      ELEPHANT_X + puffLeanX, ELEPHANT_Y + 50,
      54 * bodyScale, 9 * bodyScale,
      0, 0, Math.PI * 2,
    );
    ctx.fill();

    // Emoji voi — LẬT NGANG để vòi quay sang phải, hướng về phía bong bóng
    // được sinh ra (SPOUT_DX > 0). Scale âm trục X = mirror; scale dương
    // trục Y giữ chiều cao. Cả 2 nhân với bodyScale để puff + breath
    // áp dụng đều cả ngang lẫn dọc.
    ctx.save();
    ctx.translate(ELEPHANT_X + puffLeanX, ELEPHANT_Y + elephantBob);
    ctx.scale(-bodyScale, bodyScale);
    ctx.font = `${ELEPHANT_FONT_PX}px ${EMOJI_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐘', 0, 0);
    ctx.restore();

    // (g) CHỮ MỤC TIÊU TO Ở GÓC TRÊN-PHẢI — luôn nhìn thấy trong khi chơi.
    if (phaseRef.current !== 'idle') {
      const boxX = w - 130;
      const boxY = 20;
      const boxSize = 110;
      // Khung bo tròn nền vàng nhạt.
      ctx.fillStyle = 'rgba(255, 251, 235, 0.95)';
      ctx.strokeStyle = '#fbbf24'; // amber-400
      ctx.lineWidth = 4;
      roundRect(ctx, boxX, boxY, boxSize, boxSize, 18);
      ctx.fill();
      ctx.stroke();
      // Nhãn "TÌM CHỮ".
      ctx.fillStyle = '#92400e'; // amber-800
      ctx.font = `900 11px ${LETTER_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('TÌM CHỮ', boxX + boxSize / 2, boxY + 6);
      // Chữ mục tiêu CỰC TO ở giữa khung.
      ctx.fillStyle = '#ef4444';
      ctx.font = `900 70px ${LETTER_FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(targetRef.current, boxX + boxSize / 2, boxY + boxSize / 2 + 8);
    }
  }, []);

  /* ─── JSX ─────────────────────────────────────────────────────────── */

  /* (a) MÀN HÌNH CHỌN CHỦ ĐỀ (idle) */
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
          <div className="text-7xl mb-4 floating">🫧</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent leading-tight">
            Bong Bóng Chữ Cái
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Chú voi 🐘 thổi bong bóng có chữ. Hãy chọc đúng bong bóng có chữ
            mà bài yêu cầu nhé!
          </p>

          <div className="bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-200 rounded-3xl p-4 mb-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">✨</span> Đúng chữ: +{SCORE_PER_HIT} điểm.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">💖</span> Sai cũng không sao — không trừ
              điểm!
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🎉</span> Đủ {TARGETS_PER_LEVEL} chữ
              đúng → đổi chữ mới.
            </div>
          </div>

          {highScore > 0 && (
            <div className="mb-4 inline-block bg-amber-100 text-amber-800 font-black text-sm px-4 py-1.5 rounded-full">
              🏆 Kỷ lục: {highScore} điểm
            </div>
          )}

          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 mt-2">
            Chọn chủ đề
          </p>
          <div className="space-y-3">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                onClick={() => startGame(t.key)}
                className={`w-full p-4 bg-gradient-to-br ${t.gradient} text-white rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-3 text-left`}
              >
                <div className="text-4xl shrink-0">{t.emoji}</div>
                <div className="flex-1">
                  <div className="font-black text-base leading-tight">
                    {t.label}
                  </div>
                  <div className="text-[11px] opacity-90 font-bold mt-0.5">
                    {t.chars.length} ký tự
                  </div>
                </div>
                <span className="text-xl">▶️</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* (b) MÀN HÌNH CHƠI */
  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Thanh trên */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={() => setPhase('idle')}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          🫧 Bong Bóng Chữ Cái
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          🏆 {highScore}
        </div>
      </div>

      {/* HUD: target / collected / score / level */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Tìm chữ
          </div>
          <div className="text-3xl font-black leading-none">{targetChar}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Đã đúng
          </div>
          <div className="text-2xl font-black">
            {collected}
            <span className="opacity-60 text-sm"> / {TARGETS_PER_LEVEL}</span>
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Điểm
          </div>
          <div className="text-2xl font-black">{score}</div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Chữ qua
          </div>
          <div className="text-2xl font-black">{levelsCleared}</div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="relative rounded-3xl overflow-hidden border-4 border-sky-300 shadow-lg shadow-sky-100 bg-sky-50">
        <canvas
          ref={canvasRef}
          className="block w-full aspect-[16/9] touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
        />
        {/* Pop-up chúc mừng giữa các level */}
        {celebrateText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 border-4 border-yellow-300 rounded-3xl px-8 py-5 shadow-2xl animate-in zoom-in duration-300">
              <div className="text-4xl font-black bg-gradient-to-r from-pink-500 via-red-500 to-amber-500 bg-clip-text text-transparent text-center">
                {celebrateText}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Chạm vào bong bóng có chữ <b>{targetChar}</b> · Bấm sai không bị trừ
        điểm 🫧
      </p>
    </div>
  );
}

/* ===========================================================================
 * Tiện ích vẽ — roundRect cho canvas.
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
