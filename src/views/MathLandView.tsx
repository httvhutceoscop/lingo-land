import { MATH_LEVELS, type MathLevel } from '../data/mathData';
import { useGame } from '../context/GameContext';

type MathLandViewProps = {
  onPickLevel: (level: MathLevel) => void;
  onBack: () => void;
};

const KIND_BADGE: Record<MathLevel['kind'], string> = {
  symbols: 'bg-indigo-50 text-indigo-700',
  compute: 'bg-purple-50 text-purple-700',
};

const KIND_LABEL: Record<MathLevel['kind'], string> = {
  symbols: 'Nhận diện',
  compute: 'Tính toán',
};

export default function MathLandView({ onPickLevel, onBack }: MathLandViewProps) {
  const { isMathUnlocked, isMathPassed, mathPassed } = useGame();
  const total = MATH_LEVELS.length;
  const doneCount = mathPassed.length;

  return (
    <div className="py-4 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Bản đồ
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl bg-purple-50 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-purple-100">
          🧮
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black">Đảo Toán Học</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            {doneCount}/{total} đã hoàn thành
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full transition-all duration-500"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {MATH_LEVELS.map((lvl) => {
          const unlocked = isMathUnlocked(lvl.id);
          const passed = isMathPassed(lvl.id);
          return (
            <div
              key={lvl.id}
              onClick={() => unlocked && onPickLevel(lvl)}
              className={`island-node flex items-center p-4 bg-white border-2 ${
                unlocked ? 'border-slate-100 cursor-pointer shadow-sm' : 'locked'
              } rounded-2xl`}
            >
              <div className="text-3xl mr-4 bg-slate-50 w-14 h-14 flex items-center justify-center rounded-2xl">
                {unlocked ? lvl.icon : '🔒'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold flex items-center gap-2">
                  {unlocked ? lvl.title : '???'}
                  {passed && <span className="text-amber-500 text-base">🏅</span>}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${KIND_BADGE[lvl.kind]}`}
                  >
                    {KIND_LABEL[lvl.kind]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {lvl.questionCount} câu
                  </span>
                </div>
              </div>
              {unlocked && <span className="text-purple-500">▶️</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
