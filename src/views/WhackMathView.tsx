import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, speak } from '../lib/audio';
import { playBip, playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Đập Thú Toán Học: Thợ Săn Số Chẵn / Số Lẻ"
 *
 * Trò chơi tốc độ phản xạ + nhận diện số chẵn/số lẻ cho trẻ 5-8 tuổi. Quái
 * mang một CON SỐ ngẫu nhiên trồi lên từ các hố. Bé chỉ được đập con thú có
 * số ĐÚNG với câu hỏi hiện tại (CHẴN hoặc LẺ). Đập sai mất 1 mạng, hết mạng
 * thì Game Over.
 *
 * KIẾN TRÚC tách biệt UI / Engine:
 *  - React  : các màn hình "Bắt đầu", "Đang chơi" (hiện điểm/mạng/câu hỏi),
 *             "Game Over". Tăng tốc độ game khi điểm cao bằng cách đẩy `level`
 *             vào Phaser registry.
 *  - Phaser : một Scene duy nhất chứa lưới hố 3×3 + 9 con thú. Mỗi con thú là
 *             một State Machine (IDLE → RISING → STAYING → HIDING/HIT) chạy
 *             bằng Phaser.Tweens. Sự kiện đập thú được phát qua
 *             `game.events.emit('correct'|'wrong')` cho React lắng nghe.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ / KIỂU
 * ========================================================================= */

const GAME_W = 800;
const GAME_H = 500;

// Toạ độ tâm 9 chiếc hố — lưới 3 cột × 3 hàng.
const HOLE_XS = [220, 400, 580];
const HOLE_YS = [180, 290, 400];

// Bù trừ y cho con thú trong các trạng thái (so với TÂM của hố).
const BASE_Y_DY = 30; // mole ẩn — y = hole.y + 30 (chìm dưới mặt đất)
// mole nhô lên — y = hole.y - 30. Giá trị nhỏ (gần hố) để thân thú "ngồi
// sát" miệng hang, không bị "lơ lửng" có khoảng cỏ giữa thân và mép hang.
const TOP_Y_DY = -30;
const MASK_BOTTOM_DY = -8; // ranh giới mặt đất (mask cắt ở đây)

// Mạng máu khởi đầu + tốc độ thay đổi câu hỏi.
const INITIAL_LIVES = 3;
const QUESTION_SWITCH_MS = 9000; // 9 giây đổi câu hỏi 1 lần

// Điểm / phạt mỗi lần đập đúng / sai.
const SCORE_HIT = 10;

// Bảng tốc độ theo level (level 1..5). Cấu hình toàn cục được Phaser đọc từ
// `game.registry.get('level')` — bé chơi giỏi ⇒ level tăng ⇒ quái nhanh hơn.
type SpeedTable = { spawnMs: number; stayMs: number; riseMs: number };
const SPEED_TABLE: Record<number, SpeedTable> = {
  1: { spawnMs: 1500, stayMs: 1700, riseMs: 260 },
  2: { spawnMs: 1300, stayMs: 1500, riseMs: 230 },
  3: { spawnMs: 1100, stayMs: 1300, riseMs: 210 },
  4: { spawnMs: 950, stayMs: 1100, riseMs: 190 },
  5: { spawnMs: 800, stayMs: 900, riseMs: 170 },
};
const getSpeed = (level: number): SpeedTable =>
  SPEED_TABLE[Math.min(5, Math.max(1, level))];

// Câu hỏi: "ĐẬP SỐ CHẴN" hay "ĐẬP SỐ LẺ"?
type Question = 'even' | 'odd';
type Phase = 'idle' | 'playing' | 'gameover';

const STORE_KEY = 'lingoland_whackmath_hs'; // localStorage: điểm cao

// Tên sự kiện React → Phaser. Mỗi khi React đổi yêu cầu toán học (chẵn/lẻ),
// nó emit event này; Scene lắng nghe và cập nhật biến kiểm tra `targetType`
// của mình ngay lập tức — không phụ thuộc vào registry / polling.
const EV_UPDATE_TARGET_TYPE = 'UPDATE_TARGET_TYPE';

/* ===========================================================================
 * 2. PHASER SCENE
 *
 * Đóng gói toàn bộ logic Engine vào một class duy nhất. Các sự kiện cần đẩy
 * cho React đều bắn qua `this.game.events.emit(...)`.
 * ========================================================================= */

class WhackScene extends Phaser.Scene {
  private moles: Mole[] = [];
  private spawnTimer?: Phaser.Time.TimerEvent;
  private hammer?: Phaser.GameObjects.Text;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;
  /**
   * Biến kiểm tra "đập số gì". React là chủ sở hữu — Scene chỉ nhận cập nhật
   * qua event `EV_UPDATE_TARGET_TYPE`. Giá trị mặc định 'even' chỉ làm fallback
   * trong tích tắc trước khi React gửi giá trị đầu tiên.
   */
  private targetType: Question = 'even';

  constructor() {
    super('WhackScene');
  }

  /** Listener riêng (arrow function để khoá `this`) — tiện gỡ trong shutdown(). */
  private onTargetTypeUpdate = (q: Question) => {
    this.targetType = q;
  };

  create() {
    // ── Nền cỏ ─────────────────────────────────────────────────────────
    // Tô gradient cỏ (đậm hơn về phía dưới) bằng một rect graphic đơn giản.
    const grass = this.add.graphics();
    grass.fillStyle(0x86efac, 1).fillRect(0, 0, GAME_W, GAME_H);
    grass.fillStyle(0x4ade80, 0.55).fillRect(0, GAME_H * 0.55, GAME_W, GAME_H);
    grass.fillStyle(0x22c55e, 0.45).fillRect(0, GAME_H * 0.78, GAME_W, GAME_H);

    // ── Texture ngôi sao cho hiệu ứng particle khi đập đúng ────────────
    this.generateStarTexture();
    this.particles = this.add.particles(0, 0, 'star', {
      speed: { min: 120, max: 260 },
      lifespan: 700,
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 },
      gravityY: 200,
      blendMode: 'ADD',
      emitting: false, // chỉ bắn khi gọi .explode()
    });
    this.particles.setDepth(20);

    // ── Vẽ 9 cái hố + khởi tạo 9 con thú ───────────────────────────────
    const holesGfx = this.add.graphics();
    holesGfx.setDepth(10); // hố vẽ ĐÈ lên thú để che phần thú đang chìm dưới đất
    for (const hy of HOLE_YS) {
      for (const hx of HOLE_XS) {
        // Vành hố: ellipse màu nâu đất tối hơn, mờ.
        holesGfx.fillStyle(0x422006, 0.85);
        holesGfx.fillEllipse(hx, hy + 4, 110, 28);
        // Mặt đáy hố sáng hơn (gradient giả).
        holesGfx.fillStyle(0x78350f, 0.95);
        holesGfx.fillEllipse(hx, hy, 100, 22);

        // Con thú tương ứng vị trí hố.
        const mole = new Mole(this, hx, hy);
        this.moles.push(mole);
      }
    }

    // ── Búa đập (ẩn ban đầu — chỉ hiện 1 cú vung ngắn khi đập trúng) ───
    this.hammer = this.add
      .text(0, 0, '🔨', { fontSize: '54px' })
      .setOrigin(0.5, 0.9) // gốc xoay ở chuôi búa cho cảm giác vung
      .setDepth(30)
      .setVisible(false);

    // ── Sự kiện thú bị chạm: scene phân giải đúng/sai dựa vào targetType ─
    this.events.on('mole-tap', (mole: Mole) => this.handleMoleTap(mole));

    // ── Đăng ký kênh React → Phaser cho câu hỏi toán học ───────────────
    // Lấy giá trị KHỞI TẠO từ registry (do React set lúc tạo game) — đề phòng
    // event UPDATE_TARGET_TYPE đầu tiên đã bay trước khi create() chạy xong.
    this.targetType = (this.registry.get('question') as Question) ?? 'even';
    this.game.events.on(EV_UPDATE_TARGET_TYPE, this.onTargetTypeUpdate);

    // ── Lịch sinh quái: dùng Phaser.Time.TimerEvent đệ quy theo level ──
    this.scheduleNextSpawn();
  }

  /** Sinh dynamic 1 texture hình ngôi sao 5 cánh để dùng cho particle. */
  private generateStarTexture() {
    const size = 32;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xfde047, 1);
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
    g.generateTexture('star', size, size);
    g.destroy();
  }

  /**
   * Đặt lịch cho lần sinh quái kế tiếp. Mỗi lần fire, chọn ngẫu nhiên một
   * (hoặc đôi khi hai) hố đang IDLE và đẩy quái lên. Delay đọc từ registry
   * → khi React tăng level, ngay lần fire sau đã thấy nhanh hơn.
   */
  private scheduleNextSpawn() {
    const level = (this.registry.get('level') as number) ?? 1;
    const { spawnMs } = getSpeed(level);
    // Một chút random ±20% cho cảm giác bất ngờ.
    const jitter = Phaser.Math.Between(-spawnMs * 0.2, spawnMs * 0.2);
    this.spawnTimer = this.time.addEvent({
      delay: spawnMs + jitter,
      callback: () => {
        this.popRandomMole();
        // Ở level cao, thỉnh thoảng đẩy lên 2 con cùng lúc.
        if (level >= 3 && Phaser.Math.Between(0, 100) < 25) {
          this.popRandomMole();
        }
        this.scheduleNextSpawn();
      },
    });
  }

  private popRandomMole() {
    const idle = this.moles.filter((m) => m.state === 'IDLE');
    if (idle.length === 0) return;
    const mole = Phaser.Utils.Array.GetRandom(idle) as Mole;
    mole.pop();
  }

  /** Xử lý khi bé chạm vào một con thú đang nhô lên. */
  private handleMoleTap(mole: Mole) {
    if (mole.state !== 'STAYING' && mole.state !== 'RISING') return;
    const value = mole.numberValue;
    // Đọc TỪ BIẾN NỘI BỘ — đã được React đẩy qua sự kiện UPDATE_TARGET_TYPE.
    const isEven = value % 2 === 0;
    const correct = (this.targetType === 'even') === isEven;

    // Hiệu ứng búa: vung nhẹ rồi đập xuống tại vị trí con thú.
    this.playHammer(mole.x, mole.y - 20);

    // Thu nhỏ + biến mất con thú (state → HIT).
    mole.hit(correct);

    // Hiệu ứng visual + âm thanh + thông báo cho React.
    if (correct) {
      this.particles?.explode(16, mole.x, mole.y - 20);
      playTing(); // tiếng chuông vui tai
      this.game.events.emit('correct', value);
    } else {
      this.flashWrongMark(mole.x, mole.y - 20);
      playBip(); // tiếng buzz trầm
      this.game.events.emit('wrong', value);
    }
  }

  /** Hoạt cảnh búa: hiện ra, xoay 1 vòng cung ngắn rồi tắt. */
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

  /** Hiệu ứng dấu ❌ đỏ nhấp nháy khi đập SAI. */
  private flashWrongMark(x: number, y: number) {
    const x1 = this.add
      .text(x, y, '❌', { fontSize: '52px' })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: x1,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 1.6 },
      duration: 650,
      onComplete: () => x1.destroy(),
    });
  }

  /** Phaser dọn dẹp timer khi scene shutdown (Phaser tự gọi khi destroy game). */
  shutdown() {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = undefined;
    }
    // Gỡ listener React → Phaser để tránh leak khi game destroy + tạo lại.
    this.game.events.off(EV_UPDATE_TARGET_TYPE, this.onTargetTypeUpdate);
    this.moles = [];
  }
}

