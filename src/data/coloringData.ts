export type ColoringRegion = {
  id: string;
  d: string;
  defaultFill?: string;
};

export type ColoringPicture = {
  id: string;
  vi: string;
  emoji: string;
  viewBox: string;
  regions: ColoringRegion[];
};

// 16 colors for the palette (4 rows × 4 cols in the UI)
export const COLOR_PALETTE: string[] = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', // red / orange / amber / yellow
  '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', // lime / green / cyan / blue
  '#8b5cf6', '#a855f7', '#ec4899', '#d946ef', // violet / purple / pink / fuchsia
  '#92400e', '#000000', '#6b7280', '#ffffff', // brown / black / gray / white (eraser)
];

export const DEFAULT_FILL = '#ffffff';
export const OUTLINE_COLOR = '#1f2937';

// All pictures share a 200×200 viewBox for layout consistency.
// Each region's `d` is a closed path (or arc-based circle). Render order = array order;
// later regions render on top.
export const COLORING_PICTURES: ColoringPicture[] = [
  {
    id: 'apple',
    vi: 'Quả táo',
    emoji: '🍎',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'body',
        d: 'M 100 55 C 55 55 35 95 35 135 C 35 175 65 190 100 190 C 135 190 165 175 165 135 C 165 95 145 55 100 55 Z',
      },
      {
        id: 'stem',
        d: 'M 95 40 L 105 40 L 105 62 L 95 62 Z',
      },
      {
        id: 'leaf',
        d: 'M 105 48 C 125 32 148 40 145 58 C 138 68 116 68 105 58 Z',
      },
      {
        id: 'highlight',
        d: 'M 60 85 C 50 80 50 105 70 108 C 82 105 78 82 60 85 Z',
      },
    ],
  },
  {
    id: 'fish',
    vi: 'Con cá',
    emoji: '🐠',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'bubble',
        d: 'M 35 40 A 7 7 0 1 0 49 40 A 7 7 0 1 0 35 40 Z',
      },
      {
        id: 'body',
        d: 'M 60 100 C 60 60 130 55 145 100 C 130 145 60 140 60 100 Z',
      },
      {
        id: 'tailFin',
        d: 'M 60 100 L 25 75 L 40 100 L 25 125 Z',
      },
      {
        id: 'topFin',
        d: 'M 95 65 L 115 40 L 125 70 Z',
      },
      {
        id: 'eye',
        d: 'M 130 90 A 6 6 0 1 0 142 90 A 6 6 0 1 0 130 90 Z',
        defaultFill: OUTLINE_COLOR,
      },
    ],
  },
  {
    id: 'car',
    vi: 'Ô tô',
    emoji: '🚗',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'ground',
        d: 'M 0 175 L 200 175 L 200 200 L 0 200 Z',
      },
      {
        id: 'body',
        d: 'M 20 160 L 20 135 L 60 135 L 75 110 L 125 110 L 140 135 L 180 135 L 180 160 Z',
      },
      {
        id: 'windshield',
        d: 'M 80 115 L 122 115 L 137 133 L 65 133 Z',
      },
      {
        id: 'wheelLeft',
        d: 'M 55 170 A 17 17 0 1 0 89 170 A 17 17 0 1 0 55 170 Z',
      },
      {
        id: 'wheelRight',
        d: 'M 115 170 A 17 17 0 1 0 149 170 A 17 17 0 1 0 115 170 Z',
      },
    ],
  },
  {
    id: 'butterfly',
    vi: 'Bươm bướm',
    emoji: '🦋',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'leftUpperWing',
        d: 'M 95 75 C 60 50 30 55 30 85 C 30 105 60 115 95 100 Z',
      },
      {
        id: 'leftLowerWing',
        d: 'M 95 105 C 70 110 45 125 50 150 C 60 165 95 150 95 125 Z',
      },
      {
        id: 'rightUpperWing',
        d: 'M 105 75 C 140 50 170 55 170 85 C 170 105 140 115 105 100 Z',
      },
      {
        id: 'rightLowerWing',
        d: 'M 105 105 C 130 110 155 125 150 150 C 140 165 105 150 105 125 Z',
      },
      {
        id: 'body',
        d: 'M 95 60 C 95 55 105 55 105 60 L 105 150 C 105 155 95 155 95 150 Z',
      },
    ],
  },
  {
    id: 'house',
    vi: 'Ngôi nhà',
    emoji: '🏠',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'sky',
        d: 'M 0 0 L 200 0 L 200 175 L 0 175 Z',
      },
      {
        id: 'ground',
        d: 'M 0 175 L 200 175 L 200 200 L 0 200 Z',
      },
      {
        id: 'walls',
        d: 'M 40 90 L 160 90 L 160 175 L 40 175 Z',
      },
      {
        id: 'roof',
        d: 'M 30 90 L 100 25 L 170 90 Z',
      },
      {
        id: 'window',
        d: 'M 55 105 L 80 105 L 80 130 L 55 130 Z',
      },
      {
        id: 'door',
        d: 'M 85 130 L 115 130 L 115 175 L 85 175 Z',
      },
    ],
  },
  {
    id: 'flower',
    vi: 'Bông hoa',
    emoji: '🌸',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'petalTop',
        d: 'M 100 13 A 22 22 0 1 0 100 57 A 22 22 0 1 0 100 13 Z',
      },
      {
        id: 'petalTopRight',
        d: 'M 128 34 A 22 22 0 1 0 128 78 A 22 22 0 1 0 128 34 Z',
      },
      {
        id: 'petalBottomRight',
        d: 'M 118 67 A 22 22 0 1 0 118 111 A 22 22 0 1 0 118 67 Z',
      },
      {
        id: 'petalBottomLeft',
        d: 'M 82 67 A 22 22 0 1 0 82 111 A 22 22 0 1 0 82 67 Z',
      },
      {
        id: 'petalTopLeft',
        d: 'M 72 34 A 22 22 0 1 0 72 78 A 22 22 0 1 0 72 34 Z',
      },
      {
        id: 'stem',
        d: 'M 95 95 L 105 95 L 105 190 L 95 190 Z',
      },
      {
        id: 'leaf',
        d: 'M 105 140 C 130 125 145 140 140 160 C 130 170 110 160 105 150 Z',
      },
      {
        id: 'center',
        d: 'M 100 51 A 14 14 0 1 0 100 79 A 14 14 0 1 0 100 51 Z',
      },
    ],
  },
];
