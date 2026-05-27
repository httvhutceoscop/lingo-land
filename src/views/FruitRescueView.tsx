import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, speak } from '../lib/audio';
import { playBip, playMiss, playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Giải Cứu Trái Cây: Đập Sâu Bảo Vệ Vườn Lợn"
 *
 * Trò chơi phản xạ + phân biệt đối tượng cho trẻ 5-10 tuổi. Từ 9 chiếc hố
 * ngẫu nhiên trồi lên một trong 3 nhân vật:
 *   - Sâu 🐛  : CẦN ĐẬP (cộng điểm).
 *   - Lợn 🐷  : KHÔNG được đập (mất 1 mạng).
 *   - Táo 🍎  : KHÔNG được đập (mất 1 mạng).
 * Nếu Sâu thoát xuống hố mà bé chưa kịp đập → trừ 5 điểm.
 *
 * KIẾN TRÚC tách biệt UI / Engine:
 *  - React  : quản lý phase (start / chơi / game over), điểm, mạng, level
 *             (suy ra từ điểm), high-score. Lắng nghe event từ Phaser:
 *             `correct` (+10) · `wrong` (-1 mạng) · `missed` (-5 điểm).
 *  - Phaser : một Scene duy nhất với lưới 3×3 hố, mỗi hố một Critter chạy
 *             bằng máy trạng thái IDLE → RISING → STAYING → HIDING/HIT.
 *             Tốc độ đọc từ `game.registry.get('level')` ⇒ tự nhanh dần.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ & KIỂU
 * ========================================================================= */

const GAME_W = 800;
const GAME_H = 500;

// Toạ độ tâm 9 hố — 3 cột × 3 hàng.
const HOLE_XS = [220, 400, 580];
const HOLE_YS = [180, 290, 400];

// Bù trừ y so với tâm hố:
//  - BASE_Y_DY    : khi nhân vật còn nằm trong hố (chìm).
//  - TOP_Y_DY     : khi nhân vật nhô lên (đầu lộ ra).
//  - MASK_BOTTOM_DY: ranh giới Geometry Mask — chỉ render phần TRÊN mặt đất.
const BASE_Y_DY = 30;
const TOP_Y_DY = -30; // sát mép hố để không "lơ lửng" giữa cỏ
const MASK_BOTTOM_DY = -8;

// Quy luật điểm / phạt.
const INITIAL_LIVES = 3;
const SCORE_HIT = 10;
const SCORE_MISS_PENALTY = 5;

// Bảng tốc độ theo level (1..5). React cập nhật `level` qua registry, Scene
// đọc lại mỗi lần lập lịch sinh quái — nên độ khó tăng tức thì khi vượt mốc.
type SpeedTable = { spawnMs: number; stayMs: number; riseMs: number };
const SPEED_TABLE: Record<number, SpeedTable> = {
  1: { spawnMs: 1500, stayMs: 1600, riseMs: 250 },
  2: { spawnMs: 1300, stayMs: 1400, riseMs: 230 },
  3: { spawnMs: 1100, stayMs: 1200, riseMs: 210 },
  4: { spawnMs: 950, stayMs: 1000, riseMs: 190 },
  5: { spawnMs: 800, stayMs: 850, riseMs: 170 },
};
const getSpeed = (level: number): SpeedTable =>
  SPEED_TABLE[Math.min(5, Math.max(1, level))];

/** 3 loại đối tượng có thể trồi lên từ hố. */
type CritterKind = 'worm' | 'pig' | 'apple';
const KIND_EMOJI: Record<CritterKind, string> = {
  worm: '🐛',
  pig: '🐷',
  apple: '🍎',
};

/**
 * Chọn ngẫu nhiên loại nhân vật cho 1 lần trồi.
 *
 * Tỉ lệ SÂU (mục tiêu cần đập) khá CAO ngay từ Lv1 để phù hợp với độ tuổi
 * mục tiêu 5-6 tuổi: Lv1 = 70% sâu (≈ 30% lợn + táo cộng lại). Khi bé chơi
 * giỏi, level tự tăng và tỉ lệ "đối tượng đánh lừa" tăng dần — nhưng vẫn
 * giữ sàn 50% sâu cho cảm giác "thắng nhiều hơn thua".
 *
 *   Lv1: 70% sâu / 30% (lợn+táo)
 *   Lv2: 65% / 35%
 *   Lv3: 60% / 40%
 *   Lv4: 55% / 45%
 *   Lv5: 50% / 50%
 */
function pickKind(level: number): CritterKind {
  const wormWeight = Math.max(50, 70 - (level - 1) * 5);
  const r = Math.random() * 100;
  if (r < wormWeight) return 'worm';
  // Phần còn lại chia đôi cho lợn và táo.
  if (r < wormWeight + (100 - wormWeight) / 2) return 'pig';
  return 'apple';
}

type Phase = 'idle' | 'playing' | 'gameover';
const STORE_KEY = 'lingoland_fruitrescue_hs'; // localStorage: high score

/* ===========================================================================
 * 2. PHASER SCENE
 * ========================================================================= */

class FruitRescueScene extends Phaser.Scene {
  private critters: Critter[] = [];
  private spawnTimer?: Phaser.Time.TimerEvent;
  private hammer?: Phaser.GameObjects.Text;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('FruitRescueScene');
  }

  create() {
    // ── Nền vườn (gradient xanh + đốm hoa nhỏ) ─────────────────────────
    const grass = this.add.graphics();
    grass.fillStyle(0x86efac, 1).fillRect(0, 0, GAME_W, GAME_H);
    grass.fillStyle(0x4ade80, 0.55).fillRect(0, GAME_H * 0.55, GAME_W, GAME_H);
    grass.fillStyle(0x22c55e, 0.45).fillRect(0, GAME_H * 0.78, GAME_W, GAME_H);
    this.drawFlowerDots(grass);

    // ── Texture ngôi sao XANH cho particle ăn mừng khi đập đúng ────────
    this.generateStarTexture();
    this.particles = this.add.particles(0, 0, 'fr-star', {
      speed: { min: 110, max: 240 },
      lifespan: 700,
      scale: { start: 0.85, end: 0 },
      rotate: { min: 0, max: 360 },
      gravityY: 180,
      blendMode: 'ADD',
      emitting: false, // bắn theo lệnh .explode()
    });
    this.particles.setDepth(20);

    // ── 9 cái hố + 9 Critter ───────────────────────────────────────────
    const holesGfx = this.add.graphics();
    holesGfx.setDepth(10); // hố đè lên thân nhân vật ở phần CHÌM dưới
    for (const hy of HOLE_YS) {
      for (const hx of HOLE_XS) {
        // Vành hố tối hơn.
        holesGfx.fillStyle(0x422006, 0.85);
        holesGfx.fillEllipse(hx, hy + 4, 110, 28);
        // Mặt đáy hố sáng hơn — gradient giả tạo chiều sâu.
        holesGfx.fillStyle(0x78350f, 0.95);
        holesGfx.fillEllipse(hx, hy, 100, 22);

        this.critters.push(new Critter(this, hx, hy));
      }
    }

    // ── Búa (ẩn ban đầu) ───────────────────────────────────────────────
    this.hammer = this.add
      .text(0, 0, '🔨', { fontSize: '54px' })
      .setOrigin(0.5, 0.9) // gốc xoay ở chuôi búa → cảm giác vung tay
      .setDepth(30)
      .setVisible(false);

    // ── Sự kiện nội bộ: critter báo bị chạm → scene phân giải hit/miss ─
    this.events.on('critter-tap', (c: Critter) => this.handleTap(c));

    // ── Lịch sinh quái — đệ quy lấy tốc độ theo level từ registry ──────
    this.scheduleNextSpawn();
  }

  /** Rải vài cụm "hoa" nhỏ (chấm tròn trắng/vàng) trên thảm cỏ cho sinh động. */
  private drawFlowerDots(g: Phaser.GameObjects.Graphics) {
    // Vị trí cố định — không random để không nhấp nháy giữa các frame.
    const dots: Array<[number, number, number]> = [
      [60, 100, 4], [120, 230, 3], [40, 350, 5], [90, 460, 4],
      [340, 130, 3], [330, 460, 4],
      [490, 90, 4], [510, 460, 3],
      [720, 130, 4], [760, 250, 3], [700, 360, 4], [740, 470, 5],
    ];
    g.fillStyle(0xfef9c3, 0.9);
    for (const [x, y, r] of dots) g.fillCircle(x, y, r);
    // Tâm cam nhỏ giữa mỗi bông cho ra dáng hoa.
    g.fillStyle(0xfb923c, 0.8);
    for (const [x, y, r] of dots) g.fillCircle(x, y, Math.max(1, r - 2));
  }

  /** Sinh texture ngôi sao 5 cánh MÀU XANH LÁ cho particle. */
  private generateStarTexture() {
    const size = 32;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4ade80, 1); // xanh lá tươi
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 14;
    const innerR = 6;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      points.push(new Phaser.Math.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    g.fillPoints(points, true);
    g.generateTexture('fr-star', size, size);
    g.destroy();
  }

  /** Lập lịch lần sinh quái kế tiếp, đọc tốc độ theo level từ registry. */
  private scheduleNextSpawn() {
    const level = (this.registry.get('level') as number) ?? 1;
    const { spawnMs } = getSpeed(level);
    const jitter = Phaser.Math.Between(-spawnMs * 0.2, spawnMs * 0.2);
    this.spawnTimer = this.time.addEvent({
      delay: spawnMs + jitter,
      callback: () => {
        this.popRandomCritter();
        // Level cao: thi thoảng sinh 2 con cùng lúc cho áp lực hơn.
        if (level >= 3 && Phaser.Math.Between(0, 100) < 25) {
          this.popRandomCritter();
        }
        this.scheduleNextSpawn();
      },
    });
  }

  private popRandomCritter() {
    const idle = this.critters.filter((c) => c.state === 'IDLE');
    if (idle.length === 0) return;
    const c = Phaser.Utils.Array.GetRandom(idle) as Critter;
    const level = (this.registry.get('level') as number) ?? 1;
    c.pop(pickKind(level));
  }

  /** Xử lý khi bé chạm vào một con vật đang nhô lên. */
  private handleTap(c: Critter) {
    if (c.state !== 'STAYING' && c.state !== 'RISING') return;
    const kind = c.kind;

    // Hiệu ứng búa & thu nhỏ biến mất con vật.
    this.playHammer(c.x, c.y - 18);
    c.hit();

    // Phân giải theo LOẠI đối tượng.
    if (kind === 'worm') {
      // ĐÚNG: nổ hạt sao xanh + Ting + báo điểm cho React.
      this.particles?.explode(16, c.x, c.y - 20);
      playTing();
      this.game.events.emit('correct', kind);
    } else {
      // SAI (đập trúng lợn/táo): dấu ❌ đỏ + Bíp + báo trừ mạng cho React.
      this.flashWrongMark(c.x, c.y - 20);
      playBip();
      this.game.events.emit('wrong', kind);
    }
  }

  /** Phaser shutdown — Critter cũng gọi qua đây khi cần thông báo miss. */
  reportMissed(kind: CritterKind) {
    // CHỈ phạt khi mục tiêu CẦN ĐẬP (sâu) lọt — lợn/táo tự thoát không sao.
    if (kind !== 'worm') return;
    playMiss();
    this.game.events.emit('missed', kind);
  }

  /** Hoạt cảnh búa: hiện ra, vung yoyo rồi ẩn. */
  private playHammer(x: number, y: number) {
    if (!this.hammer) return;
    this.hammer.setPosition(x + 18, y - 10).setAngle(-40).setVisible(true);
    this.tweens.add({
      targets: this.hammer,
      angle: 25,
      duration: 110,
      yoyo: true,
      onComplete: () => this.hammer!.setVisible(false),
    });
  }

  /** Dấu ❌ đỏ to nhấp nháy tại chỗ con vật khi bé đập sai. */
  private flashWrongMark(x: number, y: number) {
    const t = this.add
      .text(x, y, '❌', { fontSize: '52px' })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: t,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 1.6 },
      duration: 650,
      onComplete: () => t.destroy(),
    });
  }

  shutdown() {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = undefined;
    }
    this.critters = [];
  }
}

