import { Suspense, lazy, useEffect, useState } from 'react';
import Header from './components/Header';
import BottomNav, { type NavKey } from './components/BottomNav';
import MapView from './views/MapView';
import KnowledgeIslandsView from './views/KnowledgeIslandsView';
import CategoryView from './views/CategoryView';
import FlashcardView from './views/FlashcardView';
import QuizView from './views/QuizView';
import MatchingView from './views/MatchingView';
import ListeningView from './views/ListeningView';
import TypingView from './views/TypingView';
import MemoryView from './views/MemoryView';
import HangmanView from './views/HangmanView';
import ShadowView from './views/ShadowView';
import ResultView, { type QuizResult } from './views/ResultView';
import LeaderboardView from './views/LeaderboardView';
import ProfileView from './views/ProfileView';
import PronunciationView from './views/PronunciationView';
import StickersView from './views/StickersView';
import TimeChallengeView from './views/TimeChallengeView';
import DailyReviewView from './views/DailyReviewView';
import AlphabetView from './views/AlphabetView';
import NumberView from './views/NumberView';
import MathLandView from './views/MathLandView';
import MathQuizView from './views/MathQuizView';
import NumberPopView from './views/NumberPopView';
import FeedAnimalView from './views/FeedAnimalView';
import CompareView from './views/CompareView';
import SubtractView from './views/SubtractView';
import CountView from './views/CountView';
import PlusView from './views/PlusView';
import MatchPuzzleView from './views/MatchPuzzleView';
import SequenceView from './views/SequenceView';
import MathRescueView from './views/MathRescueView';
import OceanVocabularyView from './views/OceanVocabularyView';
import GreenKnightRecycleView from './views/GreenKnightRecycleView';
import CodeKingdomView from './views/CodeKingdomView';
import TrainTrackPuzzleView from './views/TrainTrackPuzzleView';
import EcoBalanceView from './views/EcoBalanceView';
import LightEngineerView from './views/LightEngineerView';
import MagicIsland2048View from './views/MagicIsland2048View';
import MarsPackingView from './views/MarsPackingView';
import DetectiveCluesView from './views/DetectiveCluesView';
import RiverRescueView from './views/RiverRescueView';
const ColoringView = lazy(() => import('./views/ColoringView'));
// Phaser game (~1 MB dep) — lazy-loaded like ColoringView để không phình bundle ban đầu.
const WhackMathView = lazy(() => import('./views/WhackMathView'));
const FruitRescueView = lazy(() => import('./views/FruitRescueView'));
const SpellingKingView = lazy(() => import('./views/SpellingKingView'));
import TracerKidsView from './views/TracerKidsView';
import FeedCountView from './views/FeedCountView';
import BubbleLettersView from './views/BubbleLettersView';
import ConnectDotsView from './views/ConnectDotsView';
import DinoAlphabetView from './views/DinoAlphabetView';
import FruitScaleView from './views/FruitScaleView';
import GameIslandsView, { type GameKey } from './views/GameIslandsView';
import SideDrawer from './components/SideDrawer';
import { speak } from './lib/audio';
import { startBgm, stopBgm } from './lib/bgm';
import type { Category, SubGroup } from './data/gameData';
import type { MathLevel } from './data/mathData';

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
  | 'review'
  | 'alphabet'
  | 'numbers'
  | 'mathland'
  | 'mathquiz'
  | 'numberpop'
  | 'feedanimal'
  | 'compare'
  | 'subtract'
  | 'plus'
  | 'count'
  | 'matchpuzzle'
  | 'sequence'
  | 'coloring'
  | 'mathrescue'
  | 'ocean'
  | 'greenknight'
  | 'codekingdom'
  | 'traintrack'
  | 'ecobalance'
  | 'lightengineer'
  | 'magicisland'
  | 'marspack'
  | 'detective'
  | 'riverrescue'
  | 'whackmath'
  | 'fruitrescue'
  | 'spellingking'
  | 'tracerkids'
  | 'feedcount'
  | 'bubbleletters'
  | 'connectdots'
  | 'dinoalphabet'
  | 'fruitscale'
  | 'gameisland'
  | 'knowledge';

const GAME_ISLAND_VIEWS: ReadonlySet<View> = new Set<View>([
  'numberpop',
  'feedanimal',
  'compare',
  'subtract',
  'count',
  'plus',
  'matchpuzzle',
  'sequence',
  'coloring',
  'mathrescue',
  'ocean',
  'greenknight',
  'codekingdom',
  'traintrack',
  'ecobalance',
  'lightengineer',
  'magicisland',
  'marspack',
  'detective',
  'riverrescue',
  'whackmath',
  'fruitrescue',
  'spellingking',
  'tracerkids',
  'feedcount',
  'bubbleletters',
  'connectdots',
  'dinoalphabet',
  'fruitscale',
  'challenge',
]);

