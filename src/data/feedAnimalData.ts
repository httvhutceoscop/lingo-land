export type Food = {
  id: string;
  emoji: string;
  en: string;
  vi: string;
};

export type Animal = {
  id: string;
  emoji: string;
  en: string;
  vi: string;
  likes: string[];
  reactionClass: string;
  personality: string;
};

export const FOODS: Food[] = [
  { id: 'carrot', emoji: '🥕', en: 'carrot', vi: 'cà rốt' },
  { id: 'banana', emoji: '🍌', en: 'banana', vi: 'chuối' },
  { id: 'fish', emoji: '🐟', en: 'fish', vi: 'cá' },
  { id: 'bamboo', emoji: '🎋', en: 'bamboo', vi: 'tre' },
  { id: 'apple', emoji: '🍎', en: 'apple', vi: 'táo' },
  { id: 'bone', emoji: '🦴', en: 'bone', vi: 'xương' },
  { id: 'cheese', emoji: '🧀', en: 'cheese', vi: 'phô mai' },
  { id: 'honey', emoji: '🍯', en: 'honey', vi: 'mật ong' },
  { id: 'meat', emoji: '🍖', en: 'meat', vi: 'thịt' },
  { id: 'corn', emoji: '🌽', en: 'corn', vi: 'ngô' },
  { id: 'grass', emoji: '🌿', en: 'leaves', vi: 'lá cây' },
  { id: 'acorn', emoji: '🌰', en: 'acorn', vi: 'hạt dẻ' },
  { id: 'burger', emoji: '🍔', en: 'burger', vi: 'bánh mì kẹp' },
  { id: 'fries', emoji: '🍟', en: 'fries', vi: 'khoai chiên' },
  { id: 'candy', emoji: '🍬', en: 'candy', vi: 'kẹo' },
  { id: 'cookie', emoji: '🍪', en: 'cookie', vi: 'bánh quy' },
];

const foodById = (id: string): Food => {
  const f = FOODS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown food: ${id}`);
  return f;
};

export const ANIMALS: Animal[] = [
  {
    id: 'rabbit',
    emoji: '🐰',
    en: 'rabbit',
    vi: 'thỏ',
    likes: ['carrot'],
    reactionClass: 'animal-bounce',
    personality: 'Thỏ thích nhảy lung tung!',
  },
  {
    id: 'monkey',
    emoji: '🐵',
    en: 'monkey',
    vi: 'khỉ',
    likes: ['banana'],
    reactionClass: 'animal-wiggle',
    personality: 'Khỉ con tinh nghịch lắm!',
  },
  {
    id: 'panda',
    emoji: '🐼',
    en: 'panda',
    vi: 'gấu trúc',
    likes: ['bamboo'],
    reactionClass: 'animal-roll',
    personality: 'Gấu trúc chậm rãi và buồn ngủ.',
  },
  {
    id: 'cat',
    emoji: '🐱',
    en: 'cat',
    vi: 'mèo',
    likes: ['fish'],
    reactionClass: 'animal-purr',
    personality: 'Mèo con thích kêu meo meo.',
  },
  {
    id: 'elephant',
    emoji: '🐘',
    en: 'elephant',
    vi: 'voi',
    likes: ['apple', 'grass'],
    reactionClass: 'animal-stomp',
    personality: 'Voi to và hiền lành.',
  },
  {
    id: 'dog',
    emoji: '🐶',
    en: 'dog',
    vi: 'chó',
    likes: ['bone', 'meat'],
    reactionClass: 'animal-bounce',
    personality: 'Cún con luôn vẫy đuôi mừng.',
  },
  {
    id: 'mouse',
    emoji: '🐭',
    en: 'mouse',
    vi: 'chuột',
    likes: ['cheese'],
    reactionClass: 'animal-wiggle',
    personality: 'Chuột nhắt nhỏ xíu.',
  },
  {
    id: 'bear',
    emoji: '🐻',
    en: 'bear',
    vi: 'gấu',
    likes: ['honey'],
    reactionClass: 'animal-roll',
    personality: 'Gấu mê mật ong cực kì.',
  },
  {
    id: 'lion',
    emoji: '🦁',
    en: 'lion',
    vi: 'sư tử',
    likes: ['meat'],
    reactionClass: 'animal-stomp',
    personality: 'Sư tử dũng mãnh oai phong.',
  },
  {
    id: 'cow',
    emoji: '🐮',
    en: 'cow',
    vi: 'bò',
    likes: ['grass', 'corn'],
    reactionClass: 'animal-bounce',
    personality: 'Bò sữa ăn cỏ cả ngày.',
  },
  {
    id: 'squirrel',
    emoji: '🐿️',
    en: 'squirrel',
    vi: 'sóc',
    likes: ['acorn'],
    reactionClass: 'animal-wiggle',
    personality: 'Sóc nhanh nhẹn leo cây.',
  },
  {
    id: 'horse',
    emoji: '🐴',
    en: 'horse',
    vi: 'ngựa',
    likes: ['apple', 'corn'],
    reactionClass: 'animal-stomp',
    personality: 'Ngựa chạy nhanh như gió.',
  },
];

export type FeedRound = {
  animal: Animal;
  correct: Food;
  options: Food[];
};

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export function buildRound(optionsCount = 4, excludeAnimalId?: string): FeedRound {
  const pool = excludeAnimalId
    ? ANIMALS.filter((a) => a.id !== excludeAnimalId)
    : ANIMALS;
  const animal = pool[randInt(0, pool.length - 1)];
  const correctId = animal.likes[randInt(0, animal.likes.length - 1)];
  const correct = foodById(correctId);

  const animalLikesSet = new Set(animal.likes);
  const distractorPool = FOODS.filter((f) => !animalLikesSet.has(f.id));
  const distractors = shuffle(distractorPool).slice(0, optionsCount - 1);
  const options = shuffle([correct, ...distractors]);
  return { animal, correct, options };
}

export const TOTAL_FEED_ROUNDS = 8;
