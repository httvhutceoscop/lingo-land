import { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { ALL_WORDS, type Word } from '../data/gameData';
import { useGame } from '../context/GameContext';
import { playSfx, speak } from '../lib/audio';
import { MAX_LEVEL, nextLevel } from '../data/srsData';

const FEEDBACK_MS = 1100;

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function buildOptions(word: Word): string[] {
  const opts = [word.vi];
  while (opts.length < 4) {
    const r = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)].vi;
    if (!opts.includes(r)) opts.push(r);
  }
  return shuffle(opts);
}

type Phase = 'intro' | 'playing' | 'done';

type DailyReviewViewProps = {
  onBack: () => void;
};

export default function DailyReviewView({ onBack }: DailyReviewViewProps) {
  const { dueDeck, wordStats, recordReview, addScore } = useGame();

  // snapshot deck at mount so the in-session list doesn't shrink as stats update
  const [deck] = useState<Word[]>(() => dueDeck);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [leveledUp, setLeveledUp] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const word = deck[currentIdx];
  const options = useMemo(() => (word ? buildOptions(word) : []), [word]);
  const currentLevel = word ? (wordStats[word.en]?.level ?? 0) : 0;

  const startReview = () => {
    if (deck.length === 0) return;
    setPhase('playing');
    setCurrentIdx(0);
    setCorrectCount(0);
    setLeveledUp(0);
    setSelected(null);
  };

  const handleSelect = (opt: string) => {
    if (selected || !word) return;
    setSelected(opt);
    const isCorrect = opt === word.vi;
    if (isCorrect) {
      playSfx('snd-correct');
      addScore(10);
      setCorrectCount((c) => c + 1);
      if (nextLevel(currentLevel, true) > currentLevel) {
        setLeveledUp((n) => n + 1);
      }
    } else {
      playSfx('snd-wrong');
    }
    recordReview(word.en, isCorrect);

    window.setTimeout(() => {
      setSelected(null);
      if (currentIdx + 1 < deck.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setPhase('done');
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#facc15'],
        });
      }
    }, FEEDBACK_MS);
  };

  // ─────────────────────────────────────────────────────────────────────
  // INTRO
  if (phase === 'intro') {
    return (
      <div className="animate-in fade-in duration-500">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>

        <div className="text-center py-4">
          <div className="text-6xl mb-4 floating">📚</div>
          <h2 className="text-2xl font-black mb-2 bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
            Ôn tập hàng ngày
          </h2>

          {deck.length === 0 ? (
            <>
              <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
                Hôm nay không có từ nào cần ôn. Hãy quay lại vào ngày mai hoặc học
                thêm chủ đề mới trên bản đồ!
              </p>
              <button
                onClick={onBack}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
              >
                Quay lại bản đồ
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
                Ôn lại từ vựng để khắc ghi vào trí nhớ lâu dài. Trả lời đúng để từ
                được nhớ lâu hơn.
              </p>

              <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-3xl p-5 mb-6">
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                  Hôm nay cần ôn
                </div>
                <div className="text-5xl font-black text-blue-600">
                  {deck.length}{' '}
                  <span className="text-sm font-bold text-blue-400">từ</span>
                </div>
              </div>

              <button
                onClick={startReview}
                className="w-full py-5 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                ✏️ Bắt đầu ôn
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // DONE
  if (phase === 'done') {
    const accuracy = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500">
        <div className="text-7xl mb-4">{correctCount >= deck.length * 0.7 ? '🎉' : '🌱'}</div>
        <h2 className="text-3xl font-black mb-2">
          {correctCount >= deck.length * 0.7 ? 'Tốt lắm!' : 'Tiếp tục cố gắng!'}
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Bạn đã ôn xong {deck.length} từ hôm nay.
        </p>

        <div className="bg-slate-50 rounded-3xl p-5 mb-6 grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-emerald-500">{correctCount}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Đúng</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-blue-500">{leveledUp}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Thăng cấp</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-orange-500">{accuracy}%</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Chuẩn</div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6 italic">
          Những từ làm đúng sẽ ít xuất hiện hơn. Từ làm sai sẽ quay lại sớm.
        </p>

        <button
          onClick={onBack}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
        >
          Hoàn tất
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // PLAYING
  if (!word) return null;
  const levelDots = Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i);

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">
          ÔN TẬP HÀNG NGÀY
        </span>
        <span className="font-bold text-blue-500">
          {currentIdx + 1}/{deck.length}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-emerald-500 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / deck.length) * 100}%` }}
        />
      </div>

      <div className="text-6xl text-center mb-3">{word.img}</div>
      <h2 className="text-2xl font-black text-center mb-1">{word.en}</h2>
      <button
        onClick={() => speak(word.en)}
        aria-label="Phát âm"
        className="block mx-auto text-blue-500 text-sm font-bold mb-2 hover:text-blue-700"
      >
        🔊 Nghe
      </button>

      <div className="flex justify-center gap-1 mb-6">
        {levelDots.map((lvl) => (
          <span
            key={lvl}
            className={`w-2 h-2 rounded-full ${
              lvl <= currentLevel ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
            aria-label={`Cấp ${lvl}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt) => {
          const isAnswer = opt === word.vi;
          const isWrongPick = selected === opt && !isAnswer;
          const base =
            'p-4 bg-white border-2 rounded-2xl font-bold text-left transition-all flex justify-between items-center disabled:cursor-default';
          const cls = !selected
            ? `${base} border-slate-100 hover:border-blue-400 hover:bg-blue-50`
            : isAnswer
              ? `${base} border-emerald-500 bg-emerald-50 text-emerald-700`
              : isWrongPick
                ? `${base} border-red-500 bg-red-50 text-red-700`
                : `${base} border-slate-100 opacity-50`;
          return (
            <button
              key={opt}
              disabled={!!selected}
              onClick={() => handleSelect(opt)}
              className={cls}
            >
              <span>{opt}</span>
              <span>
                {!selected ? '' : isAnswer ? '✅' : isWrongPick ? '❌' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
