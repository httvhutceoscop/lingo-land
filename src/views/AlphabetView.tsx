import { useMemo } from 'react';
import { ALL_WORDS } from '../data/gameData';
import { speak } from '../lib/audio';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type AlphabetViewProps = {
  onBack: () => void;
};

export default function AlphabetView({ onBack }: AlphabetViewProps) {
  const exampleByLetter = useMemo(() => {
    const map: Record<string, string> = {};
    for (const w of ALL_WORDS) {
      const first = w.en[0]?.toUpperCase();
      if (first && !map[first]) {
        map[first] = w.en;
      }
    }
    return map;
  }, []);

  return (
    <div className="py-4 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Quay lại
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-blue-100">
          🔤
        </div>
        <div>
          <h2 className="text-2xl font-black">Bảng chữ cái</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Chạm để nghe phát âm
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {ALPHABET.map((letter) => {
          const example = exampleByLetter[letter];
          return (
            <button
              key={letter}
              onClick={() => speak(letter.toLowerCase())}
              aria-label={`Phát âm chữ ${letter}`}
              className="aspect-square bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-100 rounded-3xl p-2 flex flex-col items-center justify-center active:scale-95 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="font-black text-5xl text-slate-800 leading-none mb-1">
                {letter}
                <span className="text-slate-400">{letter.toLowerCase()}</span>
              </div>
              <div className="text-[10px] font-bold text-blue-600 truncate max-w-full">
                {example ?? '—'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-bold">💡 Mẹo:</span> Phát âm tên chữ cái khác phát âm
          phoneme. Để học cách đọc âm trong từ, xem{' '}
          <span className="font-bold">tab Phát âm 🔤</span> ở bottom nav.
        </p>
      </div>
    </div>
  );
}
