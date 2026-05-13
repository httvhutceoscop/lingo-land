import { useState, type KeyboardEvent } from 'react';
import { TOTAL_SUBGROUPS } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { getNextStage, getPetStage, getStageIndex, PET_NAME_MAX } from '../data/petData';

type ProfileViewProps = {
  onOpenStickers: () => void;
};

export default function ProfileView({ onOpenStickers }: ProfileViewProps) {
  const { streak, unlockedSubGroups, passedSubGroups, petName, setPetName } = useGame();
  const progressPct = (passedSubGroups.length / TOTAL_SUBGROUPS) * 100;

  const pet = getPetStage(passedSubGroups.length);
  const nextStage = getNextStage(passedSubGroups.length);
  const stageIdx = getStageIndex(pet);
  const stageProgressPct = nextStage
    ? ((passedSubGroups.length - pet.threshold) / (nextStage.threshold - pet.threshold)) * 100
    : 100;
  const toNext = nextStage ? nextStage.threshold - passedSubGroups.length : 0;

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(petName);
  const [bouncing, setBouncing] = useState(false);

  const startEdit = () => {
    setDraftName(petName);
    setEditingName(true);
  };
  const saveName = () => {
    setPetName(draftName);
    setEditingName(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') setEditingName(false);
  };

  const handleBounce = () => {
    if (bouncing) return;
    setBouncing(true);
    setTimeout(() => setBouncing(false), 600);
  };

  const handleReset = () => {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả tiến độ học tập?')) {
      localStorage.clear();
      location.reload();
    }
  };

  return (
    <div className="py-4 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-3xl p-6 mb-6 border-2 border-emerald-100 shadow-sm">
        <div className="flex justify-center mb-3">
          <button
            onClick={handleBounce}
            aria-label={`Vỗ về ${petName}`}
            className={`text-7xl select-none transition-all duration-300 cursor-pointer ${
              bouncing ? '-translate-y-3 scale-110 rotate-6' : 'hover:scale-105'
            }`}
          >
            {pet.icon}
          </button>
        </div>

        <div className="text-center">
          {editingName ? (
            <input
              autoFocus
              value={draftName}
              maxLength={PET_NAME_MAX}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={saveName}
              onKeyDown={onKeyDown}
              className="text-xl font-black text-center bg-white border-2 border-emerald-300 rounded-xl px-3 py-1 outline-none w-44"
              placeholder="Đặt tên..."
            />
          ) : (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1 text-xl font-black hover:text-emerald-600 transition-colors"
            >
              {petName}
              <span className="text-xs text-slate-300">✏️</span>
            </button>
          )}
          <p className="text-sm font-bold text-emerald-600 mt-1">
            Mức {stageIdx + 1} · {pet.name}
          </p>
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            {pet.description}
          </p>
        </div>

        {nextStage ? (
          <div className="mt-4 bg-white/70 rounded-2xl p-3">
            <div className="flex justify-between text-[10px] font-bold mb-1.5">
              <span className="text-slate-500">
                Còn {toNext} huy hiệu để tiến hoá
              </span>
              <span className="text-emerald-700">
                {nextStage.icon} {nextStage.name}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-1000"
                style={{ width: `${stageProgressPct}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
            <span className="text-xs font-bold text-amber-700">🏆 Đã đạt mức cao nhất!</span>
          </div>
        )}
      </div>

      <h2 className="text-xl font-black mb-1 text-center">Thám hiểm viên</h2>
      <p className="text-slate-400 text-sm mb-6 text-center">Trạng thái: Đang chăm chỉ học tập</p>

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

      <div className="mt-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
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
        onClick={onOpenStickers}
        className="mt-6 w-full p-5 bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-amber-200 rounded-3xl flex items-center gap-4 active:scale-95 transition-all text-left"
      >
        <div className="text-3xl bg-white w-14 h-14 flex items-center justify-center rounded-2xl border-2 border-amber-200">
          🏅
        </div>
        <div className="flex-1">
          <div className="font-black text-amber-800">Sổ Sưu Tập</div>
          <div className="text-[11px] text-amber-600 font-bold">
            {passedSubGroups.length}/{TOTAL_SUBGROUPS} huy hiệu đã nhận
          </div>
        </div>
        <span className="text-amber-500 text-xl">▶️</span>
      </button>

      <button
        onClick={handleReset}
        className="mt-12 w-full text-red-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 transition-colors text-center"
      >
        Xóa sạch dữ liệu & Chơi lại
      </button>
    </div>
  );
}
