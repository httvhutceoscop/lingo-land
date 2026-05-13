export type PetStage = {
  threshold: number;
  icon: string;
  name: string;
  description: string;
};

export const PET_STAGES: PetStage[] = [
  {
    threshold: 0,
    icon: '🥚',
    name: 'Trứng',
    description: 'Đang ấp trong tổ ấm. Cùng học để giúp bạn ấy sớm nở nào!',
  },
  {
    threshold: 3,
    icon: '🐣',
    name: 'Vừa nở',
    description: 'Vỏ trứng đã nứt! Một chú gà con tò mò bước ra khỏi tổ.',
  },
  {
    threshold: 7,
    icon: '🐤',
    name: 'Gà nhí',
    description: 'Lông vàng tơ mịn, chân chạy lon ton khắp đảo.',
  },
  {
    threshold: 12,
    icon: '🐥',
    name: 'Gà choai',
    description: 'Đã biết vỗ cánh và kêu lớn — sắp thành nhà thông thái rồi!',
  },
  {
    threshold: 18,
    icon: '🐔',
    name: 'Vô địch',
    description: 'Bạn đồng hành đã trưởng thành. Một bậc thầy từ vựng thực thụ.',
  },
];

export const DEFAULT_PET_NAME = 'Bí';
export const PET_NAME_MAX = 16;

export function getPetStage(passedCount: number): PetStage {
  let current = PET_STAGES[0];
  for (const stage of PET_STAGES) {
    if (passedCount >= stage.threshold) current = stage;
    else break;
  }
  return current;
}

export function getNextStage(passedCount: number): PetStage | null {
  for (const stage of PET_STAGES) {
    if (passedCount < stage.threshold) return stage;
  }
  return null;
}

export function getStageIndex(stage: PetStage): number {
  return PET_STAGES.indexOf(stage);
}
