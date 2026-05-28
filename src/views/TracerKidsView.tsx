import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../context/GameContext';
import { LANG_SPEAK_DEFAULT, playSfx, speak } from '../lib/audio';

/* ──────────────────────────────────────────────────────────────────────────
 * GAME: "Thợ Sơn Tí Hon — Tập Tô Chữ Và Số"
 *
 * Trò chơi tập tô cho bé 3-5 tuổi: bé dùng "cọ sơn" (chuột hoặc ngón tay)
 * tô đè lên chữ cái A-Z và chữ số 0-9 hiện mờ trên canvas. Hệ thống vẽ sẵn
 * các ĐIỂM CHỐT (yellow dots) đánh số 1,2,3... để hướng dẫn thứ tự nét vẽ.
 *
 * KIẾN TRÚC:
 *  - React: quản lý chữ hiện tại, màu cọ, các chữ đã hoàn thành (lưu vào
 *    localStorage để giữ thành tích giữa các phiên).
 *  - HTML5 Canvas: vẽ nền bảng, chữ template mờ, các điểm chốt vàng, nét
 *    sơn của bé, và con trỏ cọ sơn dạng emoji.
 *
 * THUẬT TOÁN TẬP TÔ (TRACING ALGORITHM):
 *  - Mỗi chữ gồm nhiều NÉT (stroke). Mỗi nét là chuỗi điểm chốt theo thứ tự
 *    bé phải đi qua. Ví dụ chữ A có 2 nét: ^ + thanh ngang.
 *  - Khi con trỏ của bé (drag) lọt vào bán kính TOLERANCE quanh điểm chốt
 *    tiếp theo → ✓ điểm đó, chuyển sang điểm kế tiếp.
 *  - Khi đã đi qua TẤT CẢ điểm chốt của TẤT CẢ nét theo đúng thứ tự
 *    → hoàn thành chữ → pháo hoa → tự chuyển chữ tiếp theo sau 2 giây.
 *  - Cố ý KHÔNG bắt buộc bé phải kéo liền tay giữa các nét (đối với bé 3-5
 *    tuổi quá khó). Bé có thể nhấc tay rồi chạm lại điểm kế tiếp.
 *
 * VẼ ĐỒ HOẠ MỖI FRAME (requestAnimationFrame):
 *   1. Nền bảng (kem dịu mắt).
 *   2. Chữ template mờ (fillText màu xám nhạt) — cỡ siêu to.
 *   3. Các điểm chốt vàng với số thứ tự; điểm đã đi qua chuyển xanh lá;
 *      điểm KẾ TIẾP có viền phát sáng + dao động (pulse) để bé chú ý.
 *   4. Vẽ các nét sơn của bé (polyline thật mượt, đầu nét bo tròn).
 *   5. Vẽ con trỏ cọ sơn 🖌️ tại vị trí pointer.
 * ────────────────────────────────────────────────────────────────────────── */

/* ===========================================================================
 * 1. HẰNG SỐ
 * ========================================================================= */

// Kích thước canvas cố định 800x500 (yêu cầu của doc).
// CSS sẽ scale theo container; pointer coords được quy về tọa độ này.
const CANVAS_W = 800;
const CANVAS_H = 500;

// Cọ siêu to (kid-friendly) — bo đầu tròn để mịn.
const BRUSH_WIDTH = 26;

// Bán kính "cảm ứng" khi kiểm tra bé có chạm vào điểm chốt hay chưa.
// To hơn bán kính chấm 1 chút để bé tô gần là tính trúng (forgive children).
const TOLERANCE = 55;

// Bán kính chấm vàng + chấm xanh khi đã đi qua.
const DOT_RADIUS = 18;

// Sau khi hoàn thành 1 chữ, đợi 2 giây rồi chuyển chữ kế tiếp (theo doc).
const ADVANCE_DELAY_MS = 2000;

// Key lưu localStorage các chữ đã hoàn thành ít nhất 1 lần — tiền tố
// `lingoland_` để cùng dọn khi user reset profile.
const STORAGE_KEY = 'lingoland_tracer_done';

/* ===========================================================================
 * 2. BỘ DỮ LIỆU ĐIỂM CHỐT (TRACE_DATA)
 *
 * Mỗi chữ định nghĩa bằng MỘT MẢNG CÁC NÉT, mỗi nét = mảng điểm chốt theo
 * thứ tự bé phải kéo qua.
 *
 * Hệ quy ước toạ độ trên canvas 800x500:
 *   - Tâm vẽ: x ≈ 400, y ≈ 250
 *   - Cạnh ngang chữ: x ∈ [320, 480]   (rộng 160px)
 *   - Cạnh dọc chữ:   y ∈ [120, 380]   (cao 260px)
 * Bộ cột mốc thường dùng:
 *   - xL = 320 (cạnh trái)        xR = 480 (cạnh phải)
 *   - xC = 400 (giữa)             yT = 120 (đỉnh)
 *   - yM = 250 (giữa)             yB = 380 (đáy)
 *
 * Một số chữ phức tạp (B, R, P, S, 8...) cố ý đơn giản hoá để vẫn vừa với
 * 5-9 điểm chốt — đủ giữ hình dạng nhận diện cho bé, không đòi hỏi đồ thị
 * font đẹp như font in.
 * ========================================================================= */