/* ===========================================================================
 * 3. CRITTER — STATE MACHINE CHO MỘT NHÂN VẬT TẠI 1 HỐ
 * ========================================================================= */

type CritterState = 'IDLE' | 'RISING' | 'STAYING' | 'HIDING' | 'HIT';

class Critter {
  scene: FruitRescueScene;
  holeX: number;
  holeY: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Text;
  /** Loại đối tượng đang trồi: 'worm' | 'pig' | 'apple'. */
  kind: CritterKind = 'worm';
  state: CritterState = 'IDLE';
  private stayTimer?: Phaser.Time.TimerEvent;

  get x() { return this.container.x; }
  get y() { return this.container.y; }

  constructor(scene: FruitRescueScene, holeX: number, holeY: number) {
    this.scene = scene;
    this.holeX = holeX;
    this.holeY = holeY;

    // Emoji của nhân vật — sẽ được pop() đặt lại mỗi lần trồi.
    this.sprite = scene.add.text(0, 0, KIND_EMOJI.worm, { fontSize: '54px' }).setOrigin(0.5);

    this.container = scene.add.container(holeX, holeY + BASE_Y_DY, [this.sprite]);
    this.container.setDepth(5); // dưới HỐ (depth 10), trên NỀN cỏ
    this.container.setSize(110, 88); // hit box rộng → bé dễ chạm trúng
    this.container.setVisible(false); // IDLE: ẩn hoàn toàn
    this.container.setInteractive({ useHandCursor: true });
    this.container.on('pointerdown', () => {
      if (this.state === 'STAYING' || this.state === 'RISING') {
        scene.events.emit('critter-tap', this);
      }
    });

    // Mask: chỉ render phần TRÊN miệng hố → cảm giác chui ra từ trong hang.
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(holeX - 80, 0, 160, holeY + MASK_BOTTOM_DY);
    this.container.setMask(maskGfx.createGeometryMask());
  }

