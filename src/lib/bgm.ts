const BGM_ENABLED = import.meta.env.VITE_BGM_ENABLED !== 'false';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let schedulerId: number | null = null;
let nextStepTime = 0;
let stepIndex = 0;
let loopVariant = 0;
let running = false;

const TEMPO_BPM = 112;
const STEP_SEC = 30 / TEMPO_BPM;
const STEPS_PER_LOOP = 16;
const LOOKAHEAD_SEC = 0.3;
const SCHEDULER_MS = 50;
const MASTER_GAIN = 0.32;

const N = {
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  C3: 130.81,
  D3: 146.83,
  F3: 174.61,
  G3: 196.0,
  C4: 261.63,
  D4: 293.66,
};

type Step = number | null;

const MELODY_A: Step[] = [
  N.C5, N.E5, N.G5, N.E5,  N.F5, N.A5, N.F5, N.C5,
  N.G4, N.B4, N.D5, N.G5,  N.C5, N.E5, N.G5, N.C6,
];

const MELODY_B: Step[] = [
  N.E5, N.G5, N.E5, N.C5,  N.A5, N.F5, N.A5, N.F5,
  N.G5, N.D5, N.B4, N.G4,  N.E5, N.C5, N.G4, N.C5,
];

const BASS: Step[] = [
  N.C3, null, N.G3, null,  N.F3, null, N.C4, null,
  N.G3, null, N.D4, null,  N.C3, null, N.G3, null,
];

const ACCENT_STEPS = new Set([0, 4, 8, 12]);

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function playNote(
  freq: number,
  when: number,
  dur: number,
  type: OscillatorType,
  vol: number,
): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g).connect(master);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

function playClick(when: number): void {
  if (!ctx || !master) return;
  const buffer = ctx.createBuffer(1, 256, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  src.connect(hp).connect(g).connect(master);
  src.start(when);
  src.stop(when + 0.08);
}

function scheduleAhead(): void {
  if (!ctx) return;
  while (nextStepTime < ctx.currentTime + LOOKAHEAD_SEC) {
    const melody = loopVariant === 0 ? MELODY_A : MELODY_B;
    const m = melody[stepIndex];
    const b = BASS[stepIndex];
    if (m !== null) {
      playNote(m, nextStepTime, STEP_SEC * 0.95, 'triangle', 0.09);
    }
    if (b !== null) {
      playNote(b, nextStepTime, STEP_SEC * 1.85, 'sine', 0.13);
    }
    if (ACCENT_STEPS.has(stepIndex)) {
      playClick(nextStepTime);
    }
    nextStepTime += STEP_SEC;
    stepIndex++;
    if (stepIndex >= STEPS_PER_LOOP) {
      stepIndex = 0;
      loopVariant = (loopVariant + 1) % 2;
    }
  }
}

export function startBgm(): void {
  if (!BGM_ENABLED) return;
  if (running) return;
  const c = ensureCtx();
  if (!c || !master) return;
  running = true;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(MASTER_GAIN, now + 0.4);
  stepIndex = 0;
  loopVariant = 0;
  nextStepTime = now + 0.08;
  scheduleAhead();
  schedulerId = window.setInterval(scheduleAhead, SCHEDULER_MS);
}

export function stopBgm(): void {
  if (!running) return;
  running = false;
  if (schedulerId !== null) {
    window.clearInterval(schedulerId);
    schedulerId = null;
  }
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + 0.4);
}
