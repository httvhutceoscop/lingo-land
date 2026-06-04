/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU GAME "BÉ TÌM CHỮ BỊ MẤT"
 *
 * Mỗi câu hỏi cho bé 5–6 tuổi: một con vật / đồ vật bị mất một (hoặc một cụm)
 * chữ cái trong tên. Bé chọn chữ đúng để hoàn thành từ.
 *
 * AUTHORING AN TOÀN VỚI UNICODE TIẾNG VIỆT:
 *   Thay vì lưu "displayWord" + "index" (dễ sai vì chữ có dấu là tổ hợp/precomposed
 *   nhiều dạng), mỗi câu được tách sẵn thành 3 mảnh:
 *       before  — phần đứng TRƯỚC ô trống   (vd "M")
 *       missing — chữ bị mất = ĐÁP ÁN ĐÚNG   (vd "È")
 *       after   — phần đứng SAU ô trống      (vd "O")
 *   => từ đầy đủ = before + missing + after  ("MÈO")
 *   => không cần tính chỉ số ký tự, không lo độ dài chuỗi Unicode.
 *
 *   `missing` có thể là 1 chữ (È, Ú, …) hoặc 1 cụm phụ âm (TR, CH, TH, NG…)
 *   để tăng độ khó ở các màn sau (theo yêu cầu "thiếu âm ghép").
 *
 * Tất cả chữ viết HOA — trẻ mầm non làm quen mặt chữ in hoa trước.
 * TTS đọc bằng chữ thường tiếng Việt (xử lý trong view).
 * ────────────────────────────────────────────────────────────────────────── */

export interface MLQuestion {
  emoji: string;        // hình minh hoạ (dùng emoji thay cho file ảnh)
  before: string;       // phần trước ô trống (có thể rỗng)
  after: string;        // phần sau ô trống (có thể rỗng)
  missing: string;      // chữ/cụm bị mất — đáp án đúng
  distractors: string[]; // 3 phương án sai (cùng "loại" với đáp án cho hợp lý)
}

export interface MLLevel {
  id: string;           // ID ổn định cho localStorage (vd "ml.animal")
  title: string;        // tên chủ đề hiển thị
  emoji: string;        // emoji chủ đề (header)
  sticker: string;      // sticker thưởng khi hoàn thành màn
  stickerName: string;  // tên sticker (đọc + hiển thị)
  gradient: string;     // tailwind gradient cho card/level
  questions: MLQuestion[];
}

/** Lấy từ đầy đủ từ 3 mảnh. */
export const fullWord = (q: MLQuestion): string => q.before + q.missing + q.after;

/** 4 phương án (đáp án + 3 distractor) — chưa xáo trộn. */
export const allChoices = (q: MLQuestion): string[] => [q.missing, ...q.distractors];

// ── Bộ phương án sai dùng lại nhiều lần ──────────────────────────────────
// Nguyên âm có dấu (cùng nhóm với đáp án là nguyên âm) và cụm phụ âm.
// Khai báo gọn để dữ liệu câu hỏi đỡ lặp.

