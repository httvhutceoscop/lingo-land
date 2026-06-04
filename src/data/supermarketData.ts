/* ──────────────────────────────────────────────────────────────────────────
 * DỮ LIỆU & BỘ SINH CÂU HỎI — GAME "SIÊU THỊ TOÁN HỌC"
 *
 * Bé 5–7 tuổi đóng vai nhân viên siêu thị. Khách hàng đưa ra yêu cầu, bé thực
 * hiện thao tác toán học tương ứng (đếm / so sánh / cộng / trừ / thanh toán).
 *
 * File này KHÔNG chứa React — chỉ dữ liệu thuần + hàm sinh câu hỏi, để:
 *   - Dễ test, dễ mở rộng (thêm sản phẩm / level / loại câu hỏi).
 *   - Tách bạch "luật chơi/đề bài" khỏi "giao diện" (nằm ở SupermarketMathView).
 *
 * Câu hỏi được SINH THEO LEVEL (procedural) thay vì viết tay từng câu — nhờ vậy
 * mỗi lần chơi đề bài luôn mới và số lượng câu là "vô hạn" (đáp ứng yêu cầu
 * tối thiểu 50 câu / 20 level một cách tự nhiên).
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. CẤU HÌNH CHUNG
 * ========================================================================= */

export const GAME_CONFIG = {
  INITIAL_LIVES: 3, // số mạng ban đầu (❤️❤️❤️)
  SCORE_PER_CORRECT: 10, // điểm gốc mỗi câu đúng (trước khi nhân combo)
  QUESTIONS_PER_LEVEL: 6, // số câu đúng cần để lên level (doc gợi ý 10 — rút còn 6
  //                          cho phù hợp khả năng tập trung của bé 5–7 tuổi)
  MAX_LEVEL: 20, // số level hiển thị trong hệ thống
  COMBO_X2: 3, // đúng liên tiếp ≥ 3 câu → nhân đôi điểm
  COMBO_X3: 5, // đúng liên tiếp ≥ 5 câu → nhân ba điểm
  ANIMATION_DURATION: 800, // ms — thời lượng hiệu ứng phản hồi đúng/sai
} as const;

/* ===========================================================================
 * 2. KIỂU DỮ LIỆU
 * ========================================================================= */

/** Một mặt hàng trong siêu thị. */
export interface Product {
  id: string;
  name: string; // tên tiếng Việt (để đọc TTS + hiển thị)
  emoji: string;
  unit: string; // đơn vị đếm: "quả", "củ", "hộp", "cái"… (đọc cho tự nhiên)
  price: number; // giá tính bằng "xu" — dùng cho chế độ thanh toán
  category: string;
}

/** 5 chế độ chơi theo doc. */
export type QMode = 'count' | 'compare' | 'add' | 'subtract' | 'checkout';

/** Một "đống hàng" trong chế độ so sánh (một bên của câu hỏi). */
export interface ComparePile {
  product: Product;
  count: number;
}

/** Một dòng trong hoá đơn ở chế độ thanh toán. */
export interface CheckoutLine {
  product: Product;
  qty: number;
}

/**
 * Câu hỏi đã được "dựng sẵn" đầy đủ thông tin để view chỉ việc render.
 * Mỗi mode chỉ dùng một nhóm field tương ứng (các field khác để undefined).
 */
export interface SMQuestion {
  id: string;
  mode: QMode;
  level: number;
  instruction: string; // câu lệnh hiển thị trên màn hình
  speak: string; // câu đọc TTS (thường trùng instruction nhưng tách riêng để chỉnh)
  answer: number; // đáp án dạng số (compare: 0 = chọn trái, 1 = chọn phải)

  // ── mode 'count' ──
  product?: Product; // sản phẩm khách muốn mua
  target?: number; // số lượng cần bỏ vào giỏ (== answer)

  // ── mode 'compare' ──
  left?: ComparePile;
  right?: ComparePile;
  wantMore?: boolean; // true: hỏi "nhiều hơn?", false: hỏi "ít hơn?"

  // ── mode 'add' ──
  addA?: number;
  addB?: number;

  // ── mode 'subtract' ──
  subTotal?: number;
  subRemove?: number;

