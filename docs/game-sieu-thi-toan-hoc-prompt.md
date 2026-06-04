# Claude Code Prompt - Siêu Thị Toán Học

## Mục tiêu

Xây dựng game giáo dục "Siêu Thị Toán Học" dành cho trẻ em từ 5-7 tuổi chuẩn bị vào lớp 1.

Game giúp trẻ:

* Nhận biết số từ 0 đến 20
* Học đếm số lượng
* Học cộng trừ trong phạm vi 10 và 20
* Rèn luyện tư duy toán học cơ bản
* Tăng khả năng tập trung và phản xạ

Ứng dụng phải được phát triển bằng:

* ReactJS
* TypeScript
* React Konva (ưu tiên)
* TailwindCSS

Code phải có thể chạy ngay sau khi generate.

---

# 1. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React chịu trách nhiệm quản lý:

* Game State
* Score
* Lives
* Level
* Current Question
* Shopping Cart
* Stars
* Achievement
* Combo
* Game Result

Sử dụng:

* useState
* useEffect
* useReducer
* useMemo
* useCallback
* Custom Hooks

---

## Canvas Layer (React Konva)

Canvas xử lý:

* Hiệu ứng kéo thả sản phẩm
* Hiệu ứng sản phẩm bay vào giỏ hàng
* Animation khách hàng xuất hiện
* Animation hoàn thành đơn hàng
* Coin effect
* Star effect
* Confetti effect
* Level transition

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé trở thành nhân viên bán hàng trong một siêu thị vui nhộn.

Khách hàng sẽ đưa ra yêu cầu mua hàng.

Ví dụ:

👩

"Cho cô 5 quả táo"

Bé phải chọn đúng số lượng sản phẩm.

---

## Luồng chơi

1. Khách hàng xuất hiện
2. Hiển thị yêu cầu
3. Hiển thị các sản phẩm
4. Bé kéo sản phẩm vào giỏ hàng
5. Kiểm tra kết quả
6. Trả thưởng
7. Sinh câu hỏi mới

---

# 3. CÁC CHẾ ĐỘ CHƠI

## Mode 1 - Đếm số lượng

Ví dụ:

"Cho cô 5 quả táo"

Bé kéo:

🍎🍎🍎🍎🍎

vào giỏ.

---

## Mode 2 - So sánh số lượng

Ví dụ:

"Cái nào nhiều hơn?"

* 3 quả táo
* 5 quả chuối

Bé chọn:

🍌

---

## Mode 3 - Cộng

Ví dụ:

Trong giỏ có:

🍎🍎🍎

Thêm:

🍎🍎

Hỏi:

"Tổng cộng có bao nhiêu quả?"

Đáp án:

5

---

## Mode 4 - Trừ

Ví dụ:

Có:

🍎🍎🍎🍎🍎

Lấy đi:

🍎🍎

Hỏi:

"Còn lại bao nhiêu quả?"

Đáp án:

3

---

## Mode 5 - Thanh toán

Ví dụ:

Táo:

1 xu

Chuối:

2 xu

Khách mua:

2 táo + 1 chuối

Bé tính:

1 + 1 + 2 = 4

---

# 4. LEVEL SYSTEM

## Level 1-5

Đếm số:

0 - 5

---

## Level 6-10

Đếm số:

0 - 10

---

## Level 11-15

Cộng trừ:

0 - 10

---

## Level 16-20

Cộng trừ:

0 - 20

---

## Level 21+

Thanh toán đơn giản

---

# 5. GAMEPLAY RULES

## Điểm

Trả lời đúng:

+10 điểm

---

Combo 3 câu:

x2 điểm

---

Combo 5 câu:

x3 điểm

---

## Mạng chơi

Bắt đầu:

❤️ ❤️ ❤️

Sai:

-1 mạng

Hết mạng:

Game Over

---

# 6. GAME STATES

## SCREEN_START

Hiển thị:

* Logo game
* Mascot siêu thị
* Nút BẮT ĐẦU

---

## SCREEN_PLAYING

Hiển thị:

* Điểm số
* Level
* Số mạng
* Khách hàng
* Sản phẩm
* Giỏ hàng

---

## SCREEN_RESULT

Hiển thị:

* Điểm
* Số sao
* Thành tích

Nút:

CHƠI LẠI

---

# 7. ĐỒ HỌA

## Theme

Siêu thị hoạt hình

Màu sắc:

* Sky Blue
* Soft Yellow
* Mint Green
* Pastel Pink

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

## Hiệu ứng

### Đúng

* Confetti
* Coin explosion
* Star burst

---

### Sai

* Rung màn hình
* Icon 😅

---

# 8. DỮ LIỆU SẢN PHẨM

```typescript
interface Product {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: string;
}
```

Ví dụ:

```typescript
[
  {
    id: "apple",
    name: "Táo",
    emoji: "🍎",
    price: 1,
    category: "fruit"
  },
  {
    id: "banana",
    name: "Chuối",
    emoji: "🍌",
    price: 2,
    category: "fruit"
  },
  {
    id: "orange",
    name: "Cam",
    emoji: "🍊",
    price: 3,
    category: "fruit"
  }
]
```

---

# 9. CÂU HỎI

```typescript
interface Question {
  id: string;
  level: number;
  type: "count" | "compare" | "add" | "subtract" | "checkout";
  instruction: string;
  answer: number;
}
```

---

# 10. GAME CONFIG

```typescript
export const GAME_CONFIG = {
  INITIAL_LIVES: 3,
  SCORE_PER_CORRECT: 10,
  QUESTIONS_PER_LEVEL: 10,
  MAX_LEVEL: 30,
  COMBO_X2: 3,
  COMBO_X3: 5,
  ANIMATION_DURATION: 800
};
```

---

# 11. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

Âm thanh:

* Đúng
* Sai
* Level Up
* Coin Reward

Voice:

Ví dụ:

"Cô muốn mua 5 quả táo"

Đọc tự động khi câu hỏi xuất hiện.

---

# 12. STICKER REWARD

Hoàn thành level mở khóa:

* 🍎 Táo vàng
* 🍌 Chuối vàng
* 🛒 Giỏ hàng thần kỳ
* 🏆 Huy chương toán học

Cho phép xem bộ sưu tập.

---

# 13. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* iPad

Tối ưu thao tác kéo thả bằng ngón tay.

---

# 14. CẤU TRÚC SOURCE CODE

```text
src/
├── components/
│   ├── SupermarketMathGame.tsx
│   ├── StartScreen.tsx
│   ├── PlayingScreen.tsx
│   ├── ResultScreen.tsx
│   ├── ProductShelf.tsx
│   ├── ShoppingCart.tsx
│   ├── CustomerPanel.tsx
│   ├── ScoreBoard.tsx
│   └── CanvasEffects.tsx
│
├── hooks/
│   ├── useGameState.ts
│   ├── useAudio.ts
│   ├── useCombo.ts
│   └── useDragDrop.ts
│
├── services/
│   ├── QuestionGenerator.ts
│   ├── AudioManager.ts
│   └── RewardManager.ts
│
├── config/
│   └── GameConfig.ts
│
├── data/
│   ├── products.ts
│   └── questions.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── math.ts
    └── random.ts
```

---

# 15. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Có mock data
* Không cần backend
* Dễ mở rộng thêm sản phẩm
* Dễ mở rộng thêm level
* Dễ mở rộng thêm loại câu hỏi

---

# 16. YÊU CẦU CUỐI CÙNG

Sinh toàn bộ source code hoàn chỉnh.

Không sử dụng pseudo code.

Không bỏ sót file.

Mọi component phải được code đầy đủ.

Sau khi generate phải có thể chạy bằng:

```bash
npm install
npm run dev
```

Ưu tiên Vite + React + TypeScript.

Tự động tạo dữ liệu mẫu tối thiểu:

* 50 câu hỏi
* 20 sản phẩm
* 20 level

Đảm bảo trẻ em 5-7 tuổi có thể sử dụng dễ dàng bằng thao tác cảm ứng trên tablet.