/* ===========================================================================
 * 3. MOLE — STATE MACHINE CHO MỘT CON THÚ
 * ========================================================================= */

type MoleState = 'IDLE' | 'RISING' | 'STAYING' | 'HIDING' | 'HIT';

class Mole {
  scene: Phaser.Scene;
  /** Tâm hố trên canvas — gốc toạ độ neo của con thú. */
  holeX: number;
  holeY: number;
  /** Container chứa sprite + số (để dễ tween cùng nhau). */
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Text;
  numberText: Phaser.GameObjects.Text;
  /** Số ngẫu nhiên 1..30 mà con thú đang mang ở lần trồi hiện tại. */
  numberValue = 0;
  state: MoleState = 'IDLE';
  /** Timer giữ thú trồi lên — huỷ nếu bị đập trước khi hết. */
  private stayTimer?: Phaser.Time.TimerEvent;

  /** Toạ độ HIỆN TẠI của con thú trên canvas (theo container — tween cập nhật). */
  get x(): number { return this.container.x; }
  get y(): number { return this.container.y; }

  constructor(scene: Phaser.Scene, holeX: number, holeY: number) {
    this.scene = scene;
    this.holeX = holeX;
    this.holeY = holeY;

    // Emoji con thú (chuột chũi 🐹).
    this.sprite = scene.add.text(0, 0, '🐹', { fontSize: '52px' }).setOrigin(0.5);

    // Số con thú mang theo — vẽ đè LÊN ĐẦU bằng nhãn bo tròn rõ chữ.
    this.numberText = scene.add
      .text(0, -34, '', {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1e293b',
        padding: { left: 8, right: 8, top: 2, bottom: 2 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Container tại vị trí "chìm" để bắt đầu — set y = baseY (chìm dưới đất).
    this.container = scene.add.container(holeX, holeY + BASE_Y_DY, [
      this.sprite,
      this.numberText,
    ]);
    this.container.setDepth(5); // dưới mức hố (depth 10), trên mức nền
    this.container.setSize(110, 80); // hit box rộng cho trẻ nhỏ dễ chạm
    // Khi còn IDLE (chưa chui ra khỏi hang) → ẩn hẳn con thú để không bị
    // "lộ đầu" qua mép mask nếu emoji được render lệch tâm so với font box.
    this.container.setVisible(false);
    this.container.setInteractive({ useHandCursor: true });
    this.container.on('pointerdown', () => {
      // Chỉ phản hồi khi đang lộ ra; ngoài ra im lặng.
      if (this.state === 'STAYING' || this.state === 'RISING') {
        scene.events.emit('mole-tap', this);
      }
    });

    // ── Mask: chỉ cho phần thú TRÊN miệng hố hiển thị (giống thật) ──
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff);
    // Vùng có thể nhìn thấy = từ đỉnh canvas xuống tới mép trên của hố.
    maskGfx.fillRect(holeX - 80, 0, 160, holeY + MASK_BOTTOM_DY);
    const mask = maskGfx.createGeometryMask();
    this.container.setMask(mask);
  }

  /** Trồi lên: bốc số mới + tween y từ baseY về topY → STAYING → tự HIDING. */
  pop() {
    if (this.state !== 'IDLE') return;
    this.state = 'RISING';
    // Hiện lại con thú — mask vẫn cắt phần dưới mép hố trong lúc nó trồi.
    this.container.setVisible(true);
    // Random số 1..30 và hiện nhãn.
    this.numberValue = Phaser.Math.Between(1, 30);
    this.numberText.setText(String(this.numberValue)).setVisible(true);

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

  /** Tự rút xuống khi hết thời gian STAYING (không bị đập). */
  hide() {
    if (this.state !== 'STAYING') return;
    this.state = 'HIDING';
    const level = (this.scene.registry.get('level') as number) ?? 1;
    const { riseMs } = getSpeed(level);
    this.scene.tweens.add({
      targets: this.container,
      y: this.holeY + BASE_Y_DY,
      duration: riseMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.numberText.setVisible(false);
        // Đã chui hẳn vào hang → ẩn container đi.
        this.container.setVisible(false);
        this.state = 'IDLE';
      },
    });
  }

  /** Bị đập — chuyển HIT, thu nhỏ + biến mất, rồi reset về IDLE. */
  hit(_correct: boolean) {
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
        // Reset hoàn toàn về trạng thái ẩn dưới đất, sẵn sàng cho lần sau.
        this.container
          .setScale(1)
          .setAlpha(1)
          .setY(this.holeY + BASE_Y_DY)
          .setVisible(false);
        this.numberText.setVisible(false);
        this.state = 'IDLE';
      },
    });
  }
}