  /** Trồi lên với loại đối tượng `kind` mới. */
  pop(kind: CritterKind) {
    if (this.state !== 'IDLE') return;
    this.kind = kind;
    this.sprite.setText(KIND_EMOJI[kind]);
    this.state = 'RISING';
    this.container.setVisible(true);

    const level = (this.scene.registry.get('level') as number) ?? 1;
    const { stayMs, riseMs } = getSpeed(level);

    this.scene.tweens.add({
      targets: this.container,
      y: this.holeY + TOP_Y_DY,
      duration: riseMs,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Nếu trong lúc rising bé đã đập trúng → state có thể đã sang HIT.
        if (this.state !== 'RISING') return;
        this.state = 'STAYING';
        this.stayTimer = this.scene.time.delayedCall(stayMs, () => this.hide());
      },
    });
  }

  /** Tự rút xuống khi hết STAYING mà không bị đập. */
  hide() {
    if (this.state !== 'STAYING') return;
    const missedKind = this.kind; // ghi lại để báo cho scene sau khi tween xong
    this.state = 'HIDING';
    const level = (this.scene.registry.get('level') as number) ?? 1;
    const { riseMs } = getSpeed(level);
    this.scene.tweens.add({
      targets: this.container,
      y: this.holeY + BASE_Y_DY,
      duration: riseMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
        this.state = 'IDLE';
        // Báo cho scene là một con đã thoát (chỉ tính phạt nếu là SÂU).
        this.scene.reportMissed(missedKind);
      },
    });
  }

  /** Bị đập — chuyển HIT, thu nhỏ + biến mất, rồi reset về IDLE. */
  hit() {
    if (this.state !== 'STAYING' && this.state !== 'RISING') return;
    this.state = 'HIT';
    if (this.stayTimer) this.stayTimer.remove();
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      scale: 0.4,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        this.container
          .setScale(1)
          .setAlpha(1)
          .setY(this.holeY + BASE_Y_DY)
          .setVisible(false);
        this.state = 'IDLE';
      },
    });
  }
}

