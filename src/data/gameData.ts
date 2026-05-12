export type Word = {
  en: string;
  vi: string;
  ipa: string;
  img: string;
  ex: string;
};

export type Level = {
  id: number;
  title: string;
  icon: string;
  words: Word[];
};

export const LEVELS: Level[] = [
  {
    id: 1,
    title: 'Animals',
    icon: '🦁',
    words: [
      { en: 'Lion', vi: 'Sư tử', ipa: '/ˈlaɪ.ən/', img: '🦁', ex: 'The lion is the king of the jungle.' },
      { en: 'Elephant', vi: 'Con voi', ipa: '/ˈel.ɪ.fənt/', img: '🐘', ex: 'Elephants have a long trunk.' },
      { en: 'Giraffe', vi: 'Hươu cao cổ', ipa: '/dʒɪˈrɑːf/', img: '🦒', ex: 'The giraffe has a very long neck.' },
      { en: 'Monkey', vi: 'Con khỉ', ipa: '/ˈmʌŋ.ki/', img: '🐒', ex: 'Monkeys like to climb trees.' },
      { en: 'Dolphin', vi: 'Cá heo', ipa: '/ˈdɒl.fɪn/', img: '🐬', ex: 'Dolphins are very intelligent animals.' },
      { en: 'Rabbit', vi: 'Con thỏ', ipa: '/ˈræb.ɪt/', img: '🐰', ex: 'The rabbit is eating a carrot.' },
    ],
  },
  {
    id: 2,
    title: 'Food',
    icon: '🍎',
    words: [
      { en: 'Apple', vi: 'Quả táo', ipa: '/ˈæp.əl/', img: '🍎', ex: 'An apple a day keeps the doctor away.' },
      { en: 'Bread', vi: 'Bánh mì', ipa: '/bred/', img: '🍞', ex: 'I eat bread for breakfast.' },
      { en: 'Cheese', vi: 'Phô mai', ipa: '/tʃiːz/', img: '🧀', ex: 'I love extra cheese on my pizza.' },
      { en: 'Pizza', vi: 'Bánh pizza', ipa: '/ˈpiːt.sə/', img: '🍕', ex: "Let's order a large pizza for dinner." },
      { en: 'Milk', vi: 'Sữa', ipa: '/mɪlk/', img: '🥛', ex: 'Drinking milk is good for your bones.' },
      { en: 'Rice', vi: 'Cơm/Gạo', ipa: '/raɪs/', img: '🍚', ex: 'Rice is a staple food in Vietnam.' },
      { en: 'Chocolate', vi: 'Sô-cô-la', ipa: '/ˈtʃɒk.lət/', img: '🍫', ex: 'Dark chocolate is my favorite snack.' },
    ],
  },
  {
    id: 3,
    title: 'Travel',
    icon: '✈️',
    words: [
      { en: 'Airplane', vi: 'Máy bay', ipa: '/ˈeə.pleɪn/', img: '✈️', ex: 'The airplane is flying high.' },
      { en: 'Passport', vi: 'Hộ chiếu', ipa: '/ˈpɑːs.pɔːt/', img: '🛂', ex: "Don't forget your passport!" },
      { en: 'Suitcase', vi: 'Va li', ipa: '/ˈsuːt.keɪs/', img: '🧳', ex: 'I am packing my suitcase for the trip.' },
      { en: 'Beach', vi: 'Bãi biển', ipa: '/biːtʃ/', img: '🏖️', ex: 'We spent the whole day at the beach.' },
      { en: 'Map', vi: 'Bản đồ', ipa: '/mæp/', img: '🗺️', ex: 'Can you show me our location on the map?' },
      { en: 'Hotel', vi: 'Khách sạn', ipa: '/həʊˈtel/', img: '🏨', ex: 'We stayed at a very comfortable hotel.' },
    ],
  },
  {
    id: 4,
    title: 'Family',
    icon: '👨‍👩‍👧',
    words: [
      { en: 'Father', vi: 'Bố', ipa: '/ˈfɑː.ðər/', img: '👨', ex: 'My father is a teacher.' },
      { en: 'Mother', vi: 'Mẹ', ipa: '/ˈmʌð.ər/', img: '👩', ex: 'My mother cooks delicious food.' },
      { en: 'Brother', vi: 'Anh/Em trai', ipa: '/ˈbrʌð.ər/', img: '👦', ex: 'My brother likes playing football.' },
      { en: 'Sister', vi: 'Chị/Em gái', ipa: '/ˈsɪs.tər/', img: '👧', ex: 'I have one younger sister.' },
      { en: 'Grandfather', vi: 'Ông', ipa: '/ˈɡræn.fɑː.ðər/', img: '👴', ex: 'My grandfather tells me stories.' },
      { en: 'Grandmother', vi: 'Bà', ipa: '/ˈɡræn.mʌð.ər/', img: '👵', ex: 'My grandmother is very kind.' },
    ],
  },
  {
    id: 5,
    title: 'Weather',
    icon: '☀️',
    words: [
      { en: 'Sun', vi: 'Mặt trời', ipa: '/sʌn/', img: '☀️', ex: 'The sun is shining brightly.' },
      { en: 'Rain', vi: 'Mưa', ipa: '/reɪn/', img: '🌧️', ex: 'I like the sound of rain.' },
      { en: 'Cloud', vi: 'Mây', ipa: '/klaʊd/', img: '☁️', ex: 'There are white clouds in the sky.' },
      { en: 'Wind', vi: 'Gió', ipa: '/wɪnd/', img: '💨', ex: 'The wind is blowing hard.' },
      { en: 'Snow', vi: 'Tuyết', ipa: '/snəʊ/', img: '❄️', ex: 'It rarely snows in Vietnam.' },
      { en: 'Storm', vi: 'Bão', ipa: '/stɔːm/', img: '⛈️', ex: 'A big storm is coming tonight.' },
    ],
  },
];
