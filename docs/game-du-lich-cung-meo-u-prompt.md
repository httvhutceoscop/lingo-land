# Claude Code Prompt - Du Lịch Cùng Mèo Ú

## Mục tiêu

Xây dựng game giáo dục "Du Lịch Cùng Mèo Ú" dành cho trẻ em từ 5-9 tuổi.

Mục tiêu giáo dục:

* Khám phá địa lý Việt Nam và thế giới
* Học về văn hóa, ẩm thực và danh lam thắng cảnh
* Học nhận biết động vật, phương tiện giao thông và nghề nghiệp
* Phát triển kỹ năng quan sát
* Học giải quyết vấn đề thông qua mini game
* Mở rộng vốn từ vựng
* Tăng khả năng ghi nhớ và khám phá

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
* Current Country
* Current City
* Current Quest
* Travel Progress
* Passport Collection
* Coins
* Gems
* Stars
* Achievement
* Sticker Collection
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

* World Map
* Character Movement
* Travel Animation
* Vehicle Animation
* Quest Interaction
* Particle Effects
* Reward Effects
* Scene Transition

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 2. Ý TƯỞNG GAME

## Bối cảnh

Mèo Ú là một chú mèo đáng yêu đam mê du lịch.

Mèo Ú nhận được một chiếc vé du lịch thần kỳ cho phép khám phá khắp nơi trên thế giới.

Bé sẽ đồng hành cùng Mèo Ú:

* Khám phá địa điểm mới
* Thu thập dấu hộ chiếu
* Tìm hiểu văn hóa địa phương
* Chơi mini game giáo dục
* Thu thập sticker lưu niệm

---

# 3. STORY MODE

## Chương 1 - Khám Phá Việt Nam

### Hà Nội

Nhiệm vụ:

* Tìm Hồ Gươm
* Tìm Tháp Rùa
* Thưởng thức phở

---

### Huế

Nhiệm vụ:

* Khám phá Đại Nội
* Tìm áo dài

---

### Đà Nẵng

Nhiệm vụ:

* Tìm Cầu Rồng
* Chụp ảnh biển Mỹ Khê

---

### TP Hồ Chí Minh

Nhiệm vụ:

* Khám phá chợ Bến Thành
* Thu thập món ăn địa phương

---

# Chương 2 - Đông Nam Á

### Thái Lan

* Chùa Vàng
* Voi
* Pad Thai

---

### Singapore

* Marina Bay
* Merlion

---

### Nhật Bản

* Núi Phú Sĩ
* Sushi
* Hoa anh đào

---

# Chương 3 - Châu Âu

### Pháp

* Tháp Eiffel

---

### Ý

* Đấu trường Colosseum

---

### Anh

* Big Ben

---

# Chương 4 - Khám Phá Thế Giới

Mở khóa các quốc gia đặc biệt.

---

# 4. GAMEPLAY

## Bước 1

Mèo Ú đến địa điểm mới.

---

## Bước 2

Nghe giới thiệu ngắn.

Ví dụ:

"Đây là Hồ Gươm ở Hà Nội."

---

## Bước 3

Hoàn thành nhiệm vụ.

Ví dụ:

Tìm đúng địa danh.

---

## Bước 4

Chơi mini game.

---

## Bước 5

Nhận dấu hộ chiếu.

---

## Bước 6

Mở khóa điểm đến tiếp theo.

---

# 5. MINI GAME SYSTEM

## Mini Game 1

Tìm đồ vật đặc trưng.

Ví dụ:

Tìm:

🍜 Phở

---

## Mini Game 2

Ghép hình địa danh.

---

## Mini Game 3

Memory Card du lịch.

---

## Mini Game 4

Xếp hành lý.

---

## Mini Game 5

Tìm đường cho Mèo Ú.

---

## Mini Game 6

Quiz văn hóa.

---

# 6. HỆ THỐNG HỘ CHIẾU

## Passport

```typescript
interface PassportStamp {
  id: string;
  locationId: string;
  unlockedAt: number;
}
```

---

## Passport

```typescript
interface Passport {
  stamps: PassportStamp[];
  completedCountries: string[];
}
```

---

# 7. HỆ THỐNG ĐỊA ĐIỂM

```typescript
interface Location {
  id: string;
  country: string;
  city: string;
  landmark: string;
  image: string;
  description: string;
}
```

---

# 8. GAMEPLAY RULES

## Điểm

Hoàn thành nhiệm vụ:

+100

---

Mini game:

+150

---

Khám phá địa điểm mới:

+300

---

Hoàn thành quốc gia:

+1000

---

# 9. HỆ THỐNG NĂNG LƯỢNG

❤️ ❤️ ❤️ ❤️ ❤️

---

Sai:

-1 năng lượng

---

Hết năng lượng:

Chơi lại checkpoint.

---

# 10. ĐỒ HỌA

## Theme

Thế giới du lịch đáng yêu.

