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
  | 'challenge';

// Nhóm tuổi đề xuất cho mỗi game.
//   - 'preschool'  (1-5 tuổi): tương tác đơn giản (chạm, kéo thả, tô màu, đếm).
//   - 'primary'    (6-10 tuổi): cần kiến thức số học, đọc, suy luận, không gian.
type AgeGroup = 'preschool' | 'primary';

type GameCard = {
  key: GameKey;
  emoji: string;
  title: string;
  subtitle: string;
  gradient: string;
  shadow: string;
  age: AgeGroup;
};

const GAMES: GameCard[] = [
  {
    key: 'numberpop',
    emoji: '🎈',
    title: 'Number Pop',
    subtitle: 'Chạm để nổ bong bóng có số đúng',
    gradient: 'from-pink-400 via-fuchsia-500 to-blue-500',
    shadow: 'shadow-pink-200',
    age: 'preschool',
  },
  {
    key: 'feedanimal',
    emoji: '🐰',
    title: 'Cho thú ăn',
    subtitle: 'Kéo món ăn đúng vào con vật đang đói',
    gradient: 'from-amber-400 via-pink-500 to-rose-500',
    shadow: 'shadow-rose-200',
    age: 'preschool',
  },
  {
    key: 'coloring',
    emoji: '🎨',
    title: 'Tô màu vui',
    subtitle: 'Chọn màu và tô tranh đẹp',
    gradient: 'from-pink-400 via-orange-400 to-amber-400',
    shadow: 'shadow-orange-200',
    age: 'preschool',
  },
  {
    key: 'sequence',
    emoji: '🐝',
    title: 'Điền số còn thiếu',
    subtitle: 'Kéo số đúng vào dãy số có dấu ?',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    shadow: 'shadow-amber-200',
    age: 'primary',
  },
  {
    key: 'matchpuzzle',
    emoji: '🐻',
    title: 'Hoàn thành bức tranh',
    subtitle: 'Kéo mảnh ghép vào bóng đen tương ứng',
    gradient: 'from-amber-500 via-rose-500 to-purple-500',
    shadow: 'shadow-rose-200',
    age: 'preschool',
  },
  {
    key: 'count',
    emoji: '🐱',
    title: 'Học Đếm Số',
    subtitle: 'Đếm đồ vật, ghép số và tìm số còn thiếu',
    gradient: 'from-pink-400 via-fuchsia-500 to-purple-500',
    shadow: 'shadow-fuchsia-200',
    age: 'preschool',
  },
  {
    key: 'plus',
    emoji: '🐼',
    title: 'Phép cộng vui',
    subtitle: 'Học phép cộng bằng hình ảnh đồ vật',
    gradient: 'from-cyan-400 via-emerald-500 to-amber-500',
    shadow: 'shadow-emerald-200',
    age: 'primary',
  },
  {
    key: 'subtract',
    emoji: '🧸',
    title: 'Phép trừ vui',
    subtitle: 'Học phép trừ bằng hình ảnh đồ vật',
    gradient: 'from-fuchsia-500 via-purple-500 to-indigo-500',
    shadow: 'shadow-purple-200',
    age: 'primary',
  },
  {
    key: 'compare',
    emoji: '🦊',
    title: 'So sánh số lượng',
    subtitle: "Chọn dấu <, > hoặc =",
    gradient: 'from-sky-400 via-amber-400 to-pink-500',
    shadow: 'shadow-amber-200',
    age: 'preschool',
  },
  {
    key: 'mathrescue',
    emoji: '🚁',
    title: 'Biệt đội cứu hộ toán',
    subtitle: 'Bấm số đúng để cứu các bạn thú khỏi bong bóng rơi',
    gradient: 'from-sky-400 via-pink-500 to-purple-500',
    shadow: 'shadow-sky-200',
    age: 'primary',
  },
  {
    key: 'ocean',
    emoji: '🚤',
    title: 'Thám hiểm đại dương',
    subtitle: 'Lái tàu ngầm, ăn chữ cái hoàn thành từ',
    gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    shadow: 'shadow-cyan-200',
    age: 'primary',
  },
  {
    key: 'greenknight',
    emoji: '🛡️',
    title: 'Hiệp sĩ xanh',
    subtitle: 'Kéo rác vào đúng thùng để cứu Trái Đất',
    gradient: 'from-emerald-400 via-green-500 to-lime-500',
    shadow: 'shadow-emerald-200',
    age: 'preschool',
  },
  {
    key: 'codekingdom',
    emoji: '🤖',
    title: 'Vương quốc code nhí',
    subtitle: 'Xếp lệnh điều khiển robot nhặt kim cương',
    gradient: 'from-indigo-500 via-purple-500 to-pink-500',
    shadow: 'shadow-purple-200',
    age: 'primary',
  },
  {
    key: 'traintrack',
    emoji: '🚂',
    title: 'Đường ray mê cung',
    subtitle: 'Xoay mảnh ray để tàu chạy từ ga đến cờ',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    shadow: 'shadow-orange-200',
    age: 'primary',
  },
  {
    key: 'ecobalance',
    emoji: '⚖️',
    title: 'Cân bằng sinh thái',
    subtitle: 'Suy luận trọng lượng — cân bằng đĩa cân',
    gradient: 'from-emerald-400 via-amber-400 to-rose-500',
    shadow: 'shadow-emerald-200',
    age: 'primary',
  },
  {
    key: 'lightengineer',
    emoji: '🔦',
    title: 'Kỹ sư ánh sáng',
    subtitle: 'Đặt gương, bẻ tia laser chạm tới viên ngọc',
    gradient: 'from-slate-700 via-indigo-600 to-cyan-500',
    shadow: 'shadow-cyan-200',
    age: 'primary',
  },
  {
    key: 'magicisland',
    emoji: '🐉',
    title: 'Đảo Thần Kỳ 2048',
    subtitle: 'Gộp thú cùng loài để tiến hoá tới Rồng',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    shadow: 'shadow-emerald-200',
    age: 'primary',
  },
  {
    key: 'marspack',
    emoji: '🚀',
    title: 'Hành lý lên Sao Hỏa',
    subtitle: 'Xếp khối hành lý lấp đầy khoang tàu vũ trụ',
    gradient: 'from-slate-700 via-indigo-700 to-orange-600',
    shadow: 'shadow-indigo-200',
    age: 'primary',
  },
  {
    key: 'detective',
    emoji: '🔍',
    title: 'Thám tử nhí',
    subtitle: 'Đọc manh mối, suy luận ai sống ở đâu, thích ăn gì',
    gradient: 'from-amber-600 via-orange-600 to-yellow-500',
    shadow: 'shadow-amber-200',
    age: 'primary',
  },
  {
    key: 'riverrescue',
    emoji: '🚢',
    title: 'Cứu hộ sông sâu',
    subtitle: 'Đưa cả đội qua sông an toàn — đừng để ai bị ăn hay bị bắt',
    gradient: 'from-sky-500 via-cyan-500 to-emerald-500',
    shadow: 'shadow-sky-200',
    age: 'primary',
  },
  {
    key: 'whackmath',
    emoji: '🔨',
    title: 'Đập thú toán học',
    subtitle: 'Đập đúng số chẵn / số lẻ — phản xạ nhanh nào!',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    shadow: 'shadow-amber-200',
    age: 'primary',
  },
  {
    key: 'fruitrescue',
    emoji: '🐛',
    title: 'Giải cứu trái cây',
    subtitle: 'Đập sâu hại, bảo vệ lợn con và táo chín',
    gradient: 'from-emerald-500 via-lime-500 to-yellow-500',
    shadow: 'shadow-emerald-200',
    age: 'primary',
  },
  {
    key: 'spellingking',
    emoji: '👑',
    title: 'Vua chính tả',
    subtitle: 'Đập từ viết sai (L/N, CH/TR, tiếng Anh) để sửa lỗi',
    gradient: 'from-violet-500 via-fuchsia-500 to-pink-500',
    shadow: 'shadow-violet-200',
    age: 'primary',
  },
  {
    key: 'tracerkids',
    emoji: '🎨',
    title: 'Thợ sơn tí hon',
    subtitle: 'Tập tô chữ A-Z và số 0-9 bằng cọ sơn nhiều màu',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    shadow: 'shadow-orange-200',
    age: 'preschool',
  },
  {
    key: 'feedcount',
    emoji: '🍽️',
    title: 'Cho thú ăn — đếm số',
    subtitle: 'Kéo đúng số lượng thức ăn vào miệng thú cưng',
    gradient: 'from-yellow-400 via-amber-500 to-emerald-500',
    shadow: 'shadow-amber-200',
    age: 'preschool',
  },
  {
    key: 'challenge',
    emoji: '🔥',
    title: 'Thử thách 60 giây',
    subtitle: 'Trả lời thật nhanh, ăn nhiều sao!',
    gradient: 'from-orange-400 via-red-500 to-pink-500',
    shadow: 'shadow-orange-200',
    age: 'primary',
  },
];

