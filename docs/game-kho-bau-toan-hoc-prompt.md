# Claude Code Prompt - Kho Báu Toán Học

## Mục tiêu

Xây dựng game giáo dục "Kho Báu Toán Học" dành cho trẻ em từ 5-8 tuổi.

Mục tiêu giáo dục:

* Học đếm số
* Học cộng trừ trong phạm vi 20
* Học so sánh số lượng
* Học nhận biết hình học cơ bản
* Rèn luyện tư duy logic
* Tăng khả năng giải quyết vấn đề
* Tạo hứng thú học toán thông qua phiêu lưu khám phá

Ứng dụng phải được phát triển bằng:

* ReactJS
* TypeScript
* React Konva (ưu tiên)
* TailwindCSS

Game phải hoạt động tốt trên:

* Mobile
* Tablet
* Desktop

Ưu tiên tối ưu cho màn hình cảm ứng.

---

# 1. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React quản lý:

* Game State
* Current Island
* Current Mission
* Score
* Stars
* Energy
* Inventory
* Treasure Collection
* Achievement
* Progress
* Daily Challenge

Sử dụng:

* useState
* useReducer
* useEffect
* useMemo
* useCallback
* Custom Hooks

---

## Canvas Layer (React Konva)

Canvas xử lý:

* Bản đồ kho báu
* Di chuyển nhân vật
* Animation mở rương
* Hiệu ứng đào kho báu
* Particle Effect
* Confetti Effect
* Reward Animation
* Scene Transition

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Bé là một nhà thám hiểm nhỏ tuổi đi tìm kho báu toán học.

Muốn mở được rương kho báu, bé phải vượt qua các thử thách toán học.

Mỗi hòn đảo đại diện cho một chủ đề:

* Đếm số
* So sánh
* Cộng
* Trừ
* Hình học
* Logic

Sau mỗi thử thách thành công, bé nhận được:

* Xu vàng
* Kim cương
* Mảnh bản đồ
* Kho báu bí mật

---

# 3. STORY MODE

## Đảo 1 - Rừng Đếm Số

Học:

* Đếm từ 1 đến 10
* Đếm đồ vật

Ví dụ:

🍎🍎🍎🍎🍎

Có bao nhiêu quả táo?

Đáp án:

5

---

## Đảo 2 - Hang Động So Sánh

Ví dụ:

3 < ?

Chọn:

5

---

Hoặc:

Cái nào nhiều hơn?

🍌🍌🍌🍌

🍎🍎

---

## Đảo 3 - Sông Cộng Trừ

Ví dụ:

3 + 2 = ?

---

Ví dụ:

8 - 3 = ?

---

## Đảo 4 - Vùng Đất Hình Học

Nhận biết:

* Hình tròn
* Hình vuông
* Hình tam giác
* Hình chữ nhật

---

## Đảo 5 - Mê Cung Logic

Ví dụ:

Chọn con đường có kết quả bằng 10.

---

## Đảo 6 - Kho Báu Cuối Cùng

Kết hợp tất cả kiến thức.

---

# 4. GAME MODES

## Mode 1 - Adventure

Chơi theo cốt truyện.

---

## Mode 2 - Quick Challenge

10 câu hỏi ngẫu nhiên.

---

## Mode 3 - Daily Treasure

Nhiệm vụ hằng ngày.

---

## Mode 4 - Endless Math

Chơi vô tận.

---

## Mode 5 - Parent Practice

Phụ huynh chọn chủ đề luyện tập.

---

# 5. HỆ THỐNG NHIỆM VỤ

## Mission

```typescript
interface Mission {
  id: string;
  islandId: string;
  title: string;
  type:
    | "count"
    | "compare"
    | "add"
    | "subtract"
    | "shape"
    | "logic";
  question: string;
  answer: number | string;
  reward: number;
}
```

---

## Island

```typescript
interface Island {
  id: string;
  name: string;
  difficulty: number;
  missions: Mission[];
}
```

---

# 6. GAMEPLAY RULES

## Điểm

Trả lời đúng:

+100 điểm

---

Trả lời nhanh:

+50 điểm

---

Combo 3 câu:

+200 điểm

---

Combo 5 câu:

+500 điểm

---

# 7. NĂNG LƯỢNG

Khởi tạo:

❤️ ❤️ ❤️

---

Trả lời sai:

-1 năng lượng

---

Hết năng lượng:

Game Over