type Point = { x: number; y: number };
type Stroke = Point[];
type CharDef = { ch: string; strokes: Stroke[] };

const TRACE_DATA: CharDef[] = [
  /* ---- CHỮ SỐ 0-9 ---- */

  // 0: hình tròn đi từ đỉnh, sang trái, xuống dưới, vòng phải lên đỉnh.
  {
    ch: '0',
    strokes: [
      [
        { x: 400, y: 120 },
        { x: 345, y: 150 },
        { x: 325, y: 210 },
        { x: 325, y: 290 },
        { x: 345, y: 350 },
        { x: 400, y: 380 },
        { x: 455, y: 350 },
        { x: 475, y: 290 },
        { x: 475, y: 210 },
        { x: 455, y: 150 },
        { x: 400, y: 122 },
      ],
    ],
  },
  // 1: cờ trên-trái + thân dọc + đế ngang (3 nét nhỏ → gộp 2 nét cho dễ).
  {
    ch: '1',
    strokes: [
      [
        { x: 345, y: 180 },
        { x: 400, y: 130 },
        { x: 400, y: 380 },
      ],
      [
        { x: 345, y: 380 },
        { x: 460, y: 380 },
      ],
    ],
  },
  // 2: cong trên + chéo xuống + đế ngang.
  {
    ch: '2',
    strokes: [
      [
        { x: 335, y: 175 },
        { x: 370, y: 130 },
        { x: 430, y: 130 },
        { x: 470, y: 180 },
        { x: 450, y: 240 },
        { x: 360, y: 330 },
        { x: 325, y: 380 },
        { x: 475, y: 380 },
      ],
    ],
  },
  // 3: cong trên + ngấn giữa + cong dưới.
  {
    ch: '3',
    strokes: [
      [
        { x: 335, y: 150 },
        { x: 380, y: 120 },
        { x: 440, y: 135 },
        { x: 465, y: 195 },
        { x: 420, y: 250 },
        { x: 380, y: 250 },
      ],
      [
        { x: 390, y: 250 },
        { x: 450, y: 260 },
        { x: 475, y: 325 },
        { x: 440, y: 375 },
        { x: 370, y: 378 },
        { x: 330, y: 355 },
      ],
    ],
  },
  // 4: chéo trên-trái xuống thanh ngang + thân dọc.
  {
    ch: '4',
    strokes: [
      [
        { x: 440, y: 120 },
        { x: 330, y: 295 },
        { x: 470, y: 295 },
      ],
      [
        { x: 440, y: 180 },
        { x: 440, y: 380 },
      ],
    ],
  },
  // 5: ngang trên + thân trái + cong vòng dưới.
  {
    ch: '5',
    strokes: [
      [
        { x: 465, y: 125 },
        { x: 340, y: 125 },
        { x: 335, y: 230 },
        { x: 390, y: 220 },
        { x: 450, y: 250 },
        { x: 465, y: 315 },
        { x: 425, y: 372 },
        { x: 360, y: 378 },
        { x: 325, y: 355 },
      ],
    ],
  },
  // 6: cong từ trên xuống bụng tròn dưới.
  {
    ch: '6',
    strokes: [
      [
        { x: 465, y: 155 },
        { x: 395, y: 130 },
        { x: 345, y: 220 },
        { x: 330, y: 310 },
        { x: 360, y: 370 },
        { x: 410, y: 378 },
        { x: 460, y: 340 },
        { x: 465, y: 290 },
        { x: 425, y: 255 },
        { x: 370, y: 260 },
        { x: 340, y: 295 },
      ],
    ],
  },
  // 7: ngang trên + chéo xuống.
  {
    ch: '7',
    strokes: [
      [
        { x: 335, y: 135 },
        { x: 465, y: 135 },
        { x: 360, y: 380 },
      ],
    ],
  },
  // 8: bụng trên + bụng dưới (vẽ liền 1 nét xoắn).
  {
    ch: '8',
    strokes: [
      [
        { x: 400, y: 250 },
        { x: 360, y: 215 },
        { x: 370, y: 160 },
        { x: 420, y: 130 },
        { x: 455, y: 170 },
        { x: 450, y: 220 },
        { x: 400, y: 250 },
        { x: 350, y: 280 },
        { x: 330, y: 325 },
        { x: 360, y: 372 },
        { x: 430, y: 378 },
        { x: 465, y: 330 },
        { x: 445, y: 275 },
        { x: 400, y: 250 },
      ],
    ],
  },
  // 9: bụng tròn trên + đuôi xuống.
  {
    ch: '9',
    strokes: [
      [
        { x: 465, y: 200 },
        { x: 440, y: 140 },
        { x: 385, y: 130 },
        { x: 345, y: 170 },
        { x: 330, y: 220 },
        { x: 370, y: 265 },
        { x: 430, y: 265 },
        { x: 465, y: 225 },
        { x: 440, y: 378 },
      ],
    ],
  },

  /* ---- CHỮ CÁI A-Z ---- */

  // A: 2 nét — ^ rồi thanh ngang giữa.
  {
    ch: 'A',
    strokes: [
      [
        { x: 320, y: 380 },
        { x: 400, y: 120 },
        { x: 480, y: 380 },
      ],
      [
        { x: 350, y: 275 },
        { x: 450, y: 275 },
      ],
    ],
  },
  // B: thân dọc + 2 bụng tròn (gộp 1 nét lớn từ đỉnh đến đáy bụng dưới).
  {
    ch: 'B',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 335, y: 380 },
      ],
      [
        { x: 335, y: 125 },
        { x: 420, y: 135 },
        { x: 470, y: 190 },
        { x: 420, y: 245 },
        { x: 335, y: 250 },
      ],
      [
        { x: 335, y: 255 },
        { x: 425, y: 260 },
        { x: 475, y: 320 },
        { x: 425, y: 375 },
        { x: 335, y: 378 },
      ],
    ],
  },
  // C: nửa vòng tròn mở phải.
  {
    ch: 'C',
    strokes: [
      [
        { x: 465, y: 165 },
        { x: 420, y: 130 },
        { x: 370, y: 135 },
        { x: 335, y: 180 },
        { x: 325, y: 260 },
        { x: 335, y: 335 },
        { x: 380, y: 375 },
        { x: 425, y: 372 },
        { x: 465, y: 340 },
      ],
    ],
  },
  // D: thân dọc + bụng vòng phải.
  {
    ch: 'D',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 335, y: 380 },
      ],
      [
        { x: 335, y: 125 },
        { x: 420, y: 140 },
        { x: 475, y: 210 },
        { x: 475, y: 290 },
        { x: 420, y: 372 },
        { x: 335, y: 375 },
      ],
    ],
  },
  // E: ngang trên + thân + ngang đáy, rồi ngang giữa.
  {
    ch: 'E',
    strokes: [
      [
        { x: 465, y: 120 },
        { x: 335, y: 120 },
        { x: 335, y: 380 },
        { x: 465, y: 380 },
      ],
      [
        { x: 335, y: 250 },
        { x: 440, y: 250 },
      ],
    ],
  },
  // F: như E nhưng bỏ ngang đáy.
  {
    ch: 'F',
    strokes: [
      [
        { x: 465, y: 120 },
        { x: 335, y: 120 },
        { x: 335, y: 380 },
      ],
      [
        { x: 335, y: 250 },
        { x: 430, y: 250 },
      ],
    ],
  },
  // G: như C + nét nối ngang ở bụng phải.
  {
    ch: 'G',
    strokes: [
      [
        { x: 465, y: 165 },
        { x: 420, y: 130 },
        { x: 370, y: 135 },
        { x: 335, y: 180 },
        { x: 325, y: 260 },
        { x: 335, y: 335 },
        { x: 380, y: 375 },
        { x: 440, y: 375 },
        { x: 470, y: 335 },
        { x: 470, y: 260 },
        { x: 420, y: 260 },
      ],
    ],
  },
  // H: 2 thân dọc + 1 thanh ngang.
  {
    ch: 'H',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 335, y: 380 },
      ],
      [
        { x: 465, y: 120 },
        { x: 465, y: 380 },
      ],
      [
        { x: 335, y: 250 },
        { x: 465, y: 250 },
      ],
    ],
  },
  // I: ngang trên + thân + ngang đáy.
  {
    ch: 'I',
    strokes: [
      [
        { x: 340, y: 120 },
        { x: 460, y: 120 },
      ],
      [
        { x: 400, y: 120 },
        { x: 400, y: 380 },
      ],
      [
        { x: 340, y: 380 },
        { x: 460, y: 380 },
      ],
    ],
  },
  // J: thân dọc với móc dưới-trái.
  {
    ch: 'J',
    strokes: [
      [
        { x: 465, y: 120 },
        { x: 465, y: 320 },
        { x: 440, y: 372 },
        { x: 385, y: 378 },
        { x: 340, y: 345 },
        { x: 330, y: 295 },
      ],
    ],
  },
  // K: thân dọc + 2 chéo gặp tại giữa.
  {
    ch: 'K',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 335, y: 380 },
      ],
      [
        { x: 465, y: 120 },
        { x: 335, y: 250 },
        { x: 465, y: 380 },
      ],
    ],
  },
  // L: thân dọc + ngang đáy.
  {
    ch: 'L',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 335, y: 380 },
        { x: 465, y: 380 },
      ],
    ],
  },
  // M: V ngược.
  {
    ch: 'M',
    strokes: [
      [
        { x: 330, y: 380 },
        { x: 330, y: 120 },
        { x: 400, y: 300 },
        { x: 470, y: 120 },
        { x: 470, y: 380 },
      ],
    ],
  },
  // N: zigzag 2 thân + chéo.
  {
    ch: 'N',
    strokes: [
      [
        { x: 330, y: 380 },
        { x: 330, y: 120 },
        { x: 470, y: 380 },
        { x: 470, y: 120 },
      ],
    ],
  },
  // O: như số 0.
  {
    ch: 'O',
    strokes: [
      [
        { x: 400, y: 120 },
        { x: 345, y: 150 },
        { x: 325, y: 210 },
        { x: 325, y: 290 },
        { x: 345, y: 350 },
        { x: 400, y: 380 },
        { x: 455, y: 350 },
        { x: 475, y: 290 },
        { x: 475, y: 210 },
        { x: 455, y: 150 },
        { x: 400, y: 122 },
      ],
    ],
  },
  // P: thân dọc + bụng trên.
  {
    ch: 'P',
    strokes: [
      [
        { x: 335, y: 380 },
        { x: 335, y: 120 },
      ],
      [
        { x: 335, y: 125 },
        { x: 425, y: 135 },
        { x: 475, y: 195 },
        { x: 425, y: 250 },
        { x: 335, y: 255 },
      ],
    ],
  },
  // Q: O + đuôi chéo xuống dưới-phải.
  {
    ch: 'Q',
    strokes: [
      [
        { x: 400, y: 120 },
        { x: 345, y: 150 },
        { x: 325, y: 210 },
        { x: 325, y: 290 },
        { x: 345, y: 350 },
        { x: 400, y: 380 },
        { x: 455, y: 350 },
        { x: 475, y: 290 },
        { x: 475, y: 210 },
        { x: 455, y: 150 },
        { x: 400, y: 122 },
      ],
      [
        { x: 430, y: 320 },
        { x: 490, y: 405 },
      ],
    ],
  },
  // R: P + chân chéo phải.
  {
    ch: 'R',
    strokes: [
      [
        { x: 335, y: 380 },
        { x: 335, y: 120 },
      ],
      [
        { x: 335, y: 125 },
        { x: 425, y: 135 },
        { x: 475, y: 190 },
        { x: 425, y: 255 },
        { x: 335, y: 255 },
      ],
      [
        { x: 345, y: 255 },
        { x: 475, y: 380 },
      ],
    ],
  },
  // S: cong trên + đảo + cong dưới.
  {
    ch: 'S',
    strokes: [
      [
        { x: 465, y: 165 },
        { x: 420, y: 130 },
        { x: 370, y: 135 },
        { x: 335, y: 180 },
        { x: 345, y: 230 },
        { x: 420, y: 260 },
        { x: 460, y: 295 },
        { x: 460, y: 335 },
        { x: 420, y: 372 },
        { x: 370, y: 378 },
        { x: 330, y: 345 },
      ],
    ],
  },
  // T: ngang trên + thân giữa.
  {
    ch: 'T',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 465, y: 120 },
      ],
      [
        { x: 400, y: 120 },
        { x: 400, y: 380 },
      ],
    ],
  },
  // U: 2 thân dọc + cong đáy.
  {
    ch: 'U',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 335, y: 310 },
        { x: 370, y: 370 },
        { x: 430, y: 370 },
        { x: 465, y: 310 },
        { x: 465, y: 120 },
      ],
    ],
  },
  // V: 2 chéo gặp ở đáy.
  {
    ch: 'V',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 400, y: 380 },
        { x: 465, y: 120 },
      ],
    ],
  },
  // W: 2 V cạnh nhau (4 chéo).
  {
    ch: 'W',
    strokes: [
      [
        { x: 320, y: 120 },
        { x: 360, y: 380 },
        { x: 400, y: 200 },
        { x: 440, y: 380 },
        { x: 480, y: 120 },
      ],
    ],
  },
  // X: 2 đường chéo cắt nhau.
  {
    ch: 'X',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 465, y: 380 },
      ],
      [
        { x: 465, y: 120 },
        { x: 335, y: 380 },
      ],
    ],
  },
  // Y: 2 chéo gặp ở giữa + thân dọc xuống.
  {
    ch: 'Y',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 400, y: 260 },
      ],
      [
        { x: 465, y: 120 },
        { x: 400, y: 260 },
        { x: 400, y: 380 },
      ],
    ],
  },
  // Z: ngang trên + chéo + ngang đáy (1 nét liền).
  {
    ch: 'Z',
    strokes: [
      [
        { x: 335, y: 120 },
        { x: 465, y: 120 },
        { x: 335, y: 380 },
        { x: 465, y: 380 },
      ],
    ],
  },
];

