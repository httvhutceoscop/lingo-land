import { speak } from './audio';

const CAMBRIDGE_BASE = 'https://dictionary.cambridge.org';
const CORS_PROXY = 'https://corsproxy.io/?url=';

const audioUrlCache = new Map<string, string | null>();
let currentAudio: HTMLAudioElement | null = null;

function stopCurrent(): void {
    if (currentAudio) {
        currentAudio.onerror = null;
        currentAudio.onended = null;
        currentAudio.pause();
        currentAudio = null;
    }
}

async function fetchAudioUrl(word: string): Promise<string | null> {
    const key = word.trim().toLowerCase();
    if (!key) return null;
    if (audioUrlCache.has(key)) return audioUrlCache.get(key)!;

    const pageUrl = `${CAMBRIDGE_BASE}/dictionary/english/${encodeURIComponent(key)}`;
    const proxied = `${CORS_PROXY}${encodeURIComponent(pageUrl)}`;

    try {
        const res = await fetch(proxied);
        if (!res.ok) {
            audioUrlCache.set(key, null);
            return null;
        }
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const audio = doc.querySelector('audio#audio2');
        const src = audio?.querySelector('source[type="audio/mpeg"]')?.getAttribute('src');
        if (!src) {
            audioUrlCache.set(key, null);
            return null;
        }
        const absoluteUrl = src.startsWith('http') ? src : `${CAMBRIDGE_BASE}${src}`;
        audioUrlCache.set(key, absoluteUrl);
        return absoluteUrl;
    } catch {
        audioUrlCache.set(key, null);
        return null;
    }
}

export async function speakCambridge(word: string): Promise<boolean> {
    if (!word) return false;
    stopCurrent();

    const url = await fetchAudioUrl(word);
    if (!url) return false;

    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
    };

    try {
        await audio.play();
        console.log("playing with ", url);

        return true;
    } catch {
        if (currentAudio === audio) currentAudio = null;
        return false;
    }
}

export function stopCambridge(): void {
    stopCurrent();
}

export async function pronounce(word: string): Promise<void> {
    const ok = await speakCambridge(word);
    if (!ok) speak(word);
}
