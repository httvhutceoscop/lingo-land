import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';

type Phase = 'idle' | 'playing' | 'success' | 'gameover';
type TopicKey = 'animals' | 'colors' | 'fruits';

type WordEntry = { word: string; hint: string };

const VOCABULARY_DATA: Record<TopicKey, WordEntry[]> = {
  animals: [
    { word: 'FISH', hint: 'Cá' },
    { word: 'CRAB', hint: 'Cua' },
    { word: 'SEAL', hint: 'Hải cẩu' },
    { word: 'WHALE', hint: 'Cá voi' },
    { word: 'SHARK', hint: 'Cá mập' },
    { word: 'CORAL', hint: 'San hô' },
    { word: 'SQUID', hint: 'Mực' },
  ],
  colors: [
    { word: 'RED', hint: 'Đỏ' },
    { word: 'BLUE', hint: 'Xanh dương' },
    { word: 'PINK', hint: 'Hồng' },
    { word: 'GREEN', hint: 'Xanh lá' },
    { word: 'YELLOW', hint: 'Vàng' },
  ],
  fruits: [
    { word: 'APPLE', hint: 'Táo' },
    { word: 'MANGO', hint: 'Xoài' },
    { word: 'GRAPE', hint: 'Nho' },
    { word: 'LEMON', hint: 'Chanh' },
    { word: 'BANANA', hint: 'Chuối' },
  ],
};

const TOPICS: { key: TopicKey; emoji: string; title: string; subtitle: string; gradient: string }[] =
  [
    {
      key: 'animals',
      emoji: '🐠',
      title: 'Động vật',
      subtitle: 'FISH, SHARK, WHALE…',
      gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    },
    {
      key: 'colors',
      emoji: '🎨',
      title: 'Màu sắc',
      subtitle: 'RED, BLUE, GREEN…',
      gradient: 'from-pink-400 via-fuchsia-500 to-purple-500',
    },
    {
      key: 'fruits',
      emoji: '🍎',
      title: 'Trái cây',
      subtitle: 'APPLE, MANGO, GRAPE…',
      gradient: 'from-emerald-400 via-lime-500 to-amber-500',
    },
  ];

const GAME_CONFIG = {
  // Kích thước canvas (px) — giữ tỉ lệ 16:9 cho cảm giác đại dương rộng.
  canvasWidth: 800,
  canvasHeight: 450,
  // Số mạng tối đa của người chơi. Hết mạng → Game Over.
  maxLives: 3,
  // Kích thước hộp va chạm (AABB) của tàu ngầm, dùng cho cả vẽ và check chạm.
  submarineW: 90,
  submarineH: 48,
  // Tốc độ di chuyển của tàu ngầm (px/giây) khi giữ phím / kéo cảm ứng.
  submarineSpeed: 280,
  // Khoảng cách đẩy lùi tàu ngầm (px) khi ăn nhầm chữ hoặc va chướng ngại.
  pushbackPx: 70,
  // Thời gian bất tử sau khi trúng chướng ngại (ms) — tàu sẽ nhấp nháy.
  invincibilityMs: 1500,
  // Bán kính bong bóng chữ cái (px) — dùng cho vẽ và circle collision.
  bubbleRadius: 34,
  // Tốc độ trôi từ phải→trái của bong bóng chữ (px/giây), có dao động ±15%.
  letterScrollSpeed: 95,
  // Tốc độ trôi từ phải→trái của chướng ngại vật (px/giây), nhanh hơn bong bóng.
  obstacleScrollSpeed: 110,
  // Chu kỳ spawn bong bóng chữ cái (ms) — càng nhỏ càng nhiều chữ.
  letterSpawnIntervalMs: 1200,
  // Chu kỳ spawn chướng ngại (ms) — thưa hơn để bé có không gian né.
  obstacleSpawnIntervalMs: 2400,
  // Số hạt particle bắn ra mỗi lần va chạm (đúng/sai) tạo hiệu ứng nổ.
  particlesCount: 24,
  // Điểm cộng cho mỗi chữ cái đúng được ăn vào.
  scorePerLetter: 20,
};

