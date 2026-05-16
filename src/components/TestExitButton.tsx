import { useState } from 'react';

type TestExitButtonProps = {
  onExit: () => void;
};

export default function TestExitButton({ onExit }: TestExitButtonProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-3 text-sm"
      >
        ✕ Thoát
      </button>
      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="text-5xl mb-3">🤔</div>
              <h3 className="text-xl font-black mb-2">Thoát bài kiểm tra?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Tiến độ làm bài sẽ không được lưu.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                >
                  ← Tiếp tục làm bài
                </button>
                <button
                  onClick={onExit}
                  className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
                >
                  Thoát ra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
