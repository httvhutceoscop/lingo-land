import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { nextSubGroupId, type SubGroup } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { getPetStage } from '../data/petData';

export type QuizResult = { correct: number; total: number };

type ResultViewProps = {
  subGroup: SubGroup;
  result: QuizResult;
  onBack: () => void;
};

export default function ResultView({ subGroup, result, onBack }: ResultViewProps) {
  const { correct, total } = result;
  const pass = correct >= total * 0.7;
  const { unlockNext, markPassed, passedSubGroups, petName, addWordsToSRS } = useGame();
  const hasNext = nextSubGroupId(subGroup.id) !== null;

  const [snapshot] = useState(() => ({
    alreadyPassed: passedSubGroups.includes(subGroup.id),
    countBefore: passedSubGroups.length,
  }));
  const countAfter =
    pass && !snapshot.alreadyPassed ? snapshot.countBefore + 1 : snapshot.countBefore;
  const stageBefore = getPetStage(snapshot.countBefore);
  const stageAfter = getPetStage(countAfter);
  const evolved = pass && stageBefore.icon !== stageAfter.icon;
  const firstPass = pass && !snapshot.alreadyPassed;

  useEffect(() => {
    if (pass) {
      markPassed(subGroup.id);
      unlockNext(subGroup.id);
      if (firstPass) {
        addWordsToSRS(subGroup.words);
      }
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      if (evolved) {
        setTimeout(
          () =>
            confetti({
              particleCount: 200,
              spread: 100,
              origin: { y: 0.5 },
              colors: ['#a855f7', '#ec4899', '#facc15'],
            }),
          500
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-center py-10 animate-in zoom-in duration-500">
      <div className="text-8xl mb-6">{pass ? '🏆' : '😅'}</div>
      <h2 className="text-3xl font-black mb-2">{pass ? 'Tuyệt vời!' : 'Cố gắng lên!'}</h2>
      <p className="text-slate-400 mb-2">
        {pass
          ? hasNext
            ? `Bạn đã mở khóa chủ đề tiếp theo của ${subGroup.title}.`
            : 'Bạn đã hoàn thành toàn bộ chủ đề này!'
          : 'Hãy ôn tập lại thẻ từ vựng một lần nữa nhé.'}
      </p>
      {pass && (
        <div className="mb-8">
          <p className="text-amber-600 text-sm font-bold">
            🏅 +1 huy hiệu vào sổ sưu tập!
          </p>
          {firstPass && (
            <p className="text-blue-600 text-xs font-bold mt-1">
              📚 +{subGroup.words.length} từ vào sổ ôn tập hàng ngày
            </p>
          )}
        </div>
      )}
      {!pass && <div className="mb-8" />}

      {evolved && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-5 mb-6 animate-in zoom-in duration-700">
          <div className="text-6xl mb-2 animate-bounce">{stageAfter.icon}</div>
          <p className="font-black text-purple-800 text-lg">
            ✨ {petName} đã tiến hoá! ✨
          </p>
          <p className="text-xs text-purple-600 mt-1 font-bold">
            Giờ là {stageAfter.name}
          </p>
        </div>
      )}

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