// Metadata cho từng nhóm tuổi — header section + nhãn nhỏ trên card.
const AGE_GROUPS: Array<{
  key: AgeGroup;
  label: string;       // Nhãn ngắn (trên card)
  title: string;       // Tiêu đề section
  subtitle: string;    // Mô tả ngắn dưới tiêu đề
  emoji: string;
  badgeClass: string;  // Tailwind class cho badge nhãn tuổi
}> = [
  {
    key: 'preschool',
    label: '1–5 tuổi',
    title: 'Mầm non · 1–5 tuổi',
    subtitle: 'Tương tác đơn giản: chạm, kéo, tô màu, đếm',
    emoji: '🧸',
    badgeClass: 'bg-pink-100 text-pink-700 border-pink-200',
  },
  {
    key: 'primary',
    label: '6–10 tuổi',
    title: 'Tiểu học · 6–10 tuổi',
    subtitle: 'Toán, đọc, logic và tư duy không gian',
    emoji: '🎒',
    badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
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

      {/* Render lần lượt từng nhóm tuổi → mỗi nhóm 1 section với header riêng.
          Cách này giúp phụ huynh dễ chọn theo độ tuổi của bé, đồng thời chia
          danh sách dài thành các block dễ scan. */}
      {AGE_GROUPS.map((group) => {
        const gamesInGroup = GAMES.filter((g) => g.age === group.key);
        if (gamesInGroup.length === 0) return null;
        return (
          <section key={group.key} className="mb-6 last:mb-0">
            {/* Header section: emoji + tiêu đề + đếm số game */}
            <div className="flex items-end justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{group.emoji}</div>
                <div>
                  <div className="font-black text-slate-800 text-base leading-tight">
                    {group.title}
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold leading-tight">
                    {group.subtitle}
                  </div>
                </div>
              </div>
              <div className={`text-[10px] font-black px-2 py-1 rounded-full border ${group.badgeClass}`}>
                {gamesInGroup.length} game
              </div>
            </div>

            {/* Lưới game trong nhóm — mỗi card có badge nhãn tuổi nhỏ ở góc */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gamesInGroup.map((g) => (
                <button
                  key={g.key}
                  onClick={() => onPickGame(g.key)}
                  className={`relative w-full p-5 bg-gradient-to-br ${g.gradient} rounded-3xl shadow-lg ${g.shadow} active:scale-95 transition-all flex items-center gap-4 text-left`}
                >
                  {/* Badge nhãn tuổi — chéo góc trên-phải card */}
                  <span className="absolute top-2 right-2 text-[9px] font-black bg-white/90 text-slate-700 px-2 py-0.5 rounded-full shadow-sm">
                    {group.label}
                  </span>
                  <div className="text-5xl floating">{g.emoji}</div>
                  <div className="flex-1 text-white pr-12">
                    <div className="font-black text-lg leading-tight">{g.title}</div>
                    <div className="text-xs opacity-90 font-bold mt-0.5">{g.subtitle}</div>
                  </div>
                  <span className="text-white text-xl">▶️</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export type { GameKey };
