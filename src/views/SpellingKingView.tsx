import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, speak } from '../lib/audio';
import { playBip, playTing } from '../lib/beep';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Vua Chính Tả: Đập Từ Sai - Tha Từ Đúng"
 *
 * Trò chơi luyện CHÍNH TẢ + phản xạ cho trẻ 7-10 tuổi. Từ 6 chiếc hố, các
 * chú thú trồi lên mang theo MỘT TỪ in to. Bé phải đập chỉ những con thú
 * mang từ VIẾT SAI; tha cho con thú mang từ VIẾT ĐÚNG.
 *
 *   - Đập trúng từ SAI  ⇒ +10 điểm (sửa lỗi chính tả).
 *   - Đập nhầm từ ĐÚNG  ⇒ mất 1 mạng (không nên đập từ đúng).
 *   - Bỏ sót từ SAI     ⇒ không phạt, nhưng cũng không được điểm.
 *
 * KIẾN TRÚC tách biệt UI / Engine:
 *  - React  : màn hình "Chọn chủ đề" (L/N, CH/TR, English), HUD lúc chơi
 *             (điểm/mạng/level/yêu cầu), Game Over. Đẩy `topic` & `level`
 *             xuống Phaser qua Registry.
 *  - Phaser : một Scene duy nhất, lưới 3×2 chứa các Mole. Mỗi lần pop, Mole
 *             chọn ngẫu nhiên 1 cặp từ trong ngân hàng + 50/50 hiển thị
 *             biến thể ĐÚNG hay SAI. Sự kiện 'correct' / 'wrong' bắn ra
 *             cho React.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. NGÂN HÀNG DỮ LIỆU TỪ VỰNG (SPELLING_DATA)
 *
 * Mỗi chủ đề gồm danh sách cặp { correct, incorrect } — `correct` là cách viết
 * đúng, `incorrect` là biến thể viết sai mà bé cần đập để "sửa lỗi".
 * ========================================================================= */

type SpellingPair = { correct: string; incorrect: string };
type TopicKey = 'ln' | 'chtr' | 'en';
type TopicDef = {
  key: TopicKey;
  label: string;
  emoji: string;
  description: string;
  /** Gradient Tailwind cho card chọn chủ đề. */
  gradient: string;
  pairs: SpellingPair[];
};