---

Có thể hồi phục bằng:

* Thưởng nhiệm vụ
* Daily Reward

---

# 8. KHO BÁU

## Common Chest

* Xu vàng

---

## Rare Chest

* Kim cương

---

## Epic Chest

* Sticker hiếm

---

## Legendary Chest

* Skin đặc biệt

---

# 9. HỆ THỐNG PHẦN THƯỞNG

## Treasure

```typescript
interface Treasure {
  id: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
}
```

---

# 10. ĐỒ HỌA

## Theme

Phiêu lưu săn kho báu.

---

## Màu sắc

* Ocean Blue
* Treasure Gold
* Jungle Green
* Sand Yellow
* Coral Orange

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 11. HIỆU ỨNG

## Đúng

* Coin Explosion
* Star Burst
* Sparkle

---

## Mở rương

* Ánh sáng phát ra
* Kim cương bay lên
* Rung nhẹ

---

## Hoàn thành đảo

* Confetti
* Firework
* Cúp chiến thắng

---

# 12. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

---

Đọc câu hỏi:

Ví dụ:

"Có bao nhiêu quả táo?"

---

Âm thanh:

* Correct
* Wrong
* Treasure Open
* Level Up
* Coin Reward

---

# 13. STICKER COLLECTION

Mở khóa:

* 🏴‍☠️ Cướp biển nhí
* 🗺️ Bản đồ kho báu
* 💎 Kim cương
* 🏆 Cúp vàng
* ⭐ Siêu toán học

---

# 14. ACHIEVEMENT SYSTEM

## Nhà Thám Hiểm

Hoàn thành 20 nhiệm vụ

---

## Thợ Săn Kho Báu

Mở 50 rương

---

## Siêu Tính Toán

Trả lời đúng 100 câu

---

## Vua Toán Học

Hoàn thành toàn bộ Adventure Mode

---

# 15. PARENT DASHBOARD

Hiển thị:

* Chủ đề đã học
* Tỷ lệ đúng
* Điểm mạnh
* Điểm cần cải thiện
* Tổng thời gian học

Lưu bằng Local Storage.

---

# 16. ADAPTIVE LEARNING

Tự động điều chỉnh độ khó theo:

* Tốc độ trả lời
* Tỷ lệ đúng
* Lịch sử học tập

Ví dụ:

Nếu đúng > 90%

→ tăng độ khó

Nếu đúng < 60%

→ giảm độ khó

---

# 17. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tự động scale:

* Canvas
* Character
* Treasure Chest
* Touch Area

---

# 18. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── IslandMapScreen.tsx
│   ├── MissionScreen.tsx
│   ├── TreasureScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── Player.tsx
│   ├── TreasureChest.tsx
│   ├── MissionCard.tsx
│   ├── ProgressBar.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── TreasureCanvas.tsx
│   ├── IslandLayer.tsx
│   ├── CharacterLayer.tsx
│   ├── ParticleLayer.tsx
│   └── ConfettiLayer.tsx
│
├── game/
│   ├── MissionEngine.ts
│   ├── RewardEngine.ts
│   ├── AdaptiveLearningEngine.ts
│   ├── TreasureEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useGameState.ts
│   ├── useProgress.ts
│   ├── useTreasure.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── StorageService.ts
│   ├── RewardManager.ts
│   └── StatisticsService.ts
│
├── data/
│   ├── islands.ts
│   ├── missions.ts
│   ├── treasures.ts
│   ├── achievements.ts
│   └── dailyChallenges.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── random.ts
    ├── scoring.ts
    ├── validation.ts
    └── adaptive.ts
```

---

# 19. DỮ LIỆU MẪU

Sinh sẵn:

* 6 đảo
* 120 nhiệm vụ
* 200 câu hỏi toán
* 50 kho báu
* 20 achievement
* 30 daily challenge

Không cần backend.

---

# 20. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Không phụ thuộc backend
* Dễ mở rộng nội dung học
* Dễ mở rộng kho báu
* Dễ mở rộng đảo và nhiệm vụ

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

* 120 nhiệm vụ
* 200 câu hỏi toán
* 6 đảo phiêu lưu
* Adaptive Learning Engine
* Achievement System
* Parent Dashboard
* Treasure Collection System

Đảm bảo trẻ em từ 5-8 tuổi có thể học toán một cách hứng thú thông qua cơ chế khám phá kho báu và phiêu lưu.
