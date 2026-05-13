import { useGame } from '../context/GameContext';
import { getPetStage } from '../data/petData';

export default function Header() {
  const { score, streak, passedSubGroups, petName } = useGame();
  const pet = getPetStage(passedSubGroups.length);

  return (
    <header className="p-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-center text-2xl floating"
          aria-label={`${petName}, ${pet.name}`}
        >
          {pet.icon}
        </div>
        <div className="leading-tight">
          <h1 className="font-black text-base text-emerald-700">{petName}</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {pet.name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 font-bold">
        <div className="flex items-center gap-1 text-orange-500">
          <span>🔥</span> <span>{streak}</span>
        </div>
        <div className="flex items-center gap-1 text-yellow-500">
          <span>⭐</span> <span>{score}</span>
        </div>
      </div>
    </header>
  );
}
