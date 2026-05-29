import { puter } from '@heyputer/puter.js';

export const LANG_SPEAK_DEFAULT = 'vi-VN';

const MAX_TTS_LEN = 200;

const VOICE_BY_LANG: Record<string, string> = {
  en: 'Puck',
  vi: 'Leda',
};
const DEFAULT_VOICE = 'Puck';

function shortLang(lang: string): string {
  return lang.split('-')[0].toLowerCase();
}

function voiceFor(lang: string): string {
  return VOICE_BY_LANG[shortLang(lang)] ?? DEFAULT_VOICE;
}

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const EN_TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function enNumber(n: number): string {
  if (n < 0) return `minus ${enNumber(-n)}`;
  if (n < 10) return EN_ONES[n];
  if (n < 20) return EN_TEENS[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o === 0 ? EN_TENS[t] : `${EN_TENS[t]}-${EN_ONES[o]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? `${EN_ONES[h]} hundred` : `${EN_ONES[h]} hundred ${enNumber(r)}`;
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    return r === 0 ? `${EN_ONES[th]} thousand` : `${EN_ONES[th]} thousand ${enNumber(r)}`;
  }
  return String(n);
}

const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function viNumber(n: number): string {
  if (n < 0) return `âm ${viNumber(-n)}`;
  if (n < 10) return VI_DIGITS[n];
  if (n < 20) {
    const o = n - 10;
    if (o === 0) return 'mười';
    if (o === 5) return 'mười lăm';
    return `mười ${VI_DIGITS[o]}`;
  }
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o === 0) return `${VI_DIGITS[t]} mươi`;
    const ones = o === 1 ? 'mốt' : o === 5 ? 'lăm' : VI_DIGITS[o];
    return `${VI_DIGITS[t]} mươi ${ones}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (r === 0) return `${VI_DIGITS[h]} trăm`;
    if (r < 10) return `${VI_DIGITS[h]} trăm lẻ ${VI_DIGITS[r]}`;
    return `${VI_DIGITS[h]} trăm ${viNumber(r)}`;
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    if (r === 0) return `${VI_DIGITS[th]} nghìn`;
    if (r < 10) return `${VI_DIGITS[th]} nghìn không trăm lẻ ${VI_DIGITS[r]}`;
    if (r < 100) return `${VI_DIGITS[th]} nghìn không trăm ${viNumber(r)}`;
    return `${VI_DIGITS[th]} nghìn ${viNumber(r)}`;
  }
  return String(n);
}

const EN_OPS: Record<string, string> = {
  '+': 'plus',
  '-': 'minus',
  '−': 'minus',
  '×': 'times',
  '*': 'times',
  '÷': 'divided by',
  ':': 'divided by',
  '/': 'divided by',
  '=': 'equals',
  '<': 'less than',
  '>': 'greater than',
};

const VI_OPS: Record<string, string> = {
  '+': 'cộng',
  '-': 'trừ',
  '−': 'trừ',
  '×': 'nhân',
  '*': 'nhân',
  '÷': 'chia',
  ':': 'chia',
  '/': 'chia',
  '=': 'bằng',
  '<': 'nhỏ hơn',
  '>': 'lớn hơn',
};

const OP_RE = /(\d)\s*([+\-−×÷*/:<>=])\s*(?=\d)/g;
const DIGIT_RE = /\d+/g;

function localize(text: string, lang: string): string {
  const short = shortLang(lang);
  if (short !== 'en' && short !== 'vi') return text;

  const num = short === 'en' ? enNumber : viNumber;
  const ops = short === 'en' ? EN_OPS : VI_OPS;

  const withOps = text.replace(OP_RE, (m, d: string, op: string) => {
    const word = ops[op];
    return word ? `${d} ${word} ` : m;
  });

  const withNums = withOps.replace(DIGIT_RE, (m) => {
    const n = parseInt(m, 10);
    return n > 9999 ? m : num(n);
  });

  return withNums.replace(/\s+/g, ' ').trim();
}

let currentAudio: HTMLAudioElement | null = null;
let speakToken = 0;

function stopCurrent(): void {
  if (currentAudio) {
    currentAudio.onerror = null;
    currentAudio.onended = null;
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function fallbackSpeak(text: string, lang: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;
  window.speechSynthesis.speak(msg);
}

export async function speak(text: string, lang: string = 'en-US'): Promise<void> {
  if (!text) return;
  stopCurrent();

  const spoken = localize(text, lang);

  if (spoken.length > MAX_TTS_LEN) {
    fallbackSpeak(spoken, lang);
    return;
  }

  const token = ++speakToken;
  let audio: HTMLAudioElement;
  try {
    audio = await puter.ai.txt2speech(spoken, {
      provider: 'gemini',
      model: 'gemini-2.5-flash-preview-tts',
      voice: voiceFor(lang),
      language: lang,
    });
  } catch {
    if (token === speakToken) fallbackSpeak(spoken, lang);
    return;
  }

  if (token !== speakToken) return;

  let fallbackFired = false;
  const fireFallback = () => {
    if (fallbackFired) return;
    fallbackFired = true;
    if (currentAudio === audio) currentAudio = null;
    if (token === speakToken) fallbackSpeak(spoken, lang);
  };
  audio.onerror = fireFallback;
  currentAudio = audio;
  audio.play().catch(fireFallback);
}

export function playSfx(id: string): void {
  const el = document.getElementById(id) as HTMLAudioElement | null;
  if (el) {
    el.currentTime = 0;
    el.play().catch(() => { });
  }
}
