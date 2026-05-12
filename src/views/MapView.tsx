import { CATEGORIES, type Category } from '../data/gameData';
import { useGame } from '../context/GameContext';

type MapViewProps = {
  onPickCategory: (category: Category) => void;
};

export default function MapView({ onPickCategory }: MapViewProps) {
  const { unlockedSubGroups } = useGame();

  return (
    <div className="py-4 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black mb-6">Đảo Tri Thức</h2>
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const openCount = cat.subGroups.filter((sg) =>
            unlockedSubGroups.includes(sg.id)
          ).length;
          const total = cat.subGroups.length;
          const pct = (openCount / total) * 100;
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
                  {total} chủ đề nhỏ
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
