import { useEffect, type ReactNode } from 'react';

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export default function SideDrawer({ open, onClose, title = 'Tủ đồ', children }: SideDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-[60] bg-black transition-opacity duration-300 ${
          open ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-[70] h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5 flex justify-between items-center border-b bg-emerald-50/50">
          <h2 className="font-black text-lg text-emerald-700 flex items-center gap-2">
            <span className="text-xl">🎒</span> {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng menu"
            className="w-9 h-9 flex items-center justify-center text-xl text-slate-400 hover:text-slate-700 hover:bg-white rounded-full transition-all"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </aside>
    </>
  );
}
