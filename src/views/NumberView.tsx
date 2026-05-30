import {
  NUMBERS,
  NUMBER_GROUPS,
  formatNumeral,
  type NumberEntry,
} from '../data/numberData';
import { pronounce } from '../lib/speak';

type NumberViewProps = {
  onBack: () => void;
};

export default function NumberView({ onBack }: NumberViewProps) {
  return (
    <div className="py-4 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        ← Quay lại
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl bg-emerald-50 w-16 h-16 flex items-center justify-center rounded-2xl border-2 border-emerald-100">
          🔢
        </div>
        <div>
          <h2 className="text-2xl font-black">Bảng số đếm</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Chạm số để nghe phát âm
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {NUMBER_GROUPS.map((g) => {
          const items = NUMBERS.filter((n) => n.group === g.key);
          return (
            <section key={g.key}>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-bold text-sm">{g.label}</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {g.subtitle}
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {items.map((item) => (
                  <NumberCard key={item.value} item={item} accent={g.accent} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-bold">💡 Mẹo:</span> Các số từ 13 đến 19 đều kết thúc
          bằng <span className="font-bold">-teen</span>, còn các số tròn chục (20, 30...)
          thì kết thúc bằng <span className="font-bold">-ty</span>. Chú ý phân biệt
          fifteen (15) và fifty (50)!
        </p>
      </div>
    </div>
  );
}

function NumberCard({ item, accent }: { item: NumberEntry; accent: string }) {
  return (
    <button
      onClick={() => pronounce(item.en)}
      aria-label={`Phát âm số ${item.value} là ${item.en}`}
      className={`aspect-square bg-gradient-to-br ${accent} border-2 rounded-3xl p-2 flex flex-col items-center justify-center active:scale-95 hover:shadow-md transition-all`}
    >
      <div className="font-black text-4xl text-slate-800 leading-none">
        {formatNumeral(item.value)}
      </div>
      <div className="text-xs font-black text-emerald-700 mt-1 truncate max-w-full">
        {item.en}
      </div>
      <div className="text-[9px] text-slate-500 font-bold mt-0.5 truncate max-w-full italic">
        {item.example}
      </div>
    </button>
  );
}

