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
  transform?: string;
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

function parseSvgAsset(svg: string): {
  viewBox: string;
  transform?: string;
  paths: string[];
} {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const transformMatch = svg.match(/<g[^>]*\stransform="([^"]+)"/);
  const paths: string[] = [];
  const pathRe = /<path[^>]*\sd="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(svg)) !== null) {
    paths.push(m[1]);
  }
  return {
    viewBox: viewBoxMatch?.[1] ?? '0 0 100 100',
    transform: transformMatch?.[1],
    paths,
  };
}

function svgAssetToRegions(paths: string[]): ColoringRegion[] {
  return paths.map((d, i) => ({ id: `shape${i}`, d }));
}

const svgModules = import.meta.glob('../assets/coloring/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function filenameSlug(path: string): string {
  const file = path.split('/').pop() ?? '';
  return file.replace(/\.svg$/i, '');
}

function humanize(slug: string): string {
  return slug
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const autoPictures: ColoringPicture[] = Object.entries(svgModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, svg]) => {
    const slug = filenameSlug(path);
    const asset = parseSvgAsset(svg);
    return {
      id: `asset.${slug}`,
      vi: humanize(slug),
      emoji: '🖼️',
      viewBox: asset.viewBox,
      transform: asset.transform,
      regions: svgAssetToRegions(asset.paths),
    };
  })
  .filter((p) => p.regions.length > 0);

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
  {
    id: 'elsa',
    vi: 'Công chúa Elsa',
    emoji: '👸',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'cape',
        d: 'M 30 130 L 170 130 L 200 200 L 0 200 Z',
      },
      {
        id: 'hairBack',
        d: 'M 50 100 C 45 40 155 40 150 100 L 165 180 L 35 180 Z',
      },
      {
        id: 'dress',
        d: 'M 78 125 L 122 125 L 150 180 L 50 180 Z',
      },
      {
        id: 'face',
        d: 'M 100 55 C 78 55 72 80 75 100 C 78 118 88 128 100 128 C 112 128 122 118 125 100 C 128 80 122 55 100 55 Z',
      },
      {
        id: 'hairFront',
        d: 'M 75 75 C 80 55 120 55 125 75 C 115 65 105 72 100 70 C 95 72 85 65 75 75 Z',
      },
      {
        id: 'braid',
        d: 'M 122 122 C 148 138 150 170 138 195 L 115 195 C 128 170 120 145 105 125 Z',
      },
      {
        id: 'browLeft',
        d: 'M 82 82 C 82 78 96 78 96 82 L 95 85 C 92 82 86 82 83 85 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'browRight',
        d: 'M 104 82 C 104 78 118 78 118 82 L 117 85 C 114 82 108 82 105 85 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'eyeLeft',
        d: 'M 83 92 A 4 5 0 1 0 91 92 A 4 5 0 1 0 83 92 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'eyeRight',
        d: 'M 109 92 A 4 5 0 1 0 117 92 A 4 5 0 1 0 109 92 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'mouth',
        d: 'M 92 110 C 96 114 104 114 108 110 C 104 116 96 116 92 110 Z',
      },
      {
        id: 'snowflake',
        d: 'M 138 158 L 138 152 L 134 152 L 134 158 L 128 158 L 128 162 L 134 162 L 134 168 L 138 168 L 138 162 L 144 162 L 144 158 Z',
      },
    ],
  },
  {
    id: 'cat',
    vi: 'Con mèo',
    emoji: '🐱',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'leftEar',
        d: 'M 55 80 L 45 30 L 90 65 Z',
      },
      {
        id: 'rightEar',
        d: 'M 145 80 L 155 30 L 110 65 Z',
      },
      {
        id: 'head',
        d: 'M 100 65 C 55 65 45 110 50 145 C 55 180 80 195 100 195 C 120 195 145 180 150 145 C 155 110 145 65 100 65 Z',
      },
      {
        id: 'leftInnerEar',
        d: 'M 62 72 L 56 42 L 85 62 Z',
      },
      {
        id: 'rightInnerEar',
        d: 'M 138 72 L 144 42 L 115 62 Z',
      },
      {
        id: 'leftEye',
        d: 'M 73 115 A 6 8 0 1 0 87 115 A 6 8 0 1 0 73 115 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'rightEye',
        d: 'M 113 115 A 6 8 0 1 0 127 115 A 6 8 0 1 0 113 115 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'nose',
        d: 'M 100 138 L 92 146 L 108 146 Z',
      },
      {
        id: 'mouth',
        d: 'M 88 152 C 92 162 100 160 100 154 C 100 160 108 162 112 152 C 108 158 92 158 88 152 Z',
      },
    ],
  },
  {
    id: 'bear',
    vi: 'Con gấu',
    emoji: '🐻',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'leftEar',
        d: 'M 55 70 A 18 18 0 1 0 91 70 A 18 18 0 1 0 55 70 Z',
      },
      {
        id: 'rightEar',
        d: 'M 109 70 A 18 18 0 1 0 145 70 A 18 18 0 1 0 109 70 Z',
      },
      {
        id: 'head',
        d: 'M 100 65 C 55 65 45 110 50 140 C 55 175 80 195 100 195 C 120 195 145 175 150 140 C 155 110 145 65 100 65 Z',
      },
      {
        id: 'leftInnerEar',
        d: 'M 65 70 A 10 10 0 1 0 85 70 A 10 10 0 1 0 65 70 Z',
      },
      {
        id: 'rightInnerEar',
        d: 'M 115 70 A 10 10 0 1 0 135 70 A 10 10 0 1 0 115 70 Z',
      },
      {
        id: 'snout',
        d: 'M 70 145 C 70 130 130 130 130 145 C 130 170 110 178 100 178 C 90 178 70 170 70 145 Z',
      },
      {
        id: 'leftEye',
        d: 'M 75 115 A 5 6 0 1 0 85 115 A 5 6 0 1 0 75 115 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'rightEye',
        d: 'M 115 115 A 5 6 0 1 0 125 115 A 5 6 0 1 0 115 115 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'nose',
        d: 'M 90 138 C 90 130 110 130 110 138 C 110 148 100 152 100 152 C 100 152 90 148 90 138 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'mouth',
        d: 'M 88 162 C 92 168 100 166 100 162 C 100 166 108 168 112 162 C 108 166 92 166 88 162 Z',
      },
    ],
  },
  {
    id: 'rabbit',
    vi: 'Con thỏ',
    emoji: '🐰',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'leftEar',
        d: 'M 78 15 C 65 20 60 60 70 95 C 75 102 85 102 88 95 C 95 60 92 15 78 15 Z',
      },
      {
        id: 'rightEar',
        d: 'M 122 15 C 135 20 140 60 130 95 C 125 102 115 102 112 95 C 105 60 108 15 122 15 Z',
      },
      {
        id: 'leftInnerEar',
        d: 'M 78 30 C 70 35 68 60 75 90 C 78 95 84 95 86 90 C 90 60 86 30 78 30 Z',
      },
      {
        id: 'rightInnerEar',
        d: 'M 122 30 C 130 35 132 60 125 90 C 122 95 116 95 114 90 C 110 60 114 30 122 30 Z',
      },
      {
        id: 'head',
        d: 'M 100 85 C 55 85 45 130 50 160 C 55 185 80 195 100 195 C 120 195 145 185 150 160 C 155 130 145 85 100 85 Z',
      },
      {
        id: 'leftEye',
        d: 'M 75 135 A 5 6 0 1 0 85 135 A 5 6 0 1 0 75 135 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'rightEye',
        d: 'M 115 135 A 5 6 0 1 0 125 135 A 5 6 0 1 0 115 135 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'leftCheek',
        d: 'M 65 158 A 7 5 0 1 0 79 158 A 7 5 0 1 0 65 158 Z',
      },
      {
        id: 'rightCheek',
        d: 'M 121 158 A 7 5 0 1 0 135 158 A 7 5 0 1 0 121 158 Z',
      },
      {
        id: 'nose',
        d: 'M 100 152 L 92 160 L 108 160 Z',
      },
      {
        id: 'mouth',
        d: 'M 92 168 C 95 175 100 172 100 168 C 100 172 105 175 108 168 C 105 172 95 172 92 168 Z',
      },
    ],
  },
  {
    id: 'pig',
    vi: 'Con lợn',
    emoji: '🐷',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'leftEar',
        d: 'M 50 60 L 75 50 L 78 80 Z',
      },
      {
        id: 'rightEar',
        d: 'M 150 60 L 125 50 L 122 80 Z',
      },
      {
        id: 'head',
        d: 'M 100 65 C 50 65 40 110 45 145 C 50 180 80 195 100 195 C 120 195 150 180 155 145 C 160 110 150 65 100 65 Z',
      },
      {
        id: 'leftCheek',
        d: 'M 55 132 A 8 6 0 1 0 71 132 A 8 6 0 1 0 55 132 Z',
      },
      {
        id: 'rightCheek',
        d: 'M 129 132 A 8 6 0 1 0 145 132 A 8 6 0 1 0 129 132 Z',
      },
      {
        id: 'snout',
        d: 'M 70 145 C 70 125 130 125 130 145 C 130 165 70 165 70 145 Z',
      },
      {
        id: 'leftNostril',
        d: 'M 86 142 A 4 6 0 1 0 96 142 A 4 6 0 1 0 86 142 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'rightNostril',
        d: 'M 104 142 A 4 6 0 1 0 114 142 A 4 6 0 1 0 104 142 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'leftEye',
        d: 'M 75 110 A 4 5 0 1 0 85 110 A 4 5 0 1 0 75 110 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'rightEye',
        d: 'M 115 110 A 4 5 0 1 0 125 110 A 4 5 0 1 0 115 110 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'mouth',
        d: 'M 88 172 C 92 178 100 176 100 172 C 100 176 108 178 112 172 C 108 176 92 176 88 172 Z',
      },
    ],
  },
  {
    id: 'chick',
    vi: 'Gà con',
    emoji: '🐥',
    viewBox: '0 0 200 200',
    regions: [
      {
        id: 'body',
        d: 'M 100 35 C 50 35 40 80 45 130 C 50 175 80 192 100 192 C 120 192 150 175 155 130 C 160 80 150 35 100 35 Z',
      },
      {
        id: 'leftWing',
        d: 'M 50 110 C 35 115 35 150 55 160 C 65 158 70 130 65 115 Z',
      },
      {
        id: 'rightWing',
        d: 'M 150 110 C 165 115 165 150 145 160 C 135 158 130 130 135 115 Z',
      },
      {
        id: 'beak',
        d: 'M 90 95 L 95 110 L 110 110 L 105 95 Z',
      },
      {
        id: 'leftEye',
        d: 'M 75 78 A 6 7 0 1 0 87 78 A 6 7 0 1 0 75 78 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'rightEye',
        d: 'M 113 78 A 6 7 0 1 0 125 78 A 6 7 0 1 0 113 78 Z',
        defaultFill: OUTLINE_COLOR,
      },
      {
        id: 'leftFoot',
        d: 'M 82 192 L 70 200 L 95 200 Z',
      },
      {
        id: 'rightFoot',
        d: 'M 118 192 L 130 200 L 105 200 Z',
      },
    ],
  },
  ...autoPictures,
];