const SPELLING_DATA: Record<TopicKey, TopicDef> = {
  ln: {
    key: 'ln',
    label: 'Tiếng Việt — L / N',
    emoji: '🇻🇳',
    description: 'Phân biệt l/n trong tiếng Việt — chú ý phụ âm đầu nhé!',
    gradient: 'from-rose-500 via-orange-500 to-amber-500',
    pairs: [
      { correct: 'Lấp lánh', incorrect: 'Nấp nánh' },
      { correct: 'No nê', incorrect: 'Lo lê' },
      { correct: 'Lung linh', incorrect: 'Nung ninh' },
      { correct: 'Năn nỉ', incorrect: 'Lăn nỉ' },
      { correct: 'Long lanh', incorrect: 'Nong nanh' },
      { correct: 'Nắng nóng', incorrect: 'Lắng lóng' },
      { correct: 'Lúa nếp', incorrect: 'Núa lếp' },
      { correct: 'Nũng nịu', incorrect: 'Lũng lịu' },
      { correct: 'Lượn lờ', incorrect: 'Nượn nờ' },
      { correct: 'Nôn nóng', incorrect: 'Lôn lóng' },
      { correct: 'Lành lặn', incorrect: 'Nành nặn' },
      { correct: 'Nóng nực', incorrect: 'Lóng lực' },
    ],
  },
  chtr: {
    key: 'chtr',
    label: 'Tiếng Việt — CH / TR',
    emoji: '📚',
    description: 'Phân biệt ch/tr — hai âm thường gây nhầm lẫn nhất!',
    gradient: 'from-sky-500 via-blue-500 to-indigo-500',
    pairs: [
      { correct: 'Tròn trịa', incorrect: 'Chòn chịa' },
      { correct: 'Chong chóng', incorrect: 'Trong chóng' },
      { correct: 'Chăm chỉ', incorrect: 'Trăm trỉ' },
      { correct: 'Trẻ trung', incorrect: 'Chẻ chung' },
      { correct: 'Chia sẻ', incorrect: 'Tria sẻ' },
      { correct: 'Trí tuệ', incorrect: 'Chí tuệ' },
      { correct: 'Chậm chạp', incorrect: 'Trậm trạp' },
      { correct: 'Trắng tinh', incorrect: 'Chắng tinh' },
      { correct: 'Chơi đùa', incorrect: 'Trơi đùa' },
      { correct: 'Trống vắng', incorrect: 'Chống vắng' },
      { correct: 'Chân thành', incorrect: 'Trân thành' },
      { correct: 'Trung thực', incorrect: 'Chung thực' },
    ],
  },
  en: {
    key: 'en',
    label: 'Tiếng Anh — Spelling',
    emoji: '🇬🇧',
    description: 'Chính tả tiếng Anh — đập từ viết sai để sửa lỗi.',
    gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
    pairs: [
      { correct: 'Apple', incorrect: 'Aple' },
      { correct: 'Banana', incorrect: 'Banaana' },
      { correct: 'Friend', incorrect: 'Freind' },
      { correct: 'Beautiful', incorrect: 'Beautifull' },
      { correct: 'Elephant', incorrect: 'Elefant' },
      { correct: 'Library', incorrect: 'Libary' },
      { correct: 'Receive', incorrect: 'Recieve' },
      { correct: 'Tomorrow', incorrect: 'Tommorow' },
      { correct: 'Because', incorrect: 'Becuase' },
      { correct: 'Necessary', incorrect: 'Neccessary' },
      { correct: 'Happy', incorrect: 'Hapy' },
      { correct: 'Yellow', incorrect: 'Yelow' },
    ],
  },
};

/* ===========================================================================
 * 2. HẰNG SỐ & KIỂU
 * ========================================================================= */

const GAME_W = 800;
const GAME_H = 500;

// Lưới 3 cột × 2 hàng (6 hố) — chừa nhiều chỗ ngang để chứa từ dài.
const HOLE_XS = [180, 400, 620];
const HOLE_YS = [200, 380];

// Bù trừ y so với tâm hố — tương tự các game whack-a-mole khác.
const BASE_Y_DY = 30;
const TOP_Y_DY = -32; // hơi nhô lên cao hơn để có chỗ vẽ chữ
const MASK_BOTTOM_DY = -8;

// Quy luật điểm / phạt.
const INITIAL_LIVES = 3;
const SCORE_HIT = 10;

// Tốc độ theo level (1..5). React đẩy `level` qua registry, Scene poll mỗi
// lần lập lịch sinh quái → khó tăng tức thì khi vượt mốc điểm.
//
// LƯU Ý chuyên biệt cho game chính tả: khác hai game whack-a-mole còn lại
// (toán học chỉ liếc SỐ, sâu/táo chỉ nhìn HÌNH), ở đây bé phải ĐỌC + xử lý
// NGÔN NGỮ → tốn thời gian hơn. Vì vậy ở các level đầu (1-2), thời gian
// STAY được nới rộng 2.0-2.5 giây để bé kịp đọc cả các từ dài như
// "Beautiful" / "Necessary" mà không phải bấm đại.
type SpeedTable = { spawnMs: number; stayMs: number; riseMs: number };
const SPEED_TABLE: Record<number, SpeedTable> = {
  1: { spawnMs: 1800, stayMs: 2500, riseMs: 280 }, // 2.5s — thoải mái cho người mới
  2: { spawnMs: 1600, stayMs: 2150, riseMs: 250 }, // 2.15s — vẫn đủ rộng để đọc
  3: { spawnMs: 1350, stayMs: 1850, riseMs: 230 },
  4: { spawnMs: 1150, stayMs: 1600, riseMs: 210 },
  5: { spawnMs: 1000, stayMs: 1400, riseMs: 200 }, // 1.4s — vẫn hơn các game khác
};
const getSpeed = (level: number): SpeedTable =>
  SPEED_TABLE[Math.min(5, Math.max(1, level))];