/* ===========================================================================
 * 3. BẢNG MÀU CỌ — CHỌN BÚT MÀU RỰC RỠ DỄ THƯƠNG
 * ========================================================================= */

const BRUSH_COLORS: { name: string; hex: string }[] = [
  { name: 'Đỏ', hex: '#ef4444' },
  { name: 'Xanh dương', hex: '#3b82f6' },
  { name: 'Xanh lá', hex: '#22c55e' },
  { name: 'Tím', hex: '#a855f7' },
  { name: 'Vàng', hex: '#f59e0b' },
  { name: 'Hồng', hex: '#ec4899' },
];

/* ===========================================================================
 * 4. HÀM TIỆN ÍCH
 * ========================================================================= */

/** Bình phương khoảng cách Euclidean — tránh sqrt cho check tolerance. */
function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Load danh sách chữ ĐÃ hoàn thành từ localStorage. */
function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/** Persist danh sách chữ ĐÃ hoàn thành. */
function saveDone(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage hỏng → bỏ qua, lần sau thử lại.
  }
}

/** Đọc tên chữ to tiếng Việt cho TTS — chữ cái đọc tên Anh, số đọc tiếng Việt. */
function speakCharVN(ch: string) {
  // Phát âm tiếng Anh cho chữ cái (đọc tên A, B, C…); tiếng Việt cho số.
  if (/[A-Z]/.test(ch)) speak(ch, 'en-US');
  else speak(ch, LANG_SPEAK_DEFAULT);
}

