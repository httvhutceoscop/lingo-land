import { useState } from 'react';
import Flashcard from '../components/Flashcard';
import { speak } from '../lib/audio';
import type { Level } from '../data/gameData';

type LevelViewProps = {
  level: Level;
  onExit: () => void;
  onComplete: () => void;
};

export default function LevelView({ level, onExit, onComplete }: LevelViewProps) {
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const words = level.words;
  const word = words[step];
  const isLast = step >= words.length - 1;

  const handleNext = () => {
    setFlipped(false);
    if (!isLast) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onExit}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
        >
          ✕ Thoát
        </button>
        <div className="w-1/2 bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full progress-bar"
            style={{ width: `${((step + 1) / words.length) * 100}%` }}
          ></div>
        </div>
      </div>
      <div className="flex flex-col items-center py-4">
        <Flashcard word={word} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
        <div className="mt-10 flex flex-col gap-3 w-full">
          <button
            onClick={() => speak(word.en)}
            className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>🔊</span> Phát âm
          </button>
          <button
            onClick={handleNext}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            {isLast ? 'Bắt đầu kiểm tra ➔' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
}
