import { VIET_LESSONS, type VietLesson } from '../data/vietData';
import { useGame } from '../context/GameContext';

type VietLandViewProps = {
  onPickLesson: (lesson: VietLesson) => void;
  onBack: () => void;
};

const KIND_LABEL: Record<VietLesson['kind'], string> = {
  alphabet: 'Chữ cái',
  blend: 'Ghép âm',
  rhyme: 'Ghép vần',
  tone: 'Thanh điệu',
  reading: 'Tập đọc',
};

export default function VietLandView({ onPickLesson, onBack }: VietLandViewProps) {
  const { isVietUnlocked, isVietPassed, vietPassed } = useGame();
  const total = VIET_LESSONS.length;
  const doneCount = vietPassed.length;

  return (
    <div className="py-4 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Bản đồ
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl bg-rose-50 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-rose-100">
          🇻🇳
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black">Đảo Tiếng Việt</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            {doneCount}/{total} đã hoàn thành
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-amber-500 h-full transition-all duration-500"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {VIET_LESSONS.map((lesson) => {
          const unlocked = isVietUnlocked(lesson.id);
          const passed = isVietPassed(lesson.id);
          return (
            <div
              key={lesson.id}
              onClick={() => unlocked && onPickLesson(lesson)}
              className={`island-node flex items-center p-4 bg-white border-2 ${
                unlocked ? 'border-slate-100 cursor-pointer shadow-sm' : 'locked'
              } rounded-2xl`}
            >
              <div className="text-3xl mr-4 bg-slate-50 w-14 h-14 flex items-center justify-center rounded-2xl">
                {unlocked ? lesson.icon : '🔒'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold flex items-center gap-2">
                  {unlocked ? lesson.title : '???'}
                  {passed && <span className="text-amber-500 text-base">🏅</span>}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                    {KIND_LABEL[lesson.kind]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {unlocked ? lesson.subtitle : 'chưa mở khoá'}
                  </span>
                </div>
              </div>
              {unlocked && <span className="text-rose-500">▶️</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