/* ===========================================================================
 * 5. REACT COMPONENT
 * ========================================================================= */

type Phase = 'tracing' | 'completed';

type Props = { onBack: () => void };

export default function TracerKidsView({ onBack }: Props) {
  const { addScore } = useGame();

  /* ─── React state (giao diện) ─────────────────────────────────────────── */

  // index của chữ hiện tại trong TRACE_DATA.
  const [idx, setIdx] = useState(0);
  // màu cọ hiện tại — đỏ là mặc định để bé thấy rõ trên nền kem.
  const [brushColor, setBrushColor] = useState(BRUSH_COLORS[0].hex);
  // 'tracing' đang tô; 'completed' vừa hoàn thành — chờ 2s rồi advance.
  const [phase, setPhase] = useState<Phase>('tracing');
  // Set các chữ đã hoàn thành ít nhất 1 lần (load từ localStorage).
  const [done, setDone] = useState<Set<string>>(() => loadDone());
  // Số điểm chốt đã đi qua (chỉ để render UI tiến độ chữ hiện tại).
  const [reachedCount, setReachedCount] = useState(0);

  /* ─── Refs (state tốc độ cao — KHÔNG re-render mỗi pointer event) ───── */

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Đang nhấn giữ chuột/ngón tay hay không.
  const drawingRef = useRef(false);

  // Tiến trình: bé đang ở điểm thứ `p` của nét thứ `s`. Khi vượt tổng số nét
  // có nghĩa là đã hoàn thành chữ.
  const progressRef = useRef<{ s: number; p: number }>({ s: 0, p: 0 });

  // Tất cả các đoạn "sơn" bé đã vẽ trên chữ HIỆN TẠI. Mỗi đoạn là 1 polyline
  // (1 lần kéo chuột liên tục) — lưu để vẽ lại mỗi frame.
  const inkStrokesRef = useRef<{ color: string; points: Point[] }[]>([]);

  // Vị trí con trỏ hiện tại (để vẽ cọ emoji). null nếu chưa từng di chuột.
  const cursorRef = useRef<Point | null>(null);

  // Lưu màu cọ hiện tại vào ref để callback pointer (vốn ổn định) đọc kịp.
  const brushColorRef = useRef(brushColor);
  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);

  // Lưu phase hiện tại vào ref để vòng lặp draw đọc kịp (animation pulse).
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* ─── Dẫn xuất từ idx ─────────────────────────────────────────────────── */

  const current = TRACE_DATA[idx];
  const totalPoints = useMemo(
    () => current.strokes.reduce((s, st) => s + st.length, 0),
    [current],
  );

  /* ─── Reset state mỗi khi đổi chữ ─────────────────────────────────────── */

  const resetForChar = useCallback(() => {
    progressRef.current = { s: 0, p: 0 };
    inkStrokesRef.current = [];
    cursorRef.current = null;
    drawingRef.current = false;
    setReachedCount(0);
    setPhase('tracing');
  }, []);

  useEffect(() => {
    resetForChar();
    // Đọc to chữ khi vào màn — bé biết mình sắp tô gì.
    const t = window.setTimeout(() => speakCharVN(current.ch), 250);
    return () => window.clearTimeout(t);
  }, [idx, current.ch, resetForChar]);

  /* ─── Tính điểm chốt KẾ TIẾP — tham chiếu cho check tolerance & vẽ pulse ─ */

  const getNextTarget = useCallback((): Point | null => {
    const { s, p } = progressRef.current;
    if (s >= current.strokes.length) return null;
    const stroke = current.strokes[s];
    if (p >= stroke.length) return null;
    return stroke[p];
  }, [current]);

  /** Nhảy progress sang điểm kế tiếp; nếu hết nét → sang nét sau. */
  const advanceProgress = useCallback(() => {
    const cur = progressRef.current;
    const stroke = current.strokes[cur.s];
    if (cur.p + 1 < stroke.length) {
      progressRef.current = { s: cur.s, p: cur.p + 1 };
    } else if (cur.s + 1 < current.strokes.length) {
      progressRef.current = { s: cur.s + 1, p: 0 };
    } else {
      // Đã đi qua điểm CUỐI CÙNG → đẩy progress vượt giới hạn để báo hoàn thành.
      progressRef.current = { s: current.strokes.length, p: 0 };
    }
  }, [current]);

  /** Tính tổng số điểm chốt ĐÃ đi qua tới thời điểm này (cho UI tiến độ). */
  const computeReached = useCallback(() => {
    const cur = progressRef.current;
    let count = 0;
    for (let i = 0; i < cur.s; i++) count += current.strokes[i].length;
    count += cur.p;
    return count;
  }, [current]);

  /* ─── Kiểm tra hoàn thành sau mỗi advance ─────────────────────────────── */

  const checkComplete = useCallback(() => {
    if (progressRef.current.s >= current.strokes.length) {
      // ĐÃ qua hết điểm cuối → chữ này hoàn thành.
      setPhase('completed');
      addScore(20);
      playSfx('snd-correct');

      // Lưu vào danh sách chữ đã hoàn thành (cho UI tiến độ tổng).
      setDone((prev) => {
        if (prev.has(current.ch)) return prev;
        const next = new Set(prev);
        next.add(current.ch);
        saveDone(next);
        return next;
      });

      // PHÁO HOA đầy màu sắc — tiêu chuẩn celebrate trong app.
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'],
      });

      // Đọc to "Giỏi quá!" + tên chữ.
      window.setTimeout(() => speak('Giỏi quá!', LANG_SPEAK_DEFAULT), 200);
      window.setTimeout(() => speakCharVN(current.ch), 900);

      // Tự chuyển chữ kế tiếp sau 2 giây (theo doc).
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % TRACE_DATA.length);
      }, ADVANCE_DELAY_MS);
    }
  }, [current, addScore]);

  /* ─── POINTER HANDLERS — mouse + touch chung 1 đường (pointer events) ─── */

  /** Quy đổi toạ độ event sang toạ độ canvas (800x500). */
  const toCanvasPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
      };
    },
    [],
  );

  /**
   * Trừ điểm chốt KẾ TIẾP nếu pointer đủ gần. Lặp khi pointer di nhanh có
   * thể qua nhiều điểm 1 frame — `while` đảm bảo không bỏ sót.
   */
  const tryReachNext = useCallback(
    (p: Point) => {
      let advanced = false;
      while (true) {
        const target = getNextTarget();
        if (!target) break;
        if (dist2(p, target) <= TOLERANCE * TOLERANCE) {
          advanceProgress();
          advanced = true;
        } else {
          break;
        }
      }
      if (advanced) {
        setReachedCount(computeReached());
        checkComplete();
      }
    },
    [advanceProgress, checkComplete, computeReached, getNextTarget],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // Chặn scroll/zoom mặc định trên touch.
    e.currentTarget.setPointerCapture(e.pointerId);
    if (phaseRef.current !== 'tracing') return;
    const p = toCanvasPoint(e);
    cursorRef.current = p;
    drawingRef.current = true;
    // Bắt đầu polyline mới với màu cọ hiện tại.
    inkStrokesRef.current.push({ color: brushColorRef.current, points: [p] });
    tryReachNext(p);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = toCanvasPoint(e);
    cursorRef.current = p;
    if (!drawingRef.current) return;
    if (phaseRef.current !== 'tracing') return;
    const cur = inkStrokesRef.current[inkStrokesRef.current.length - 1];
    if (cur) cur.points.push(p);
    tryReachNext(p);
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    // setPointerCapture có thể đã release tự nhiên; bọc try để khỏi throw.
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  /* ─── XOÁ + Điều hướng chữ ────────────────────────────────────────────── */

  const handleErase = () => {
    if (phaseRef.current === 'completed') return;
    inkStrokesRef.current = [];
    progressRef.current = { s: 0, p: 0 };
    setReachedCount(0);
  };

  const handlePrev = () => {
    setIdx((i) => (i - 1 + TRACE_DATA.length) % TRACE_DATA.length);
  };

  const handleNext = () => {
    setIdx((i) => (i + 1) % TRACE_DATA.length);
  };

  /* ─── VÒNG LẶP VẼ — requestAnimationFrame ─────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Đảm bảo canvas có nội dung pixel khớp với 800x500 logic coords.
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    let rafId = 0;

    const draw = () => {
      const w = CANVAS_W;
      const h = CANVAS_H;

      // 1. NỀN — kem tươi sáng, dịu mắt theo doc.
      ctx.fillStyle = '#fff7ed'; // tailwind orange-50
      ctx.fillRect(0, 0, w, h);

      // Viền giấy mờ cho cảm giác "trang giấy" — chỉ khung mềm.
      ctx.strokeStyle = '#fde68a'; // amber-200
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      // 2. CHỮ TEMPLATE — vẽ to mờ ở giữa để bé tô đè.
      //    Dùng stroke thay vì fill cho cảm giác nét đứt (rỗng giữa).
      ctx.save();
      ctx.font = "bold 280px 'Nunito', 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Fill mờ
      ctx.fillStyle = 'rgba(148, 163, 184, 0.18)'; // slate-400 18%
      ctx.fillText(current.ch, w / 2, h / 2 + 18);
      // Viền nét đậm hơn 1 chút để rõ biên chữ
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)'; // slate-500 40%
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]); // tạo nét đứt
      ctx.strokeText(current.ch, w / 2, h / 2 + 18);
      ctx.setLineDash([]);
      ctx.restore();

      // 3. NÉT SƠN của bé — vẽ trước khi vẽ điểm chốt để chốt vàng nổi trên cọ.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = BRUSH_WIDTH;
      for (const s of inkStrokesRef.current) {
        if (s.points.length === 0) continue;
        ctx.strokeStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        // Trường hợp 1 điểm — vẽ dot tròn nhỏ.
        if (s.points.length === 1) {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.points[0].x, s.points[0].y, BRUSH_WIDTH / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.stroke();
        }
      }
      ctx.restore();

      // 4. CÁC ĐIỂM CHỐT — đã đi qua: xanh lá ✓; điểm KẾ TIẾP: vàng pulse;
      //    điểm sau đó: vàng mờ với số thứ tự.
      const nextTarget = getNextTarget();
      const cur = progressRef.current;
      let runningNumber = 0; // số thứ tự liên tục qua các nét (1,2,3...).
      for (let si = 0; si < current.strokes.length; si++) {
        const stroke = current.strokes[si];
        for (let pi = 0; pi < stroke.length; pi++) {
          runningNumber++;
          const p = stroke[pi];
          const isReached =
            si < cur.s || (si === cur.s && pi < cur.p);
          const isNext =
            !!nextTarget && nextTarget.x === p.x && nextTarget.y === p.y;

          if (isReached) {
            // ĐÃ tô qua — chấm xanh lá với ✓.
            ctx.fillStyle = '#22c55e'; // green-500
            ctx.beginPath();
            ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = "bold 18px 'Nunito', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', p.x, p.y + 1);
          } else if (isNext) {
            // ĐIỂM TIẾP THEO — pulse + viền xanh để bé biết tô tiếp ở đây.
            const t = Date.now() / 1000;
            const pulse = 1 + Math.sin(t * 5) * 0.18; // dao động 18%
            const r = DOT_RADIUS * pulse;
            // Vòng halo mờ bên ngoài
            ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'; // blue-500/25
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
            ctx.fill();
            // Chấm vàng chính
            ctx.fillStyle = '#fde047'; // yellow-300
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            // Viền xanh dương đậm
            ctx.strokeStyle = '#1d4ed8'; // blue-700
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.stroke();
            // Số thứ tự
            ctx.fillStyle = '#1e3a8a'; // blue-900
            ctx.font = "bold 18px 'Nunito', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(runningNumber), p.x, p.y + 1);
          } else {
            // ĐIỂM CHƯA TỚI — vàng nhạt + số.
            ctx.fillStyle = '#fef3c7'; // amber-100
            ctx.beginPath();
            ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d97706'; // amber-600
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#92400e'; // amber-800
            ctx.font = "bold 16px 'Nunito', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(runningNumber), p.x, p.y + 1);
          }
        }
      }

      // 5. CON TRỎ CỌ SƠN — emoji 🖌️ theo doc, vẽ ngay tại pointer hiện tại.
      const c = cursorRef.current;
      if (c) {
        ctx.save();
        ctx.font = '46px serif'; // serif vì có emoji
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Lệch xíu xíu để mũi cọ đúng ở điểm pointer.
        ctx.fillText('🖌️', c.x + 6, c.y - 14);
        ctx.restore();
      }

      // 6. NẾU HOÀN THÀNH — overlay "GIỎI QUÁ!" ở giữa, scale pulse cho vui mắt.
      if (phaseRef.current === 'completed') {
        const t = Date.now() / 1000;
        const scale = 1 + Math.sin(t * 6) * 0.05;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.font = "900 70px 'Nunito', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#7c2d12'; // orange-900
        ctx.strokeText('GIỎI QUÁ! 🎉', 0, 0);
        ctx.fillStyle = '#facc15'; // yellow-400
        ctx.fillText('GIỎI QUÁ! 🎉', 0, 0);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [current, getNextTarget]);

  /* ─── JSX ─────────────────────────────────────────────────────────────── */

  // % tiến độ chữ hiện tại (cho thanh progress trên-cùng).
  const pct = totalPoints === 0 ? 0 : Math.round((reachedCount / totalPoints) * 100);
  // Số chữ đã hoàn thành ít nhất 1 lần / tổng số chữ.
  const doneCount = done.size;
  const totalChars = TRACE_DATA.length;

  return (
    <div className="animate-in fade-in duration-300 max-w-3xl mx-auto select-none">
      {/* ─── Thanh đầu: nút thoát + tiến độ tổng + nút điều hướng ─── */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 font-bold hover:text-slate-600 text-sm"
        >
          ✕ Thoát
        </button>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">
          🎨 Thợ Sơn Tí Hon
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
          ⭐ {doneCount} / {totalChars}
        </div>
      </div>

      {/* ─── Hiển thị chữ đang tô + thanh progress ─── */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="col-span-2 rounded-2xl p-3 text-center bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            Đang tô
          </div>
          <div className="text-3xl leading-none font-black">{current.ch}</div>
          <div className="text-[10px] font-bold opacity-90 mt-1">
            {idx + 1} / {totalChars} ·{' '}
            {/A-Z/.test(current.ch) ? 'chữ cái' : 'chữ số'}
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-emerald-50 border-2 border-emerald-200 flex flex-col justify-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
            Tiến độ
          </div>
          <div className="text-2xl font-black text-emerald-700">{pct}%</div>
          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
            {reachedCount} / {totalPoints} chấm
          </div>
        </div>
        <div className="rounded-2xl p-3 text-center bg-pink-50 border-2 border-pink-200 flex flex-col justify-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-pink-700">
            Bước tiếp
          </div>
          <div className="text-2xl font-black text-pink-700">
            {reachedCount + 1 <= totalPoints ? reachedCount + 1 : '✓'}
          </div>
          <div className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">
            điểm vàng
          </div>
        </div>
      </div>

      {/* ─── CANVAS ─── */}
      <div className="rounded-3xl overflow-hidden border-4 border-amber-300 shadow-lg shadow-amber-100 bg-orange-50">
        <canvas
          ref={canvasRef}
          // CSS-scaled — pixel size cố định 800x500, hiển thị fit-width.
          className="block w-full aspect-[8/5] touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={onPointerEnd}
        />
      </div>

      {/* ─── Bảng màu cọ ─── */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {BRUSH_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => setBrushColor(c.hex)}
            aria-label={`Chọn màu ${c.name}`}
            className={`w-10 h-10 rounded-full border-4 shadow-md active:scale-90 transition-transform ${
              brushColor === c.hex
                ? 'border-slate-800 scale-110'
                : 'border-white'
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>

      {/* ─── Nút điều hướng + xoá ─── */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={handlePrev}
          className="py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm active:scale-95 transition-all"
        >
          ← Trước
        </button>
        <button
          onClick={handleErase}
          className="py-3 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all"
        >
          🧽 Xoá
        </button>
        <button
          onClick={handleNext}
          className="py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm active:scale-95 transition-all"
        >
          Sau →
        </button>
      </div>

      <p className="text-center text-slate-400 text-[11px] font-bold mt-3 leading-relaxed">
        Tô đè lên chữ mờ · Đi qua các chấm <span className="text-amber-500">vàng</span>{' '}
        theo số thứ tự · Hoàn thành nhận pháo hoa! 🎆
      </p>
    </div>
  );
}
