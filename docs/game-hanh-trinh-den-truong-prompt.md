# Claude Code Prompt - Hành Trình Đến Trường

## Mục tiêu

Xây dựng game giáo dục "Hành Trình Đến Trường" dành cho trẻ em từ 5-7 tuổi chuẩn bị vào lớp 1.

Mục tiêu giáo dục:

* Làm quen với môi trường trường học
* Học kỹ năng tự lập
* Học chuẩn bị đồ dùng học tập
* Học quy tắc lớp học
* Học kỹ năng giao tiếp cơ bản
* Học nhận biết thời gian và lịch trình
* Giảm tâm lý lo lắng trước khi vào lớp 1

Ứng dụng phải được phát triển bằng:

* ReactJS
* TypeScript
* React Konva (ưu tiên)
* TailwindCSS

Game phải hoạt động tốt trên:

* Mobile
* Tablet
* Desktop

Ưu tiên tối ưu cho trẻ sử dụng cảm ứng.

---

# 1. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React quản lý:

* Game State
* Story Progress
* Current Mission
* Level
* Score
* Stars
* Achievement
* Inventory
* Character Progress
* Sticker Collection

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

* Character Animation
* Drag & Drop Items
* Scene Transition
* Map Navigation
* Particle Effects
* Reward Effects
* Mission Completion Animation
* Classroom Activities

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé vào vai một học sinh chuẩn bị bước vào lớp 1.

Bé sẽ trải qua nhiều nhiệm vụ hàng ngày:

* Chuẩn bị đồ dùng
* Mặc đồng phục
* Đi đến trường
* Tham gia lớp học
* Kết bạn
* Hoàn thành bài học
* Trở về nhà

Thông qua chuỗi nhiệm vụ này, bé học được các kỹ năng cần thiết trước khi vào tiểu học.

---

# 3. CẤU TRÚC GAME

Game gồm nhiều chương (Chapter).

Mỗi chương gồm nhiều nhiệm vụ nhỏ (Mission).

---

# Chapter 1 - Chuẩn Bị Đi Học

## Mission 1

Chọn đúng đồng phục.

Ví dụ:

Hiển thị:

* Áo đồng phục
* Áo ngủ
* Áo mưa

Bé phải chọn:

✔ Áo đồng phục

---

## Mission 2

Xếp đồ vào cặp.

Đồ vật:

* Bút
* Vở
* Thước
* Cục tẩy
* Đồ chơi

Bé phải chọn:

✔ Bút
✔ Vở
✔ Thước
✔ Tẩy

Không chọn:

✘ Đồ chơi

---

## Mission 3

Kiểm tra cặp sách.

Hoàn thành checklist trước khi đi học.

---

# Chapter 2 - Trên Đường Đến Trường

## Mission 1

Chọn đường an toàn.

Ví dụ:

* Đi bộ đúng vạch qua đường
* Không chạy băng qua đường

---

## Mission 2

Nhận biết đèn giao thông.

* Đèn đỏ → Dừng
* Đèn xanh → Đi

---

# Chapter 3 - Trong Lớp Học

## Mission 1

Tìm chỗ ngồi.

Ví dụ:

"Bé Nam ngồi bàn số 3"

Bé kéo nhân vật tới đúng vị trí.

---

## Mission 2

Giơ tay phát biểu.

Khi cô giáo đặt câu hỏi:

Bé nhấn nút:

🙋

---

## Mission 3

Chuẩn bị đồ dùng theo yêu cầu.

Ví dụ:

"Các con lấy bút chì"

Bé phải chọn đúng.

---

# Chapter 4 - Kết Bạn

## Mission 1

Chào hỏi bạn mới.

Chọn câu:

✔ Xin chào

✘ Không nói gì

---

## Mission 2

Chia sẻ đồ dùng.

Ví dụ:

Bạn quên bút.

Bé chọn:

✔ Cho bạn mượn bút

---

# Chapter 5 - Hoàn Thành Ngày Học

## Mission 1

Thu dọn bàn học.

## Mission 2

Xếp đồ vào cặp.

## Mission 3

Ra về đúng quy trình.

---

# 4. GAMEPLAY RULES

## Điểm

Hoàn thành nhiệm vụ:

+100 điểm

---

Mission hoàn hảo:

+200 điểm

---

Combo

3 nhiệm vụ liên tiếp đúng:

+300 điểm

---

# 5. HỆ THỐNG SAO

### 3 Sao

Hoàn thành không sai.

---

### 2 Sao

Sai dưới 3 lần.

---

### 1 Sao

Hoàn thành nhưng sai nhiều.

---

# 6. HINT SYSTEM

Mỗi màn:

3 Hint

Ví dụ:

Highlight vật phẩm đúng.

---

# 7. STORY MODE

Bé tạo nhân vật riêng:

* Tóc
* Quần áo
* Balo
* Màu sắc

Nhân vật sẽ đồng hành suốt trò chơi.

---

# 8. CHARACTER SYSTEM

```typescript
interface Character {
  id: string;
  name: string;
  avatar: string;
  unlockedItems: string[];
}
```

---

# 9. MISSION SYSTEM

```typescript
interface Mission {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  type:
    | "drag_drop"
    | "multiple_choice"
    | "matching"
    | "checklist"
    | "navigation";
  reward: number;
}
```

---

# 10. GAME CONFIG

```typescript
export const GAME_CONFIG = {
  INITIAL_HINTS: 3,
  SCORE_PER_MISSION: 100,
  PERFECT_BONUS: 200,
  COMBO_BONUS: 300,
  LEVEL_COMPLETE_DELAY: 1500
};
```

---

# 11. ĐỒ HỌA

## Theme

Trường học vui nhộn.

---

## Màu sắc

* Sky Blue
* Mint Green
* Soft Yellow
* Pastel Orange
* Pastel Pink

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 12. HIỆU ỨNG

## Hoàn thành nhiệm vụ

* Confetti
* Star Burst
* Coin Effect

---

## Trả lời sai

* Rung nhẹ
* Gợi ý trực quan

---

## Hoàn thành Chapter

* Huy hiệu
* Pháo hoa
* Chứng nhận

---

# 13. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

Ví dụ:

"Các con hãy lấy bút chì"

Hệ thống đọc hướng dẫn.

---

# 14. STICKER COLLECTION

Mở khóa:

* 🎒 Balo
* ✏️ Bút chì
* 📚 Sách
* 🏫 Trường học
* ⭐ Học sinh giỏi

Cho phép xem bộ sưu tập.

---

# 15. ACHIEVEMENT SYSTEM

## Học Sinh Gương Mẫu

Hoàn thành 20 nhiệm vụ.

---

## Chuyên Gia Chuẩn Bị

Hoàn thành tất cả nhiệm vụ chuẩn bị đi học.

---

## Bạn Tốt

Hoàn thành tất cả nhiệm vụ kết bạn.

---

## Ngôi Sao Lớp 1

Hoàn thành toàn bộ game.

---

# 16. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tự động scale:

* Character
* Canvas
* UI
* Touch Area

---

# 17. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── ChapterMapScreen.tsx
│   ├── MissionScreen.tsx
│   ├── ResultScreen.tsx
│
├── components/
│   ├── Character.tsx
│   ├── Inventory.tsx
│   ├── MissionCard.tsx
│   ├── ProgressBar.tsx
│   ├── StickerGallery.tsx
│
├── canvas/
│   ├── GameCanvas.tsx
│   ├── CharacterLayer.tsx
│   ├── MissionLayer.tsx
│   ├── ParticleLayer.tsx
│   └── ConfettiLayer.tsx
│
├── game/
│   ├── MissionEngine.ts
│   ├── StoryEngine.ts
│   ├── RewardEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useGameState.ts
│   ├── useCharacter.ts
│   ├── useMission.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── RewardManager.ts
│   └── SaveGameService.ts
│
├── data/
│   ├── chapters.ts
│   ├── missions.ts
│   ├── stickers.ts
│   └── achievements.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── random.ts
    ├── validation.ts
    └── storage.ts
```

---

# 18. DỮ LIỆU MẪU

Sinh sẵn:

* 5 Chapter
* 50 Mission
* 20 Achievement
* 50 Sticker

Không cần backend.

Lưu tiến trình bằng Local Storage.

---

# 19. CHẾ ĐỘ PHỤ HUYNH (BONUS)

Tạo màn hình thống kê:

* Số nhiệm vụ hoàn thành
* Kỹ năng đã học
* Thời gian chơi
* Tỷ lệ hoàn thành

Dữ liệu lưu local.

---

# 20. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ cảm ứng
* Không phụ thuộc backend
* Dễ mở rộng thêm Chapter
* Dễ mở rộng thêm Mission
* Dễ mở rộng thêm Achievement

---

# 21. YÊU CẦU CUỐI CÙNG

Sinh toàn bộ source code hoàn chỉnh.

Không pseudo code.

Không bỏ sót file.

Mọi component phải được code đầy đủ.

Sử dụng:

* Vite
* React
* TypeScript
* React Konva

Sau khi generate phải có thể chạy:

```bash
npm install
npm run dev
```

Tự động tạo:

* 5 Chapter hoàn chỉnh
* 50 Mission hoàn chỉnh
* Hệ thống Achievement
* Hệ thống Sticker
* Hệ thống Save Progress

Đảm bảo trẻ em 5-7 tuổi chuẩn bị vào lớp 1 có thể học và chơi dễ dàng bằng cảm ứng hoặc chuột.
