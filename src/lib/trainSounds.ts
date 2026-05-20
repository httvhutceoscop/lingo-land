// Hand-synthesized SFX for the Train Track Puzzle game — a steam-train chug
// loop ("tu xình xịch") and a bell-like win jingle ("ting ting"). Uses its own
// AudioContext so it stays independent of the global BGM loop in bgm.ts.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let chugTimer: number | null = null;
let chugBeat = 0;

const MASTER_GAIN = 0.5;
const CHUG_INTERVAL_MS = 195;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  return ctx;
}

// Steam whistle "tuuuu" — a wailing sawtooth with vibrato.
export function playTrainWhistle(): void {
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;

  const mkOsc = (detune: number) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(720 + detune, now);
    o.frequency.linearRampToValueAtTime(840 + detune, now + 0.12);
    o.frequency.linearRampToValueAtTime(720 + detune, now + 0.55);
    return o;
  };
  const o1 = mkOsc(0);
  const o2 = mkOsc(6);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.22, now + 0.05);
  g.gain.linearRampToValueAtTime(0.18, now + 0.45);
  g.gain.linearRampToValueAtTime(0, now + 0.6);

  o1.connect(g);
  o2.connect(g);
  g.connect(lp).connect(master);
  o1.start(now);
  o2.start(now);
  o1.stop(now + 0.65);
  o2.stop(now + 0.65);
}

// A single chug burst — bandpass-filtered noise, accented "xình" (high) or
// softer "xịch" (low).
function playChug(accented: boolean): void {
  if (!ctx || !master) return;
  const c = ctx;
  const now = c.currentTime;
  const dur = 0.12;

  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = accented ? 700 : 340;
  bp.Q.value = 1.4;

  const g = c.createGain();
  const peak = accented ? 0.5 : 0.32;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  src.connect(bp).connect(g).connect(master);
  src.start(now);
  src.stop(now + dur + 0.02);

  // Add a low "puff" thud for accented beats so it feels like steam pressure.
  if (accented) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, now);
    o.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    const og = c.createGain();
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(0.18, now + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    o.connect(og).connect(master);
    o.start(now);
    o.stop(now + 0.12);
  }
}

// Periodic "xình xịch xình xịch" while the train is moving.
export function startChug(): void {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (chugTimer !== null) return;
  chugBeat = 0;
  playChug(true);
  chugTimer = window.setInterval(() => {
    chugBeat = (chugBeat + 1) % 2;
    playChug(chugBeat === 0);
  }, CHUG_INTERVAL_MS);
}

export function stopChug(): void {
  if (chugTimer !== null) {
    window.clearInterval(chugTimer);
    chugTimer = null;
  }
}

// Bell-like ascending arpeggio for a win — "ting ting ting!"
export function playWinJingle(): void {
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;

  // C5 — E5 — G5 — C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const start = now + i * 0.13;
    const fundamental = c.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.value = freq;
    const harmonic = c.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.value = freq * 2;

    const g1 = c.createGain();
    g1.gain.setValueAtTime(0, start);
    g1.gain.linearRampToValueAtTime(0.24, start + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);

    const g2 = c.createGain();
    g2.gain.setValueAtTime(0, start);
    g2.gain.linearRampToValueAtTime(0.08, start + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

    fundamental.connect(g1).connect(master!);
    harmonic.connect(g2).connect(master!);
    fundamental.start(start);
    fundamental.stop(start + 0.55);
    harmonic.start(start);
    harmonic.stop(start + 0.4);
  });
}

// Sad descending honk when the train hits a broken section.
export function playFailHonk(): void {
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(420, now);
  o.frequency.linearRampToValueAtTime(140, now + 0.5);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1500;
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.2, now + 0.04);
  g.gain.linearRampToValueAtTime(0, now + 0.55);
  o.connect(g).connect(lp).connect(master);
  o.start(now);
  o.stop(now + 0.6);
}