export default function App() {
  const [view, setView] = useState<View>('map');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<SubGroup | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMathLevel, setActiveMathLevel] = useState<MathLevel | null>(null);

  useEffect(() => {
    speak('');
  }, []);

  useEffect(() => {
    if (GAME_ISLAND_VIEWS.has(view)) {
      startBgm();
    } else {
      stopBgm();
    }
  }, [view]);

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

  const startTestDirect = (subGroup: SubGroup) => {
    setActiveSubGroup(subGroup);
    setView('test');
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

  const goGameIsland = () => setView('gameisland');

  const pickGame = (key: GameKey) => {
    switch (key) {
      case 'numberpop':
        setView('numberpop');
        break;
      case 'feedanimal':
        setView('feedanimal');
        break;
      case 'coloring':
        setView('coloring');
        break;
      case 'sequence':
        setView('sequence');
        break;
      case 'matchpuzzle':
        setView('matchpuzzle');
        break;
      case 'count':
        setView('count');
        break;
      case 'plus':
        setView('plus');
        break;
      case 'subtract':
        setView('subtract');
        break;
      case 'compare':
        setView('compare');
        break;
      case 'mathrescue':
        setView('mathrescue');
        break;
      case 'ocean':
        setView('ocean');
        break;
      case 'greenknight':
        setView('greenknight');
        break;
      case 'codekingdom':
        setView('codekingdom');
        break;
      case 'traintrack':
        setView('traintrack');
        break;
      case 'ecobalance':
        setView('ecobalance');
        break;
      case 'lightengineer':
        setView('lightengineer');
        break;
      case 'magicisland':
        setView('magicisland');
        break;
      case 'marspack':
        setView('marspack');
        break;
      case 'detective':
        setView('detective');
        break;
      case 'riverrescue':
        setView('riverrescue');
        break;
      case 'whackmath':
        setView('whackmath');
        break;
      case 'fruitrescue':
        setView('fruitrescue');
        break;
      case 'spellingking':
        setView('spellingking');
        break;
      case 'tracerkids':
        setView('tracerkids');
        break;
      case 'feedcount':
        setView('feedcount');
        break;
      case 'bubbleletters':
        setView('bubbleletters');
        break;
      case 'connectdots':
        setView('connectdots');
        break;
      case 'dinoalphabet':
        setView('dinoalphabet');
        break;
      case 'fruitscale':
        setView('fruitscale');
        break;
      case 'challenge':
        setView('challenge');
        break;
    }
  };

  return (
    <div className="max-w-md md:max-w-3xl lg:max-w-4xl mx-auto min-h-screen flex flex-col relative bg-white shadow-2xl">
      <Header onOpenMenu={() => setDrawerOpen(true)} />
      <main className="flex-1 min-h-0 p-4 md:p-6 lg:p-8 relative overflow-y-auto">
        {view === 'map' && (
          <MapView
            onPickKnowledge={() => setView('knowledge')}
            onPickReview={() => setView('review')}
            onPickMath={() => setView('mathland')}
            onPickGameIsland={goGameIsland}
          />
        )}
        {view === 'gameisland' && (
          <GameIslandsView onPickGame={pickGame} onBack={goMap} />
        )}
        {view === 'knowledge' && (
          <KnowledgeIslandsView
            onPickCategory={pickCategory}
            onBack={goMap}
          />
        )}
        {view === 'numberpop' && <NumberPopView onBack={goGameIsland} />}
        {view === 'feedanimal' && <FeedAnimalView onBack={goGameIsland} />}
        {view === 'compare' && <CompareView onBack={goGameIsland} />}
        {view === 'subtract' && <SubtractView onBack={goGameIsland} />}
        {view === 'count' && <CountView onBack={goGameIsland} />}
        {view === 'plus' && <PlusView onBack={goGameIsland} />}
        {view === 'matchpuzzle' && <MatchPuzzleView onBack={goGameIsland} />}
        {view === 'sequence' && <SequenceView onBack={goGameIsland} />}
        {view === 'mathrescue' && <MathRescueView onBack={goGameIsland} />}
        {view === 'ocean' && <OceanVocabularyView onBack={goGameIsland} />}
        {view === 'greenknight' && <GreenKnightRecycleView onBack={goGameIsland} />}
        {view === 'codekingdom' && <CodeKingdomView onBack={goGameIsland} />}
        {view === 'traintrack' && <TrainTrackPuzzleView onBack={goGameIsland} />}
        {view === 'ecobalance' && <EcoBalanceView onBack={goGameIsland} />}
        {view === 'lightengineer' && <LightEngineerView onBack={goGameIsland} />}
        {view === 'magicisland' && <MagicIsland2048View onBack={goGameIsland} />}
        {view === 'marspack' && <MarsPackingView onBack={goGameIsland} />}
        {view === 'detective' && <DetectiveCluesView onBack={goGameIsland} />}
        {view === 'riverrescue' && <RiverRescueView onBack={goGameIsland} />}
        {view === 'whackmath' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải…</div>}>
            <WhackMathView onBack={goGameIsland} />
          </Suspense>
        )}
        {view === 'fruitrescue' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải…</div>}>
            <FruitRescueView onBack={goGameIsland} />
          </Suspense>
        )}
        {view === 'spellingking' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải…</div>}>
            <SpellingKingView onBack={goGameIsland} />
          </Suspense>
        )}
        {view === 'tracerkids' && <TracerKidsView onBack={goGameIsland} />}
        {view === 'feedcount' && <FeedCountView onBack={goGameIsland} />}
        {view === 'bubbleletters' && <BubbleLettersView onBack={goGameIsland} />}
        {view === 'connectdots' && <ConnectDotsView onBack={goGameIsland} />}
        {view === 'dinoalphabet' && <DinoAlphabetView onBack={goGameIsland} />}
        {view === 'fruitscale' && <FruitScaleView onBack={goGameIsland} />}
        {view === 'coloring' && (
          <Suspense
            fallback={
              <div className="py-10 text-center text-slate-400 font-bold animate-pulse">
                🎨 Đang tải tranh tô màu…
              </div>
            }
          >
            <ColoringView onBack={goGameIsland} />
          </Suspense>
        )}
        {view === 'mathland' && (
          <MathLandView
            onPickLevel={(l) => {
              setActiveMathLevel(l);
              setView('mathquiz');
            }}
            onBack={goMap}
          />
        )}
        {view === 'mathquiz' && activeMathLevel && (
          <MathQuizView level={activeMathLevel} onBack={() => setView('mathland')} />
        )}
        {view === 'challenge' && <TimeChallengeView onBack={goGameIsland} />}
        {view === 'review' && <DailyReviewView onBack={goMap} />}
        {view === 'category' && activeCategory && (
          <CategoryView
            category={activeCategory}
            onPickSubGroup={pickSubGroup}
            onStartTest={startTestDirect}
            onBack={() => setView('knowledge')}
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
              <QuizView words={activeSubGroup.words} onFinish={finishTest} onExit={goCategory} />
            )}
            {activeSubGroup.mode === 'matching' && (
              <MatchingView words={activeSubGroup.words} onFinish={finishTest} onExit={goCategory} />
            )}
            {activeSubGroup.mode === 'listening' && (
              <ListeningView words={activeSubGroup.words} onFinish={finishTest} onExit={goCategory} />
            )}
            {activeSubGroup.mode === 'typing' && (
              <TypingView words={activeSubGroup.words} onFinish={finishTest} onExit={goCategory} />
            )}
            {activeSubGroup.mode === 'memory' && (
              <MemoryView words={activeSubGroup.words} onFinish={finishTest} onExit={goCategory} />
            )}
            {activeSubGroup.mode === 'hangman' && (
              <HangmanView words={activeSubGroup.words} onFinish={finishTest} onExit={goCategory} />
            )}
            {activeSubGroup.mode === 'shadow' && (
              <ShadowView words={activeSubGroup.words} onFinish={finishTest} onExit={goCategory} />
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
        {view === 'alphabet' && <AlphabetView onBack={goMap} />}
        {view === 'numbers' && <NumberView onBack={goMap} />}
      </main>
      <BottomNav active={navActive} onNavigate={handleNavigate} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-2">
          <button
            onClick={() => {
              setView('alphabet');
              setDrawerOpen(false);
            }}
            className="w-full p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-100 rounded-2xl flex items-center gap-3 active:scale-95 transition-all text-left hover:shadow-md"
          >
            <div className="text-3xl bg-white w-12 h-12 flex items-center justify-center rounded-xl border-2 border-blue-200">
              🔤
            </div>
            <div className="flex-1">
              <div className="font-black text-slate-800">Bảng chữ cái</div>
              <div className="text-[10px] text-slate-500 font-bold">
                26 chữ A-Z, chạm để nghe
              </div>
            </div>
            <span className="text-blue-400">▶️</span>
          </button>

          <button
            onClick={() => {
              setView('numbers');
              setDrawerOpen(false);
            }}
            className="w-full p-4 bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-100 rounded-2xl flex items-center gap-3 active:scale-95 transition-all text-left hover:shadow-md"
          >
            <div className="text-3xl bg-white w-12 h-12 flex items-center justify-center rounded-xl border-2 border-emerald-200">
              🔢
            </div>
            <div className="flex-1">
              <div className="font-black text-slate-800">Bảng số đếm</div>
              <div className="text-[10px] text-slate-500 font-bold">
                0 — 1.000, chạm để nghe
              </div>
            </div>
            <span className="text-emerald-400">▶️</span>
          </button>
        </div>
      </SideDrawer>
    </div>
  );
}
