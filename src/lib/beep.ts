/* ──────────────────────────────────────────────────────────────────────────
 * BEEP SYNTHESIZER (WebAudio)
 *
 * Bộ 3 hiệu ứng âm thanh ngắn dùng chung cho các trò chơi phản xạ kiểu
 * "đập thú". Sinh trực tiếp trong trình duyệt — không cần tải file audio:
 *
 *  - playTing() : chuông trong trẻo, A5 + E6 chồng nhau, dùng khi bé làm ĐÚNG.
 *  - playBip()  : buzz trầm 180→120Hz, dùng khi bé làm SAI (chạm nhầm).
 *  - playMiss() : tiếng "doh" nhẹ nhàng, sine 520→220Hz, dùng khi bé bỏ lỡ
 *                 mục tiêu (vd: sâu/quái thoát ra hố mà không kịp đập).
 *  - playChomp(): tiếng "chomp chomp" tượng trưng cho tiếng NHAI — hai nhịp
 *                 sawtooth tần số thấp 110→55Hz pha với 1 noise burst lọc
 *                 thấp ~600Hz để có texture "mushy" như cắn vào trái cây.
 *  - playPop()  : tiếng "BÓC!" bong bóng nổ — sine sweep 1400→350Hz cực
 *                 nhanh (~90ms) với envelope sắc gọn. Dùng cho game bong
 *                 bóng — phản hồi nhanh, vui tai, kích thích bé chọc thêm.
 *
 * AudioContext được khởi tạo LƯỜI ở lần phát đầu tiên (vốn xảy ra ngay sau
 * thao tác chạm của bé nên không bị browser chặn vì thiếu user gesture).
 * ────────────────────────────────────────────────────────────────────────── */

let _audioCtx: AudioContext | null = null;

/** Trả về AudioContext dùng chung — tạo mới nếu chưa có. */
function getAudioCtx(): AudioContext | null {
  if (_audioCtx) return _audioCtx;
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  try {
    _audioCtx = new AC();
  } catch {
    return null;
  }
  return _audioCtx;
}

/** Một số trình duyệt mobile (iOS Safari) tự suspend ctx — gọi resume cho chắc. */
function ensureResumed(ctx: AudioContext) {
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

/** Phát tiếng "Ting" vui tai khi bé làm đúng. */
export function playTing() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  // Sóng nền: A5 (~880Hz) — tone trong sáng làm hạt nhân tiếng "ting".
  const gain1 = ctx.createGain();
  gain1.connect(ctx.destination);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.22, now + 0.005);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  osc1.connect(gain1);

  // Hài âm cao hơn (E6 ~1318Hz) tắt nhanh → cho hiệu ứng "leng keng".
  const gain2 = ctx.createGain();
  gain2.connect(ctx.destination);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.12, now + 0.005);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318, now);
  osc2.connect(gain2);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.4);
  osc2.stop(now + 0.22);
}

/** Phát tiếng "Bíp" trầm khi bé làm sai (chạm nhầm đối tượng). */
export function playBip() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  const osc = ctx.createOscillator();
  osc.type = 'square'; // square wave cho cảm giác "buzz" thô
  osc.frequency.setValueAtTime(180, now);
  // Trượt xuống 120Hz cho cảm giác "rớt" — củng cố thông điệp "sai".
  osc.frequency.linearRampToValueAtTime(120, now + 0.22);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.3);
}

/**
 * Phát tiếng "Chomp Chomp" — 2 nhịp nhai liên tiếp dành cho game cho thú ăn.
 *
 * Kết cấu mỗi NHỊP:
 *   1) Oscillator SAWTOOTH 110Hz → 55Hz (~120ms) — thân chính, đặc rậm, gợi
 *      cảm giác "ngậm vào". Sawtooth giàu hài âm hơn sine ⇒ texture dày.
 *   2) Noise burst 80ms lọc lowpass ~600Hz — texture "ẩm/mushy" như đang
 *      cắn vào trái cây/cỏ.
 *
 * Hai nhịp cách nhau 190ms → tạo nhịp điệu "chomp ... chomp" rõ ràng.
 */
export function playChomp() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  ensureResumed(ctx);
  const baseNow = ctx.currentTime;

  // Dựng MỘT nhịp "chomp" tại offset (giây) tính từ baseNow.
  const buildOne = (offset: number) => {
    const start = baseNow + offset;

    // ── (1) Sawtooth tần số thấp — phần thân tiếng nhai ─────────────────
    const oscGain = ctx.createGain();
    oscGain.connect(ctx.destination);
    oscGain.gain.setValueAtTime(0, start);
    // Attack rất nhanh 12ms → âm bật ngay khi cắn xuống.
    oscGain.gain.linearRampToValueAtTime(0.28, start + 0.012);
    // Decay 130ms về gần 0 — đủ dài để cảm thấy "nhồm nhoàm" mà không lê thê.
    oscGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, start);
    // Trượt xuống 55Hz cho cảm giác "ngậm vào" (pitch drop = swallow feel).
    osc.frequency.exponentialRampToValueAtTime(55, start + 0.12);
    osc.connect(oscGain);

    // ── (2) Noise burst lọc thấp — texture mushy ────────────────────────
    const noiseLen = 0.08; // 80ms
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(noiseLen * sampleRate), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Lowpass ~600Hz → cắt phần "sssh" cao, giữ lại "fwwff" trầm = ướt/ẩm.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, start);
    noiseGain.gain.linearRampToValueAtTime(0.16, start + 0.008);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);

    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.16);
    noise.start(start);
    // noise tự tắt khi hết buffer; không cần stop() thủ công.
  };

  // "Chomp ... Chomp" — 2 nhịp cách 190ms.
  buildOne(0);
  buildOne(0.19);
}

/**
 * Phát tiếng "BÓC!" bong bóng nổ — dành cho game chọc bong bóng.
 *
 * Thiết kế:
 *   - Sóng SINE thuần (mịn, không gắt) — đặc trưng tiếng bóng xà phòng vỡ.
 *   - Tần số quét nhanh 1400Hz → 350Hz trong 90ms → tạo cảm giác "nổ rồi
 *     trầm xuống" cực kỳ ngắn gọn, đúng kiểu pop.
 *   - Envelope: attack 4ms (sắc gọn) + exponential decay 100ms → tiếng pop
 *     đứt khoát mà không để lại đuôi vang dai dẳng.
 *   - Volume 0.25 — đủ nghe trên loa di động/iPad mà không gây giật mình.
 *
 * Phát ngay khi va chạm trả về true (bất kể đúng/sai chữ mục tiêu) để bé
 * luôn có phản hồi âm thanh vui tai mỗi lần chọc trúng bong bóng.
 */
export function playPop() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  // Envelope chính — attack siêu nhanh + decay 100ms.
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  // Sine sweep 1400Hz → 350Hz trong 90ms.
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(350, now + 0.09);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.12);
}

/** Phát tiếng "Hụt" nhẹ khi bé BỎ LỠ mục tiêu (đối tượng cần đập tự thoát). */
export function playMiss() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

  // Sine wave dịu hơn square — tránh nghe "gắt" như Bip. Trượt 520→220Hz
  // tạo cảm giác "tuột mất" mà không quá tiêu cực (chỉ là bỏ lỡ, chưa thua).
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.32);
}