/**
 * Lọc danh sách cặp từ theo level — level càng cao thì cho phép từ DÀI hơn,
 * vốn nhiều ký tự hơn ⇒ khó đọc nhanh dưới áp lực thời gian.
 */
function pairsForLevel(topic: TopicDef, level: number): SpellingPair[] {
  const maxLen = level <= 2 ? 8 : level <= 4 ? 10 : 99;
  const filtered = topic.pairs.filter(
    (p) => Math.max(p.correct.length, p.incorrect.length) <= maxLen,
  );
  // Phòng trường hợp chủ đề có tất cả từ dài hơn ngưỡng — fallback toàn bộ.
  return filtered.length > 0 ? filtered : topic.pairs;
}

type Phase = 'idle' | 'playing' | 'gameover';
const STORE_KEY = 'lingoland_spelling_hs'; // localStorage: high score

/* ===========================================================================
 * 3. PHASER SCENE
 * ========================================================================= */

class SpellingScene extends Phaser.Scene {
  private moles: SpellingMole[] = [];
  private spawnTimer?: Phaser.Time.TimerEvent;
  private hammer?: Phaser.GameObjects.Text;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('SpellingScene');
  }

  create() {
    // ── Nền lớp học (xanh dương nhẹ + ô caro mờ) ──────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0xe0e7ff, 1).fillRect(0, 0, GAME_W, GAME_H);
    bg.fillStyle(0xc7d2fe, 0.45).fillRect(0, GAME_H * 0.6, GAME_W, GAME_H);

    // ── Texture ngôi sao VÀNG cho hiệu ứng "chữ nổ" khi đập đúng ──────
    this.generateStarTexture();
    this.particles = this.add.particles(0, 0, 'sk-star', {
      speed: { min: 130, max: 270 },
      lifespan: 750,
      scale: { start: 0.95, end: 0 },
      rotate: { min: 0, max: 360 },
      gravityY: 180,
      blendMode: 'ADD',
      emitting: false,
    });
    this.particles.setDepth(20);

    // ── 6 cái hố + 6 con thú ──────────────────────────────────────────
    const holesGfx = this.add.graphics();
    holesGfx.setDepth(10);
    for (const hy of HOLE_YS) {
      for (const hx of HOLE_XS) {
        // Vành hố tối hơn.
        holesGfx.fillStyle(0x422006, 0.85);
        holesGfx.fillEllipse(hx, hy + 4, 140, 32);
        // Mặt đáy hố sáng hơn — tạo cảm giác có chiều sâu.
        holesGfx.fillStyle(0x78350f, 0.95);
        holesGfx.fillEllipse(hx, hy, 130, 26);

        this.moles.push(new SpellingMole(this, hx, hy));
      }
    }

    // ── Búa đập (ẩn ban đầu) ──────────────────────────────────────────
    this.hammer = this.add
      .text(0, 0, '🔨', { fontSize: '54px' })
      .setOrigin(0.5, 0.9)
      .setDepth(30)
      .setVisible(false);

    // ── Sự kiện nội bộ — mole báo bị chạm ─────────────────────────────
    this.events.on('mole-tap', (m: SpellingMole) => this.handleTap(m));

    // ── Lịch sinh quái — đệ quy lấy tốc độ theo level từ registry ────
    this.scheduleNextSpawn();
  }

  /** Sinh texture ngôi sao 5 cánh MÀU VÀNG cho particle. */
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
    g.generateTexture('sk-star', size, size);
    g.destroy();
  }

  private scheduleNextSpawn() {
    const level = (this.registry.get('level') as number) ?? 1;
    const { spawnMs } = getSpeed(level);
    const jitter = Phaser.Math.Between(-spawnMs * 0.2, spawnMs * 0.2);
    this.spawnTimer = this.time.addEvent({
      delay: spawnMs + jitter,
      callback: () => {
        this.popRandomMole();
        // Level cao: thỉnh thoảng sinh 2 con cùng lúc — áp lực phản xạ tăng.
        if (level >= 3 && Phaser.Math.Between(0, 100) < 22) {
          this.popRandomMole();
        }
        this.scheduleNextSpawn();
      },
    });
  }

  private popRandomMole() {
    const idle = this.moles.filter((m) => m.state === 'IDLE');
    if (idle.length === 0) return;
    const m = Phaser.Utils.Array.GetRandom(idle) as SpellingMole;

    // Lấy chủ đề + cặp từ phù hợp level từ registry, rồi rút thăm 50/50
    // xem con thú này mang từ ĐÚNG hay từ SAI.
    const topicKey = (this.registry.get('topic') as TopicKey) ?? 'ln';
    const level = (this.registry.get('level') as number) ?? 1;
    const pool = pairsForLevel(SPELLING_DATA[topicKey], level);
    const pair = Phaser.Utils.Array.GetRandom(pool) as SpellingPair;
    const showIncorrect = Math.random() < 0.5;
    const word = showIncorrect ? pair.incorrect : pair.correct;

    // Truyền cả `correct` (chữ đúng tương ứng) cho mole — dùng để dạy bé
    // ngay tại chỗ khi bé đập trúng biến thể viết sai.
    m.pop(word, showIncorrect, pair.correct);
  }

  /** Xử lý khi bé chạm vào một con thú đang nhô lên. */
  private handleTap(m: SpellingMole) {
    if (m.state !== 'STAYING' && m.state !== 'RISING') return;

    this.playHammer(m.x, m.y - 18);
    const wasIncorrect = m.isIncorrect;

    if (wasIncorrect) {
      // ĐÚNG yêu cầu: đập trúng từ SAI → nổ chữ + ngôi sao + Ting + hiện
      // chữ ĐÚNG màu xanh lá 0.5s để bé HỌC NGAY từ lỗi sai vừa "sửa".
      this.particles?.explode(18, m.x, m.y - 24);
      playTing();
      m.hitWithReveal();
      this.game.events.emit('correct');
    } else {
      // SAI: đập nhầm từ ĐÚNG → ❌ + Bíp + biến mất nhanh + báo trừ mạng.
      this.flashWrongMark(m.x, m.y - 24);
      playBip();
      m.hit();
      this.game.events.emit('wrong');
    }
  }

  /** Hoạt cảnh búa: vung yoyo nhanh rồi ẩn. */
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

  /** Dấu ❌ đỏ to nhấp nháy tại chỗ con thú khi bé đập sai. */
  private flashWrongMark(x: number, y: number) {
    const t = this.add
      .text(x, y, '❌', { fontSize: '54px' })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: t,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 1.7 },
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  shutdown() {
    if (this.spawnTimer) {
      this.spawnTimer.remove();
      this.spawnTimer = undefined;
    }
    this.moles = [];
  }
}

