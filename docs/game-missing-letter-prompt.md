# Claude Code Prompt - Bé Tìm Chữ Bị Mất

## Mục tiêu

Xây dựng game giáo dục "Bé Tìm Chữ Bị Mất" dành cho trẻ em 5-6 tuổi chuẩn bị vào lớp 1.

Ứng dụng phải được phát triển bằng ReactJS + TypeScript, sử dụng React Konva để xử lý hiệu ứng đồ họa và animation.

Code cần sạch, dễ bảo trì, dễ mở rộng và tuân thủ các best practices của React hiện đại.

---

# 1. KIẾN TRÚC VÀ CÁCH PHÂN CHIA VAI TRÒ

## ReactJS

React chịu trách nhiệm quản lý:

* Screen Start
* Screen Playing
* Screen Result
* Điểm số
* Level
* Tiến độ bài học
* Trạng thái đúng/sai
* Combo
* Sticker Collection
* Audio State

Sử dụng:

* useState
* useEffect
* useMemo
* useCallback
* useReducer (nếu phù hợp)
* Custom Hooks

---

## React Konva

Sử dụng React Konva để xử lý:

* Animation xuất hiện từ mới
* Hiệu ứng chữ cái bay vào chỗ trống
* Hiệu ứng phát sáng khi trả lời đúng
* Hiệu ứng rung khi trả lời sai
* Particle Effect
* Hiệu ứng nhận thưởng
* Chuyển màn chơi

Không sử dụng Canvas API thuần nếu không thật sự cần thiết.

---

# 2. GAMEPLAY

## Bối cảnh

Người chơi giúp các con vật và đồ vật tìm lại chữ cái bị mất.

Ví dụ:

🐱 M _ O

Đáp án:

* A
* E
* È
* Ô

Người chơi chọn:

👉 È

Kết quả:

🐱 MÈO

---

## Luồng chơi

1. Hiển thị hình ảnh minh họa
2. Hiển thị từ bị thiếu
3. Hiển thị 4 đáp án
4. Người chơi chọn đáp án
5. Kiểm tra kết quả
6. Phản hồi bằng âm thanh + animation
7. Chuyển câu hỏi tiếp theo

---

## Trả lời đúng

* +10 điểm
* Particle Effect
* Đọc từ hoàn chỉnh bằng Text To Speech
* Tăng Combo

Ví dụ:

MÈO

=> Đọc:

"Mèo"

---

## Trả lời sai

* Button rung
* Hiệu ứng nhẹ
* Không trừ điểm
* Cho phép chọn lại

---

## Kết thúc Level

10 câu hỏi / level

Đánh giá:

* 8-10 đúng → ⭐⭐⭐
* 5-7 đúng → ⭐⭐
* 0-4 đúng → ⭐

---

# 3. THÔNG SỐ KỸ THUẬT

## Tech Stack

* ReactJS
* TypeScript
* React Konva
* TailwindCSS
* Web Speech API

---

## Interface

```typescript
interface Question {
  id: string;
  image: string;
  word: string;
  displayWord: string;
  missingPart: string;
  choices: string[];
  answer: string;
  category: string;
}
```

Ví dụ:

```typescript
{
  id: "1",
  image: "cat.png",
  word: "MÈO",
  displayWord: "M _ O",
  missingPart: "È",
  choices: ["È", "A", "Ô", "U"],
  answer: "È",
  category: "animal"
}
```

---

## GAME_CONFIG

```typescript
export const GAME_CONFIG = {
  QUESTIONS_PER_LEVEL: 10,
  SCORE_PER_CORRECT: 10,
  TRANSITION_DELAY: 1000,
  MAX_LEVEL: 20,
  ENABLE_SOUND: true,
  COMBO_THRESHOLD_1: 3,
  COMBO_THRESHOLD_2: 5
};
```

---

# 4. UI / UX CHO TRẺ EM

## Màu sắc

Sử dụng:

* Sky Blue
* Mint Green
* Soft Yellow
* Pastel Pink

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

Font phải lớn, dễ đọc.

---

## SCREEN_START

Hiển thị:

* Logo game
* Mascot vui nhộn
* Nút:

"BẮT ĐẦU"

---

## SCREEN_PLAYING

Hiển thị:

* Level
* Điểm số
* Thanh tiến độ
* Hình minh họa
* Từ bị thiếu
* Các đáp án

---

## SCREEN_RESULT

Hiển thị:

* Điểm đạt được
* Số sao
* Sticker nhận được
* Nút:

"CHƠI LẠI"

---

# 5. STICKER COLLECTION

Sau mỗi level mở khóa sticker mới:

* 🐱 Mèo
* 🐶 Chó
* 🐰 Thỏ
* 🦁 Sư tử
* 🐼 Gấu trúc

Cho phép xem bộ sưu tập sticker.

---

# 6. COMBO SYSTEM

Đúng liên tiếp:

3 câu:

Hiển thị:

"TUYỆT VỜI!"

Nhân điểm x2

---

5 câu:

Hiển thị:

"SIÊU GIỎI!"

Nhân điểm x3

---

# 7. HỆ THỐNG NỘI DUNG

## Chủ đề Động vật

* MÈO
* CHÓ
* GÀ
* CÁ
* THỎ

---

## Chủ đề Gia đình

* BỐ
* MẸ
* ANH
* CHỊ

---

## Chủ đề Đồ vật

* BÚT
* GHẾ
* BÀN
* TỦ
* SÁCH

---

## Chủ đề Trường học

* LỚP
* VỞ
* THƯỚC
* TRƯỜNG

---

# 8. ĐỘ KHÓ TĂNG DẦN

## Level 1-5

Thiếu 1 chữ cái

Ví dụ:

M _ O

---

## Level 6-10

Thiếu 2 chữ cái

Ví dụ:

T _ Ơ _ G

---

## Level 11-20

Thiếu âm ghép

Ví dụ:

_ Ư Ờ N G

---

# 9. ÂM THANH

Sử dụng Web Speech API.

Khi hiện từ:

MÈO

Đọc:

"Mèo"

Khi trả lời đúng:

Đọc lại từ hoàn chỉnh.

---

# 10. CẤU TRÚC FILE

Sinh đầy đủ source code:

```text
src/
├── components/
│   ├── MissingLetterGame.tsx
│   ├── StartScreen.tsx
│   ├── PlayingScreen.tsx
│   ├── ResultScreen.tsx
│   ├── QuestionCard.tsx
│   ├── AnswerButtons.tsx
│   ├── StickerGallery.tsx
│   └── CanvasEffects.tsx
│
├── hooks/
│   ├── useGameState.ts
│   ├── useSpeech.ts
│   └── useCombo.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── QuestionEngine.ts
│   └── StickerManager.ts
│
├── data/
│   └── questions.ts
│
├── config/
│   └── GameConfig.ts
│
└── types/
    └── game.ts
```

---

# 11. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Có cleanup đầy đủ
* Có mock data để chạy ngay
* Không phụ thuộc backend
* Hỗ trợ tối thiểu 500+ từ vựng trong tương lai
* Responsive Mobile + Tablet
* Có comment giải thích logic quan trọng

---

# 12. YÊU CẦU CUỐI CÙNG

Sinh toàn bộ source code hoàn chỉnh có thể chạy ngay bằng:

```bash
npm install
npm run dev
```

Không tạo pseudo code.

Không bỏ sót file.

Không rút gọn implementation.

Mọi component phải được code đầy đủ.
