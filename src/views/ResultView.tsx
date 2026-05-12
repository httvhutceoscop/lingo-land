import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { nextSubGroupId, type SubGroup } from '../data/gameData';
import { useGame } from '../context/GameContext';

export type QuizResult = { correct: number; total: number };

type ResultViewProps = {
  subGroup: SubGroup;
  result: QuizResult;
  onBack: () => void;
};

export default function ResultView({ subGroup, result, onBack }: ResultViewProps) {
  const { correct, total } = result;
  const pass = correct >= total * 0.7;
  const { unlockNext } = useGame();
  const hasNext = nextSubGroupId(subGroup.id) !== null;

  useEffect(() => {
    if (pass) {
      unlockNext(subGroup.id);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-center py-10 animate-in zoom-in duration-500">
      <div className="text-8xl mb-6">{pass ? '🏆' : '😅'}</div>
      <h2 className="text-3xl font-black mb-2">{pass ? 'Tuyệt vời!' : 'Cố gắng lên!'}</h2>
      <p className="text-slate-400 mb-8">
        {pass
          ? hasNext
            ? `Bạn đã mở khóa chủ đề tiếp theo của ${subGroup.title}.`
            : 'Bạn đã hoàn thành toàn bộ chủ đề này!'
          : 'Hãy ôn tập lại thẻ từ vựng một lần nữa nhé.'}
      </p>

      <div className="bg-slate-50 rounded-3xl p-6 mb-8 grid grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-2xl font-black text-emerald-500">
            {correct}/{total}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Đúng</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-2xl font-black text-orange-500">+{correct * 20}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Exp</div>
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
      >
        {pass ? 'Tiếp tục hành trình' : 'Quay lại danh sách'}
      </button>
    </div>
  );
}
