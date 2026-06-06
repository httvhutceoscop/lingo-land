/* ──────────────────────────────────────────────────────────────────────────
 * GAME "HÀNH TRÌNH ĐẾN TRƯỜNG" (Game Island)
 *
 * Bé chuẩn bị vào lớp 1: tạo nhân vật rồi đi qua 5 chương nhiệm vụ (chuẩn bị →
 * trên đường → trong lớp → kết bạn → kết thúc ngày học). 2 loại tương tác: chọn
 * 1 đáp án ('choice') và chọn đúng tập đồ vật ('pick' — xếp cặp). Có gợi ý 💡,
 * combo, sao, thành tích, sticker và bảng phụ huynh.
 *
 * KIẾN TRÚC (so với prompt gốc):
 *   - Prompt đề xuất React Konva. Đây là chuỗi nhiệm vụ CHẠM, repo dùng
 *     HTML/Tailwind là phù hợp; hiệu ứng CSS + canvas-confetti.
 *
 * localStorage (prefix `lingoland_`):
 *   - lingoland_school_stats    : JSON {completions, timeMs}
 *   - lingoland_school_missions : JSON string[] — id nhiệm vụ đã hoàn thành
 *   - lingoland_school_chapters : JSON string[] — id chương đã hoàn thành
 *   - lingoland_school_char     : JSON {avatar, color}
 * ────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  GAME_CONFIG,
  CHAPTERS,
  AVATARS,
  BAG_COLORS,
  ACHIEVEMENTS,
  STICKERS,
  TOTAL_CHAPTERS,
  type Chapter,
  type Mission,
  type SchoolStats,
  type AchievementCtx,
} from '../data/schoolJourneyData';
import { speak, LANG_SPEAK_DEFAULT, playSfx } from '../lib/audio';
import { playTing, playBip, playPop } from '../lib/beep';

type Props = { onBack: () => void };

type Phase = 'character' | 'map' | 'playing' | 'collection' | 'parent';

const STATS_KEY = 'lingoland_school_stats';
const MISSIONS_KEY = 'lingoland_school_missions';
const CHAPTERS_KEY = 'lingoland_school_chapters';
const CHAR_KEY = 'lingoland_school_char';

const CONFETTI_COLORS = ['#7dd3fc', '#a7f3d0', '#fde68a', '#fdba74', '#f9a8d4'];
const PRAISES = ['Giỏi quá!', 'Tuyệt vời!', 'Con làm đúng rồi!', 'Xuất sắc!'];

const { INITIAL_HINTS, SCORE_PER_MISSION, PERFECT_BONUS, COMBO_N, COMBO_BONUS, LEVEL_COMPLETE_DELAY } = GAME_CONFIG;

/* ===========================================================================
 * localStorage helpers
 * ========================================================================= */

