import { useGame } from '../context/GameContext';

export default function Header() {
  const { score, streak } = useGame();
  return (
    <header className="p-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-black">
          L
        </div>
        <h1 className="font-black text-xl text-emerald-600 tracking-tight">LingoLand</h1>
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
