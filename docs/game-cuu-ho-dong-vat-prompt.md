# Claude Code Prompt - Cứu Hộ Động Vật

## Mục tiêu

Xây dựng game giáo dục "Cứu Hộ Động Vật" dành cho trẻ em từ 5-9 tuổi.

Mục tiêu giáo dục:

* Học về các loài động vật
* Học môi trường sống của động vật
* Học cách yêu thương và bảo vệ động vật
* Học phân loại động vật
* Học kỹ năng giải quyết vấn đề
* Học trách nhiệm và lòng nhân ái
* Phát triển tư duy quan sát và ghi nhớ
* Nâng cao nhận thức bảo vệ môi trường

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

# 1. Ý TƯỞNG GAME

## Cốt truyện

Bé trở thành một "Siêu Anh Hùng Cứu Hộ Động Vật".

Các loài động vật đang gặp khó khăn:

* Bị lạc đường
* Bị đói
* Bị thương nhẹ
* Mất môi trường sống
* Cần tìm gia đình

Nhiệm vụ của bé:

* Giải cứu động vật
* Chăm sóc động vật
* Đưa động vật về môi trường phù hợp
* Xây dựng trung tâm cứu hộ

Sau mỗi nhiệm vụ:

* Nhận huy hiệu cứu hộ
* Mở khóa động vật mới
* Nâng cấp trung tâm cứu hộ
* Thu thập sticker động vật

---

# 2. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React quản lý:

* Game State
* Current Rescue Mission
* Rescue Center Level
* Animal Collection
* Coins
* Hearts
* Stars
* Achievements
* Daily Missions
* Parent Dashboard

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

* Animal Animation
* Character Movement
* Rescue Scene
* Drag & Drop Interaction
* Reward Effects
* Particle Effects
* Environment Animation
* Scene Transition

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 3. KHU VỰC CỨU HỘ

## Khu Rừng Xanh

Động vật:

* Thỏ
* Sóc
* Nai
* Gấu

---

## Nông Trại Vui Vẻ

Động vật:

* Gà
* Vịt
* Bò
* Cừu

---

## Đại Dương Xanh

Động vật:

* Cá heo
* Rùa biển
* Cá ngựa

---

## Thảo Nguyên

Động vật:

* Sư tử
* Hươu cao cổ
* Ngựa vằn

---

## Khu Bảo Tồn Đặc Biệt

Các động vật hiếm.

---

# 4. GAMEPLAY LOOP

## Bước 1

Nhận nhiệm vụ cứu hộ.

Ví dụ:

"Một chú thỏ bị lạc trong rừng."

---

## Bước 2

Tìm động vật.

Mini game tìm kiếm.

---

## Bước 3

Đánh giá tình trạng.

Ví dụ:

* Đói
* Khát
* Mệt
* Bị thương

---

## Bước 4

Chăm sóc đúng cách.

---

## Bước 5

Đưa về môi trường phù hợp.

---

## Bước 6

Nhận thưởng.

---

# 5. MINI GAME SYSTEM

## Mini Game 1 - Tìm Động Vật

Hidden Object.

Tìm động vật trong môi trường.

---

## Mini Game 2 - Cho Ăn

Kéo đúng thức ăn cho từng loài.

Ví dụ:

🐰 → 🥕

---

## Mini Game 3 - Ghép Môi Trường Sống

Ví dụ:

🐬 → 🌊

🦁 → 🌾

---

## Mini Game 4 - Chữa Trị

Chọn vật dụng phù hợp.

---

## Mini Game 5 - Memory Card Động Vật

Ghép đúng cặp động vật.

---

## Mini Game 6 - Giải Cứu Khẩn Cấp

Hoàn thành nhiệm vụ trong thời gian giới hạn.

---

# 6. HỆ THỐNG KIẾN THỨC

## Animal

```typescript
interface Animal {
  id: string;
  name: string;
  species: string;
  habitat: string;
  food: string[];
  rarity: string;
  image: string;
  description: string;
}
```

---

## RescueMission

```typescript
interface RescueMission {
  id: string;
  animalId: string;
  type:
    | "lost"
    | "hungry"
    | "injured"
    | "homeless"
    | "emergency";
  difficulty: number;
  reward: number;
}
```

---

## RescueCenter

```typescript
interface RescueCenter {
  level: number;
  capacity: number;
  animalsRescued: number;
}
```

---

# 7. GIÁO DỤC KIẾN THỨC

Sau mỗi nhiệm vụ hiển thị:

## Animal Fact Card

Ví dụ:

🐘 Voi

* Là động vật trên cạn lớn nhất thế giới
* Có thể giao tiếp bằng âm thanh tần số thấp
* Sống theo bầy đàn

---

## Fun Fact

"Rùa biển có thể sống hơn 100 năm."

---

# 8. HỆ THỐNG ĐIỂM

## Hoàn thành nhiệm vụ

+100 điểm

---

## Chăm sóc đúng

+150 điểm

---

## Không mắc lỗi

+200 điểm

---

## Combo cứu hộ

5 nhiệm vụ liên tiếp:

+500 điểm

---

# 9. HEART SYSTEM

❤️ ❤️ ❤️ ❤️ ❤️

---

Sai:

-1 tim

---

Hết tim:

Chơi lại checkpoint.

---