const OBSTACLE_TYPES = ['🦈', '🪨', '🗑️'] as const;
type ObstacleType = (typeof OBSTACLE_TYPES)[number];

type LetterBubble = {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  letter: string;
  wobble: number;
  wobbleSpeed: number;
};

type Obstacle = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  speed: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

type BgBubble = { x: number; y: number; r: number; speed: number };

const HS_KEY = 'lingoland_ocean_hs';

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randChoice = <T,>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

let bubbleIdSeq = 0;
let obstacleIdSeq = 0;
let particleIdSeq = 0;

function makeLetterBubble(targetLetter: string): LetterBubble {
  // 50% chance to spawn the correct next letter, otherwise random distractor.
  let letter: string;
  if (Math.random() < 0.5) {
    letter = targetLetter;
  } else {
    do {
      letter = ALPHABET[randInt(0, ALPHABET.length - 1)];
    } while (letter === targetLetter && Math.random() < 0.5);
  }
  const radius = GAME_CONFIG.bubbleRadius;
  return {
    id: ++bubbleIdSeq,
    x: GAME_CONFIG.canvasWidth + radius,
    y: randInt(radius + 10, GAME_CONFIG.canvasHeight - radius - 10),
    radius,
    speed: GAME_CONFIG.letterScrollSpeed * (0.9 + Math.random() * 0.3),
    letter,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 1 + Math.random() * 0.6,
  };
}

function makeObstacle(): Obstacle {
  const type = randChoice(OBSTACLE_TYPES);
  const size = type === '🦈' ? 72 : type === '🪨' ? 64 : 56;
  return {
    id: ++obstacleIdSeq,
    x: GAME_CONFIG.canvasWidth + size,
    y: randInt(size / 2 + 10, GAME_CONFIG.canvasHeight - size / 2 - 10),
    width: size,
    height: size,
    type,
    speed: GAME_CONFIG.obstacleScrollSpeed * (0.9 + Math.random() * 0.25),
  };
}

function makeBgBubbles(): BgBubble[] {
  const arr: BgBubble[] = [];
  for (let i = 0; i < 28; i++) {
    arr.push({
      x: Math.random() * GAME_CONFIG.canvasWidth,
      y: Math.random() * GAME_CONFIG.canvasHeight,
      r: 1 + Math.random() * 2.5,
      speed: 18 + Math.random() * 30,
    });
  }
  return arr;
}

function makeParticles(x: number, y: number, color: string): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < GAME_CONFIG.particlesCount; i++) {
    const angle = (Math.PI * 2 * i) / GAME_CONFIG.particlesCount;
    const speed = 80 + Math.random() * 120;
    arr.push({
      id: ++particleIdSeq,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.3,
      color,
    });
  }
  return arr;
}

type Props = { onBack: () => void };

