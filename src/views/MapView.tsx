import { TOTAL_SUBGROUPS } from '../data/gameData';
import { TOTAL_MATH_LEVELS } from '../data/mathData';
import { useGame } from '../context/GameContext';

type MapViewProps = {
  onPickKnowledge: () => void;
  onPickReview: () => void;
  onPickMath: () => void;
  onPickGameIsland: () => void;
};

export default function MapView({
  onPickKnowledge,
  onPickReview,
  onPickMath,
  onPickGameIsland,
}: MapViewProps) {
  const { passedSubGroups, dueDeck, mathPassed } = useGame();
  const dueCount = dueDeck.length;
  const mathDone = mathPassed.length;
  const knowledgeDone = passedSubGroups.length;

  return (
    <div className="py-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {dueCount > 0 && (
          <button
            onClick={onPickReview}
            className="w-full p-4 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-4 text-left md:col-span-2"
          >
            <div className="text-4xl">📚</div>
            <div className="flex-1 text-white">
              <div className="font-black text-base leading-tight">Ôn tập hàng ngày</div>
              <div className="text-xs opacity-90 font-bold mt-0.5">
                {dueCount} từ cần ôn để nhớ lâu hơn
              </div>
            </div>
            <span className="text-white text-xl">▶️</span>
          </button>
        )}

        <button
          onClick={onPickKnowledge}
          className="w-full p-5 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-3xl shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center gap-4 text-left md:col-span-2"
        >
          <div className="text-5xl">🏝️</div>
          <div className="flex-1 text-white">
            <div className="font-black text-lg leading-tight">Đảo Tri Thức</div>
            <div className="text-xs opacity-90 font-bold mt-0.5">
              Học từ vựng theo chủ đề, mở khoá nhãn dán
            </div>
            <div className="text-[10px] mt-1 font-bold bg-white/20 inline-block px-2 py-0.5 rounded-full">
              ✓ {knowledgeDone}/{TOTAL_SUBGROUPS} bài
            </div>
          </div>
          <span className="text-white text-xl">▶️</span>
        </button>

        <button
          onClick={onPickMath}
          className="w-full p-5 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-3xl shadow-lg shadow-purple-200 active:scale-95 transition-all flex items-center gap-4 text-left"
        >
          <div className="text-5xl">🧮</div>
          <div className="flex-1 text-white">
            <div className="font-black text-lg leading-tight">Đảo Toán Học</div>
            <div className="text-xs opacity-90 font-bold mt-0.5">
              Nhận diện ký hiệu, cộng trừ trong 20
            </div>
            {mathDone > 0 && (
              <div className="text-[10px] mt-1 font-bold bg-white/20 inline-block px-2 py-0.5 rounded-full">
                ✓ {mathDone}/{TOTAL_MATH_LEVELS} level
              </div>
            )}
          </div>
          <span className="text-white text-xl">▶️</span>
        </button>

        <button
          onClick={onPickGameIsland}
          className="w-full p-5 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-blue-500 rounded-3xl shadow-lg shadow-pink-200 active:scale-95 transition-all flex items-center gap-4 text-left"
        >
          <div className="text-5xl floating">🎮</div>
          <div className="flex-1 text-white">
            <div className="font-black text-lg leading-tight">Đảo Trò Chơi</div>
            <div className="text-xs opacity-90 font-bold mt-0.5">
              10 mini-game vui nhộn cho bé
            </div>
          </div>
          <span className="text-white text-xl">▶️</span>
        </button>
      </div>
    </div>
  );
}
