import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ALL_WORDS, type Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';
import TestExitButton from '../components/TestExitButton';
import type { QuizResult } from './ResultView';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function buildOptions(correct: Word): Word[] {
  const seenEn = new Set<string>([correct.en]);
  const seenImg = new Set<string>([correct.img]);
  const opts: Word[] = [correct];
  let tries = 0;
  while (opts.length < 4 && tries < 200) {
    tries++;
    const r = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
    if (seenEn.has(r.en) || seenImg.has(r.img)) continue;
    seenEn.add(r.en);
    seenImg.add(r.img);
    opts.push(r);
  }
  return shuffle(opts);
}

type ShadowViewProps = {
  words: Word[];
  onFinish: (result: QuizResult) => void;
  onExit: () => void;
};

type DragState = {
  wordEn: string;
  pointerId: number;
  origin: { x: number; y: number };
  offset: { x: number; y: number };
  pos: { x: number; y: number };
};

export default function ShadowView({ words, onFinish, onExit }: ShadowViewProps) {
  const { addScore } = useGame();
  const shuffledWords = useMemo(() => shuffle(words), [words]);
  const [roundIdx, setRoundIdx] = useState(0);
  const word = shuffledWords[roundIdx];
  const options = useMemo(() => buildOptions(word), [word]);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [hovering, setHovering] = useState(false);
  const [solved, setSolved] = useState(false);
  const [wrongEn, setWrongEn] = useState<string | null>(null);

  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => speak(word.en), 250);
    return () => window.clearTimeout(t);
  }, [word.en]);

  const isOverShadow = (x: number, y: number): boolean => {
    const el = shadowRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const handleCorrect = () => {
    setSolved(true);
    playSfx('snd-correct');
    addScore(20);
    speak(word.en);
    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 35,
      origin: { y: 0.45 },
      colors: ['#10b981', '#34d399', '#fbbf24', '#ec4899'],
    });
    window.setTimeout(() => {
      if (roundIdx + 1 < shuffledWords.length) {
        setRoundIdx(roundIdx + 1);
        setSolved(false);
      } else {
        onFinish({ correct: shuffledWords.length, total: shuffledWords.length });
      }
    }, 1100);
  };

  const handleWrong = (wordEn: string) => {
    playSfx('snd-wrong');
    window.setTimeout(() => {
      setWrongEn(wordEn);
      window.setTimeout(() => setWrongEn(null), 500);
    }, 260);
  };

  const onTilePointerDown = (e: React.PointerEvent<HTMLButtonElement>, w: Word) => {
    if (solved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      wordEn: w.en,
      pointerId: e.pointerId,
      origin: { x: rect.left, y: rect.top },
      offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      pos: { x: e.clientX, y: e.clientY },
    });
    setHovering(isOverShadow(e.clientX, e.clientY));
  };

  const onTilePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDrag({ ...drag, pos: { x: e.clientX, y: e.clientY } });
    setHovering(isOverShadow(e.clientX, e.clientY));
  };

  const onTilePointerUp = (e: React.PointerEvent<HTMLButtonElement>, w: Word) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dropped = isOverShadow(e.clientX, e.clientY);
    setDrag(null);
    setHovering(false);
    if (!dropped) return;
    if (w.en === word.en) {
      handleCorrect();
    } else {
      handleWrong(w.en);
    }
  };

  const onTilePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDrag(null);
    setHovering(false);
  };

  const tileTransform = (w: Word): string | undefined => {
    if (!drag || drag.wordEn !== w.en) return undefined;
    const targetX = drag.pos.x - drag.offset.x;
    const targetY = drag.pos.y - drag.offset.y;
    const dx = targetX - drag.origin.x;
    const dy = targetY - drag.origin.y;
    return `translate3d(${dx}px, ${dy}px, 0) scale(1.1)`;
  };

  return (
    <div className="animate-in slide-in-from-right duration-300 select-none max-w-xl mx-auto">
      <TestExitButton onExit={onExit} />
      <div className="flex justify-between items-center mb-6">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          KÉO HÌNH VÀO BÓNG
        </span>
        <span className="font-bold text-emerald-500">
          {roundIdx + 1}/{shuffledWords.length}
        </span>
      </div>

      <div
        ref={shadowRef}
        className={`relative rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 transition-all duration-200 mb-4 flex items-center justify-center overflow-hidden ${
          hovering && !solved
            ? 'border-emerald-400 scale-[1.02] shadow-lg shadow-emerald-100'
            : 'border-slate-200'
        } ${solved ? 'glow-pulse border-emerald-400' : ''}`}
        style={{ height: 240 }}
      >
        <div
          className={`leading-none transition-all duration-500 ${
            solved ? '' : 'shadow-silhouette'
          }`}
          style={{ fontSize: 140 }}
        >
          {word.img}
        </div>
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/80 backdrop-blur border border-slate-200">
          <span className="font-black text-slate-700">{word.en}</span>
        </div>
        <button
          type="button"
          onClick={() => speak(word.en)}
          aria-label="Phát âm"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur border border-slate-200 flex items-center justify-center active:scale-95"
        >
          🔊
        </button>
      </div>

      <p className="text-center text-slate-500 text-xs font-bold mb-4">
        Kéo hình đúng vào bóng phía trên 👆
      </p>

      <div className="grid grid-cols-4 gap-2">
        {options.map((w) => {
          const isDragging = drag?.wordEn === w.en;
          const isWrong = wrongEn === w.en;
          return (
            <div key={w.en} className="aspect-square">
              <button
                type="button"
                disabled={solved}
                onPointerDown={(e) => onTilePointerDown(e, w)}
                onPointerMove={onTilePointerMove}
                onPointerUp={(e) => onTilePointerUp(e, w)}
                onPointerCancel={onTilePointerCancel}
                className={`w-full h-full bg-white border-2 rounded-2xl flex items-center justify-center text-5xl disabled:opacity-50 ${
                  isWrong
                    ? 'shake-x border-red-300 bg-red-50'
                    : isDragging
                      ? 'shadow-2xl border-emerald-300'
                      : 'border-slate-100 shadow-sm'
                }`}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  transform: tileTransform(w),
                  transition: isDragging ? 'none' : 'transform 0.25s ease',
                  zIndex: isDragging ? 50 : 'auto',
                  position: 'relative',
                  cursor: solved ? 'default' : 'grab',
                }}
              >
                {w.img}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
