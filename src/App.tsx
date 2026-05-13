import { useEffect, useState } from 'react';
import Header from './components/Header';
import BottomNav, { type NavKey } from './components/BottomNav';
import MapView from './views/MapView';
import CategoryView from './views/CategoryView';
import FlashcardView from './views/FlashcardView';
import QuizView from './views/QuizView';
import MatchingView from './views/MatchingView';
import ListeningView from './views/ListeningView';
import TypingView from './views/TypingView';
import MemoryView from './views/MemoryView';
import HangmanView from './views/HangmanView';
import ResultView, { type QuizResult } from './views/ResultView';
import LeaderboardView from './views/LeaderboardView';
import ProfileView from './views/ProfileView';
import PronunciationView from './views/PronunciationView';
import StickersView from './views/StickersView';
import TimeChallengeView from './views/TimeChallengeView';
import DailyReviewView from './views/DailyReviewView';
import { speak } from './lib/audio';
import type { Category, SubGroup } from './data/gameData';

type View =
  | 'map'
  | 'category'
  | 'flashcard'
  | 'test'
  | 'result'
  | 'leader'
  | 'profile'
  | 'pron'
  | 'stickers'
  | 'challenge'
  | 'review';

export default function App() {
  const [view, setView] = useState<View>('map');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<SubGroup | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    speak('');
  }, []);

  const goMap = () => {
    setActiveCategory(null);
    setActiveSubGroup(null);
    setView('map');
  };

  const goCategory = () => {
    setActiveSubGroup(null);
    setView('category');
  };

  const goProfile = () => setView('profile');

  const handleNavigate = (key: NavKey) => {
    if (key === 'map') goMap();
    else setView(key);
  };

  const pickCategory = (category: Category) => {
    setActiveCategory(category);
    setView('category');
  };

  const pickSubGroup = (subGroup: SubGroup) => {
    setActiveSubGroup(subGroup);
    setView('flashcard');
  };

  const startTest = () => setView('test');

  const finishTest = (result: QuizResult) => {
    setQuizResult(result);
    setView('result');
  };

  const navActive: NavKey =
    view === 'leader' || view === 'pron'
      ? view
      : view === 'profile' || view === 'stickers'
        ? 'profile'
        : 'map';

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-white shadow-2xl">
      <Header />
      <main className="flex-1 p-4 relative overflow-y-auto">
        {view === 'map' && (
          <MapView
            onPickCategory={pickCategory}
            onPickChallenge={() => setView('challenge')}
            onPickReview={() => setView('review')}
          />
        )}
        {view === 'challenge' && <TimeChallengeView onBack={goMap} />}
        {view === 'review' && <DailyReviewView onBack={goMap} />}
        {view === 'category' && activeCategory && (
          <CategoryView
            category={activeCategory}
            onPickSubGroup={pickSubGroup}
            onBack={goMap}
          />
        )}
        {view === 'flashcard' && activeSubGroup && (
          <FlashcardView
            subGroup={activeSubGroup}
            onExit={goCategory}
            onComplete={startTest}
          />
        )}
        {view === 'test' && activeSubGroup && (
          <>
            {activeSubGroup.mode === 'quiz' && (
              <QuizView words={activeSubGroup.words} onFinish={finishTest} />
            )}
            {activeSubGroup.mode === 'matching' && (
              <MatchingView words={activeSubGroup.words} onFinish={finishTest} />
            )}
            {activeSubGroup.mode === 'listening' && (
              <ListeningView words={activeSubGroup.words} onFinish={finishTest} />
            )}
            {activeSubGroup.mode === 'typing' && (
              <TypingView words={activeSubGroup.words} onFinish={finishTest} />
            )}
            {activeSubGroup.mode === 'memory' && (
              <MemoryView words={activeSubGroup.words} onFinish={finishTest} />
            )}
            {activeSubGroup.mode === 'hangman' && (
              <HangmanView words={activeSubGroup.words} onFinish={finishTest} />
            )}
          </>
        )}
        {view === 'result' && activeSubGroup && quizResult && (
          <ResultView
            subGroup={activeSubGroup}
            result={quizResult}
            onBack={goCategory}
          />
        )}
        {view === 'leader' && <LeaderboardView />}
        {view === 'profile' && <ProfileView onOpenStickers={() => setView('stickers')} />}
        {view === 'pron' && <PronunciationView />}
        {view === 'stickers' && <StickersView onBack={goProfile} />}
      </main>
      <BottomNav active={navActive} onNavigate={handleNavigate} />
    </div>
  );
}