---

## Nhân vật chính

Mèo Ú

Các biểu cảm:

* Vui vẻ
* Ngạc nhiên
* Tò mò
* Tự hào

---

## Màu sắc

* Sky Blue
* Travel Orange
* Mint Green
* Ocean Blue
* Pastel Yellow

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 11. HIỆU ỨNG

## Mở khóa địa điểm

* Stamp Passport Animation
* Firework
* Sparkle

---

## Hoàn thành quốc gia

* Confetti
* Globe Rotation
* Travel Badge

---

## Thu thập vật phẩm

* Flying Coin
* Shine Effect

---

# 12. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

---

Ví dụ:

"Xin chào, chúng ta đang ở Hà Nội!"

---

Âm thanh:

* Travel Start
* Correct
* Wrong
* Stamp Passport
* Country Complete

---

# 13. ACHIEVEMENT SYSTEM

## Nhà Du Hành Nhí

Khám phá 10 địa điểm.

---

## Chuyên Gia Việt Nam

Hoàn thành toàn bộ Việt Nam.

---

## Nhà Thám Hiểm Thế Giới

Khám phá 20 quốc gia.

---

## Mèo Ú Siêu Cấp

Hoàn thành toàn bộ game.

---

# 14. STICKER COLLECTION

Mở khóa:

* 🐱 Mèo Ú
* 🗼 Eiffel
* 🗻 Phú Sĩ
* 🦁 Merlion
* 🎌 Nhật Bản
* 🇻🇳 Việt Nam
* 🌍 Trái Đất

---

# 15. PARENT DASHBOARD

Hiển thị:

* Quốc gia đã khám phá
* Thành phố đã khám phá
* Kiến thức đã học
* Tỷ lệ hoàn thành
* Thời gian chơi

---

# 16. ADAPTIVE LEARNING

Nếu trẻ:

* Trả lời đúng nhiều

→ Tăng số lượng câu hỏi.

---

Nếu trẻ:

* Gặp khó khăn

→ Hiển thị thêm gợi ý.

---

# 17. RESPONSIVE

Hỗ trợ:

* Mobile Portrait
* Mobile Landscape
* Tablet
* Desktop

Tối ưu:

* Touch
* Drag & Drop
* Large UI
* Accessibility

---

# 18. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── WorldMapScreen.tsx
│   ├── CountryScreen.tsx
│   ├── QuestScreen.tsx
│   ├── MiniGameScreen.tsx
│   ├── PassportScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── CatCharacter.tsx
│   ├── PassportBook.tsx
│   ├── CountryCard.tsx
│   ├── QuestCard.tsx
│   ├── ProgressBar.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── WorldMapCanvas.tsx
│   ├── CharacterLayer.tsx
│   ├── TravelLayer.tsx
│   ├── RewardLayer.tsx
│   ├── ParticleLayer.tsx
│   └── ConfettiLayer.tsx
│
├── game/
│   ├── TravelEngine.ts
│   ├── QuestEngine.ts
│   ├── PassportEngine.ts
│   ├── RewardEngine.ts
│   ├── MiniGameEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useTravel.ts
│   ├── useQuest.ts
│   ├── usePassport.ts
│   ├── useGameState.ts
│   └── useAchievements.ts
│
├── services/
│   ├── AudioManager.ts
│   ├── SpeechService.ts
│   ├── StorageService.ts
│   └── StatisticsService.ts
│
├── data/
│   ├── countries.ts
│   ├── cities.ts
│   ├── locations.ts
│   ├── quests.ts
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
    ├── geography.ts
    └── adaptive.ts
```

---

# 19. DỮ LIỆU MẪU

Sinh sẵn:

* 50 quốc gia
* 200 thành phố
* 300 địa danh
* 300 nhiệm vụ
* 50 achievement
* 100 sticker

Không cần backend.

Lưu bằng Local Storage.

---

# 20. TÍNH NĂNG NÂNG CAO (BONUS)

## Travel Album

Tự động lưu ảnh kỷ niệm.

---

## Collect Souvenir

Thu thập quà lưu niệm từng quốc gia.

---

## Daily Travel Mission

Nhiệm vụ du lịch hàng ngày.

---

## Offline First

Toàn bộ game hoạt động offline.

---

# 21. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Không phụ thuộc backend
* Dễ mở rộng quốc gia
* Dễ mở rộng mini game
* Dễ mở rộng nội dung giáo dục

---

# 22. YÊU CẦU CUỐI CÙNG

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

* 50 quốc gia
* 300 địa danh
* 300 nhiệm vụ
* 6 loại mini game
* Passport System
* Achievement System
* Parent Dashboard
* Travel Album
* Souvenir Collection

Đảm bảo trẻ em từ 5-9 tuổi có thể vừa chơi vừa khám phá thế giới thông qua hành trình du lịch đáng yêu cùng Mèo Ú.
