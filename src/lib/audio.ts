export const LANG_SPEAK_DEFAULT = 'vi-VN';

const CAMBRIDGE_BASE = 'https://dictionary.cambridge.org';
const CORS_PROXY = 'https://corsproxy.io/?url=';

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
  '+': 'plus', '-': 'minus', '−': 'minus',
  '×': 'times', '*': 'times',
  '÷': 'divided by', ':': 'divided by', '/': 'divided by',
  '=': 'equals', '<': 'less than', '>': 'greater than',
};

const VI_OPS: Record<string, string> = {
  '+': 'cộng', '-': 'trừ', '−': 'trừ',
  '×': 'nhân', '*': 'nhân',
  '÷': 'chia', ':': 'chia', '/': 'chia',
  '=': 'bằng', '<': 'nhỏ hơn', '>': 'lớn hơn',
};

const OP_RE = /(\d)\s*([+\-−×÷*/:<>=])\s*(?=\d)/g;
const DIGIT_RE = /\d+/g;

function localize(text: string, lang: string): string {
  const short = lang.split('-')[0].toLowerCase();
  if (short !== 'en' && short !== 'vi') return text;

  const num = short === 'en' ? enNumber : viNumber;
  const ops = short === 'en' ? EN_OPS : VI_OPS;

  return text
    .replace(OP_RE, (m, d: string, op: string) => {
      const word = ops[op];
      return word ? `${d} ${word} ` : m;
    })
    .replace(DIGIT_RE, (m) => {
      const n = parseInt(m, 10);
      return n > 9999 ? m : num(n);
    })
    .replace(/\s+/g, ' ')
    .trim();
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

export function speak(text: string, lang: string = 'en-US'): void {
  if (!text) return;
  stopCurrent();
  speakToken++;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(localize(text, lang));
  msg.lang = lang;
  window.speechSynthesis.speak(msg);
}

const cambridgeUrlCache = new Map<string, string | null>();

async function fetchCambridgeUrl(word: string): Promise<string | null> {
  const key = word.trim().toLowerCase();
  if (!key) return null;
  if (cambridgeUrlCache.has(key)) return cambridgeUrlCache.get(key)!;

  const pageUrl = `${CAMBRIDGE_BASE}/dictionary/english/${encodeURIComponent(key)}`;
  try {
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(pageUrl)}`);
    if (!res.ok) {
      cambridgeUrlCache.set(key, null);
      return null;
    }
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const src = doc
      .querySelector('audio#audio2 source[type="audio/mpeg"]')
      ?.getAttribute('src');
    const url = src ? (src.startsWith('http') ? src : `${CAMBRIDGE_BASE}${src}`) : null;
    cambridgeUrlCache.set(key, url);
    return url;
  } catch {
    cambridgeUrlCache.set(key, null);
    return null;
  }
}

export async function pronounce(word: string): Promise<void> {
  if (!word) return;
  stopCurrent();
  const token = ++speakToken;

  const url = await fetchCambridgeUrl(word);
  if (token !== speakToken) return;

  if (url) {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
    };
    try {
      await audio.play();
      return;
    } catch {
      if (currentAudio === audio) currentAudio = null;
    }
  }

  if (token === speakToken) speak(word);
}

export function playSfx(id: string): void {
  const el = document.getElementById(id) as HTMLAudioElement | null;
  if (el) {
    el.currentTime = 0;
    el.play().catch(() => {});
  }
}
