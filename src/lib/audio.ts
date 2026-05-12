export function speak(text: string): void {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'en-US';
  window.speechSynthesis.speak(msg);
}

export function playSfx(id: string): void {
  const el = document.getElementById(id) as HTMLAudioElement | null;
  if (el) {
    el.currentTime = 0;
    el.play().catch(() => {});
  }
}