/* ===========================================================================
 * 4. MOLE — TỪNG CON THÚ MANG MỘT TỪ
 * ========================================================================= */

type MoleState = 'IDLE' | 'RISING' | 'STAYING' | 'HIDING' | 'HIT';

class SpellingMole {
  scene: SpellingScene;
  holeX: number;
  holeY: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Text;
  /** Nhãn từ vựng vẽ TO bên trên đầu con thú. */
  wordLabel: Phaser.GameObjects.Text;
  /** Từ hiện tại con thú mang theo + nó có phải là biến thể VIẾT SAI hay không. */
  word = '';
  isIncorrect = false;
  /**
   * Chữ ĐÚNG CHÍNH TẢ tương ứng (luôn được nhồi từ ngoài vào). Dùng để hiển
   * thị "đáp án" màu xanh lá khi bé đập trúng biến thể viết sai → bộ não bé
   * gắn ngay "sai → đúng" để nhớ.
   */
  correctWord = '';
  state: MoleState = 'IDLE';
  private stayTimer?: Phaser.Time.TimerEvent;

  get x() { return this.container.x; }
  get y() { return this.container.y; }

  constructor(scene: SpellingScene, holeX: number, holeY: number) {
    this.scene = scene;
    this.holeX = holeX;
    this.holeY = holeY;

    // Emoji con thú (gấu nâu để khác các game whack-a-mole khác trong app).
    this.sprite = scene.add.text(0, 0, '🐻', { fontSize: '54px' }).setOrigin(0.5);

    // Từ vựng — chữ to, bo viền (stroke) đậm để đọc nhanh dưới áp lực.
    this.wordLabel = scene.add
      .text(0, -46, '', {
        fontSize: '22px',
        fontStyle: 'bold',
        fontFamily: 'Nunito, sans-serif',
        color: '#fef9c3',
        stroke: '#0f172a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.container = scene.add.container(holeX, holeY + BASE_Y_DY, [
      this.sprite,
      this.wordLabel,
    ]);
    this.container.setDepth(5); // dưới HỐ (depth 10), trên nền
    this.container.setSize(140, 110); // hit box rộng — bé dễ chạm
    this.container.setVisible(false); // IDLE: ẩn tuyệt đối
    this.container.setInteractive({ useHandCursor: true });
    this.container.on('pointerdown', () => {
      if (this.state === 'STAYING' || this.state === 'RISING') {
        scene.events.emit('mole-tap', this);
      }
    });

    // Mask: chỉ render phần TRÊN miệng hố. Chữ vẽ ở y=-46 trong container nên
    // luôn ở vị trí ABOVE mask khi mole nhô lên — đảm bảo đọc rõ.
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(holeX - 90, 0, 180, holeY + MASK_BOTTOM_DY);
    this.container.setMask(maskGfx.createGeometryMask());
  }

