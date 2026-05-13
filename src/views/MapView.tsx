import { CATEGORIES, type Category } from '../data/gameData';
import { useGame } from '../context/GameContext';

type MapViewProps = {
  onPickCategory: (category: Category) => void;
  onPickChallenge: () => void;
  onPickReview: () => void;
};

export default function MapView({
  onPickCategory,
  onPickChallenge,
  onPickReview,
}: MapViewProps) {
  const { passedSubGroups, timeHighScore, dueDeck } = useGame();
  const dueCount = dueDeck.length;

  return (
    <div className="py-4 animate-in fade-in duration-500">
      {dueCount > 0 && (
        <button
          onClick={onPickReview}
          className="w-full mb-3 p-4 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-4 text-left"
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
        onClick={onPickChallenge}
        className="w-full mb-6 p-5 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-3xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center gap-4 text-left"
      >
        <div className="text-5xl floating">🔥</div>
        <div className="flex-1 text-white">
          <div className="font-black text-lg leading-tight">Thử thách 60 giây</div>
          <div className="text-xs opacity-90 font-bold mt-0.5">
            Trả lời thật nhanh, ăn nhiều sao!
          </div>
          {timeHighScore > 0 && (
            <div className="text-[10px] mt-1 font-bold bg-white/20 inline-block px-2 py-0.5 rounded-full">
              🏆 Kỷ lục: {timeHighScore} câu
            </div>
          )}
        </div>
        <span className="text-white text-xl">▶️</span>
      </button>

      <h2 className="text-2xl font-black mb-4">Đảo Tri Thức</h2>
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const doneCount = cat.subGroups.filter((sg) =>
            passedSubGroups.includes(sg.id)
          ).length;
          const total = cat.subGroups.length;
          const pct = (doneCount / total) * 100;
          return (
            <div
              key={cat.id}
              onClick={() => onPickCategory(cat)}
              className="island-node flex items-center p-5 bg-white border-2 border-slate-100 rounded-3xl cursor-pointer shadow-sm"
            >
              <div className="text-4xl mr-4 bg-slate-50 w-16 h-16 flex items-center justify-center rounded-2xl">
                {cat.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{cat.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  {doneCount}/{total} đã hoàn thành
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-emerald-500 ml-3">▶️</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
