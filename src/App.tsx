import { Suspense, lazy, useEffect, useState, type ComponentType } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
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
import VietLandView from './views/VietLandView';
import VietLessonView from './views/VietLessonView';
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
import RhymeGardenView from './views/RhymeGardenView';
import ToneKingView from './views/ToneKingView';
import GhepTiengView from './views/GhepTiengView';
import KhoiSoView from './views/KhoiSoView';
import CongKhoiView from './views/CongKhoiView';
import BeKhoiView from './views/BeKhoiView';
import CauVongSoView from './views/CauVongSoView';
import MissingLetterView from './views/MissingLetterView';
import SupermarketMathView from './views/SupermarketMathView';
import SpotDifferenceView from './views/SpotDifferenceView';
import AnimalPuzzleView from './views/AnimalPuzzleView';
import WriteLetterView from './views/WriteLetterView';
import TrainPhonicsView from './views/TrainPhonicsView';
import SpaceMathView from './views/SpaceMathView';
import ClassMonitorView from './views/ClassMonitorView';
import AnimalRescueView from './views/AnimalRescueView';
import TravelCatView from './views/TravelCatView';
import SchoolJourneyView from './views/SchoolJourneyView';
import MathTreasureView from './views/MathTreasureView';
import MemoryCardView from './views/MemoryCardView';
import TrafficHeroView from './views/TrafficHeroView';
import GameIslandsView, { type GameKey } from './views/GameIslandsView';
import SideDrawer from './components/SideDrawer';
import { speak } from './lib/audio';
import { startBgm, stopBgm } from './lib/bgm';
import { CATEGORIES, findSubGroup, type Word } from './data/gameData';
import { MATH_LEVELS } from './data/mathData';
import { VIET_LESSONS } from './data/vietData';

// Mọi game ở Đảo Trò Chơi đều nhận đúng một prop `onBack`. Registry này thay cho
// switch pickGame() + 50 nhánh render cũ — thêm game mới chỉ cần một dòng ở đây
// (và một entry trong GAMES của GameIslandsView). 'challenge' (TimeChallenge) cũng
// là một game key nên nằm cùng bảng.
const GAME_COMPONENTS: Record<GameKey, ComponentType<{ onBack: () => void }>> = {
  numberpop: NumberPopView,
  feedanimal: FeedAnimalView,
  compare: CompareView,
  subtract: SubtractView,
  count: CountView,
  plus: PlusView,
  matchpuzzle: MatchPuzzleView,
  sequence: SequenceView,
  coloring: ColoringView,
  mathrescue: MathRescueView,
  ocean: OceanVocabularyView,
  greenknight: GreenKnightRecycleView,
  codekingdom: CodeKingdomView,
  traintrack: TrainTrackPuzzleView,
  ecobalance: EcoBalanceView,
  lightengineer: LightEngineerView,
  magicisland: MagicIsland2048View,
  marspack: MarsPackingView,
  detective: DetectiveCluesView,
  riverrescue: RiverRescueView,
  whackmath: WhackMathView,
  fruitrescue: FruitRescueView,
  spellingking: SpellingKingView,
  tracerkids: TracerKidsView,
  feedcount: FeedCountView,
  bubbleletters: BubbleLettersView,
  connectdots: ConnectDotsView,
  dinoalphabet: DinoAlphabetView,
  fruitscale: FruitScaleView,
  rhymegarden: RhymeGardenView,
  toneking: ToneKingView,
  ghepting: GhepTiengView,
  khoiso: KhoiSoView,
  congkhoi: CongKhoiView,
  bekhoi: BeKhoiView,
  cauvongso: CauVongSoView,
  missingletter: MissingLetterView,
  supermarket: SupermarketMathView,
  spotdiff: SpotDifferenceView,
  animalpuzzle: AnimalPuzzleView,
  writeletter: WriteLetterView,
  trainphonics: TrainPhonicsView,
  spacemath: SpaceMathView,
  classmonitor: ClassMonitorView,
  animalrescue: AnimalRescueView,
  travelcat: TravelCatView,
  schooljourney: SchoolJourneyView,
  mathtreasure: MathTreasureView,
  memorycard: MemoryCardView,
  traffichero: TrafficHeroView,
  challenge: TimeChallengeView,
};

