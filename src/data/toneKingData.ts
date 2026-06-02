// Dữ liệu cho game "Vua Thanh Điệu". Bé nghe 1 tiếng và chọn đúng biến thể
// thanh điệu trong các nút lựa chọn. Tổ chức thành 6 "vương quốc" mở tuần tự
// — mỗi vương quốc thêm 1 thanh mới để bé làm quen từng bước.
//
// Pedagogical note: tiếng Việt 4-5 tuổi đã NÓI đúng cả 6 thanh nhưng chưa
// kết nối được "thanh đó tên là gì" và "trông thế nào trên giấy". Game này
// dán nhãn cho cái đã biết — cầu nối quan trọng cho việc đọc lớp 1.

export type Tone = 'ngang' | 'sac' | 'huyen' | 'hoi' | 'nga' | 'nang';

export type ToneInfo = {
  id: Tone;
  name: string; // 'ngang', 'sắc', 'huyền', ...
  mark: string; // Ký tự đại diện cho dấu (hiển thị trên nút như "hint")
  // Hướng dẫn ngắn — đọc khi bé chọn đúng để củng cố tên dấu.
  hint: string;
};

export const TONES: Record<Tone, ToneInfo> = {
  ngang: { id: 'ngang', name: 'ngang', mark: '—', hint: 'không có dấu' },
  sac:   { id: 'sac',   name: 'sắc',   mark: '´', hint: 'nét chéo lên' },
  huyen: { id: 'huyen', name: 'huyền', mark: '`', hint: 'nét chéo xuống' },
  hoi:   { id: 'hoi',   name: 'hỏi',   mark: '?', hint: 'dấu hỏi cong' },
  nga:   { id: 'nga',   name: 'ngã',   mark: '~', hint: 'lượn sóng' },
  nang:  { id: 'nang',  name: 'nặng',  mark: '.', hint: 'dấu chấm dưới' },
};

// Bảng các âm tiết. Mỗi base map sang 6 biến thể thanh điệu (đã có sẵn Unicode).
// Chọn base có 1-3 biến thể là từ concrete trẻ biết — để khi bé nghe sẽ thấy
// quen tai. Các biến thể còn lại tuy không phải từ phổ biến vẫn phát âm
// được rõ ràng, đủ cho game audio-visual matching.
export type SyllableSet = Record<Tone, string>;

export const SYLLABLES: Record<string, SyllableSet> = {
  ma: { ngang: 'ma', sac: 'má', huyen: 'mà', hoi: 'mả', nga: 'mã', nang: 'mạ' },
  ca: { ngang: 'ca', sac: 'cá', huyen: 'cà', hoi: 'cả', nga: 'cã', nang: 'cạ' },
  co: { ngang: 'co', sac: 'có', huyen: 'cò', hoi: 'cỏ', nga: 'cõ', nang: 'cọ' },
  la: { ngang: 'la', sac: 'lá', huyen: 'là', hoi: 'lả', nga: 'lã', nang: 'lạ' },
  ba: { ngang: 'ba', sac: 'bá', huyen: 'bà', hoi: 'bả', nga: 'bã', nang: 'bạ' },
  to: { ngang: 'to', sac: 'tó', huyen: 'tò', hoi: 'tỏ', nga: 'tõ', nang: 'tọ' },
  na: { ngang: 'na', sac: 'ná', huyen: 'nà', hoi: 'nả', nga: 'nã', nang: 'nạ' },
};

export const SYLLABLE_BASES: string[] = Object.keys(SYLLABLES);

export type Kingdom = {
  id: string;
  name: string;
  emoji: string;
  // Các thanh điệu được hiển thị làm lựa chọn ở vương quốc này.
  tones: Tone[];
  // Mô tả ngắn cho card chọn level.
  desc: string;
};