  // ── mode 'checkout' ──
  lines?: CheckoutLine[];

  // ── dùng chung cho add / subtract / checkout: 4 nút số để chọn ──
  options?: number[];
}

/* ===========================================================================
 * 3. DANH SÁCH SẢN PHẨM (20 mặt hàng)
 *    Dễ mở rộng: chỉ cần thêm phần tử vào mảng này.
 * ========================================================================= */

export const PRODUCTS: Product[] = [
  // Trái cây ─ category 'fruit', đơn vị "quả"
  { id: 'apple', name: 'táo', emoji: '🍎', unit: 'quả', price: 1, category: 'fruit' },
  { id: 'banana', name: 'chuối', emoji: '🍌', unit: 'quả', price: 2, category: 'fruit' },
  { id: 'orange', name: 'cam', emoji: '🍊', unit: 'quả', price: 3, category: 'fruit' },
  { id: 'grape', name: 'nho', emoji: '🍇', unit: 'chùm', price: 3, category: 'fruit' },
  { id: 'strawberry', name: 'dâu', emoji: '🍓', unit: 'quả', price: 2, category: 'fruit' },
  { id: 'watermelon', name: 'dưa hấu', emoji: '🍉', unit: 'quả', price: 4, category: 'fruit' },
  { id: 'pineapple', name: 'dứa', emoji: '🍍', unit: 'quả', price: 4, category: 'fruit' },
  { id: 'kiwi', name: 'kiwi', emoji: '🥝', unit: 'quả', price: 3, category: 'fruit' },

  // Rau củ ─ category 'veg'
  { id: 'carrot', name: 'cà rốt', emoji: '🥕', unit: 'củ', price: 1, category: 'veg' },
  { id: 'corn', name: 'ngô', emoji: '🌽', unit: 'bắp', price: 2, category: 'veg' },
  { id: 'tomato', name: 'cà chua', emoji: '🍅', unit: 'quả', price: 1, category: 'veg' },
  { id: 'broccoli', name: 'súp lơ', emoji: '🥦', unit: 'cái', price: 3, category: 'veg' },

  // Bánh & đồ ăn vặt ─ category 'snack'
  { id: 'bread', name: 'bánh mì', emoji: '🍞', unit: 'ổ', price: 2, category: 'snack' },
  { id: 'cake', name: 'bánh kem', emoji: '🧁', unit: 'cái', price: 3, category: 'snack' },
  { id: 'cookie', name: 'bánh quy', emoji: '🍪', unit: 'cái', price: 1, category: 'snack' },
  { id: 'donut', name: 'bánh vòng', emoji: '🍩', unit: 'cái', price: 2, category: 'snack' },

  // Đồ uống & khác ─ category 'other'
  { id: 'milk', name: 'sữa', emoji: '🥛', unit: 'hộp', price: 2, category: 'other' },
  { id: 'juice', name: 'nước ép', emoji: '🧃', unit: 'hộp', price: 2, category: 'other' },
  { id: 'egg', name: 'trứng', emoji: '🥚', unit: 'quả', price: 1, category: 'other' },
  { id: 'cheese', name: 'phô mai', emoji: '🧀', unit: 'miếng', price: 3, category: 'other' },
];

/* ===========================================================================
 * 4. STICKER THƯỞNG
 *    Mở khoá theo cột mốc level (xem unlockStickersForLevel ở view).
 * ========================================================================= */

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
  /** Level cần ĐẠT (hoàn thành) để mở khoá sticker này. */
  atLevel: number;
}

export const STICKERS: Sticker[] = [
  { id: 'gold-apple', emoji: '🍎', name: 'Táo vàng', atLevel: 5 },
  { id: 'gold-banana', emoji: '🍌', name: 'Chuối vàng', atLevel: 10 },
  { id: 'magic-cart', emoji: '🛒', name: 'Giỏ hàng thần kỳ', atLevel: 15 },
  { id: 'math-medal', emoji: '🏆', name: 'Huy chương toán học', atLevel: 20 },
];

/* ===========================================================================
 * 5. TIỆN ÍCH NGẪU NHIÊN
 * ========================================================================= */

