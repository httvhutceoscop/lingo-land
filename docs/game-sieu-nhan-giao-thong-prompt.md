# Claude Code Prompt - Siêu Nhân Giao Thông

## Mục tiêu

Xây dựng game giáo dục "Siêu Nhân Giao Thông" dành cho trẻ em từ 5-9 tuổi.

Mục tiêu giáo dục:

* Học các quy tắc giao thông cơ bản
* Nhận biết biển báo giao thông
* Học cách sang đường an toàn
* Học sử dụng phương tiện giao thông đúng cách
* Học ý thức tham gia giao thông
* Học kỹ năng xử lý tình huống giao thông
* Hình thành thói quen an toàn từ sớm
* Phát triển khả năng quan sát và ra quyết định

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

Bé trở thành "Siêu Nhân Giao Thông" của Thành Phố An Toàn.

Nhiệm vụ:

* Giúp người dân tham gia giao thông an toàn
* Điều khiển giao thông tại ngã tư
* Nhận biết biển báo
* Hướng dẫn các bạn nhỏ sang đường
* Xử lý các tình huống giao thông hàng ngày

Sau mỗi nhiệm vụ thành công:

* Nhận huy hiệu an toàn
* Mở khóa khu vực mới
* Nâng cấp bộ đồ siêu nhân
* Trở thành Đại Sứ Giao Thông Nhí

---

# 2. KIẾN TRÚC VÀ PHÂN CHIA TRÁCH NHIỆM

## ReactJS

React quản lý:

* Game State
* Current City Zone
* Current Mission
* Safety Score
* Hero Level
* Coins
* Stars
* Achievement
* Traffic Knowledge
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

* Animation xe cộ
* Điều khiển đèn giao thông
* Nhân vật di chuyển
* Particle Effects
* Reward Effects
* Traffic Simulation
* Scene Transition

Không sử dụng Canvas API thuần nếu không cần thiết.

---

# 3. BẢN ĐỒ THÀNH PHỐ

## Khu Vực 1 - Trường Học

Học:

* Đi bộ trên vỉa hè
* Sang đường đúng nơi quy định

---

## Khu Vực 2 - Khu Dân Cư

Học:

* Nhận biết biển báo cơ bản
* Đi xe đạp an toàn

---

## Khu Vực 3 - Công Viên

Học:

* Tuân thủ tín hiệu giao thông

---

## Khu Vực 4 - Trung Tâm Thành Phố

Học:

* Điều khiển giao thông
* Xử lý nhiều tình huống

---

## Khu Vực 5 - Thành Phố Thông Minh

Kết hợp toàn bộ kiến thức.

---

# 4. HỆ THỐNG BÀI HỌC

## Bài Học 1 - Đèn Giao Thông

Hiển thị:

🔴 Đỏ

🟡 Vàng

🟢 Xanh

---

Câu hỏi:

Đèn đỏ thì phải làm gì?

Đáp án:

Dừng lại.

---

## Bài Học 2 - Sang Đường

Các bước:

1. Dừng lại
2. Quan sát trái
3. Quan sát phải
4. Quan sát trái lần nữa
5. Sang đường

---

## Bài Học 3 - Đội Mũ Bảo Hiểm

Ví dụ:

Ai đang đội mũ bảo hiểm đúng cách?

---

## Bài Học 4 - Biển Báo

Nhận biết:

* Cấm đi ngược chiều
* Người đi bộ
* Trường học
* Giao nhau
* Đèn tín hiệu

---

# 5. MINI GAME SYSTEM

## Mini Game 1

Sang đường an toàn.

Kéo nhân vật sang đường đúng thời điểm.

---

## Mini Game 2

Điều khiển đèn giao thông.

Điều chỉnh đèn để tránh ùn tắc.

---

## Mini Game 3

Nhận diện biển báo.

Chọn đúng biển báo theo yêu cầu.

---

## Mini Game 4

Trang bị cho người tham gia giao thông.

Ví dụ:

Đội mũ bảo hiểm cho bé.

---

## Mini Game 5

Tìm lỗi giao thông.

Ví dụ:

Ai đang vi phạm luật?

---

## Mini Game 6

Lái xe an toàn.

Điều khiển xe tránh chướng ngại vật.

---

# 6. HỆ THỐNG DỮ LIỆU

## TrafficMission

```typescript
interface TrafficMission {
  id: string;
  title: string;
  type:
    | "traffic_light"
    | "cross_road"
    | "helmet"
    | "road_sign"
    | "safe_driving"
    | "traffic_control";
  difficulty: number;
  reward: number;
}
```

---

## RoadSign

```typescript
interface RoadSign {
  id: string;
  name: string;
  image: string;
  description: string;
  category:
    | "warning"
    | "mandatory"
    | "prohibition"
    | "instruction";
}
```

---

## Hero

```typescript
interface Hero {
  level: number;
  experience: number;
  safetyScore: number;
  skin: string;
}
```

---

# 7. ĐIỂM SỐ

## Hành động đúng

+100 điểm

---

## Hoàn thành nhiệm vụ

+300 điểm

---

## Không mắc lỗi

+200 điểm

---

## Combo

5 nhiệm vụ liên tiếp:

+500 điểm

---

# 8. SAFETY SCORE

## Chỉ số an toàn

0 - 100

---

Tăng khi:

* Trả lời đúng
* Xử lý đúng tình huống

---

Giảm khi:

* Vi phạm luật giao thông
* Chọn đáp án nguy hiểm

---

# 9. HỆ THỐNG HUY HIỆU

## Badge

```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}
```

---

Ví dụ:

* Người Đi Bộ Gương Mẫu
* Chuyên Gia Biển Báo
* Anh Hùng Đèn Giao Thông
* Đại Sứ Giao Thông Nhí