// Dispatch của 7 mini-game ôn tập từ vựng (test view) theo SubGroup.mode.
const TEST_COMPONENTS: Record<
  string,
  ComponentType<{ words: Word[]; onFinish: (r: QuizResult) => void; onExit: () => void }>
> = {
  quiz: QuizView,
  matching: MatchingView,
  listening: ListeningView,
  typing: TypingView,
  memory: MemoryView,
  hangman: HangmanView,
  shadow: ShadowView,
};

const NAV_PATHS: Record<NavKey, string> = {
  map: '/',
  pron: '/pronunciation',
  leader: '/leaderboard',
  profile: '/profile',
};

function navKeyForPath(pathname: string): NavKey {
  if (pathname === '/leaderboard') return 'leader';
  if (pathname === '/pronunciation') return 'pron';
  if (pathname === '/profile' || pathname === '/stickers') return 'profile';
  return 'map';
}

const gameFallback = (key: string | undefined) =>
  key === 'coloring' ? (
    <div className="py-10 text-center text-slate-400 font-bold animate-pulse">
      🎨 Đang tải tranh tô màu…
    </div>
  ) : (
    <div className="p-8 text-center text-slate-400">Đang tải…</div>
  );

// /game/:key — tra registry, render với onBack về Đảo Trò Chơi. Key lạ → quay lại danh sách.
function GameRoute() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const Comp = key ? GAME_COMPONENTS[key as GameKey] : undefined;
  if (!Comp) return <Navigate to="/games" replace />;
  return (
    <Suspense fallback={gameFallback(key)}>
      <Comp onBack={() => navigate('/games')} />
    </Suspense>
  );
}

// /category/:categoryId — id là Category.id (number).
function CategoryRoute() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const category = CATEGORIES.find((c) => String(c.id) === categoryId);
  if (!category) return <Navigate to="/knowledge" replace />;
  return (
    <CategoryView
      category={category}
      onPickSubGroup={(sg) => navigate(`/learn/${sg.id}/flashcard`)}
      onStartTest={(sg) => navigate(`/learn/${sg.id}/test`)}
      onBack={() => navigate('/knowledge')}
    />
  );
}

// /learn/:subGroupId/flashcard — học thẻ trước khi làm bài.
function FlashcardRoute() {
  const { subGroupId } = useParams<{ subGroupId: string }>();
  const navigate = useNavigate();
  const found = subGroupId ? findSubGroup(subGroupId) : null;
  if (!found) return <Navigate to="/knowledge" replace />;
  return (
    <FlashcardView
      subGroup={found.subGroup}
      onExit={() => navigate(`/category/${found.category.id}`)}
      onComplete={() => navigate(`/learn/${found.subGroup.id}/test`)}
    />
  );
}

// /learn/:subGroupId/test — dispatch mini-game theo mode.
function TestRoute() {
  const { subGroupId } = useParams<{ subGroupId: string }>();
  const navigate = useNavigate();
  const found = subGroupId ? findSubGroup(subGroupId) : null;
  if (!found) return <Navigate to="/knowledge" replace />;
  const { subGroup, category } = found;
  const Comp = TEST_COMPONENTS[subGroup.mode];
  if (!Comp) return <Navigate to={`/category/${category.id}`} replace />;
  return (
    <Comp
      words={subGroup.words}
      onFinish={(result) =>
        navigate(`/learn/${subGroup.id}/result`, { state: { result } })
      }
      onExit={() => navigate(`/category/${category.id}`)}
    />
  );
}

// /learn/:subGroupId/result — quizResult truyền qua location.state (không serialize vào URL),
// nên refresh trang này sẽ mất kết quả → quay về trang category.
function ResultRoute() {
  const { subGroupId } = useParams<{ subGroupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const found = subGroupId ? findSubGroup(subGroupId) : null;
  const result = (location.state as { result?: QuizResult } | null)?.result ?? null;
  if (!found) return <Navigate to="/knowledge" replace />;
  if (!result) return <Navigate to={`/category/${found.category.id}`} replace />;
  return (
    <ResultView
      subGroup={found.subGroup}
      result={result}
      onBack={() => navigate(`/category/${found.category.id}`)}
    />
  );
}

// /math/:levelId — levelId là MathLevel.id ('math.symbols', 'math.plus.5'…).
function MathQuizRoute() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const level = MATH_LEVELS.find((l) => l.id === levelId);
  if (!level) return <Navigate to="/math" replace />;
  return <MathQuizView level={level} onBack={() => navigate('/math')} />;
}

