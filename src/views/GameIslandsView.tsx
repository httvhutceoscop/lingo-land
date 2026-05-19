type GameKey =
  | 'numberpop'
  | 'feedanimal'
  | 'coloring'
  | 'sequence'
  | 'matchpuzzle'
  | 'count'
  | 'plus'
  | 'subtract'
  | 'compare'
  | 'mathrescue'
  | 'ocean'
  | 'challenge';

type GameCard = {
  key: GameKey;
  emoji: string;
  title: string;
  subtitle: string;
  gradient: string;
  shadow: string;
};

const GAMES: GameCard[] = [
  {
    key: 'numberpop',
    emoji: '🎈',
    title: 'Number Pop',
    subtitle: 'Chạm để nổ bong bóng có số đúng',
    gradient: 'from-pink-400 via-fuchsia-500 to-blue-500',
    shadow: 'shadow-pink-200',
  },
  {
    key: 'feedanimal',
    emoji: '🐰',
    title: 'Cho thú ăn',
    subtitle: 'Kéo món ăn đúng vào con vật đang đói',
    gradient: 'from-amber-400 via-pink-500 to-rose-500',
    shadow: 'shadow-rose-200',
  },
  {
    key: 'coloring',
    emoji: '🎨',
    title: 'Tô màu vui',
    subtitle: 'Chọn màu và tô tranh đẹp',
    gradient: 'from-pink-400 via-orange-400 to-amber-400',
    shadow: 'shadow-orange-200',
  },
  {
    key: 'sequence',
    emoji: '🐝',
    title: 'Điền số còn thiếu',
    subtitle: 'Kéo số đúng vào dãy số có dấu ?',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    shadow: 'shadow-amber-200',
  },
  {
    key: 'matchpuzzle',
    emoji: '🐻',
    title: 'Hoàn thành bức tranh',
    subtitle: 'Kéo mảnh ghép vào bóng đen tương ứng',
    gradient: 'from-amber-500 via-rose-500 to-purple-500',
    shadow: 'shadow-rose-200',
  },
  {
    key: 'count',
    emoji: '🐱',
    title: 'Học Đếm Số',
    subtitle: 'Đếm đồ vật, ghép số và tìm số còn thiếu',
    gradient: 'from-pink-400 via-fuchsia-500 to-purple-500',
    shadow: 'shadow-fuchsia-200',
  },
  {
    key: 'plus',
    emoji: '🐼',
    title: 'Phép cộng vui',
    subtitle: 'Học phép cộng bằng hình ảnh đồ vật',
    gradient: 'from-cyan-400 via-emerald-500 to-amber-500',
    shadow: 'shadow-emerald-200',
  },
  {
    key: 'subtract',
    emoji: '🧸',
    title: 'Phép trừ vui',
    subtitle: 'Học phép trừ bằng hình ảnh đồ vật',
    gradient: 'from-fuchsia-500 via-purple-500 to-indigo-500',
    shadow: 'shadow-purple-200',
  },
  {
    key: 'compare',
    emoji: '🦊',
    title: 'So sánh số lượng',
    subtitle: "Chọn dấu <, > hoặc =",
    gradient: 'from-sky-400 via-amber-400 to-pink-500',
    shadow: 'shadow-amber-200',
  },
  {
    key: 'mathrescue',
    emoji: '🚁',
    title: 'Biệt đội cứu hộ toán',
    subtitle: 'Bấm số đúng để cứu các bạn thú khỏi bong bóng rơi',
    gradient: 'from-sky-400 via-pink-500 to-purple-500',
    shadow: 'shadow-sky-200',
  },
  {
    key: 'ocean',
    emoji: '🚤',
    title: 'Thám hiểm đại dương',
    subtitle: 'Lái tàu ngầm, ăn chữ cái hoàn thành từ',
    gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    shadow: 'shadow-cyan-200',
  },
  {
    key: 'challenge',
    emoji: '🔥',
    title: 'Thử thách 60 giây',
    subtitle: 'Trả lời thật nhanh, ăn nhiều sao!',
    gradient: 'from-orange-400 via-red-500 to-pink-500',
    shadow: 'shadow-orange-200',
  },
];

type GameIslandsViewProps = {
  onPickGame: (key: GameKey) => void;
  onBack: () => void;
};

export default function GameIslandsView({ onPickGame, onBack }: GameIslandsViewProps) {
  return (
    <div className="py-4 animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Bản đồ
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-black mb-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent">
          🎮 Đảo Trò Chơi
        </h2>
        <p className="text-slate-500 text-sm font-bold">
          Vừa chơi vừa học — chọn một trò chơi yêu thích nhé!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {GAMES.map((g) => (
          <button
            key={g.key}
            onClick={() => onPickGame(g.key)}
            className={`w-full p-5 bg-gradient-to-br ${g.gradient} rounded-3xl shadow-lg ${g.shadow} active:scale-95 transition-all flex items-center gap-4 text-left`}
          >
            <div className="text-5xl floating">{g.emoji}</div>
            <div className="flex-1 text-white">
              <div className="font-black text-lg leading-tight">{g.title}</div>
              <div className="text-xs opacity-90 font-bold mt-0.5">{g.subtitle}</div>
            </div>
            <span className="text-white text-xl">▶️</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type { GameKey };
