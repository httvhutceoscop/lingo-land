export type NavKey = 'map' | 'leader' | 'profile';

type NavItem = { key: NavKey; icon: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'map', icon: '🏝️', label: 'KHÁM PHÁ' },
  { key: 'leader', icon: '🏆', label: 'XẾP HẠNG' },
  { key: 'profile', icon: '👤', label: 'HỒ SƠ' },
];

type BottomNavProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
};

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="sticky bottom-0 z-40 border-t bg-white/90 backdrop-blur-md px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-around items-center">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          className={`flex flex-col items-center ${
            active === item.key ? 'text-emerald-500' : 'text-slate-400'
          }`}
        >
          <span className="text-2xl">{item.icon}</span>
          <span className="text-[10px] font-bold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