export default function OceanVocabularyView({ onBack }: Props) {
  const { addScore } = useGame();
  const [phase, setPhase] = useState<Phase>('idle');
  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(GAME_CONFIG.maxLives);
  const [invincible, setInvincible] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [highScore, setHighScore] = useState<number>(() => {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const rafRef = useRef<number | null>(null);
  const letterSpawnTimerRef = useRef<number | null>(null);
  const obstacleSpawnTimerRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const submarineRef = useRef({
    x: 90,
    y: GAME_CONFIG.canvasHeight / 2,
    vx: 0,
    vy: 0,
    invincibleUntil: 0,
  });
  const lettersRef = useRef<LetterBubble[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bgBubblesRef = useRef<BgBubble[]>(makeBgBubbles());
  const keysRef = useRef<Set<string>>(new Set());
  const touchTargetRef = useRef<{ x: number; y: number } | null>(null);

  const wordRef = useRef<WordEntry | null>(null);
  const revealedRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(GAME_CONFIG.maxLives);
  const topicRef = useRef<TopicKey | null>(null);

  const stopLoops = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (letterSpawnTimerRef.current !== null) {
      window.clearTimeout(letterSpawnTimerRef.current);
      letterSpawnTimerRef.current = null;
    }
    if (obstacleSpawnTimerRef.current !== null) {
      window.clearTimeout(obstacleSpawnTimerRef.current);
      obstacleSpawnTimerRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  const targetLetter = useCallback((): string => {
    const w = wordRef.current?.word ?? '';
    return w[revealedRef.current] ?? '';
  }, []);

  const scheduleLetterSpawn = useCallback(() => {
    if (letterSpawnTimerRef.current !== null) {
      window.clearTimeout(letterSpawnTimerRef.current);
    }
    letterSpawnTimerRef.current = window.setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      const tl = targetLetter();
      if (tl) lettersRef.current.push(makeLetterBubble(tl));
      scheduleLetterSpawn();
    }, GAME_CONFIG.letterSpawnIntervalMs);
  }, [targetLetter]);

  const scheduleObstacleSpawn = useCallback(() => {
    if (obstacleSpawnTimerRef.current !== null) {
      window.clearTimeout(obstacleSpawnTimerRef.current);
    }
    obstacleSpawnTimerRef.current = window.setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      obstaclesRef.current.push(makeObstacle());
      scheduleObstacleSpawn();
    }, GAME_CONFIG.obstacleSpawnIntervalMs);
  }, []);

  const drawSubmarine = useCallback(
    (ctx: CanvasRenderingContext2D, blink: boolean) => {
      const s = submarineRef.current;
      const w = GAME_CONFIG.submarineW;
      const h = GAME_CONFIG.submarineH;
      const now = performance.now();
      ctx.save();
      if (blink) {
        ctx.globalAlpha = 0.35 + Math.sin(now / 60) * 0.25;
      }

      // Shadow đổ bên dưới thân để có chiều sâu.
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + h / 2 + 4, w / 2 - 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Vây đuôi (rudder hình tam giác sau).
      ctx.save();
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x - w / 2 + 4, s.y);
      ctx.lineTo(s.x - w / 2 - 14, s.y - h / 2);
      ctx.lineTo(s.x - w / 2 - 14, s.y + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Thân tàu chính: capsule với gradient vàng từ sáng (đỉnh) → cam (đáy).
      const hullGrad = ctx.createLinearGradient(s.x, s.y - h / 2, s.x, s.y + h / 2);
      hullGrad.addColorStop(0, '#fef3c7');
      hullGrad.addColorStop(0.45, '#fbbf24');
      hullGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = hullGrad;
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Highlight bóng đỉnh thân.
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.ellipse(s.x - 6, s.y - h / 2 + 6, w / 2 - 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Đường viền ngang giữa thân (làm cho ra dáng tàu kim loại).
      ctx.save();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(s.x - w / 2 + 6, s.y);
      ctx.lineTo(s.x + w / 2 - 8, s.y);
      ctx.stroke();
      ctx.restore();

      // Chóp mũi nhọn ở đầu (nose cone).
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(s.x + w / 2 - 6, s.y, 7, h / 2 - 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ba cửa kính (portholes) dọc theo thân.
      const portholeY = s.y - 2;
      const portholeXs = [s.x - 18, s.x, s.x + 18];
      for (const px of portholeXs) {
        // Vành kim loại
        ctx.beginPath();
        ctx.arc(px, portholeY, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#78350f';
        ctx.fill();
        // Mặt kính xanh
        const glassGrad = ctx.createRadialGradient(px - 2, portholeY - 2, 1, px, portholeY, 6);
        glassGrad.addColorStop(0, '#e0f2fe');
        glassGrad.addColorStop(0.6, '#7dd3fc');
        glassGrad.addColorStop(1, '#0284c7');
        ctx.beginPath();
        ctx.arc(px, portholeY, 6, 0, Math.PI * 2);
        ctx.fillStyle = glassGrad;
        ctx.fill();
        // Đốm sáng phản chiếu
        ctx.beginPath();
        ctx.arc(px - 2, portholeY - 2, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
      }

      // Tháp chỉ huy (conning tower) trên đỉnh.
      const towerW = 26;
      const towerH = 16;
      const towerX = s.x - towerW / 2;
      const towerY = s.y - h / 2 - towerH + 2;
      const towerGrad = ctx.createLinearGradient(0, towerY, 0, towerY + towerH);
      towerGrad.addColorStop(0, '#fde68a');
      towerGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = towerGrad;
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(towerX, towerY, towerW, towerH, 5);
      ctx.fill();
      ctx.stroke();

      // Kính tiềm vọng: cần đứng + thân ngang + ống kính tròn.
      const periX = s.x + 4;
      const periBaseY = towerY + 2;
      const periTopY = periBaseY - 16;
      // Cần đứng
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(periX, periBaseY);
      ctx.lineTo(periX, periTopY);
      ctx.stroke();
      // Đoạn ngang ở đỉnh
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(periX - 1, periTopY);
      ctx.lineTo(periX + 9, periTopY);
      ctx.stroke();
      // Ống kính tròn ở đầu
      ctx.beginPath();
      ctx.arc(periX + 11, periTopY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#1f2937';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(periX + 11, periTopY, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.fill();
      // Cần ăng-ten mảnh hơn ở sau tháp
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - 7, periBaseY);
      ctx.lineTo(s.x - 7, periBaseY - 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x - 7, periBaseY - 13.5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // Vây bụng nhỏ phía dưới.
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - 8, s.y + h / 2 - 1);
      ctx.lineTo(s.x + 8, s.y + h / 2 - 1);
      ctx.lineTo(s.x + 4, s.y + h / 2 + 6);
      ctx.lineTo(s.x - 4, s.y + h / 2 + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Trục chân vịt nối từ đuôi.
      const shaftX1 = s.x - w / 2 - 4;
      const shaftX2 = s.x - w / 2 - 18;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(shaftX1, s.y);
      ctx.lineTo(shaftX2, s.y);
      ctx.stroke();

      // Chân vịt: 4 cánh quạt quay quanh trục.
      const propCenterX = shaftX2 - 2;
      const propCenterY = s.y;
      const propAngle = (now / 60) % (Math.PI * 2);
      ctx.save();
      ctx.translate(propCenterX, propCenterY);
      ctx.rotate(propAngle);
      ctx.fillStyle = '#374151';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.beginPath();
        ctx.ellipse(0, -8, 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Hub trục giữa
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Bong bóng từ chân vịt (kéo lùi về sau).
      for (let i = 0; i < 4; i++) {
        const tx = propCenterX - 6 - i * 9;
        const ty =
          propCenterY - 10 + i * 5 + Math.sin(now / 200 + i) * 4;
        const tr = 4 - i * 0.6;
        ctx.beginPath();
        ctx.arc(tx, ty, Math.max(1, tr), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.55 - i * 0.1})`;
        ctx.fill();
      }

      ctx.restore();
    },
    [],
  );

  const drawLetterBubble = useCallback(
    (ctx: CanvasRenderingContext2D, b: LetterBubble, drawX: number) => {
      ctx.save();
      ctx.shadowColor = 'rgba(56,189,248,0.55)';
      ctx.shadowBlur = 16;
      const grad = ctx.createRadialGradient(
        drawX - b.radius * 0.3,
        b.y - b.radius * 0.35,
        b.radius * 0.1,
        drawX,
        b.y,
        b.radius,
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.5, 'rgba(125,211,252,0.85)');
      grad.addColorStop(1, 'rgba(14,165,233,0.85)');
      ctx.beginPath();
      ctx.arc(drawX, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();
      ctx.restore();
      // Glossy highlight
      ctx.beginPath();
      ctx.arc(drawX - b.radius * 0.35, b.y - b.radius * 0.4, b.radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
      // Letter
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0c4a6e';
      ctx.lineWidth = 3;
      ctx.font = `900 ${b.radius * 1.1}px Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(b.letter, drawX, b.y + 1);
      ctx.fillText(b.letter, drawX, b.y + 1);
    },
    [],
  );

  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, o: Obstacle) => {
    ctx.save();
    ctx.font = `${o.height}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.type, o.x, o.y);
    ctx.restore();
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, dt: number) => {
    const W = GAME_CONFIG.canvasWidth;
    const H = GAME_CONFIG.canvasHeight;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0c4a6e');
    sky.addColorStop(0.5, '#0e7490');
    sky.addColorStop(1, '#082f49');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Light shafts
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fef9c3';
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 200;
      ctx.beginPath();
      ctx.moveTo(x - 20, 0);
      ctx.lineTo(x + 20, 0);
      ctx.lineTo(x + 90, H);
      ctx.lineTo(x - 50, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Background bubbles drifting backward (right-to-left)
    for (const b of bgBubblesRef.current) {
      b.x -= b.speed * dt;
      if (b.x < -b.r) {
        b.x = W + b.r;
        b.y = Math.random() * H;
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(186,230,253,0.45)';
      ctx.fill();
    }
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, dt: number) => {
    const surviving: Particle[] = [];
    for (const p of particlesRef.current) {
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * (1 - t * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      surviving.push(p);
    }
    particlesRef.current = surviving;
  }, []);

  const checkWordComplete = useCallback(() => {
    const w = wordRef.current?.word ?? '';
    if (w && revealedRef.current >= w.length) {
      phaseRef.current = 'success';
      setPhase('success');
      stopLoops();
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.45 },
        colors: ['#38bdf8', '#fbbf24', '#f472b6', '#34d399', '#a78bfa'],
      });
      // Speak the completed word
      try {
        speak(w.toLowerCase(), 'en-US');
      } catch {
        /* noop */
      }
    }
  }, [stopLoops]);

  const tick = useCallback(
    (timestamp: number) => {
      if (phaseRef.current !== 'playing') return;
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const prev = lastTimestampRef.current;
      const dt = prev === null ? 0 : Math.min((timestamp - prev) / 1000, 0.05);
      lastTimestampRef.current = timestamp;

      const W = GAME_CONFIG.canvasWidth;
      const H = GAME_CONFIG.canvasHeight;

      drawBackground(ctx, dt);

      // Submarine movement
      const s = submarineRef.current;
      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
      if (keys.has('arrowright') || keys.has('d')) dx += 1;
      if (keys.has('arrowup') || keys.has('w')) dy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) dy += 1;
      // Touch / pointer drag target
      const target = touchTargetRef.current;
      if (target && dx === 0 && dy === 0) {
        const tdx = target.x - s.x;
        const tdy = target.y - s.y;
        const dist = Math.hypot(tdx, tdy);
        if (dist > 6) {
          dx = tdx / dist;
          dy = tdy / dist;
        }
      }
      const mag = Math.hypot(dx, dy) || 1;
      const speed = GAME_CONFIG.submarineSpeed;
      s.x += (dx / mag) * speed * dt;
      s.y += (dy / mag) * speed * dt;
      // Bounds
      const halfW = GAME_CONFIG.submarineW / 2;
      const halfH = GAME_CONFIG.submarineH / 2 + 14;
      if (s.x < halfW) s.x = halfW;
      if (s.x > W - halfW) s.x = W - halfW;
      if (s.y < halfH) s.y = halfH;
      if (s.y > H - halfH) s.y = H - halfH;

      const now = performance.now();
      const isInvincible = now < s.invincibleUntil;

      // Letter bubbles
      const surviving: LetterBubble[] = [];
      let revealedDelta = 0;
      let scoreDelta = 0;
      let pushBack = false;
      const tl = targetLetter();
      for (const b of lettersRef.current) {
        b.x -= b.speed * dt;
        b.wobble += b.wobbleSpeed * dt;
        const wobbledY = b.y + Math.sin(b.wobble) * 6;
        if (b.x + b.radius < -10) continue;
        const ellRX = halfW;
        const ellRY = GAME_CONFIG.submarineH / 2;
        const nx = (b.x - s.x) / (ellRX + b.radius * 0.7);
        const ny = (wobbledY - s.y) / (ellRY + b.radius * 0.7);
        if (nx * nx + ny * ny <= 1) {
          if (b.letter === tl) {
            revealedDelta += 1;
            scoreDelta += GAME_CONFIG.scorePerLetter;
            particlesRef.current.push(...makeParticles(b.x, wobbledY, '#fde68a'));
            playSfx('snd-correct');
          } else {
            pushBack = true;
            particlesRef.current.push(...makeParticles(b.x, wobbledY, '#fca5a5'));
            playSfx('snd-wrong');
          }
          continue;
        }
        const wobbledBubble: LetterBubble = { ...b, y: wobbledY };
        drawLetterBubble(ctx, wobbledBubble, b.x);
        surviving.push(b);
      }
      lettersRef.current = surviving;

      // Obstacles
      const survivingObs: Obstacle[] = [];
      let livesLost = 0;
      for (const o of obstaclesRef.current) {
        o.x -= o.speed * dt;
        if (o.x + o.width / 2 < -10) continue;
        // AABB collision
        if (!isInvincible) {
          const submarineLeft = s.x - halfW * 0.85;
          const submarineRight = s.x + halfW * 0.85;
          const submarineTop = s.y - GAME_CONFIG.submarineH / 2;
          const submarineBottom = s.y + GAME_CONFIG.submarineH / 2;
          const oLeft = o.x - o.width / 2 + 6;
          const oRight = o.x + o.width / 2 - 6;
          const oTop = o.y - o.height / 2 + 6;
          const oBottom = o.y + o.height / 2 - 6;
          if (
            submarineRight > oLeft &&
            submarineLeft < oRight &&
            submarineBottom > oTop &&
            submarineTop < oBottom
          ) {
            livesLost += 1;
            s.invincibleUntil = now + GAME_CONFIG.invincibilityMs;
            playSfx('snd-wrong');
            // visual push-back
            s.x = Math.max(halfW, s.x - GAME_CONFIG.pushbackPx);
            continue; // remove obstacle on hit so we don't double-count next frame
          }
        }
        drawObstacle(ctx, o);
        survivingObs.push(o);
      }
      obstaclesRef.current = survivingObs;

      // Apply state changes
      if (revealedDelta > 0) {
        revealedRef.current += revealedDelta;
        setRevealed(revealedRef.current);
        scoreRef.current += scoreDelta;
        setScore(scoreRef.current);
        addScore(scoreDelta);
        checkWordComplete();
      }
      if (pushBack) {
        s.x = Math.max(halfW, s.x - GAME_CONFIG.pushbackPx);
      }
      if (livesLost > 0) {
        const next = Math.max(0, livesRef.current - livesLost);
        livesRef.current = next;
        setLives(next);
        setInvincible(true);
        window.setTimeout(() => setInvincible(false), GAME_CONFIG.invincibilityMs);
        if (next <= 0) {
          phaseRef.current = 'gameover';
          setPhase('gameover');
          stopLoops();
          return;
        }
      }

      // Draw submarine on top
      drawSubmarine(ctx, isInvincible);

      // Particles overlay
      drawParticles(ctx, dt);

      rafRef.current = requestAnimationFrame(tick);
    },
    [
      addScore,
      checkWordComplete,
      drawBackground,
      drawLetterBubble,
      drawObstacle,
      drawParticles,
      drawSubmarine,
      stopLoops,
      targetLetter,
    ],
  );

  const beginRound = useCallback(
    (t: TopicKey) => {
      const pool = VOCABULARY_DATA[t];
      const next = pool[randInt(0, pool.length - 1)];
      wordRef.current = next;
      revealedRef.current = 0;
      setCurrentWord(next);
      setRevealed(0);
      lettersRef.current = [];
      obstaclesRef.current = [];
      particlesRef.current = [];
      submarineRef.current.x = 90;
      submarineRef.current.y = GAME_CONFIG.canvasHeight / 2;
      submarineRef.current.invincibleUntil = 0;
      phaseRef.current = 'playing';
      setPhase('playing');
      lastTimestampRef.current = null;
      // Seed first letter quickly
      const tl = next.word[0];
      if (tl) lettersRef.current.push(makeLetterBubble(tl));
      scheduleLetterSpawn();
      scheduleObstacleSpawn();
      rafRef.current = requestAnimationFrame(tick);
    },
    [scheduleLetterSpawn, scheduleObstacleSpawn, tick],
  );

  const startGame = useCallback(
    (t: TopicKey) => {
      stopLoops();
      topicRef.current = t;
      setTopic(t);
      scoreRef.current = 0;
      livesRef.current = GAME_CONFIG.maxLives;
      setScore(0);
      setLives(GAME_CONFIG.maxLives);
      beginRound(t);
    },
    [beginRound, stopLoops],
  );

  const continueNextWord = useCallback(() => {
    const t = topicRef.current;
    if (!t) return;
    beginRound(t);
  }, [beginRound]);

  const requestExit = useCallback(() => {
    stopLoops();
    setShowExitConfirm(true);
  }, [stopLoops]);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
    if (phaseRef.current === 'playing') {
      lastTimestampRef.current = null;
      scheduleLetterSpawn();
      scheduleObstacleSpawn();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [scheduleLetterSpawn, scheduleObstacleSpawn, tick]);

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem(HS_KEY, String(scoreRef.current));
    }
    onBack();
  }, [highScore, onBack]);

  // Persist high score on gameover/success transitions
  useEffect(() => {
    if (phase !== 'gameover' && phase !== 'success') return;
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem(HS_KEY, String(scoreRef.current));
    }
  }, [phase, highScore]);

  // Keyboard listeners
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)
      ) {
        e.preventDefault();
        keysRef.current.add(key);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.delete(key);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    return () => stopLoops();
  }, [stopLoops]);

  // Pointer / touch drag handler on canvas
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * GAME_CONFIG.canvasWidth;
    const y = ((e.clientY - rect.top) / rect.height) * GAME_CONFIG.canvasHeight;
    return { x, y };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = getCanvasPoint(e);
    if (p) touchTargetRef.current = p;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (touchTargetRef.current === null) return;
    const p = getCanvasPoint(e);
    if (p) touchTargetRef.current = p;
  };
  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    touchTargetRef.current = null;
  };

  // ---------- RENDER STATES ----------

  if (phase === 'idle' || topic === null) {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Trò Chơi
        </button>
        <div className="text-center py-4 max-w-md mx-auto">
          <div className="text-7xl mb-3 floating">🚤</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 bg-clip-text text-transparent leading-tight">
            Thám Hiểm Lòng Đại Dương
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Lái tàu ngầm, ăn chữ cái đúng thứ tự để hoàn thành từ vựng tiếng
            Anh. Né cá mập, đá ngầm và rác biển nhé!
          </p>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-100 rounded-3xl p-4 mb-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">⬆️⬇️⬅️➡️</span> Phím mũi tên hoặc WASD —
              màn cảm ứng có thể kéo để điều khiển.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🫧</span> Chạm bong bóng chữ đúng thứ tự
              của từ trên đầu.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🦈</span> Tránh chướng ngại — mỗi va
              chạm mất 1 trái tim.
            </div>
          </div>

          {highScore > 0 && (
            <div className="mb-3 text-xs font-black text-slate-400 uppercase tracking-widest">
              Kỉ lục:{' '}
              <span className="text-blue-500 text-base ml-1">{highScore}</span>
            </div>
          )}

          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Chọn chủ đề
          </div>
          <div className="space-y-2">
            {TOPICS.map((t) => (
              <button
                key={t.key}
                onClick={() => startGame(t.key)}
                className={`w-full p-4 bg-gradient-to-br ${t.gradient} rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-3 text-left`}
              >
                <div className="text-4xl">{t.emoji}</div>
                <div className="flex-1 text-white">
                  <div className="font-black text-lg leading-tight">{t.title}</div>
                  <div className="text-xs opacity-90 font-bold mt-0.5">
                    {t.subtitle}
                  </div>
                </div>
                <span className="text-white text-xl">▶️</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'gameover') {
    const newRecord = score > 0 && score >= highScore;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{newRecord ? '🏆' : score > 0 ? '🐠' : '💪'}</div>
        <h2 className="text-3xl font-black mb-3">
          {newRecord ? 'Kỉ lục mới!' : score > 0 ? 'Chơi hay quá!' : 'Ráng thêm nhé!'}
        </h2>
        <div className="bg-slate-50 rounded-3xl p-5 mb-6">
          <div className="text-5xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
            {score}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Điểm vừa đạt
          </div>
          <div className="mt-3 text-xs font-bold text-slate-400">
            Kỉ lục:{' '}
            <span className="text-blue-500">{Math.max(highScore, score)}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={() => topic && startGame(topic)}
            className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-cyan-200 active:scale-95 transition-all"
          >
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  const word = currentWord?.word ?? '';
  const wordDisplay = word
    .split('')
    .map((ch, i) => (i < revealed ? ch : '_'))
    .join(' ');

  if (phase === 'success') {
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-3 floating">🎉</div>
        <h2 className="text-2xl font-black mb-1 text-slate-700">Tuyệt vời!</h2>
        <p className="text-sm font-bold text-slate-500 mb-5">
          Bé đã hoàn thành từ
        </p>
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl p-6 mb-5">
          <div className="text-5xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent tracking-widest">
            {word}
          </div>
          <div className="text-sm font-bold text-slate-500 mt-2">
            ({currentWord?.hint})
          </div>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3 mb-5 flex items-center justify-around">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Điểm
            </div>
            <div className="text-2xl font-black text-blue-500">{score}</div>
          </div>
          <div className="text-xl">
            {Array.from({ length: GAME_CONFIG.maxLives }, (_, i) => (
              <span key={i} className={i < lives ? '' : 'grayscale opacity-25'}>
                ❤️
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={continueNextWord}
            className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-cyan-200 active:scale-95 transition-all"
          >
            🚀 Tiếp tục
          </button>
        </div>
      </div>
    );
  }

  // PLAYING
  return (
    <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-0.5 text-xl">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < lives ? '' : 'grayscale opacity-25'}>
              ❤️
            </span>
          ))}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Điểm <span className="text-blue-500 text-lg ml-1">{score}</span>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Kỉ lục <span className="text-cyan-500 text-lg ml-1">{highScore}</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-100 rounded-2xl py-3 px-4 mb-2 text-center">
        <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent tracking-[0.3em]">
          {wordDisplay}
        </div>
        <div className="text-xs font-bold text-slate-500 mt-1">
          {currentWord?.hint}
          {invincible && (
            <span className="ml-2 text-amber-500">⚡ bất tử</span>
          )}
        </div>
      </div>

      <div className="relative rounded-3xl overflow-hidden border-4 border-cyan-200 shadow-lg">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.canvasWidth}
          height={GAME_CONFIG.canvasHeight}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none',
          }}
        />
      </div>

      <button
        onClick={requestExit}
        className="mt-3 w-full py-3 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-bold text-sm active:scale-95 transition-all"
      >
        ← Thoát
      </button>

      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 animate-in fade-in duration-200"
          onClick={cancelExit}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-5xl mb-2">🤔</div>
              <h3 className="text-xl font-black text-slate-800">Thoát game?</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">
                Tiến trình từ này sẽ không được giữ lại nhé.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelExit}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-cyan-200 active:scale-95 transition-all"
              >
                Chơi tiếp
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
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
