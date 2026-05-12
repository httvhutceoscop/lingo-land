import { LEVELS, type Level } from '../data/gameData';
import { useGame } from '../context/GameContext';

type MapViewProps = {
  onPickLevel: (level: Level) => void;
};

export default function MapView({ onPickLevel }: MapViewProps) {
  const { unlockedLevels } = useGame();
  return (
    <div className="py-4 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black mb-6">Đảo Tri Thức</h2>
      <div className="space-y-4">
        {LEVELS.map((lvl) => {
          const isUnlocked = unlockedLevels.includes(lvl.id);
          return (
            <div
              key={lvl.id}
              onClick={() => isUnlocked && onPickLevel(lvl)}
              className={`island-node flex items-center p-5 bg-white border-2 ${
                isUnlocked ? 'border-slate-100 cursor-pointer shadow-sm' : 'locked'
              } rounded-3xl`}
            >
              <div className="text-4xl mr-4 bg-slate-50 w-16 h-16 flex items-center justify-center rounded-2xl">
                {isUnlocked ? lvl.icon : '🔒'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{lvl.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {lvl.words.length} TỪ VỰNG
                </p>
              </div>
              {isUnlocked && <span className="text-emerald-500">▶️</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
