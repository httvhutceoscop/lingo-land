import { CATEGORIES, TOTAL_SUBGROUPS, type Category } from '../data/gameData';
import { useGame } from '../context/GameContext';

type KnowledgeIslandsViewProps = {
  onPickCategory: (category: Category) => void;
  onBack: () => void;
};

export default function KnowledgeIslandsView({
  onPickCategory,
  onBack,
}: KnowledgeIslandsViewProps) {
  const { passedSubGroups } = useGame();
  const totalDone = passedSubGroups.length;
  const overallPct = (totalDone / TOTAL_SUBGROUPS) * 100;

  return (
    <div className="py-4 animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Bản đồ
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-black mb-1 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
          🏝️ Đảo Tri Thức
        </h2>
        <p className="text-slate-500 text-sm font-bold mb-3">
          Khám phá từng hòn đảo, học hết từ vựng để mở khoá nhãn dán.
        </p>
        <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tiến độ tổng quát
            </span>
            <span className="font-black text-emerald-500">
              {totalDone}
              <span className="text-slate-300 font-bold">/{TOTAL_SUBGROUPS}</span>
            </span>
          </div>
          <div className="w-full bg-white h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

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
