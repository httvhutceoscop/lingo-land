import { TOTAL_SUBGROUPS } from '../data/gameData';
import { useGame } from '../context/GameContext';

export default function ProfileView() {
  const { streak, unlockedSubGroups } = useGame();
  const progressPct = (unlockedSubGroups.length / TOTAL_SUBGROUPS) * 100;

  const handleReset = () => {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả tiến độ học tập?')) {
      localStorage.clear();
      location.reload();
    }
  };

  return (
    <div className="py-4 text-center animate-in fade-in duration-500">
      <div className="relative inline-block mb-6">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-lg">
          👤
        </div>
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-xs">
          ⭐
        </div>
      </div>
      <h2 className="text-2xl font-black mb-1">Thám hiểm viên</h2>
      <p className="text-slate-400 text-sm mb-8">Trạng thái: Đang chăm chỉ học tập</p>

      <div className="grid grid-cols-2 gap-4 text-left">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-orange-500 text-2xl font-black">{streak}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Streak Hiện Tại
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-emerald-500 text-2xl font-black">
            {unlockedSubGroups.length}/{TOTAL_SUBGROUPS}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Chủ đề đã mở
          </div>
        </div>
      </div>

      <div className="mt-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-sm">Tiến độ tổng quát</span>
          <span className="text-xs font-black text-emerald-600">{Math.round(progressPct)}%</span>
        </div>
        <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-slate-200">
          <div
            className="bg-emerald-500 h-full transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="mt-12 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
      >
        Xóa sạch dữ liệu & Chơi lại
      </button>
    </div>
  );
}