# 10. RESCUE CENTER BUILDER

Nâng cấp:

* Chuồng động vật
* Hồ nước
* Khu chữa bệnh
* Khu vui chơi

---

Mỗi nâng cấp mở khóa động vật mới.

---

# 11. ĐỒ HỌA

## Theme

Thế giới động vật đáng yêu.

---

## Màu sắc

* Forest Green
* Ocean Blue
* Sunny Yellow
* Earth Brown
* Rescue Orange

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 12. HIỆU ỨNG

## Cứu hộ thành công

* Heart Burst
* Sparkle
* Happy Animal Animation

---

## Mở khóa động vật

* Animal Reveal Animation

---

## Nâng cấp trung tâm

* Building Upgrade Effect

---

# 13. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

---

Ví dụ:

"Cảm ơn bạn đã giúp mình."

---

Âm thanh:

* Animal Sound
* Success
* Reward
* Rescue Complete
* Upgrade

---

# 14. ACHIEVEMENT SYSTEM

## Người Bạn Của Động Vật

Cứu hộ 20 động vật.

---

## Bác Sĩ Nhí

Chữa trị 50 ca.

---

## Nhà Bảo Tồn

Mở khóa tất cả môi trường sống.

---

## Siêu Anh Hùng Cứu Hộ

Hoàn thành toàn bộ game.

---

# 15. STICKER COLLECTION

Mở khóa:

* 🐰 Thỏ
* 🐬 Cá heo
* 🦁 Sư tử
* 🐘 Voi
* 🐢 Rùa biển
* ❤️ Trái tim cứu hộ

---

# 16. PARENT DASHBOARD

Hiển thị:

* Động vật đã học
* Môi trường sống đã học
* Nhiệm vụ hoàn thành
* Điểm mạnh
* Điểm cần cải thiện
* Thời gian chơi

---

# 17. LEARNING ENGINE

```typescript
interface LearningProgress {
  animalsLearned: number;
  habitatsLearned: number;
  rescueSkills: number;
  empathyScore: number;
}
```

---

Theo dõi tiến bộ học tập.

---

# 18. ADAPTIVE LEARNING

Nếu:

Tỷ lệ đúng > 90%

→ Tăng độ khó.

---

Nếu:

Tỷ lệ đúng < 60%

→ Thêm hướng dẫn.

---

Nếu:

Sai liên tục

→ Hiển thị Animal Hint.

---

# 19. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tối ưu:

* Touch
* Drag & Drop
* Accessibility
* Large UI

---

# 20. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── WorldMapScreen.tsx
│   ├── RescueMissionScreen.tsx
│   ├── RescueCenterScreen.tsx
│   ├── AnimalCollectionScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── AnimalCard.tsx
│   ├── RescueCenter.tsx
│   ├── MissionCard.tsx
│   ├── ProgressBar.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── RescueCanvas.tsx
│   ├── AnimalLayer.tsx
│   ├── EnvironmentLayer.tsx
│   ├── CharacterLayer.tsx
│   ├── ParticleLayer.tsx
│   └── RewardLayer.tsx
│
├── game/
│   ├── RescueEngine.ts
│   ├── AnimalEngine.ts
│   ├── LearningEngine.ts
│   ├── CenterUpgradeEngine.ts
│   ├── RewardEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useGameState.ts
│   ├── useRescue.ts
│   ├── useAnimals.ts
│   ├── useProgress.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── SpeechService.ts
│   ├── StorageService.ts
│   └── StatisticsService.ts
│
├── data/
│   ├── animals.ts
│   ├── habitats.ts
│   ├── missions.ts
│   ├── achievements.ts
│   └── stickers.ts
│
├── config/
│   └── GameConfig.ts
│
├── types/
│   └── game.ts
│
└── utils/
    ├── scoring.ts
    ├── random.ts
    ├── validation.ts
    └── adaptive.ts
```

---

# 21. DỮ LIỆU MẪU

Sinh sẵn:

* 200 loài động vật
* 300 nhiệm vụ cứu hộ
* 50 môi trường sống
* 100 Animal Facts
* 50 achievement
* 100 sticker

Không cần backend.

Lưu bằng Local Storage.

---

# 22. TÍNH NĂNG NÂNG CAO (BONUS)

## Animal Encyclopedia

Từ điển động vật.

---

## Daily Rescue Mission

Nhiệm vụ hàng ngày.

---

## Rescue Center Decoration

Trang trí trung tâm cứu hộ.

---

## Animal Album

Bộ sưu tập ảnh động vật.

---

## Offline First

Toàn bộ game hoạt động offline.

---

# 23. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Không phụ thuộc backend
* Dễ mở rộng động vật
* Dễ mở rộng nhiệm vụ
* Dễ mở rộng mini game

---

# 24. YÊU CẦU CUỐI CÙNG

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

* 300 nhiệm vụ cứu hộ
* 200 loài động vật
* 50 môi trường sống
* 6 mini game
* Rescue Center Builder
* Achievement System
* Parent Dashboard
* Animal Encyclopedia
* Daily Rescue Mission

Đảm bảo trẻ em từ 5-9 tuổi vừa chơi vừa học về động vật, môi trường sống và phát triển lòng yêu thương động vật thông qua các hoạt động cứu hộ đầy ý nghĩa.
