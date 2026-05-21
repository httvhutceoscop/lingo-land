export const LANG_SPEAK_DEFAULT = 'vi-VN';

const GOOGLE_TTS_BASE = 'https://translate.google.com/translate_tts';
const MAX_TTS_LEN = 200;

let currentAudio: HTMLAudioElement | null = null;

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

function shortLang(lang: string): string {
  return lang.split('-')[0].toLowerCase();
}

function fallbackSpeak(text: string, lang: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;
  window.speechSynthesis.speak(msg);
}

export function speak(text: string, lang: string = 'en-US'): void {
  if (!text) return;
  stopCurrent();

  if (text.length > MAX_TTS_LEN) {
    fallbackSpeak(text, lang);
    return;
  }

  const url = `${GOOGLE_TTS_BASE}?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${shortLang(lang)}&client=tw-ob`;
  const audio = new Audio(url);
  let fallbackFired = false;
  const fireFallback = () => {
    if (fallbackFired) return;
    fallbackFired = true;
    if (currentAudio === audio) currentAudio = null;
    fallbackSpeak(text, lang);
  };
  audio.onerror = fireFallback;
  currentAudio = audio;
  audio.play().catch(fireFallback);
}

export function playSfx(id: string): void {
  const el = document.getElementById(id) as HTMLAudioElement | null;
  if (el) {
    el.currentTime = 0;
    el.play().catch(() => {});
  }
}