export const MISSING_LETTER_LEVELS: MLLevel[] = [
  // ─── MÀN 1: ĐỘNG VẬT — thiếu 1 nguyên âm (dễ) ─────────────────────────
  {
    id: 'ml.animal',
    title: 'Vườn Thú',
    emoji: '🐾',
    sticker: '🐱',
    stickerName: 'Mèo con',
    gradient: 'from-amber-400 via-pink-500 to-rose-500',
    questions: [
      { emoji: '🐱', before: 'M', after: 'O', missing: 'È', distractors: ['A', 'Ô', 'U'] },
      { emoji: '🐶', before: 'CH', after: '', missing: 'Ó', distractors: ['A', 'Ê', 'U'] },
      { emoji: '🐔', before: 'G', after: '', missing: 'À', distractors: ['O', 'Ê', 'I'] },
      { emoji: '🐟', before: 'C', after: '', missing: 'Á', distractors: ['O', 'È', 'U'] },
      { emoji: '🐰', before: 'TH', after: '', missing: 'Ỏ', distractors: ['A', 'Ê', 'U'] },
      { emoji: '🦆', before: 'V', after: 'T', missing: 'Ị', distractors: ['A', 'O', 'Ê'] },
      { emoji: '🐮', before: 'B', after: '', missing: 'Ò', distractors: ['A', 'Ê', 'I'] },
      { emoji: '🐷', before: 'L', after: 'N', missing: 'Ợ', distractors: ['A', 'Ê', 'U'] },
    ],
  },

  // ─── MÀN 2: GIA ĐÌNH — thiếu 1 nguyên âm, vài câu thiếu chữ đầu ────────
  {
    id: 'ml.family',
    title: 'Gia Đình',
    emoji: '👨‍👩‍👧',
    sticker: '🐶',
    stickerName: 'Cún yêu',
    gradient: 'from-rose-400 via-fuchsia-500 to-purple-500',
    questions: [
      { emoji: '👨', before: 'B', after: '', missing: 'Ố', distractors: ['A', 'Ê', 'U'] },
      { emoji: '👩', before: 'M', after: '', missing: 'Ẹ', distractors: ['A', 'O', 'Ô'] },
      { emoji: '👦', before: '', after: 'NH', missing: 'A', distractors: ['E', 'O', 'U'] },
      { emoji: '👧', before: 'CH', after: '', missing: 'Ị', distractors: ['A', 'O', 'Ê'] },
      { emoji: '👶', before: '', after: 'M', missing: 'E', distractors: ['A', 'O', 'U'] },
      { emoji: '👴', before: '', after: 'NG', missing: 'Ô', distractors: ['A', 'O', 'U'] },
      { emoji: '👵', before: 'B', after: '', missing: 'À', distractors: ['O', 'Ê', 'U'] },
      { emoji: '🏠', before: 'NH', after: '', missing: 'À', distractors: ['O', 'Ê', 'I'] },
    ],
  },

  // ─── MÀN 3: ĐỒ VẬT — thiếu nguyên âm có dấu (khó hơn) ─────────────────
  {
    id: 'ml.object',
    title: 'Đồ Vật',
    emoji: '🪑',
    sticker: '🐰',
    stickerName: 'Thỏ bông',
    gradient: 'from-sky-400 via-cyan-500 to-emerald-500',
    questions: [
      { emoji: '✏️', before: 'B', after: 'T', missing: 'Ú', distractors: ['A', 'O', 'Ê'] },
      { emoji: '🪑', before: 'GH', after: '', missing: 'Ế', distractors: ['A', 'O', 'Ô'] },
      { emoji: '📚', before: 'S', after: 'CH', missing: 'Á', distractors: ['O', 'Ê', 'U'] },
      { emoji: '🪟', before: 'C', after: 'A', missing: 'Ử', distractors: ['A', 'O', 'Ô'] },
      { emoji: '🥄', before: 'TH', after: 'A', missing: 'Ì', distractors: ['A', 'O', 'U'] },
      { emoji: '⚽', before: 'B', after: 'NG', missing: 'Ó', distractors: ['A', 'Ê', 'U'] },
      { emoji: '🧦', before: 'T', after: 'T', missing: 'Ấ', distractors: ['A', 'O', 'Ê'] },
      { emoji: '🔑', before: 'CH', after: 'A', missing: 'Ì', distractors: ['A', 'O', 'U'] },
    ],
  },

  // ─── MÀN 4: ĐỒ ĂN — thiếu PHỤ ÂM đầu (vài câu cụm) ───────────────────
  {
    id: 'ml.food',
    title: 'Món Ngon',
    emoji: '🍚',
    sticker: '🦁',
    stickerName: 'Sư tử nhí',
    gradient: 'from-yellow-400 via-orange-500 to-rose-500',
    questions: [
      { emoji: '🍚', before: '', after: 'ƠM', missing: 'C', distractors: ['B', 'M', 'N'] },
      { emoji: '🍜', before: 'PH', after: '', missing: 'Ở', distractors: ['A', 'O', 'Ê'] },
      { emoji: '🥚', before: '', after: 'ỨNG', missing: 'TR', distractors: ['CH', 'TH', 'NG'] },
      { emoji: '🍞', before: 'B', after: 'NH', missing: 'Á', distractors: ['O', 'Ê', 'U'] },
      { emoji: '🥩', before: '', after: 'ỊT', missing: 'TH', distractors: ['CH', 'PH', 'NH'] },
      { emoji: '🍤', before: 'T', after: 'M', missing: 'Ô', distractors: ['A', 'O', 'Ê'] },
      { emoji: '🍎', before: '', after: 'ÁO', missing: 'T', distractors: ['B', 'C', 'N'] },
      { emoji: '🥛', before: 'S', after: 'A', missing: 'Ữ', distractors: ['A', 'O', 'Ơ'] },
    ],
  },

  // ─── MÀN 5: TRƯỜNG HỌC — thiếu PHỤ ÂM / CỤM (khó) ────────────────────
  {
    id: 'ml.school',
    title: 'Trường Học',
    emoji: '🏫',
    sticker: '🐼',
    stickerName: 'Gấu trúc',
    gradient: 'from-indigo-400 via-purple-500 to-pink-500',
    questions: [
      { emoji: '🏫', before: '', after: 'ƯỜNG', missing: 'TR', distractors: ['CH', 'GI', 'TH'] },
      { emoji: '📓', before: 'V', after: '', missing: 'Ở', distractors: ['A', 'O', 'Ê'] },
      { emoji: '📏', before: '', after: 'ƯỚC', missing: 'TH', distractors: ['CH', 'TR', 'PH'] },
      { emoji: '🎒', before: 'C', after: 'P', missing: 'Ặ', distractors: ['A', 'Â', 'Ô'] },
      { emoji: '🧑‍🏫', before: '', after: 'ỚP', missing: 'L', distractors: ['N', 'R', 'Đ'] },
      { emoji: '🔢', before: 'S', after: '', missing: 'Ố', distractors: ['A', 'O', 'Ô'] },
      { emoji: '🔤', before: '', after: 'Ữ', missing: 'CH', distractors: ['TR', 'NH', 'KH'] },
      { emoji: '🖍️', before: 'M', after: 'U', missing: 'À', distractors: ['O', 'Ê', 'I'] },
    ],
  },

  // ─── MÀN 6: THIÊN NHIÊN — tổng hợp, khó nhất ─────────────────────────
  {
    id: 'ml.nature',
    title: 'Thiên Nhiên',
    emoji: '🌈',
    sticker: '🐻',
    stickerName: 'Gấu nâu',
    gradient: 'from-emerald-400 via-sky-500 to-indigo-500',
    questions: [
      { emoji: '☀️', before: 'N', after: 'NG', missing: 'Ắ', distractors: ['A', 'Â', 'Ô'] },
      { emoji: '🌧️', before: 'M', after: 'A', missing: 'Ư', distractors: ['A', 'Ơ', 'Â'] },
      { emoji: '🌙', before: '', after: 'ĂNG', missing: 'TR', distractors: ['CH', 'GI', 'TH'] },
      { emoji: '⭐', before: '', after: 'AO', missing: 'S', distractors: ['X', 'CH', 'TH'] },
      { emoji: '🌳', before: 'C', after: 'Y', missing: 'Â', distractors: ['A', 'Ă', 'Ơ'] },
      { emoji: '🌸', before: '', after: 'OA', missing: 'H', distractors: ['K', 'L', 'N'] },
      { emoji: '🔥', before: 'L', after: 'A', missing: 'Ử', distractors: ['A', 'O', 'Ô'] },
      { emoji: '🌊', before: 'BI', after: 'N', missing: 'Ể', distractors: ['Ê', 'A', 'Ô'] },
    ],
  },
];

export const TOTAL_ML_LEVELS = MISSING_LETTER_LEVELS.length;