// /viet/:lessonId — lessonId là VietLesson.id ('viet.alphabet', 'viet.blend'…).
function VietLessonRoute() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const lesson = VIET_LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return <Navigate to="/viet" replace />;
  return (
    <VietLessonView
      lesson={lesson}
      onBack={() => navigate('/viet')}
      onPractice={(game) => navigate(`/game/${game}`)}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    speak('');
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('fade-out');
    const t = window.setTimeout(() => splash.remove(), 500);
    return () => window.clearTimeout(t);
  }, []);

  // BGM chỉ bật trong các màn Đảo Trò Chơi (mọi route /game/* — kể cả /game/challenge).
  useEffect(() => {
    if (location.pathname.startsWith('/game/')) startBgm();
    else stopBgm();
  }, [location.pathname]);

  const navActive = navKeyForPath(location.pathname);
  const handleNavigate = (key: NavKey) => navigate(NAV_PATHS[key]);

  return (
    <div className="max-w-md md:max-w-3xl lg:max-w-4xl mx-auto min-h-screen flex flex-col relative bg-white shadow-2xl">
      <Header onOpenMenu={() => setDrawerOpen(true)} />
      <main className="flex-1 min-h-0 p-4 md:p-6 lg:p-8 relative overflow-y-auto">
        <Routes>
          <Route
            path="/"
            element={
              <MapView
                onPickKnowledge={() => navigate('/knowledge')}
                onPickReview={() => navigate('/review')}
                onPickViet={() => navigate('/viet')}
                onPickMath={() => navigate('/math')}
                onPickGameIsland={() => navigate('/games')}
              />
            }
          />
          <Route
            path="/games"
            element={
              <GameIslandsView
                onPickGame={(key) => navigate(`/game/${key}`)}
                onBack={() => navigate('/')}
              />
            }
          />
          <Route path="/game/:key" element={<GameRoute />} />
          <Route
            path="/knowledge"
            element={
              <KnowledgeIslandsView
                onPickCategory={(c) => navigate(`/category/${c.id}`)}
                onBack={() => navigate('/')}
              />
            }
          />
          <Route path="/category/:categoryId" element={<CategoryRoute />} />
          <Route path="/learn/:subGroupId/flashcard" element={<FlashcardRoute />} />
          <Route path="/learn/:subGroupId/test" element={<TestRoute />} />
          <Route path="/learn/:subGroupId/result" element={<ResultRoute />} />
          <Route
            path="/math"
            element={
              <MathLandView
                onPickLevel={(l) => navigate(`/math/${l.id}`)}
                onBack={() => navigate('/')}
              />
            }
          />
          <Route path="/math/:levelId" element={<MathQuizRoute />} />
          <Route
            path="/viet"
            element={
              <VietLandView
                onPickLesson={(l) => navigate(`/viet/${l.id}`)}
                onBack={() => navigate('/')}
              />
            }
          />
          <Route path="/viet/:lessonId" element={<VietLessonRoute />} />
          <Route path="/review" element={<DailyReviewView onBack={() => navigate('/')} />} />
          <Route path="/leaderboard" element={<LeaderboardView />} />
          <Route
            path="/profile"
            element={<ProfileView onOpenStickers={() => navigate('/stickers')} />}
          />
          <Route path="/stickers" element={<StickersView onBack={() => navigate('/profile')} />} />
          <Route path="/pronunciation" element={<PronunciationView />} />
          <Route path="/alphabet" element={<AlphabetView onBack={() => navigate('/')} />} />
          <Route path="/numbers" element={<NumberView onBack={() => navigate('/')} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav active={navActive} onNavigate={handleNavigate} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-2">
          <button
            onClick={() => {
              navigate('/alphabet');
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
              navigate('/numbers');
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

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold">
          LingoLand v{__APP_VERSION__}
        </div>
      </SideDrawer>
    </div>
  );
}