  /**
   * Trồi lên kèm 1 từ.
   *  - `word`        : từ hiển thị trên đầu con thú (đúng hay sai tuỳ rút thăm).
   *  - `isIncorrect` : true nếu `word` là biến thể VIẾT SAI.
   *  - `correctWord` : chữ ĐÚNG CHÍNH TẢ của cặp này — dùng cho reveal khi bị đập.
   */
  pop(word: string, isIncorrect: boolean, correctWord: string) {
    if (this.state !== 'IDLE') return;
    this.word = word;
    this.isIncorrect = isIncorrect;
    this.correctWord = correctWord;
    this.wordLabel.setText(word).setVisible(true);
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
        if (this.state !== 'RISING') return;
        this.state = 'STAYING';
        this.stayTimer = this.scene.time.delayedCall(stayMs, () => this.hide());
      },
    });
  }

  /** Tự rút xuống khi hết STAYING mà bé không kịp đập. */
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
        this.wordLabel.setVisible(false);
        this.container.setVisible(false);
        this.state = 'IDLE';
        // Bỏ sót: theo luật chơi của game này KHÔNG có hình phạt — bé sẽ thử
        // lại ở lần pop kế tiếp. Không emit gì cho React.
      },
    });
  }

  /**
   * Phiên bản "có dạy" của hit() — dùng khi bé đập trúng từ VIẾT SAI:
   *
   *   1. Gạch ngang đường đỏ qua chữ sai.
   *   2. Bật chữ ĐÚNG (xanh lá) ngay phía trên với scale nhảy lên.
   *   3. Giữ nguyên cảnh đó 500ms để bé ghi nhớ "sai → đúng".
   *   4. Hết 500ms thì mới chạy hit-animation (thu nhỏ + biến mất) như bình thường.
   */
  hitWithReveal() {
    if (this.state !== 'STAYING' && this.state !== 'RISING') return;
    this.state = 'HIT';
    if (this.stayTimer) this.stayTimer.remove();
    this.scene.tweens.killTweensOf(this.container);

    // ── 1. Vẽ đường gạch ngang đỏ trên chữ sai ─────────────────────────
    // wordLabel có origin (0.5, 0.5) → tâm tại (container.x, container.y - 46).
    const labelCx = this.container.x;
    const labelCy = this.container.y - 46;
    const halfW = Math.max(20, this.wordLabel.width / 2) + 6;
    const strike = this.scene.add.graphics();
    strike.setDepth(this.container.depth + 5);
    strike.lineStyle(4, 0xef4444, 1);
    strike.beginPath();
    strike.moveTo(labelCx - halfW, labelCy);
    strike.lineTo(labelCx + halfW, labelCy);
    strike.strokePath();

    // ── 2. Hiện chữ ĐÚNG màu xanh lá ngay TRÊN chữ sai, scale nhảy lên ─
    const correctLabel = this.scene.add
      .text(this.container.x, this.container.y - 78, this.correctWord, {
        fontSize: '24px',
        fontStyle: 'bold',
        fontFamily: 'Nunito, sans-serif',
        color: '#4ade80', // green-400
        stroke: '#052e16', // viền xanh đậm để nổi trên mọi nền
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(this.container.depth + 6)
      .setScale(0.3);
    this.scene.tweens.add({
      targets: correctLabel,
      scale: 1,
      y: this.container.y - 86,
      duration: 220,
      ease: 'Back.easeOut',
    });

    // ── 3. Sau 500ms: gỡ effect + chạy hit-animation thu nhỏ biến mất ──
    this.scene.time.delayedCall(500, () => {
      strike.destroy();
      correctLabel.destroy();
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
          this.wordLabel.setVisible(false);
          this.state = 'IDLE';
        },
      });
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
        this.wordLabel.setVisible(false);
        this.state = 'IDLE';
      },
    });
  }
}