/* ===========================================================================
 * 4. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function FruitRescueView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── State giao diện ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? Math.max(0, Number(raw) || 0) : 0;
    } catch {
      return 0;
    }
  });

  // ── Refs ────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null); // div chứa canvas Phaser
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  // Level = floor(score/40)+1, tối đa 5 — Phaser đọc qua registry mỗi lần spawn.
  const level = Math.min(5, Math.floor(score / 40) + 1);

  /* ─────────────────────────────────────────────────────────────────────
   * 4a. Tạo / huỷ Phaser game theo phase
   * ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing') return;
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
        parent: containerRef.current,
      },
      backgroundColor: '#86efac',
      scene: FruitRescueScene,
    });
    gameInstanceRef.current = game;
    game.registry.set('level', level);

    // ── Lắng nghe event từ Phaser → cập nhật React state ──────────────
    const onCorrect = () => {
      setScore((s) => s + SCORE_HIT);
    };
    const onWrong = () => {
      setLives((l) => Math.max(0, l - 1));
    };
    const onMissed = () => {
      // Bỏ sót sâu — trừ điểm, kẹp sàn 0 để không âm.
      setScore((s) => Math.max(0, s - SCORE_MISS_PENALTY));
    };
    game.events.on('correct', onCorrect);
    game.events.on('wrong', onWrong);
    game.events.on('missed', onMissed);

    // ── CLEANUP — huỷ game khi rời phase hoặc unmount ─────────────────
    return () => {
      game.events.off('correct', onCorrect);
      game.events.off('wrong', onWrong);
      game.events.off('missed', onMissed);
      game.destroy(true);
      gameInstanceRef.current = null;
    };
  // `level` cố tình KHÔNG ở deps — chỉ là giá trị seed lúc tạo game.
  // Các thay đổi sau được đẩy qua registry ở effect bên dưới.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── React → Phaser: đẩy `level` mới xuống qua registry ──────────────
  useEffect(() => {
    gameInstanceRef.current?.registry.set('level', level);
  }, [level]);

  /* ─────────────────────────────────────────────────────────────────────
   * 4b. Game over khi hết mạng
   * ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing' || lives > 0) return;
    setPhase('gameover');
    addScore(score);
    setHighScore((prev) => {
      const next = Math.max(prev, score);
      try {
        localStorage.setItem(STORE_KEY, String(next));
      } catch {
        // localStorage hỏng → bỏ qua
      }
      return next;
    });
    if (score > 0) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#4ade80', '#22c55e', '#facc15', '#fb923c'],
      });
    }
    window.setTimeout(
      () => speak('Hết giờ! Cùng xem kết quả nhé', LANG_SPEAK_DEFAULT),
      200,
    );
  }, [lives, phase, score, addScore]);

  /* ─────────────────────────────────────────────────────────────────────
   * 4c. Bắt đầu / chơi lại
   * ───────────────────────────────────────────────────────────────────── */

  const startGame = useCallback(() => {
    setScore(0);
    setLives(INITIAL_LIVES);
    setPhase('playing');
    // Lời hướng dẫn giọng nói khi vào ván mới.
    window.setTimeout(
      () => speak('Đập sâu, bảo vệ lợn và táo nhé', LANG_SPEAK_DEFAULT),
      400,
    );
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
   * 4d. Màn hình bắt đầu
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
          <div className="text-7xl mb-4 floating">🐛</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-emerald-500 via-lime-500 to-yellow-500 bg-clip-text text-transparent leading-tight">
            Giải Cứu Trái Cây
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Đập sâu phá hoại 🐛, nhưng tuyệt đối ĐỪNG đập lợn con 🐷 và táo
            chín 🍎 — đó là bạn của bé!
          </p>

          <div className="bg-gradient-to-br from-emerald-50 to-lime-50 border-2 border-emerald-200 rounded-3xl p-5 mb-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🐛</span> Đập SÂU: +{SCORE_HIT} điểm.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🐷🍎</span> Đập NHẦM: mất 1 mạng (có{' '}
              {INITIAL_LIVES} ❤️).
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">💨</span> Bỏ sót sâu: -{SCORE_MISS_PENALTY} điểm.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">⚡</span> Càng nhiều điểm, quái trồi càng nhanh!
            </div>
          </div>

          {highScore > 0 && (
            <div className="mb-5 inline-block bg-emerald-100 text-emerald-800 font-black text-sm px-4 py-1.5 rounded-full">
              🏆 Kỷ lục: {highScore} điểm
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full p-5 bg-gradient-to-br from-emerald-500 via-lime-500 to-yellow-500 text-white rounded-3xl shadow-lg shadow-emerald-200 active:scale-95 transition-all font-black text-xl"
          >
            ▶️ BẮT ĐẦU
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 4e. Màn hình Game Over / Hoàn thành
   * ───────────────────────────────────────────────────────────────────── */

  if (phase === 'gameover') {
    const isNewRecord = score > 0 && score >= highScore;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4 floating">{isNewRecord ? '🏆' : '🐛'}</div>
        <h2 className="text-2xl font-black mb-2 bg-gradient-to-r from-emerald-500 via-lime-500 to-yellow-500 bg-clip-text text-transparent leading-tight">
          {isNewRecord ? 'Kỷ lục mới! 🎉' : 'Game Over!'}
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Cảm ơn bé đã bảo vệ vườn lợn. Thử lại để vượt kỷ lục nhé!
        </p>

        <div className="bg-slate-50 rounded-3xl p-5 mb-6 space-y-1">
          <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-yellow-500 bg-clip-text text-transparent">
            {score} điểm
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Kỷ lục: {highScore} điểm · Đạt Level {level}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-lime-500 to-yellow-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
          <button
            onClick={onBack}
            className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 4f. Màn hình chơi
   * ───────────────────────────────────────────────────────────────────── */

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
          🐛 Giải Cứu Trái Cây
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          🏆 {highScore}
        </div>
      </div>

      {/* HUD: nhắc nhở luật chơi · Điểm/Level · Mạng tim */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="col-span-2 rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500 to-lime-600 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Đập
          </div>
          <div className="text-xl leading-tight">
            <span className="text-2xl mr-1">🐛</span> SÂU
            <span className="opacity-70 text-sm"> · bảo vệ 🐷 🍎</span>
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-emerald-50 border-2 border-emerald-200">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
            Điểm
          </div>
          <div className="text-2xl font-black text-emerald-700">{score}</div>
          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
            Lv {level}
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-rose-50 border-2 border-rose-200">
          <div className="text-[10px] font-black uppercase tracking-widest text-rose-600">
            Mạng
          </div>
          <div className="text-2xl leading-none">
            {'❤️'.repeat(lives)}
            <span className="opacity-25">
              {'🤍'.repeat(Math.max(0, INITIAL_LIVES - lives))}
            </span>
          </div>
        </div>
      </div>

      {/* Khung Phaser canvas */}
      <div
        ref={containerRef}
        className="rounded-3xl overflow-hidden border-4 border-emerald-300 shadow-lg shadow-emerald-100 aspect-[8/5] w-full bg-green-300"
        style={{ touchAction: 'none' }}
      />

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Chỉ đập SÂU 🐛 · Đừng đập lợn 🐷 hay táo 🍎 · Để sót sâu cũng bị trừ điểm!
      </p>
    </div>
  );
}
