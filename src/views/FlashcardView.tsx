import { useState } from 'react';
import Flashcard from '../components/Flashcard';
import { speak } from '../lib/audio';
import type { SubGroup, TestMode } from '../data/gameData';

const TEST_LABEL: Record<TestMode, string> = {
  quiz: 'Bắt đầu trắc nghiệm ➔',
  matching: 'Bắt đầu nối từ ➔',
  listening: 'Bắt đầu nghe đoán ➔',
  typing: 'Bắt đầu gõ chính tả ➔',
  memory: 'Bắt đầu trí nhớ ➔',
  hangman: 'Bắt đầu đoán chữ ➔',
  shadow: 'Bắt đầu kéo bóng ➔',
};

type FlashcardViewProps = {
  subGroup: SubGroup;
  onExit: () => void;
  onComplete: () => void;
};

export default function FlashcardView({ subGroup, onExit, onComplete }: FlashcardViewProps) {
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showFinish, setShowFinish] = useState(false);

  const words = subGroup.words;
  const word = words[step];
  const isLast = step >= words.length - 1;

  const handleNext = () => {
    setFlipped(false);
    if (!isLast) {
      setStep(step + 1);
    } else {
      setShowFinish(true);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
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
        <div className="mt-10 flex flex-col gap-3 w-full max-w-md">
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
            {isLast ? 'Hoàn thành học ➔' : 'Tiếp theo'}
          </button>
        </div>
      </div>

      {showFinish && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="text-6xl mb-3">🎉</div>
              <h3 className="text-2xl font-black mb-2">Đã học xong!</h3>
              <p className="text-sm text-slate-500 mb-6">
                Bạn có muốn làm bài kiểm tra ngay bây giờ?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={onComplete}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                >
                  {TEST_LABEL[subGroup.mode]}
                </button>
                <button
                  onClick={onExit}
                  className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
                >
                  ← Quay lại danh sách
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