// 6 vương quốc tuần tự — mỗi vương quốc thêm 1 thanh. Vương quốc cuối "Đại
// Đăng Quang" có đủ 6 thanh nhưng dùng pool syllable đa dạng hơn.
export const KINGDOMS: Kingdom[] = [
  {
    id: 'k_ngang_sac',
    name: 'Ngang & Sắc',
    emoji: '🏰',
    tones: ['ngang', 'sac'],
    desc: 'Bé phân biệt tiếng "ma" và "má"',
  },
  {
    id: 'k_huyen',
    name: 'Vương quốc Huyền',
    emoji: '🏯',
    tones: ['ngang', 'sac', 'huyen'],
    desc: 'Thêm dấu huyền — "mà" và "má"',
  },
  {
    id: 'k_hoi',
    name: 'Vương quốc Hỏi',
    emoji: '🕌',
    tones: ['ngang', 'sac', 'huyen', 'hoi'],
    desc: 'Thêm dấu hỏi — "mả" cong cong',
  },
  {
    id: 'k_nga',
    name: 'Vương quốc Ngã',
    emoji: '🗼',
    tones: ['ngang', 'sac', 'huyen', 'hoi', 'nga'],
    desc: 'Thêm dấu ngã — "mã" lượn sóng',
  },
  {
    id: 'k_nang',
    name: 'Vương quốc Nặng',
    emoji: '🎪',
    tones: ['ngang', 'sac', 'huyen', 'hoi', 'nga', 'nang'],
    desc: 'Đủ 6 thanh — "mạ" có dấu chấm',
  },
  {
    id: 'k_final',
    name: 'Đại Đăng Quang',
    emoji: '💎',
    tones: ['ngang', 'sac', 'huyen', 'hoi', 'nga', 'nang'],
    desc: 'Bé là Vua Thanh Điệu thực thụ!',
  },
];

export const QUESTIONS_PER_KINGDOM = 5;
export const PASS_THRESHOLD = 4; // ≥4/5 đúng → pass

export type ToneQuestion = {
  syllable: string;            // base, vd 'ma'
  options: Tone[];             // các tone hiển thị (= kingdom.tones, có thể xáo trộn)
  target: Tone;                // thanh đúng
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Sinh deck N câu hỏi cho 1 vương quốc.
// - Mỗi câu chọn ngẫu nhiên 1 syllable và 1 target tone trong các tone của vương quốc.
// - Tránh 2 câu liên tiếp dùng cùng (syllable + tone) — bé sẽ không lặp mù.
export function generateDeck(kingdom: Kingdom, count: number = QUESTIONS_PER_KINGDOM): ToneQuestion[] {
  const deck: ToneQuestion[] = [];
  let last: { syllable: string; target: Tone } | null = null;
  let safety = 0;
  while (deck.length < count && safety < 200) {
    safety++;
    const syllable = pickRandom(SYLLABLE_BASES);
    const target = pickRandom(kingdom.tones);
    if (last && last.syllable === syllable && last.target === target) continue;
    // Cũng tránh 2 câu liên tiếp cùng target (đỡ nhàm) khi pool đủ rộng.
    if (last && last.target === target && kingdom.tones.length >= 3 && deck.length >= 1) {
      // Cho phép trùng target 1 lần — không cứng nhắc.
      if (Math.random() < 0.5) continue;
    }
    // Tone options là thứ tự cố định của kingdom (giữ vị trí nhất quán giúp bé
    // ghi nhớ vị trí của dấu — như chữ trên bàn phím).
    deck.push({ syllable, target, options: kingdom.tones });
    last = { syllable, target };
  }
  return deck;
}

export const findKingdom = (id: string): Kingdom | undefined =>
  KINGDOMS.find((k) => k.id === id);

// Vương quốc kế tiếp trong chuỗi unlock; undefined nếu là cuối.
export const nextKingdomId = (id: string): string | undefined => {
  const idx = KINGDOMS.findIndex((k) => k.id === id);
  if (idx < 0 || idx >= KINGDOMS.length - 1) return undefined;
  return KINGDOMS[idx + 1].id;
};

// Vương quốc nào unlock cho user dựa trên Set các id đã pass.
// Logic: vương quốc đầu luôn unlock; mỗi vương quốc kế chỉ unlock khi vương
// quốc trước đã pass.
export const isKingdomUnlocked = (id: string, passed: Set<string>): boolean => {
  const idx = KINGDOMS.findIndex((k) => k.id === id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return passed.has(KINGDOMS[idx - 1].id);
};
