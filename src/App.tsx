import { useEffect, useState } from 'react';
import Header from './components/Header';
import BottomNav, { type NavKey } from './components/BottomNav';
import MapView from './views/MapView';
import LevelView from './views/LevelView';
import QuizView from './views/QuizView';
import ResultView, { type QuizResult } from './views/ResultView';
import LeaderboardView from './views/LeaderboardView';
import ProfileView from './views/ProfileView';
import { speak } from './lib/audio';
import type { Level } from './data/gameData';

type View = 'map' | 'level' | 'quiz' | 'result' | 'leader' | 'profile';

export default function App() {
  const [view, setView] = useState<View>('map');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    speak('');
  }, []);

  const goMap = () => setView('map');
  const handleNavigate = (key: NavKey) => {
    if (key === 'map') goMap();
    else setView(key);
  };
  const startLevel = (level: Level) => {
    setActiveLevel(level);
    setView('level');
  };
  const startQuiz = () => setView('quiz');
  const finishQuiz = (result: QuizResult) => {
    setQuizResult(result);
    setView('result');
  };

  const navActive: NavKey = view === 'leader' || view === 'profile' ? view : 'map';

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-white shadow-2xl">
      <Header />
      <main className="flex-1 p-4 relative overflow-y-auto">
        {view === 'map' && <MapView onPickLevel={startLevel} />}
        {view === 'level' && activeLevel && (
          <LevelView level={activeLevel} onExit={goMap} onComplete={startQuiz} />
        )}
        {view === 'quiz' && activeLevel && (
          <QuizView level={activeLevel} onFinish={finishQuiz} />
        )}
        {view === 'result' && activeLevel && quizResult && (
          <ResultView level={activeLevel} result={quizResult} onBack={goMap} />
        )}
        {view === 'leader' && <LeaderboardView />}
        {view === 'profile' && <ProfileView />}
      </main>
      <BottomNav active={navActive} onNavigate={handleNavigate} />
    </div>
  );
}
