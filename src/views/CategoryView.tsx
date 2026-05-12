import type { Category, SubGroup, TestMode } from '../data/gameData';
import { useGame } from '../context/GameContext';

type CategoryViewProps = {
  category: Category;
  onPickSubGroup: (subGroup: SubGroup) => void;
  onBack: () => void;
};

const MODE_LABEL: Record<TestMode, string> = {
  quiz: 'Trắc nghiệm',
  matching: 'Nối từ',
  listening: 'Nghe đoán',
  typing: 'Gõ chính tả',
};

const MODE_BADGE: Record<TestMode, string> = {
  quiz: 'bg-emerald-50 text-emerald-700',
  matching: 'bg-purple-50 text-purple-700',
  listening: 'bg-blue-50 text-blue-700',
  typing: 'bg-orange-50 text-orange-700',
};

export default function CategoryView({ category, onPickSubGroup, onBack }: CategoryViewProps) {
  const { isUnlocked } = useGame();

  return (
    <div className="py-4 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Bản đồ
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl bg-slate-50 w-16 h-16 flex items-center justify-center rounded-2xl">
          {category.icon}
        </div>
        <div>
          <h2 className="text-2xl font-black">{category.title}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {category.subGroups.length} chủ đề nhỏ
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {category.subGroups.map((sg) => {
          const unlocked = isUnlocked(sg.id);
          return (
            <div
              key={sg.id}
              onClick={() => unlocked && onPickSubGroup(sg)}
              className={`island-node flex items-center p-4 bg-white border-2 ${
                unlocked ? 'border-slate-100 cursor-pointer shadow-sm' : 'locked'
              } rounded-2xl`}
            >
              <div className="text-3xl mr-4 bg-slate-50 w-14 h-14 flex items-center justify-center rounded-2xl">
                {unlocked ? sg.icon : '🔒'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{sg.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${MODE_BADGE[sg.mode]}`}
                  >
                    {MODE_LABEL[sg.mode]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {sg.words.length} từ
                  </span>
                </div>
              </div>
              {unlocked && <span className="text-emerald-500">▶️</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