/* ===========================================================================
 * 5. REACT COMPONENT
 * ========================================================================= */

type Props = { onBack: () => void };

export default function SpellingKingView({ onBack }: Props) {
  const { addScore } = useGame();

  // ── React state ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('idle');
  const [topicKey, setTopicKey] = useState<TopicKey>('ln');
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  const level = Math.min(5, Math.floor(score / 40) + 1);

  /* ─────────────────────────────────────────────────────────────────────
   * 5a. Tạo / huỷ Phaser game theo phase
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
      backgroundColor: '#e0e7ff',
      scene: SpellingScene,
    });
    gameInstanceRef.current = game;

    // Cấu hình ban đầu — Scene đọc lúc create() và mỗi lần pop quái.
    game.registry.set('topic', topicKey);
    game.registry.set('level', level);

    // ── Lắng nghe event từ Phaser → cập nhật React state ─────────────
    const onCorrect = () => setScore((s) => s + SCORE_HIT);
    const onWrong = () => setLives((l) => Math.max(0, l - 1));
    game.events.on('correct', onCorrect);
    game.events.on('wrong', onWrong);

    return () => {
      game.events.off('correct', onCorrect);
      game.events.off('wrong', onWrong);
      // CLEANUP: huỷ game để không lặp Canvas khi unmount / chuyển phase.
      game.destroy(true);
      gameInstanceRef.current = null;
    };
  // topicKey & level cố tình KHÔNG ở deps — chỉ là giá trị seed lúc tạo
  // game; các thay đổi sau được push qua registry ở effect bên dưới.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── React → Phaser: đẩy `level` mới xuống registry ────────────────
  useEffect(() => {
    gameInstanceRef.current?.registry.set('level', level);
  }, [level]);

  /* ─────────────────────────────────────────────────────────────────────
   * 5b. Game over khi hết mạng
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
        particleCount: 130,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#facc15', '#a78bfa', '#38bdf8', '#f472b6'],
      });
    }
    window.setTimeout(
      () => speak('Hết giờ! Cùng xem kết quả nhé', LANG_SPEAK_DEFAULT),
      200,
    );
  }, [lives, phase, score, addScore]);

  /* ─────────────────────────────────────────────────────────────────────
   * 5c. Bắt đầu / chơi lại
   * ───────────────────────────────────────────────────────────────────── */

  const startGame = useCallback((key: TopicKey) => {
    setTopicKey(key);
    setScore(0);
    setLives(INITIAL_LIVES);
    setPhase('playing');
    window.setTimeout(
      () => speak('Đập từ viết sai chính tả để sửa lỗi nhé', LANG_SPEAK_DEFAULT),
      400,
    );
  }, []);

  const replaySame = useCallback(() => startGame(topicKey), [startGame, topicKey]);

  /* ─────────────────────────────────────────────────────────────────────
   * 5d. Màn hình chọn chủ đề (idle)
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
          <div className="text-7xl mb-4 floating">👑</div>
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent leading-tight">
            Vua Chính Tả
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-5">
            Đập <b>TỪ VIẾT SAI</b> để sửa lỗi, tha cho từ viết đúng nhé!
          </p>

          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-200 rounded-3xl p-4 mb-5 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">✅</span> Đập từ SAI: +{SCORE_HIT} điểm.
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">❌</span> Đập từ ĐÚNG: mất 1 ❤️ (có {INITIAL_LIVES}).
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-xl">⚡</span> Càng nhiều điểm, quái trồi càng nhanh!
            </div>
          </div>

          {highScore > 0 && (
            <div className="mb-4 inline-block bg-violet-100 text-violet-800 font-black text-sm px-4 py-1.5 rounded-full">
              🏆 Kỷ lục: {highScore} điểm
            </div>
          )}

          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 mt-2">
            Chọn chủ đề
          </p>
          <div className="space-y-3">
            {Object.values(SPELLING_DATA).map((t) => (
              <button
                key={t.key}
                onClick={() => startGame(t.key)}
                className={`w-full p-4 bg-gradient-to-br ${t.gradient} text-white rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-3 text-left`}
              >
                <div className="text-4xl shrink-0">{t.emoji}</div>
                <div className="flex-1">
                  <div className="font-black text-base leading-tight">{t.label}</div>
                  <div className="text-[11px] opacity-90 font-bold mt-0.5">
                    {t.description}
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

  /* ─────────────────────────────────────────────────────────────────────
   * 5e. Màn hình Game Over
   * ───────────────────────────────────────────────────────────────────── */

  if (phase === 'gameover') {
    const isNewRecord = score > 0 && score >= highScore;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4 floating">{isNewRecord ? '🏆' : '👑'}</div>
        <h2 className="text-2xl font-black mb-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent leading-tight">
          {isNewRecord ? 'Vua Chính Tả mới! 🎉' : 'Game Over!'}
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          Chủ đề: <b>{SPELLING_DATA[topicKey].label}</b>. Thử lại để vượt kỷ lục nhé!
        </p>

        <div className="bg-slate-50 rounded-3xl p-5 mb-6 space-y-1">
          <div className="text-5xl font-black bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
            {score} điểm
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Kỷ lục: {highScore} điểm · Đạt Level {level}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={replaySame}
            className="w-full py-4 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white rounded-2xl font-black shadow-lg shadow-violet-200 active:scale-95 transition-all"
          >
            🔄 Chơi lại chủ đề này
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setPhase('idle')}
              className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
            >
              🗂️ Đổi chủ đề
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 5f. Màn hình chơi
   * ───────────────────────────────────────────────────────────────────── */

  const topic = SPELLING_DATA[topicKey];

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* Thanh trên: thoát + tiêu đề chủ đề + kỷ lục */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          👑 {topic.label}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          🏆 {highScore}
        </div>
      </div>

      {/* HUD: yêu cầu màn chơi · Điểm/Level · Mạng tim */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="col-span-2 rounded-2xl p-3 text-center bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Yêu cầu</div>
          <div className="text-base leading-tight font-black">
            ĐẬP TỪ <span className="text-yellow-300">VIẾT SAI</span> · THA TỪ ĐÚNG
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-violet-50 border-2 border-violet-200">
          <div className="text-[10px] font-black uppercase tracking-widest text-violet-700">
            Điểm
          </div>
          <div className="text-2xl font-black text-violet-700">{score}</div>
          <div className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">
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
        className="rounded-3xl overflow-hidden border-4 border-violet-300 shadow-lg shadow-violet-100 aspect-[8/5] w-full bg-indigo-100"
        style={{ touchAction: 'none' }}
      />

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Đọc kỹ từ trước khi đập · Đập trúng từ ĐÚNG sẽ mất 1 ❤️
      </p>
    </div>
  );
}
