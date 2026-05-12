import type { Word } from '../data/gameData';

type FlashcardProps = {
  word: Word;
  flipped: boolean;
  onFlip: () => void;
};

export default function Flashcard({ word, flipped, onFlip }: FlashcardProps) {
  return (
    <div
      onClick={onFlip}
      className="w-full aspect-square max-w-[280px] perspective-1000 cursor-pointer"
    >
      <div className={`card-inner w-full h-full relative ${flipped ? 'flipped' : ''}`}>
        <div className="card-front bg-white border-2 border-slate-100 rounded-[2rem] flex flex-col items-center justify-center p-6 shadow-xl">
          <div className="text-8xl mb-4 floating">{word.img}</div>
          <h2 className="text-4xl font-black mb-2 text-center">{word.en}</h2>
          <p className="text-slate-400 font-mono italic">{word.ipa}</p>
          <p className="mt-8 text-[10px] font-bold text-slate-300 uppercase animate-pulse tracking-widest">
            Chạm để lật
          </p>
        </div>
        <div className="card-back bg-emerald-500 border-2 border-emerald-600 rounded-[2rem] flex flex-col items-center justify-center p-6 shadow-xl text-white">
          <h2 className="text-3xl font-black mb-4">{word.vi}</h2>
          <p className="text-sm opacity-90 leading-relaxed italic text-center">"{word.ex}"</p>
        </div>
      </div>
    </div>
  );
}