/* ===========================================================================
 * 4. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function WhackMathView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── Trạng thái React ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [question, setQuestion] = useState<Question>('even');
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? Math.max(0, Number(raw) || 0) : 0;
    } catch {
      return 0;
    }
  });

  // ── Refs ─────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null); // div Phaser inject canvas vào
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  // Level dẫn xuất từ điểm: mỗi 40 điểm = 1 level, tối đa level 5.
  const level = Math.min(5, Math.floor(score / 40) + 1);

  /* ─────────────────────────────────────────────────────────────────────
   * 4a. Tạo / Huỷ Phaser game theo phase
   * ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing') return;
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      // Scale FIT để Phaser tự co giãn canvas vừa khung React.
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
        parent: containerRef.current,
      },
      backgroundColor: '#86efac',
      scene: WhackScene,
    });
    gameInstanceRef.current = game;

    // Giá trị KHỞI TẠO trước khi Scene.create() chạy:
    //  - `question` đặt vào registry để Scene đọc làm fallback ngay đầu game,
    //    phòng trường hợp event UPDATE_TARGET_TYPE đầu tiên bay quá sớm.
    //  - `level` luôn dùng registry vì Scene polling lại mỗi lần sinh quái.
    game.registry.set('question', question);
    game.registry.set('level', level);

    // Lắng nghe sự kiện từ Phaser → cập nhật React state.
    // Âm thanh "Ting"/"Bíp" đã được Phaser tự phát qua WebAudio nên React
    // không cần gọi playSfx — tránh phát 2 lớp âm thanh cùng lúc.
    const onCorrect = (_value: number) => {
      setScore((s) => s + SCORE_HIT);
    };
    const onWrong = (_value: number) => {
      setLives((l) => Math.max(0, l - 1));
    };
    game.events.on('correct', onCorrect);
    game.events.on('wrong', onWrong);

    // CLEANUP: huỷ Phaser game khi rời phase chơi hoặc component unmount.
    // `destroy(true)` cũng remove canvas khỏi DOM → không lặp instance.
    return () => {
      game.events.off('correct', onCorrect);
      game.events.off('wrong', onWrong);
      game.destroy(true);
      gameInstanceRef.current = null;
    };
  }, [phase]);

  /* ─────────────────────────────────────────────────────────────────────
   * 4b. Đẩy `question` / `level` xuống Phaser qua Registry
   * ───────────────────────────────────────────────────────────────────── */

  // React → Phaser: mỗi lần đổi câu hỏi toán học, bắn event UPDATE_TARGET_TYPE
  // cho Scene cập nhật biến kiểm tra `targetType` ngay tức khắc.
  useEffect(() => {
    gameInstanceRef.current?.events.emit(EV_UPDATE_TARGET_TYPE, question);
  }, [question]);

  useEffect(() => {
    gameInstanceRef.current?.registry.set('level', level);
  }, [level]);

  /* ─────────────────────────────────────────────────────────────────────
   * 4c. Tự đổi câu hỏi định kỳ + check Game Over
   * ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = window.setInterval(() => {
      setQuestion((q) => (q === 'even' ? 'odd' : 'even'));
    }, QUESTION_SWITCH_MS);
    return () => window.clearInterval(t);
  }, [phase]);

  // Khi câu hỏi đổi → đọc to lên để bé chú ý (TTS Tiếng Việt).
  useEffect(() => {
    if (phase !== 'playing') return;
    speak(question === 'even' ? 'Đập số chẵn nhé' : 'Đập số lẻ nhé', LANG_SPEAK_DEFAULT);
  }, [question, phase]);

  // Hết mạng → Game Over (cộng điểm, lưu high score, hiệu ứng).
  useEffect(() => {
    if (phase !== 'playing' || lives > 0) return;
    setPhase('gameover');
    addScore(score);
    setHighScore((prev) => {
      const next = Math.max(prev, score);
      try {
        localStorage.setItem(STORE_KEY, String(next));
      } catch {
        // localStorage hỏng — bỏ qua
      }
      return next;
    });
    if (score > 0) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#facc15', '#22c55e', '#38bdf8', '#f472b6'],
      });
    }
    window.setTimeout(
      () => speak('Hết giờ! Cùng xem kết quả nhé', LANG_SPEAK_DEFAULT),
      200,
    );
  }, [lives, phase, score, addScore]);

  /* ─────────────────────────────────────────────────────────────────────
   * 4d. Bắt đầu / chơi lại
   * ───────────────────────────────────────────────────────────────────── */

  const startGame = useCallback(() => {
    setScore(0);
    setLives(INITIAL_LIVES);
    setQuestion(Math.random() < 0.5 ? 'even' : 'odd');
    setPhase('playing');
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
   * 4e. Màn hình bắt đầu
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
          <div className="text-7xl mb-4 floating">🔨</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent leading-tight">
            Đập Thú Toán Học
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Quái 🐹 mang theo số sẽ trồi lên từ các hố. Chỉ đập đúng số CHẴN
            hoặc số LẺ theo yêu cầu nhé!
          </p>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-5 mb-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">🔨</span> Chạm vào con thú để đập (búa sẽ vung).
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">✅</span> Đập đúng: +{SCORE_HIT} điểm + hiệu ứng sao.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">❌</span> Đập sai: mất 1 mạng (bắt đầu {INITIAL_LIVES} ❤️).
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">⚡</span> Càng nhiều điểm, quái trồi càng nhanh!
            </div>
          </div>

          {highScore > 0 && (
            <div className="mb-5 inline-block bg-amber-100 text-amber-800 font-black text-sm px-4 py-1.5 rounded-full">
              🏆 Kỷ lục: {highScore} điểm
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full p-5 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-3xl shadow-lg shadow-amber-200 active:scale-95 transition-all font-black text-xl"
          >
            ▶️ BẮT ĐẦU
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 4f. Màn hình Game Over
   * ───────────────────────────────────────────────────────────────────── */

  if (phase === 'gameover') {
    const isNewRecord = score > 0 && score >= highScore;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4 floating">{isNewRecord ? '🏆' : '🐹'}</div>
        <h2 className="text-2xl font-black mb-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent leading-tight">
          {isNewRecord ? 'Kỷ lục mới! 🎉' : 'Game Over!'}
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Bé đã đập trúng nhiều quái lắm. Thử lại để vượt qua kỷ lục nhé!
        </p>

        <div className="bg-slate-50 rounded-3xl p-5 mb-6 space-y-1">
          <div className="text-5xl font-black bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
            {score} điểm
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Kỷ lục: {highScore} điểm · Đạt Level {level}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all"
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
   * 4g. Màn hình chơi
   * ───────────────────────────────────────────────────────────────────── */

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Thanh trên: thoát + tiêu đề + điểm cao */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          🔨 Đập Thú Toán Học
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          🏆 {highScore}
        </div>
      </div>

      {/* HUD: Câu hỏi · Level · Điểm · Mạng */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div
          className={`col-span-2 rounded-2xl p-3 text-center font-black shadow-md transition-colors ${
            question === 'even'
              ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white'
              : 'bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white'
          }`}
        >
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Đập số
          </div>
          <div className="text-2xl leading-tight">
            {question === 'even' ? 'CHẴN' : 'LẺ'}
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-amber-50 border-2 border-amber-200">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">
            Điểm
          </div>
          <div className="text-2xl font-black text-amber-700">{score}</div>
          <div className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
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
        className="rounded-3xl overflow-hidden border-4 border-amber-300 shadow-lg shadow-amber-100 aspect-[8/5] w-full bg-green-300"
        style={{ touchAction: 'none' }}
      />

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Chỉ đập con thú có số đúng với câu hỏi · Đập sai sẽ mất 1 ❤️
      </p>
    </div>
  );
}