/** Số nguyên ngẫu nhiên trong [min, max] (bao gồm 2 đầu). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Lấy ngẫu nhiên một phần tử của mảng. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Xáo trộn mảng (Fisher–Yates) — trả về mảng MỚI, không sửa mảng gốc. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lấy 2 sản phẩm KHÁC nhau (dùng cho chế độ so sánh / thanh toán nhiều món). */
function pickTwoProducts(): [Product, Product] {
  const a = pick(PRODUCTS);
  let b = pick(PRODUCTS);
  while (b.id === a.id) b = pick(PRODUCTS);
  return [a, b];
}

/**
 * Tạo 4 phương án số (1 đúng + 3 nhiễu) cho các câu hỏi dạng chọn số.
 * Distractor nằm gần đáp án (±1..3), được kẹp trong [0, maxRange] để không
 * vượt phạm vi học của bé. Nếu pool quá hẹp thì lấp bằng số nhỏ.
 */
function numberOptions(answer: number, maxRange: number): number[] {
  const distractors = new Set<number>();
  let guard = 0;
  while (distractors.size < 3 && guard < 60) {
    guard++;
    const delta = randInt(1, 3) * (Math.random() < 0.5 ? -1 : 1);
    const cand = answer + delta;
    if (cand >= 0 && cand <= maxRange && cand !== answer) distractors.add(cand);
  }
  // Lấp thêm nếu thiếu (trường hợp maxRange nhỏ).
  for (let n = 0; n <= maxRange && distractors.size < 3; n++) {
    if (n !== answer) distractors.add(n);
  }
  return shuffle([answer, ...distractors]);
}

/* ===========================================================================
 * 6. BỘ SINH CÂU HỎI THEO LEVEL
 *
 *    Phân tầng độ khó bám theo doc:
 *      Level 1–5  : đếm 0–5
 *      Level 6–10 : đếm 0–10
 *      Level 11–15: cộng / trừ trong 10
 *      Level 16–20: cộng / trừ trong 20 + thanh toán
 *    So sánh (compare) được rải đều xuyên suốt để đổi nhịp.
 * ========================================================================= */

/** Quyết định chế độ chơi cho 1 câu, dựa trên level. */
function pickMode(level: number): QMode {
  const r = Math.random();
  if (level <= 5) {
    // Giai đoạn đầu: chủ yếu đếm, thỉnh thoảng so sánh.
    return r < 0.8 ? 'count' : 'compare';
  }
  if (level <= 10) {
    return r < 0.6 ? 'count' : r < 0.85 ? 'compare' : 'add';
  }
  if (level <= 15) {
    // Trọng tâm cộng/trừ, xen kẽ so sánh.
    return r < 0.4 ? 'add' : r < 0.8 ? 'subtract' : r < 0.9 ? 'compare' : 'count';
  }
  // Level 16+: cộng/trừ phạm vi lớn + thanh toán.
  return r < 0.3 ? 'add' : r < 0.6 ? 'subtract' : r < 0.85 ? 'checkout' : 'compare';
}

/** Phạm vi số tối đa cho chế độ đếm theo level. */
function countMaxForLevel(level: number): number {
  if (level <= 5) return 5;
  return 10;
}

/** Phạm vi số tối đa cho cộng/trừ theo level. */
function arithMaxForLevel(level: number): number {
  return level <= 15 ? 10 : 20;
}

let _qCounter = 0; // bộ đếm để tạo id duy nhất cho mỗi câu hỏi

/**
 * Sinh MỘT câu hỏi ngẫu nhiên phù hợp với `level`.
 * Đây là điểm vào chính được view gọi mỗi khi cần câu mới.
 */
