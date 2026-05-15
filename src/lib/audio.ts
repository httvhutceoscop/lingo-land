export const LANG_SPEAK_DEFAULT = 'vi-VN';

export function speak(text: string, lang: string = 'en-US'): void {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;
  window.speechSynthesis.speak(msg);
}

export function playSfx(id: string): void {
  const el = document.getElementById(id) as HTMLAudioElement | null;
  if (el) {
    el.currentTime = 0;
    el.play().catch(() => {});
  }
}
