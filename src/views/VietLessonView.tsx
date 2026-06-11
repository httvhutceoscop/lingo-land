import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  generateVietQuestions,
  getStudyItems,
  type VietLesson,
  type VietQuestion,
} from '../data/vietData';
import type { GameKey } from './GameIslandsView';
import { useGame } from '../context/GameContext';
import { playSfx, speak, LANG_SPEAK_DEFAULT } from '../lib/audio';
import TestExitButton from '../components/TestExitButton';

const FEEDBACK_MS = 1000;

type Phase = 'learn' | 'playing' | 'done';

type VietLessonViewProps = {
  lesson: VietLesson;
  onBack: () => void;
  onPractice: (game: GameKey) => void;
};

export default function VietLessonView({ lesson, onBack, onPractice }: VietLessonViewProps) {
  const { addScore, markVietPassed, isVietPassed } = useGame();

  const studyItems = useMemo(() => getStudyItems(lesson), [lesson]);
  const [deck, setDeck] = useState<VietQuestion[]>(() => generateVietQuestions(lesson));
  const [phase, setPhase] = useState<Phase>('learn');
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const question = deck[idx];
  const alreadyPassedOnEntry = useMemo(() => isVietPassed(lesson.id), [lesson.id]);

  const startTest = () => {
    setDeck(generateVietQuestions(lesson));
    setPhase('playing');
    setIdx(0);
    setCorrectCount(0);
    setSelected(null);
  };

  // Đọc tiếng cần nghe mỗi khi sang câu mới (trừ những câu nhìn-là-đủ vẫn đọc được).
  useEffect(() => {
    if (phase !== 'playing' || !question) return;
    speak(question.speakText, LANG_SPEAK_DEFAULT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  const onPick = (opt: { label: string; correct: boolean }) => {
    if (selected !== null) return;
    setSelected(opt.label);
    if (opt.correct) {
      playSfx('snd-correct');
      addScore(10);
      setCorrectCount((c) => c + 1);
    } else {
      playSfx('snd-wrong');
    }
    window.setTimeout(() => {
      setSelected(null);
      if (idx + 1 < deck.length) {
        setIdx((i) => i + 1);
      } else {
        setPhase('done');
      }
    }, FEEDBACK_MS);
  };

  const pass = correctCount >= deck.length * 0.7;

  useEffect(() => {
    if (phase !== 'done') return;
    if (pass) {
      markVietPassed(lesson.id);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f97316', '#facc15'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ─────────────────────────────────────────────────────────────── LEARN
  if (phase === 'learn') {
    return (
      <div className="py-4 animate-in fade-in duration-300 max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Đảo Tiếng Việt
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="text-4xl bg-rose-50 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-rose-100">
            {lesson.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black">{lesson.title}</h2>
            <p className="text-xs text-slate-400 font-bold">{lesson.subtitle}</p>
          </div>
        </div>

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          👂 Chạm vào từng ô để nghe
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {studyItems.map((item, i) => (
            <button
              key={i}
              onClick={() => speak(item.speakText, LANG_SPEAK_DEFAULT)}
              className="p-3 bg-white border-2 border-slate-100 rounded-2xl flex flex-col items-center text-center active:scale-95 transition-all hover:border-rose-300 hover:bg-rose-50 shadow-sm"
            >
              <div className="text-4xl font-black text-slate-800 leading-tight">{item.big}</div>
              {item.sub && <div className="text-sm font-bold text-rose-600 mt-1">{item.sub}</div>}
              {item.example && (
                <div className="text-[11px] text-slate-400 font-bold mt-0.5">{item.example}</div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={startTest}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-rose-200 active:scale-95 transition-all"
        >
          Bắt đầu kiểm tra →
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── DONE
  if (phase === 'done') {
    const accuracy = Math.round((correctCount / deck.length) * 100);
    const justUnlocked = pass && !alreadyPassedOnEntry;
    return (
      <div className="text-center py-8 animate-in zoom-in duration-500 max-w-md mx-auto">
        <div className="text-7xl mb-4">{pass ? '🏆' : '😅'}</div>
        <h2 className="text-3xl font-black mb-2">{pass ? 'Tuyệt vời!' : 'Cố gắng lên!'}</h2>
        <p className="text-slate-400 mb-2">
          {pass
            ? justUnlocked
              ? 'Bạn đã mở khoá bài tiếp theo!'
              : `Bạn đã hoàn thành ${lesson.title}.`
            : 'Hãy làm lại để qua bài này nhé.'}
        </p>
        {pass && <p className="text-amber-600 text-sm font-bold mb-6">🏅 Đạt {lesson.title}</p>}
        {!pass && <div className="mb-6" />}

        <div className="bg-slate-50 rounded-3xl p-5 mb-6 grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-emerald-500">{correctCount}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Đúng</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-slate-600">{deck.length}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Tổng</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-black text-rose-500">{accuracy}%</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">Chuẩn</div>
          </div>
        </div>

        <button
          onClick={() => onPractice(lesson.practiceGame)}
          className="w-full py-4 mb-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-black shadow-lg shadow-rose-200 active:scale-95 transition-all"
        >
          🎮 Luyện tập thêm
        </button>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Quay lại
          </button>
          <button
            onClick={startTest}
            className="flex-1 py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            🔄 Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────── PLAYING
  return (
    <div className="animate-in fade-in duration-200 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-1">
        <TestExitButton onExit={onBack} />
        <span className="font-bold text-rose-500">
          {idx + 1}/{deck.length}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-rose-400 to-amber-500 transition-all duration-300"
          style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
        />
      </div>

      <div className="text-center mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          {question.question}
        </p>
        <button
          onClick={() => speak(question.speakText, LANG_SPEAK_DEFAULT)}
          className="text-6xl font-black text-slate-800 bg-rose-50 border-2 border-rose-100 rounded-3xl py-6 inline-block px-12 active:scale-95 transition-all"
          aria-label="Nghe lại"
        >
          {question.display}
        </button>
        {question.sub && (
          <p className="text-xs text-slate-400 font-bold mt-2">🔊 {question.sub}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options.map((opt) => {
          const base =
            'p-4 bg-white border-2 rounded-2xl font-bold text-center text-lg transition-all disabled:cursor-default';
          let cls: string;
          if (selected === null) {
            cls = `${base} border-slate-100 hover:border-rose-400 hover:bg-rose-50 active:scale-95`;
          } else if (opt.correct) {
            cls = `${base} border-emerald-500 bg-emerald-50 text-emerald-700`;
          } else if (opt.label === selected) {
            cls = `${base} border-red-500 bg-red-50 text-red-700`;
          } else {
            cls = `${base} border-slate-100 opacity-50`;
          }
          return (
            <button
              key={opt.label}
              disabled={selected !== null}
              onClick={() => onPick(opt)}
              className={cls}
            >
              {opt.label}
              {selected !== null && opt.correct && ' ✅'}
              {selected !== null && !opt.correct && opt.label === selected && ' ❌'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
