import { CATEGORIES, TOTAL_SUBGROUPS } from '../data/gameData';
import { useGame } from '../context/GameContext';

type StickersViewProps = {
  onBack: () => void;
};

export default function StickersView({ onBack }: StickersViewProps) {
  const { passedSubGroups } = useGame();
  const total = TOTAL_SUBGROUPS;
  const owned = passedSubGroups.length;
  const pct = (owned / total) * 100;

  return (
    <div className="py-4 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Hồ sơ
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl bg-yellow-100 w-16 h-16 flex items-center justify-center rounded-2xl">
          🏅
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black">Sổ Sưu Tập</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {owned}/{total} huy hiệu
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>
      </div>

      {owned === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center mb-6">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm text-slate-500 font-bold">Sổ còn trống!</p>
          <p className="text-xs text-slate-400 mt-1">
            Hoàn thành 1 chủ đề để nhận huy hiệu đầu tiên.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {CATEGORIES.map((cat) => {
          const catOwned = cat.subGroups.filter((sg) => passedSubGroups.includes(sg.id)).length;
          return (
            <div key={cat.id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  {cat.title}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  {catOwned}/{cat.subGroups.length}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {cat.subGroups.map((sg) => {
                  const got = passedSubGroups.includes(sg.id);
                  return (
                    <div
                      key={sg.id}
                      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 transition-all ${
                        got
                          ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border-amber-300 shadow-sm'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className={`text-3xl mb-0.5 leading-none ${got ? '' : 'opacity-30 grayscale'}`}>
                        {got ? sg.icon : '🔒'}
                      </div>
                      <div
                        className={`text-[9px] font-bold text-center leading-tight line-clamp-2 ${
                          got ? 'text-amber-700' : 'text-slate-400'
                        }`}
                      >
                        {got ? sg.title : '???'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
