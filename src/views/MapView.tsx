import { CATEGORIES, type Category } from '../data/gameData';
import { TOTAL_MATH_LEVELS } from '../data/mathData';
import { useGame } from '../context/GameContext';

type MapViewProps = {
  onPickCategory: (category: Category) => void;
  onPickChallenge: () => void;
  onPickReview: () => void;
  onPickMath: () => void;
  onPickNumberPop: () => void;
  onPickFeedAnimal: () => void;
};

export default function MapView({
  onPickCategory,
  onPickChallenge,
  onPickReview,
  onPickMath,
  onPickNumberPop,
  onPickFeedAnimal,
}: MapViewProps) {
  const { passedSubGroups, timeHighScore, dueDeck, mathPassed } = useGame();
  const dueCount = dueDeck.length;
  const mathDone = mathPassed.length;

  return (
    <div className="py-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {dueCount > 0 && (
          <button
            onClick={onPickReview}
            className="w-full p-4 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-4 text-left"
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
          onClick={onPickFeedAnimal}
          className="w-full p-5 bg-gradient-to-br from-amber-400 via-pink-500 to-rose-500 rounded-3xl shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center gap-4 text-left"
        >
          <div className="text-5xl floating">🐰</div>
          <div className="flex-1 text-white">
            <div className="font-black text-lg leading-tight">Cho thú ăn</div>
            <div className="text-xs opacity-90 font-bold mt-0.5">
              Kéo món ăn đúng vào con vật đang đói
            </div>
          </div>
          <span className="text-white text-xl">▶️</span>
        </button>

        <button
          onClick={onPickNumberPop}
          className="w-full p-5 bg-gradient-to-br from-pink-400 via-fuchsia-500 to-blue-500 rounded-3xl shadow-lg shadow-pink-200 active:scale-95 transition-all flex items-center gap-4 text-left"
        >
          <div className="text-5xl floating">🎈</div>
          <div className="flex-1 text-white">
            <div className="font-black text-lg leading-tight">Number Pop</div>
            <div className="text-xs opacity-90 font-bold mt-0.5">
              Chạm để nổ bong bóng có số đúng
            </div>
          </div>
          <span className="text-white text-xl">▶️</span>
        </button>

        <button
          onClick={onPickChallenge}
          className="w-full p-5 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-3xl shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center gap-4 text-left"
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
      </div>

      <h2 className="text-2xl font-black mb-4">Đảo Tri Thức</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
