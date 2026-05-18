import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  COLOR_PALETTE,
  COLORING_PICTURES,
  DEFAULT_FILL,
  OUTLINE_COLOR,
  type ColoringPicture,
} from '../data/coloringData';
import { LANG_SPEAK_DEFAULT, speak } from '../lib/audio';

type Phase = 'library' | 'coloring';
type AllFills = Record<string, Record<string, string>>;

const STORAGE_KEY = 'lingoland_coloring';
const RESET_CONFIRM_MS = 2000;

function loadFills(): AllFills {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as AllFills;
    }
  } catch {
    // fall through
  }
  return {};
}

function saveFills(fills: AllFills): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fills));
}

function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

type ColoringViewProps = {
  onBack: () => void;
};

export default function ColoringView({ onBack }: ColoringViewProps) {
  const [phase, setPhase] = useState<Phase>('library');
  const [activePictureId, setActivePictureId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTE[0]);
  const [allFills, setAllFills] = useState<AllFills>(() => loadFills());
  const [pulsingRegion, setPulsingRegion] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [search, setSearch] = useState('');
  const libraryScrollRef = useRef({ mainTop: 0, winY: 0 });

  const filteredPictures = useMemo(() => {
    const q = normalizeForSearch(search);
    if (!q) return COLORING_PICTURES;
    return COLORING_PICTURES.filter((p) =>
      normalizeForSearch(p.vi).includes(q)
    );
  }, [search]);

  useLayoutEffect(() => {
    const main = document.querySelector('main');
    const apply = (mainTop: number, winY: number) => {
      if (main) main.scrollTop = mainTop;
      window.scrollTo(0, winY);
    };
    if (phase === 'library') {
      const { mainTop, winY } = libraryScrollRef.current;
      apply(mainTop, winY);
      const id = requestAnimationFrame(() => apply(mainTop, winY));
      return () => cancelAnimationFrame(id);
    }
    apply(0, 0);
  }, [phase]);

  const activePicture: ColoringPicture | null = useMemo(
    () => COLORING_PICTURES.find((p) => p.id === activePictureId) ?? null,
    [activePictureId]
  );

  const activeFills = activePicture ? allFills[activePicture.id] ?? {} : {};

  // Speak the title once when entering the coloring phase
  useEffect(() => {
    if (phase !== 'coloring' || !activePicture) return;
    const t = window.setTimeout(() => {
      speak(`Tô màu ${activePicture.vi.toLowerCase()}`, LANG_SPEAK_DEFAULT);
    }, 300);
    return () => window.clearTimeout(t);
  }, [phase, activePicture]);

  // Auto-disarm the reset confirmation after RESET_CONFIRM_MS
  useEffect(() => {
    if (!resetArmed) return;
    const t = window.setTimeout(() => setResetArmed(false), RESET_CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [resetArmed]);

  const openPicture = (id: string) => {
    const main = document.querySelector('main');
    libraryScrollRef.current = {
      mainTop: main?.scrollTop ?? 0,
      winY: window.scrollY,
    };
    setActivePictureId(id);
    setPhase('coloring');
    setResetArmed(false);
    setPulsingRegion(null);
  };

  const backToLibrary = () => {
    setPhase('library');
    setActivePictureId(null);
    setResetArmed(false);
    setPulsingRegion(null);
  };

  const paintRegion = (pictureId: string, regionId: string) => {
    const nextPic = { ...(allFills[pictureId] ?? {}), [regionId]: selectedColor };
    const next: AllFills = { ...allFills, [pictureId]: nextPic };
    setAllFills(next);
    saveFills(next);
    setPulsingRegion(regionId);
    setSavedToast(true);
    window.setTimeout(
      () => setPulsingRegion((r) => (r === regionId ? null : r)),
      400
    );
    window.setTimeout(() => setSavedToast(false), 900);
  };

  const handleReset = () => {
    if (!activePicture) return;
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    const next = { ...allFills };
    delete next[activePicture.id];
    setAllFills(next);
    saveFills(next);
    setResetArmed(false);
  };

  // ─── LIBRARY ───────────────────────────────────────────────────────
  if (phase === 'library' || !activePicture) {
    return (
      <>
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
        >
          ← Bản đồ
        </button>
        <div className="text-center mb-5 max-w-md mx-auto">
          <div className="text-7xl mb-3 floating">🎨</div>
          <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-pink-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            Tô màu vui
          </h2>
          <p className="text-slate-500 text-sm">
            Chọn một bức tranh và tô màu theo ý thích.
          </p>
        </div>

        <div className="sticky top-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 mb-3 bg-white/95 backdrop-blur border-b border-slate-100">
          <div className="relative max-w-md mx-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tranh..."
              className="w-full pl-11 pr-10 py-3 border-2 border-slate-200 rounded-2xl focus:border-amber-400 focus:outline-none font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-normal"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              🔍
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Xoá tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-black flex items-center justify-center active:scale-95"
              >
                ✕
              </button>
            )}
          </div>
          {search && (
            <p className="text-center text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">
              {filteredPictures.length} kết quả
            </p>
          )}
        </div>

        {filteredPictures.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-5xl mb-2">🔎</div>
            <p className="font-bold">Không tìm thấy tranh phù hợp</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {filteredPictures.map((pic) => {
              const fills = allFills[pic.id] ?? {};
              const filledCount = Object.keys(fills).length;
              return (
                <button
                  key={pic.id}
                  onClick={() => openPicture(pic.id)}
                  className="bg-white border-2 border-slate-100 rounded-3xl p-4 shadow-sm active:scale-95 transition-all flex flex-col items-center gap-2 text-center hover:shadow-md"
                >
                  <PictureThumbnail picture={pic} fills={fills} />
                  <div className="font-black text-slate-700 text-sm">{pic.vi}</div>
                  {filledCount > 0 && (
                    <div className="text-[10px] font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">
                      Đã tô {filledCount} vùng
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ─── COLORING ──────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-3 gap-2">
        <button
          onClick={backToLibrary}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm shrink-0"
        >
          ← Thư viện
        </button>
        <div className="font-black text-slate-700 truncate">
          {activePicture.emoji} {activePicture.vi}
        </div>
        <button
          onClick={handleReset}
          className={`text-xs font-black px-3 py-1.5 rounded-full transition-all shrink-0 ${
            resetArmed
              ? 'bg-rose-500 text-white'
              : 'bg-white border-2 border-slate-200 text-slate-500'
          }`}
        >
          {resetArmed ? 'Xác nhận?' : '🗑️ Xoá'}
        </button>
      </div>

      <div className="relative bg-gradient-to-br from-pink-50 via-orange-50 to-amber-50 border-2 border-amber-100 rounded-3xl p-4 mb-4">
        <svg
          viewBox={activePicture.viewBox}
          xmlns="http://www.w3.org/2000/svg"
          className="block w-full mx-auto max-w-md select-none"
          style={{ touchAction: 'manipulation' }}
        >
          <g transform={activePicture.transform}>
            {activePicture.regions.map((region) => {
              const fill =
                activeFills[region.id] ?? region.defaultFill ?? DEFAULT_FILL;
              const isPulsing = pulsingRegion === region.id;
              return (
                <path
                  key={region.id}
                  d={region.d}
                  fill={fill}
                  stroke={OUTLINE_COLOR}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className={isPulsing ? 'color-pulse' : undefined}
                  style={{
                    transition: 'fill 0.25s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => paintRegion(activePicture.id, region.id)}
                />
              );
            })}
          </g>
        </svg>
        {savedToast && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full badge-pop">
            ✓ Đã lưu
          </div>
        )}
      </div>

      <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
        Chọn màu rồi chạm vào tranh
      </p>
      <div className="grid grid-cols-8 gap-2 md:gap-3 max-w-lg mx-auto">
        {COLOR_PALETTE.map((c) => {
          const isSelected = selectedColor === c;
          const isWhite = c.toLowerCase() === '#ffffff';
          return (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              aria-label={`Màu ${c}`}
              className={`aspect-square rounded-full transition-all active:scale-95 ${
                isSelected
                  ? 'ring-4 ring-amber-400 ring-offset-2 scale-110 shadow-lg'
                  : 'ring-1 ring-slate-200'
              } ${isWhite ? 'border-2 border-slate-300' : ''}`}
              style={{
                backgroundColor: c,
                touchAction: 'manipulation',
                minWidth: 32,
                minHeight: 32,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Thumbnail ─────────────────────────────────────────────────────────

type PictureThumbnailProps = {
  picture: ColoringPicture;
  fills: Record<string, string>;
};

function PictureThumbnail({ picture, fills }: PictureThumbnailProps) {
  return (
    <svg
      viewBox={picture.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="w-20 h-20"
      aria-hidden
    >
      <g transform={picture.transform}>
        {picture.regions.map((region) => {
          const fill = fills[region.id] ?? region.defaultFill ?? DEFAULT_FILL;
          return (
            <path
              key={region.id}
              d={region.d}
              fill={fill}
              stroke={OUTLINE_COLOR}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    </svg>
  );
}