---

# 10. ĐỒ HỌA

## Theme

Thành phố hoạt hình vui nhộn.

---

## Màu sắc

* Traffic Red
* Safety Yellow
* Road Blue
* Grass Green
* Hero Orange

---

## Font

Ưu tiên:

* Baloo 2
* Nunito

---

# 11. HIỆU ỨNG

## Hoàn thành nhiệm vụ

* Confetti
* Star Burst
* Badge Unlock

---

## Điều khiển giao thông thành công

* Green Wave Effect
* Traffic Flow Animation

---

## Mở khóa khu vực

* City Expansion Animation

---

# 12. AUDIO

Sử dụng:

* Web Audio API
* Web Speech API

---

Ví dụ:

"Rất tốt! Con đã sang đường an toàn."

---

Âm thanh:

* Correct
* Wrong
* Traffic Light Change
* Reward
* Badge Unlock

---

# 13. ACHIEVEMENT SYSTEM

## Người Đi Bộ An Toàn

Hoàn thành 20 nhiệm vụ sang đường.

---

## Chuyên Gia Biển Báo

Nhận biết 50 biển báo.

---

## Siêu Nhân Giao Thông

Hoàn thành 100 nhiệm vụ.

---

## Đại Sứ Giao Thông

Hoàn thành toàn bộ game.

---

# 14. STICKER COLLECTION

Mở khóa:

* 🚦 Đèn giao thông
* 🚲 Xe đạp
* 🛵 Xe máy
* 🚸 Biển trường học
* 👮 Cảnh sát giao thông
* 🦸 Siêu nhân giao thông

---

# 15. PARENT DASHBOARD

Hiển thị:

* Số bài học hoàn thành
* Tỷ lệ đúng
* Biển báo đã học
* Kỹ năng còn yếu
* Thời gian học

---

Thống kê:

* An toàn giao thông
* Biển báo
* Tình huống thực tế
* Kỹ năng quan sát

---

# 16. KNOWLEDGE ENGINE

## Hệ thống kiến thức

```typescript
interface LearningProgress {
  trafficLights: number;
  roadSigns: number;
  crossingRoad: number;
  safeDriving: number;
}
```

---

Theo dõi tiến bộ học tập.

---

# 17. ADAPTIVE LEARNING

Nếu:

Tỷ lệ đúng > 90%

→ Tăng độ khó.

---

Nếu:

Tỷ lệ đúng < 60%

→ Hiển thị thêm hướng dẫn.

---

Nếu:

Sai liên tục

→ Chuyển sang chế độ thực hành.

---

# 18. RESPONSIVE

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

# 19. CẤU TRÚC SOURCE CODE

```text
src/
├── screens/
│   ├── StartScreen.tsx
│   ├── CityMapScreen.tsx
│   ├── LessonScreen.tsx
│   ├── MissionScreen.tsx
│   ├── TrafficControlScreen.tsx
│   ├── BadgeScreen.tsx
│   ├── ResultScreen.tsx
│   └── ParentDashboard.tsx
│
├── components/
│   ├── HeroCharacter.tsx
│   ├── RoadSignCard.tsx
│   ├── TrafficLight.tsx
│   ├── MissionCard.tsx
│   ├── ProgressBar.tsx
│   ├── AchievementPanel.tsx
│   └── StickerGallery.tsx
│
├── canvas/
│   ├── TrafficCanvas.tsx
│   ├── VehicleLayer.tsx
│   ├── HeroLayer.tsx
│   ├── RoadLayer.tsx
│   ├── ParticleLayer.tsx
│   └── RewardLayer.tsx
│
├── game/
│   ├── MissionEngine.ts
│   ├── TrafficSimulationEngine.ts
│   ├── LearningEngine.ts
│   ├── RewardEngine.ts
│   ├── SafetyEngine.ts
│   └── AchievementEngine.ts
│
├── hooks/
│   ├── useGameState.ts
│   ├── useMission.ts
│   ├── useLearning.ts
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
│   ├── roadSigns.ts
│   ├── lessons.ts
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

# 20. DỮ LIỆU MẪU

Sinh sẵn:

* 100 biển báo giao thông
* 300 nhiệm vụ
* 100 bài học
* 50 achievement
* 100 sticker
* 5 khu vực thành phố

Không cần backend.

Lưu bằng Local Storage.

---

# 21. TÍNH NĂNG NÂNG CAO (BONUS)

## Traffic City Builder

Xây dựng thành phố an toàn.

---

## Daily Safety Mission

Nhiệm vụ giao thông hàng ngày.

---

## Road Sign Encyclopedia

Từ điển biển báo giao thông.

---

## Parent Learning Mode

Phụ huynh học cùng trẻ.

---

## Offline First

Toàn bộ game hoạt động offline.

---

# 22. YÊU CẦU CHẤT LƯỢNG CODE

* TypeScript Strict Mode
* Functional Components
* Hooks Only
* Không memory leak
* Cleanup animation đúng chuẩn
* Responsive
* Hỗ trợ Touch Events
* Không phụ thuộc backend
* Dễ mở rộng biển báo
* Dễ mở rộng bài học
* Dễ mở rộng mini game

---

# 23. YÊU CẦU CUỐI CÙNG

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

* 300 nhiệm vụ
* 100 bài học
* 100 biển báo
* 6 mini game
* Traffic Simulation Engine
* Achievement System
* Parent Dashboard
* Road Sign Encyclopedia
* Daily Safety Mission

Đảm bảo trẻ em từ 5-9 tuổi có thể học luật giao thông, nhận biết biển báo và hình thành ý thức tham gia giao thông an toàn thông qua trải nghiệm game tương tác hấp dẫn.
