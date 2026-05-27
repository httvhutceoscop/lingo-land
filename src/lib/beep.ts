/* ──────────────────────────────────────────────────────────────────────────
 * BEEP SYNTHESIZER (WebAudio)
 *
 * Bộ 3 hiệu ứng âm thanh ngắn dùng chung cho các trò chơi phản xạ kiểu
 * "đập thú". Sinh trực tiếp trong trình duyệt — không cần tải file audio:
 *
 *  - playTing(): chuông trong trẻo, A5 + E6 chồng nhau, dùng khi bé làm ĐÚNG.
 *  - playBip() : buzz trầm 180→120Hz, dùng khi bé làm SAI (chạm nhầm).
 *  - playMiss(): tiếng "doh" nhẹ nhàng, sine 520→220Hz, dùng khi bé bỏ lỡ
 *                mục tiêu (vd: sâu/quái thoát ra hố mà không kịp đập).
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
