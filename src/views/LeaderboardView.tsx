import { useGame } from '../context/GameContext';

export default function LeaderboardView() {
  const { score } = useGame();
  return (
    <div className="py-4 animate-in slide-in-from-bottom duration-500">
      <h2 className="text-2xl font-black mb-6">Bảng Xếp Hạng</h2>
      <div className="space-y-3">
        <div className="flex items-center p-4 bg-yellow-50 border-2 border-yellow-100 rounded-2xl shadow-sm">
          <span className="text-2xl mr-4">🥇</span>
          <div className="flex-1">
            <div className="font-bold text-yellow-800">Bạn (Thám hiểm viên)</div>
            <div className="text-[10px] font-bold text-yellow-600 uppercase">Rank: Master</div>
          </div>
          <div className="font-black text-yellow-600 text-lg">{score}</div>
        </div>
        <div className="flex items-center p-4 bg-white border border-slate-100 rounded-2xl opacity-70">
          <span className="text-2xl mr-4">🥈</span>
          <div className="flex-1 font-bold">Alex English</div>
          <div className="font-black text-slate-400">2,450</div>
        </div>
        <div className="flex items-center p-4 bg-white border border-slate-100 rounded-2xl opacity-70">
          <span className="text-2xl mr-4">🥉</span>
          <div className="flex-1 font-bold">Mochi Chan</div>
          <div className="font-black text-slate-400">1,980</div>
        </div>
        <div className="flex items-center p-4 bg-white border border-slate-100 rounded-2xl opacity-50">
          <span className="text-2xl mr-4">4</span>
          <div className="flex-1 font-bold">John Doe</div>
          <div className="font-black text-slate-400">850</div>
        </div>
      </div>
    </div>
  );
}