const loadStats = (): SchoolStats => {
  try {
    const p = JSON.parse(localStorage.getItem(STATS_KEY) ?? '');
    return { completions: p?.completions || 0, timeMs: p?.timeMs || 0 };
  } catch {
    return { completions: 0, timeMs: 0 };
  }
};
const saveStats = (s: SchoolStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};
const loadSet = (key: string): Set<string> => {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(p) ? new Set(p.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
};
const saveSet = (key: string, s: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
};

interface CharData {
  avatar: string;
  color: string;
}
const loadChar = (): CharData | null => {
  try {
    const p = JSON.parse(localStorage.getItem(CHAR_KEY) ?? 'null');
    return p && typeof p.avatar === 'string' ? { avatar: p.avatar, color: p.color || 'blue' } : null;
  } catch {
    return null;
  }
};
const saveChar = (c: CharData) => {
  try {
    localStorage.setItem(CHAR_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
};

/* ===========================================================================
 * Tiện ích
 * ========================================================================= */

const PRAISE = () => PRAISES[Math.floor(Math.random() * PRAISES.length)];
const fmtTime = (ms: number) => `${Math.round(ms / 60000)} phút`;
const bagClass = (id: string) => BAG_COLORS.find((c) => c.id === id)?.class ?? 'bg-sky-400';

/** So sánh tập đã chọn với tập đúng (đủ và không thừa). */
const sameSet = (selected: Set<string>, correct: string[]): boolean =>
  selected.size === correct.length && correct.every((id) => selected.has(id));

export default function SchoolJourneyView({ onBack }: Props) {
  /* ── Điều hướng (nếu chưa có nhân vật → vào màn tạo nhân vật) ─────────── */
  const initialChar = loadChar();
  const [phase, setPhase] = useState<Phase>(initialChar ? 'map' : 'character');
  const [character, setCharacter] = useState<CharData>(initialChar ?? { avatar: AVATARS[0], color: 'blue' });

  /* ── State phiên ─────────────────────────────────────────────────────── */
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [missionIndex, setMissionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  /* ── State 1 nhiệm vụ ────────────────────────────────────────────────── */
  const [wrongIds, setWrongIds] = useState<string[]>([]); // lựa chọn sai (choice) / mục sai (pick)
  const [selected, setSelected] = useState<Set<string>>(new Set()); // pick: đang chọn
  const [hintIds, setHintIds] = useState<string[]>([]); // gợi ý: làm sáng đáp án đúng
  const [hintsLeft, setHintsLeft] = useState<number>(INITIAL_HINTS);
  const [result, setResult] = useState<{ stars: number; feedback: string } | null>(null);
  const [chapterDone, setChapterDone] = useState<Chapter | null>(null);

  const mistakesRef = useRef(0);
  const missionStartRef = useRef(0);
  const lockRef = useRef(false);

  /* ── Tiến độ lưu ─────────────────────────────────────────────────────── */
  const statsRef = useRef<SchoolStats>(loadStats());
  const missionsRef = useRef<Set<string>>(loadSet(MISSIONS_KEY));
  const chaptersRef = useRef<Set<string>>(loadSet(CHAPTERS_KEY));
  const [stats, setStats] = useState<SchoolStats>(() => statsRef.current);
  const [missionsDone, setMissionsDone] = useState<Set<string>>(() => missionsRef.current);
  const [chaptersDone, setChaptersDone] = useState<Set<string>>(() => chaptersRef.current);
  const [toast, setToast] = useState<{ emoji: string; text: string } | null>(null);

  /* ── Timer cleanup ───────────────────────────────────────────────────── */
  const timersRef = useRef<number[]>([]);
  const addTimer = (id: number) => timersRef.current.push(id);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const mission: Mission | undefined = chapter?.missions[missionIndex];

  /* ── Toast + xét mở khoá ─────────────────────────────────────────────── */
  const showToast = useCallback((emoji: string, text: string) => {
    setToast({ emoji, text });
    const t = window.setTimeout(() => setToast(null), 2600);
    addTimer(t);
  }, []);
  const makeCtx = useCallback(
    (): AchievementCtx => ({ ...statsRef.current, missionsDone: missionsRef.current, chapters: chaptersRef.current }),
    [],
  );
  const announceUnlocks = useCallback(
    (prev: AchievementCtx) => {
      const next = makeCtx();
      const a = ACHIEVEMENTS.find((x) => !x.unlocked(prev) && x.unlocked(next));
      if (a) {
        showToast(a.emoji, `Mở khoá: ${a.name}`);
        return;
      }
      const s = STICKERS.find((x) => !x.unlocked(prev) && x.unlocked(next));
      if (s) showToast(s.emoji, `Sticker mới: ${s.name}`);
    },
    [makeCtx, showToast],
  );

  /* ── Nạp một nhiệm vụ ────────────────────────────────────────────────── */
  const loadMission = useCallback((m: Mission) => {
    setWrongIds([]);
    setSelected(new Set());
    setHintIds([]);
    setHintsLeft(INITIAL_HINTS);
    setResult(null);
    mistakesRef.current = 0;
    missionStartRef.current = Date.now();
    lockRef.current = false;
    const t = window.setTimeout(() => speak(m.prompt, LANG_SPEAK_DEFAULT), 350);
    addTimer(t);
  }, []);

  /* ── Bắt đầu một chương ──────────────────────────────────────────────── */
  const startChapter = useCallback(
    (c: Chapter) => {
      clearTimers();
      setChapter(c);
      setMissionIndex(0);
      setScore(0);
      setCombo(0);
      setChapterDone(null);
      setPhase('playing');
      loadMission(c.missions[0]);
    },
    [clearTimers, loadMission],
  );

  /* ── Hoàn thành nhiệm vụ → tính sao, điểm, sang nhiệm vụ kế ───────────── */
  const completeMission = useCallback(() => {
    if (!mission || !chapter) return;
    lockRef.current = true;
    const stars = mistakesRef.current === 0 ? 3 : mistakesRef.current < 3 ? 2 : 1;

    // Điểm + combo.
    const newCombo = combo + 1;
    setCombo(newCombo);
    let gained = SCORE_PER_MISSION + (mistakesRef.current === 0 ? PERFECT_BONUS : 0);
    if (newCombo > 0 && newCombo % COMBO_N === 0) gained += COMBO_BONUS;
    setScore((s) => s + gained);

    // Thống kê.
    const prevCtx = makeCtx();
    const ns: SchoolStats = {
      completions: statsRef.current.completions + 1,
      timeMs: statsRef.current.timeMs + (Date.now() - missionStartRef.current),
    };
    statsRef.current = ns;
    setStats(ns);
    saveStats(ns);
    const nextMissions = new Set(missionsRef.current);
    nextMissions.add(mission.id);
    missionsRef.current = nextMissions;
    setMissionsDone(nextMissions);
    saveSet(MISSIONS_KEY, nextMissions);
    announceUnlocks(prevCtx);

    confetti({ particleCount: 70, spread: 75, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
    playSfx('snd-correct');
    playTing();
    const praise = PRAISE();
    setResult({ stars, feedback: praise });
    speak(praise, LANG_SPEAK_DEFAULT);

    // Sang nhiệm vụ kế / hoàn thành chương.
    const t = window.setTimeout(() => {
      if (missionIndex + 1 < chapter.missions.length) {
        setMissionIndex((i) => i + 1);
        loadMission(chapter.missions[missionIndex + 1]);
      } else {
        // Hoàn thành chương → huy hiệu.
        const prev = makeCtx();
        const nextChapters = new Set(chaptersRef.current);
        nextChapters.add(chapter.id);
        chaptersRef.current = nextChapters;
        setChaptersDone(nextChapters);
        saveSet(CHAPTERS_KEY, nextChapters);
        announceUnlocks(prev);
        confetti({ particleCount: 220, spread: 120, origin: { y: 0.5 }, colors: CONFETTI_COLORS });
        speak(`Hoàn thành ${chapter.title}! Bé giỏi quá!`, LANG_SPEAK_DEFAULT);
        setChapterDone(chapter);
      }
    }, LEVEL_COMPLETE_DELAY);
    addTimer(t);
  }, [mission, chapter, combo, missionIndex, makeCtx, announceUnlocks, loadMission]);

  /* ── Ghi nhận một lần chọn SAI (rung + đếm lỗi) ──────────────────────── */
  const registerWrong = useCallback((badId: string) => {
    mistakesRef.current += 1;
    setCombo(0);
    playSfx('snd-wrong');
    playBip();
    setWrongIds((w) => (w.includes(badId) ? w : [...w, badId]));
    const t = window.setTimeout(() => setWrongIds((w) => w.filter((x) => x !== badId)), 500);
    addTimer(t);
  }, []);

  /* ── CHOICE: chạm một lựa chọn ───────────────────────────────────────── */
  const handleChoice = (optId: string) => {
    if (!mission || mission.type !== 'choice' || lockRef.current) return;
    if (optId === mission.answerId) {
      completeMission();
    } else {
      registerWrong(optId);
    }
  };

  /* ── PICK: bật/tắt chọn một món; "Xong" để kiểm tra ──────────────────── */
  const toggleItem = (itemId: string) => {
    if (!mission || mission.type !== 'pick' || lockRef.current) return;
    playPop();
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(itemId)) n.delete(itemId);
      else n.add(itemId);
      return n;
    });
  };
  const submitPick = () => {
    if (!mission || mission.type !== 'pick' || lockRef.current) return;
    if (sameSet(selected, mission.correctIds)) {
      completeMission();
    } else {
      // Sai: rung những món chọn nhầm (không thuộc tập đúng).
      mistakesRef.current += 1;
      setCombo(0);
      playSfx('snd-wrong');
      playBip();
      const wrongSel = [...selected].filter((id) => !mission.correctIds.includes(id));
      setWrongIds(wrongSel.length > 0 ? wrongSel : ['__missing__']);
      const t = window.setTimeout(() => setWrongIds([]), 600);
      addTimer(t);
    }
  };

  /* ── Gợi ý: làm sáng đáp án đúng ─────────────────────────────────────── */
  const useHint = () => {
    if (!mission || hintsLeft <= 0 || hintIds.length > 0 || lockRef.current) return;
    setHintsLeft((h) => h - 1);
    playPop();
    setHintIds(mission.type === 'choice' ? [mission.answerId] : mission.correctIds);
    const t = window.setTimeout(() => setHintIds([]), 2000);
    addTimer(t);
  };

  /* ── Lưu nhân vật ────────────────────────────────────────────────────── */
  const confirmCharacter = (c: CharData) => {
    setCharacter(c);
    saveChar(c);
    setPhase('map');
  };

  /* ── Dữ liệu suy ra ──────────────────────────────────────────────────── */
  const ctx: AchievementCtx = { ...stats, missionsDone, chapters: chaptersDone };
  const isChapterUnlocked = useCallback(
    (idx: number) => idx === 0 || chaptersDone.has(CHAPTERS[idx - 1].id),
    [chaptersDone],
  );

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: CHARACTER CREATION
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'character') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Bản đồ
        </button>
        <div className="text-center mb-5">
          <div className="text-7xl mb-2 floating">{character.avatar}</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
            Tạo Nhân Vật Của Bé
          </h2>
          <p className="text-slate-500 text-sm font-bold mt-1">Chọn hình và màu balo cho bạn nhỏ nhé!</p>
        </div>

        {/* Chọn avatar */}
        <div className="mb-4">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Chọn bạn nhỏ</div>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setCharacter((c) => ({ ...c, avatar: a }))}
                className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-3xl active:scale-95 transition-all ${
                  character.avatar === a ? 'border-sky-400 bg-sky-50 ring-4 ring-sky-200' : 'border-slate-200 bg-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Chọn màu balo */}
        <div className="mb-6">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Màu balo</div>
          <div className="flex gap-3 justify-center">
            {BAG_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCharacter((ch) => ({ ...ch, color: c.id }))}
                aria-label={c.name}
                className={`w-12 h-12 rounded-full border-4 active:scale-90 transition-transform ${c.class} ${
                  character.color === c.id ? 'border-slate-700 scale-110' : 'border-white'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => confirmCharacter(character)}
          className="w-full py-4 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 active:scale-95 transition-all"
        >
          🎒 Bắt đầu hành trình!
        </button>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: CHAPTER MAP
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'map') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Bản đồ
        </button>

        <div className="text-center mb-4">
          {/* Nhân vật của bé + balo màu đã chọn */}
          <div className="relative inline-block mb-1">
            <div className="text-7xl floating">{character.avatar}</div>
            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg ${bagClass(character.color)} flex items-center justify-center text-sm`}>🎒</div>
          </div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
            Hành Trình Đến Trường
          </h2>
          <p className="text-slate-500 text-sm font-bold">Cùng chuẩn bị thật giỏi để vào lớp 1 nhé!</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={() => setPhase('character')} className="bg-sky-100 text-sky-700 font-black text-xs px-3 py-2.5 rounded-2xl active:scale-95">
            🧒 Nhân vật
          </button>
          <button onClick={() => setPhase('collection')} className="bg-amber-100 text-amber-700 font-black text-xs px-3 py-2.5 rounded-2xl active:scale-95">
            🏅 Thành tích
          </button>
          <button onClick={() => setPhase('parent')} className="bg-indigo-100 text-indigo-700 font-black text-xs px-3 py-2.5 rounded-2xl active:scale-95">
            👨‍👩‍👧 Phụ huynh
          </button>
        </div>

        <div className="space-y-2">
          {CHAPTERS.map((c, idx) => {
            const unlocked = isChapterUnlocked(idx);
            const done = chaptersDone.has(c.id);
            const doneCount = c.missions.filter((m) => missionsDone.has(m.id)).length;
            return (
              <button
                key={c.id}
                disabled={!unlocked}
                onClick={() => startChapter(c)}
                className={`relative w-full p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex items-center gap-4 text-left ${
                  unlocked ? `bg-gradient-to-br ${c.gradient}` : 'bg-slate-100 border-2 border-slate-200'
                }`}
              >
                <div className={`text-4xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{unlocked ? c.emoji : '🔒'}</div>
                <div className="flex-1">
                  <div className={`font-black text-sm leading-tight ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                    {unlocked ? c.title : '???'}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${unlocked ? 'text-white/90' : 'text-slate-400'}`}>
                    {unlocked ? `${doneCount}/${c.missions.length} nhiệm vụ` : 'Hoàn thành chương trước để mở'}
                  </div>
                </div>
                {done && <span className="text-2xl">🏅</span>}
                {unlocked && !done && <span className="text-white text-xl">▶️</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: COLLECTION
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'collection') {
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">🏅</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
            Bảng Vinh Danh
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">
            {chaptersDone.size}/{TOTAL_CHAPTERS} chương · {stats.completions} lượt nhiệm vụ
          </p>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thành tích</h3>
        <div className="space-y-2 mb-5">
          {ACHIEVEMENTS.map((a) => {
            const got = a.unlocked(ctx);
            return (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${got ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-30'}`}>{a.emoji}</span>
                <div className="flex-1">
                  <div className={`font-black text-sm ${got ? 'text-slate-700' : 'text-slate-400'}`}>{got ? a.name : '???'}</div>
                  <div className="text-[11px] font-bold text-slate-400">{a.desc}</div>
                </div>
                {got && <span className="text-emerald-500 font-black">✓</span>}
              </div>
            );
          })}
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sticker</h3>
        <div className="grid grid-cols-5 gap-2">
          {STICKERS.map((s) => {
            const got = s.unlocked(ctx);
            return (
              <div key={s.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 ${got ? 'bg-gradient-to-br from-amber-50 to-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-3xl ${got ? '' : 'grayscale opacity-25'}`}>{got ? s.emoji : '🔒'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PARENT DASHBOARD
   * ════════════════════════════════════════════════════════════════════ */
  if (phase === 'parent') {
    const pct = Math.round((chaptersDone.size / TOTAL_CHAPTERS) * 100);
    // Kỹ năng đã học = các chương đã hoàn thành.
    const skillsLearned = CHAPTERS.filter((c) => chaptersDone.has(c.id)).map((c) => c.title.split('· ')[1] ?? c.title);
    return (
      <div className="animate-in fade-in duration-500 max-w-md mx-auto">
        <button onClick={() => setPhase('map')} className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4">
          ← Quay lại
        </button>
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 floating">👨‍👩‍👧</div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">
            Bảng Phụ Huynh
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Nhiệm vụ hoàn thành</div>
            <div className="text-2xl font-black text-sky-600">{stats.completions}</div>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tỷ lệ hoàn thành</div>
            <div className="text-2xl font-black text-emerald-600">{pct}%</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Thời gian chơi</div>
            <div className="text-2xl font-black text-amber-600">{fmtTime(stats.timeMs)}</div>
          </div>
          <div className="bg-violet-50 border-2 border-violet-100 rounded-2xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Chương đã xong</div>
            <div className="text-2xl font-black text-violet-600">{chaptersDone.size}/{TOTAL_CHAPTERS}</div>
          </div>
        </div>

        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kỹ năng đã học</h3>
        {skillsLearned.length === 0 ? (
          <div className="text-center text-slate-400 text-sm font-bold py-3 bg-slate-50 rounded-2xl">Bé hãy bắt đầu hành trình nhé!</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skillsLearned.map((s) => (
              <span key={s} className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-black text-xs px-3 py-2 rounded-2xl">
                ✓ {s}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
   * SCREEN: PLAYING
   * ════════════════════════════════════════════════════════════════════ */
  if (!chapter || !mission) return null;

  return (
    <div className="animate-in fade-in duration-300 max-w-md mx-auto select-none">
      {/* ── Thanh trạng thái ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { clearTimers(); setPhase('map'); }} className="text-slate-400 font-bold hover:text-slate-600 text-sm">
          ✕ Thoát
        </button>
        <span className="text-xs font-black text-slate-500">
          {chapter.emoji} Nhiệm vụ {missionIndex + 1}/{chapter.missions.length}
        </span>
        <div className="flex items-center gap-1">
          <span className="bg-amber-100 text-amber-700 font-black text-xs px-2.5 py-1 rounded-full">⭐ {score}</span>
          {combo >= 2 && <span className="bg-orange-100 text-orange-600 font-black text-xs px-2.5 py-1 rounded-full">🔥 {combo}</span>}
        </div>
      </div>

      {/* ── Thẻ nhiệm vụ (cô giáo + nhân vật của bé) ───────────────────── */}
      <div className="flex items-start gap-2 mb-4">
        <div className="text-4xl shrink-0 floating">{character.avatar}</div>
        <div className="flex-1 bg-gradient-to-br from-sky-50 to-emerald-50 border-2 border-sky-100 rounded-2xl rounded-tl-sm p-3 relative">
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{mission.title}</div>
          <p className="font-black text-slate-700 text-base leading-snug pr-8">{mission.prompt}</p>
          <button onClick={() => speak(mission.prompt, LANG_SPEAK_DEFAULT)} aria-label="Nghe lại" className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white border border-sky-200 flex items-center justify-center active:scale-95 text-sky-500">
            🔊
          </button>
        </div>
      </div>

      {/* ── CHOICE: chọn 1 đáp án ──────────────────────────────────────── */}
      {mission.type === 'choice' && !result && (
        <div className="space-y-2">
          {mission.options.map((opt) => {
            const isWrong = wrongIds.includes(opt.id);
            const isHint = hintIds.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => handleChoice(opt.id)}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-3 active:scale-95 transition-all text-left ${
                  isWrong ? 'shake-x border-red-300 bg-red-50' : isHint ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 animate-pulse' : 'border-sky-100 bg-white shadow-sm hover:border-sky-200'
                }`}
              >
                <span className="text-4xl">{opt.emoji}</span>
                <span className="font-black text-slate-700">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── PICK: chọn đúng tập đồ vật ─────────────────────────────────── */}
      {mission.type === 'pick' && !result && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {mission.items.map((item) => {
              const isSel = selected.has(item.id);
              const isWrong = wrongIds.includes(item.id);
              const isHint = hintIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all ${
                    isWrong
                      ? 'shake-x border-red-300 bg-red-50'
                      : isSel
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                        : isHint
                          ? 'border-amber-400 bg-amber-50 animate-pulse'
                          : 'border-sky-100 bg-white shadow-sm'
                  }`}
                >
                  <span className="text-4xl leading-none">{item.emoji}</span>
                  <span className="text-[10px] font-black text-slate-600">{item.label}</span>
                  {isSel && <span className="text-[10px] text-emerald-500 font-black">✓ trong cặp</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={submitPick}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
          >
            ✓ Xong, kiểm tra cặp!
          </button>
        </div>
      )}

      {/* ── Nút gợi ý (ẩn khi đang hiện kết quả) ───────────────────────── */}
      {!result && (
        <button
          onClick={useHint}
          disabled={hintsLeft <= 0 || hintIds.length > 0}
          className="w-full mt-3 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black shadow-lg shadow-amber-200 active:scale-95 transition-all disabled:opacity-40"
        >
          💡 Gợi ý ({hintsLeft})
        </button>
      )}

      {/* ── Overlay kết quả nhiệm vụ (sao) ─────────────────────────────── */}
      {result && (
        <div className="bg-white border-2 border-emerald-100 rounded-3xl p-5 text-center shadow-lg animate-in zoom-in">
          <div className="flex justify-center gap-1 mb-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`text-5xl ${i < result.stars ? '' : 'grayscale opacity-25'}`}>
                ⭐
              </span>
            ))}
          </div>
          <div className="text-3xl mb-1">👩‍🏫</div>
          <p className="font-black text-slate-700">"{result.feedback}"</p>
        </div>
      )}

      {/* ── Overlay hoàn thành chương (huy hiệu / chứng nhận) ──────────── */}
      {chapterDone && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setPhase('map')}>
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-7 text-center animate-in zoom-in max-w-xs">
            <div className="text-7xl mb-1 animate-bounce">🏅</div>
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Chứng nhận hoàn thành</div>
            <div className="text-lg font-black text-slate-800 my-1">{chapterDone.title}</div>
            <div className="text-4xl my-2">{character.avatar}🎓</div>
            <button onClick={() => setPhase('map')} className="mt-2 w-full py-3 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-2xl font-black active:scale-95 transition-all">
              Tiếp tục →
            </button>
          </div>
        </div>
      )}

      {/* ── Toast mở khoá ──────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-white border-2 border-amber-200 rounded-3xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom">
          <span className="text-4xl">{toast.emoji}</span>
          <div className="text-left">
            <div className="text-[10px] font-bold text-amber-500 uppercase">Chúc mừng!</div>
            <div className="font-black text-slate-700">{toast.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
