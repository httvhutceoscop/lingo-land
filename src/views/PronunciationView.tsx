import { useMemo, useState } from 'react';
import {
  PHONEMES,
  PHONEME_GROUPS,
  youtubeSearchUrl,
  type PhonemeType,
} from '../data/ipaData';
import { pronounce } from '../lib/audio';

const TAB_ACCENT: Record<PhonemeType, string> = {
  'vowel-short': 'bg-blue-50 text-blue-700 border-blue-200',
  'vowel-long': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  diphthong: 'bg-purple-50 text-purple-700 border-purple-200',
  consonant: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function PronunciationView() {
  const [activeTab, setActiveTab] = useState<PhonemeType>('vowel-short');

  const filtered = useMemo(
    () => PHONEMES.filter((p) => p.type === activeTab),
    [activeTab]
  );

  return (
    <div className="py-4 animate-in fade-in duration-300">
      <h2 className="text-2xl font-black mb-2">Bảng phát âm IPA</h2>
      <p className="text-slate-400 text-sm mb-6">
        44 âm cơ bản của tiếng Anh — tap 🔊 để nghe ví dụ, ▶️ để xem video hướng dẫn.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {PHONEME_GROUPS.map((g) => {
          const active = g.key === activeTab;
          return (
            <button
              key={g.key}
              onClick={() => setActiveTab(g.key)}
              className={`shrink-0 px-3 py-2 rounded-full border-2 font-bold text-xs transition-all ${
                active
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-500 border-slate-100'
              }`}
            >
              <span className="mr-1">{g.icon}</span>
              {g.label}
              <span className="ml-1 text-[10px] opacity-70">
                ({PHONEMES.filter((p) => p.type === g.key).length})
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((p) => (
          <div
            key={p.ipa}
            className={`p-4 rounded-2xl border-2 ${TAB_ACCENT[p.type]} flex flex-col`}
          >
            <div className="font-black text-3xl mb-2 text-center font-mono">{p.ipa}</div>
            <div className="text-xs text-slate-600 mb-2 leading-relaxed">
              {p.examples.map((w, i) => (
                <span key={w}>
                  {i > 0 ? ', ' : ''}
                  <span className="font-bold">{w}</span>
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed flex-1 mb-3">{p.vi}</p>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => pronounce(p.examples[0])}
                aria-label={`Nghe ví dụ ${p.examples[0]}`}
                className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold active:scale-95 transition-all"
              >
                🔊
              </button>
              <a
                href={youtubeSearchUrl(p.ipa)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Xem video phát âm ${p.ipa} trên YouTube`}
                className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center active:scale-95 transition-all"
              >
                ▶️
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-700">Mẹo: </span>
          Mô tả tiếng Việt chỉ mang tính gần đúng. Một số âm như /θ/, /ð/, /æ/, /r/ không có
          trong tiếng Việt — hãy xem video để luyện khẩu hình chính xác.
        </p>
      </div>
    </div>
  );
}