export function generateQuestion(level: number): SMQuestion {
  const id = `q${_qCounter++}`;
  const mode = pickMode(level);

  switch (mode) {
    /* ── ĐẾM: "Cho cô N <đơn vị> <tên>" ───────────────────────────────── */
    case 'count': {
      const product = pick(PRODUCTS);
      const max = countMaxForLevel(level);
      const target = randInt(1, max); // ít nhất 1 để luôn có thao tác
      return {
        id,
        mode,
        level,
        product,
        target,
        answer: target,
        instruction: `Cho cô ${target} ${product.unit} ${product.name} nhé!`,
        speak: `Cho cô ${target} ${product.unit} ${product.name}`,
      };
    }

    /* ── SO SÁNH: "Bên nào nhiều/ít hơn?" ─────────────────────────────── */
    case 'compare': {
      const [pa, pb] = pickTwoProducts();
      const maxC = level <= 5 ? 5 : 9;
      let na = randInt(1, maxC);
      let nb = randInt(1, maxC);
      while (nb === na) nb = randInt(1, maxC); // tránh bằng nhau
      const wantMore = Math.random() < 0.5;
      // answer: 0 = đống TRÁI đúng, 1 = đống PHẢI đúng.
      const leftIsBigger = na > nb;
      const answer = wantMore
        ? leftIsBigger
          ? 0
          : 1
        : leftIsBigger
          ? 1
          : 0;
      return {
        id,
        mode,
        level,
        left: { product: pa, count: na },
        right: { product: pb, count: nb },
        wantMore,
        answer,
        instruction: wantMore ? 'Bên nào NHIỀU hơn?' : 'Bên nào ÍT hơn?',
        speak: wantMore ? 'Bên nào nhiều hơn?' : 'Bên nào ít hơn?',
      };
    }

    /* ── CỘNG: "Có A, thêm B. Tất cả mấy?" ────────────────────────────── */
    case 'add': {
      const max = arithMaxForLevel(level);
      const addA = randInt(1, max - 1);
      const addB = randInt(1, max - addA); // đảm bảo A + B ≤ max
      const answer = addA + addB;
      const product = pick(PRODUCTS);
      return {
        id,
        mode,
        level,
        product,
        addA,
        addB,
        answer,
        options: numberOptions(answer, max),
        instruction: `Trong giỏ có ${addA}, thêm ${addB} ${product.unit} nữa. Tất cả mấy ${product.unit}?`,
        speak: `Trong giỏ có ${addA} ${product.name}, thêm ${addB} ${product.name} nữa. Tất cả bao nhiêu?`,
      };
    }

    /* ── TRỪ: "Có A, lấy đi B. Còn mấy?" ──────────────────────────────── */
    case 'subtract': {
      const max = arithMaxForLevel(level);
      const subTotal = randInt(2, max);
      const subRemove = randInt(1, subTotal - 1); // còn lại luôn ≥ 1
      const answer = subTotal - subRemove;
      const product = pick(PRODUCTS);
      return {
        id,
        mode,
        level,
        product,
        subTotal,
        subRemove,
        answer,
        options: numberOptions(answer, max),
        instruction: `Có ${subTotal} ${product.unit}, lấy đi ${subRemove}. Còn lại mấy ${product.unit}?`,
        speak: `Có ${subTotal} ${product.name}, lấy đi ${subRemove}. Còn lại bao nhiêu?`,
      };
    }

    /* ── THANH TOÁN: tính tổng số xu phải trả ─────────────────────────── */
    case 'checkout': {
      // 1–2 dòng hàng, mỗi dòng 1–3 món; giữ tổng ≤ 10 cho dễ với bé.
      const lineCount = randInt(1, 2);
      const products = shuffle(PRODUCTS).slice(0, lineCount);
      const lines: CheckoutLine[] = [];
      let total = 0;
      for (const product of products) {
        // Giới hạn qty sao cho tổng không vượt 10 xu.
        const maxQty = Math.max(1, Math.min(3, Math.floor((10 - total) / product.price)));
        if (maxQty < 1) break;
        const qty = randInt(1, maxQty);
        lines.push({ product, qty });
        total += qty * product.price;
      }
      // Phòng hờ: nếu vòng lặp không thêm được dòng nào (giá cao), ép 1 món rẻ.
      if (lines.length === 0) {
        const cheap = PRODUCTS.reduce((m, p) => (p.price < m.price ? p : m), PRODUCTS[0]);
        lines.push({ product: cheap, qty: 1 });
        total = cheap.price;
      }
      return {
        id,
        mode,
        level,
        lines,
        answer: total,
        options: numberOptions(total, 12),
        instruction: 'Khách trả tất cả mấy xu? 🪙',
        speak: 'Khách phải trả tất cả bao nhiêu xu?',
      };
    }
  }
}
