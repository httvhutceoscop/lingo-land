export type Word = {
  en: string;
  vi: string;
  ipa: string;
  img: string;
  ex: string;
};

export type TestMode = 'quiz' | 'matching' | 'listening' | 'typing' | 'memory' | 'hangman';

export type SubGroup = {
  id: string;
  title: string;
  icon: string;
  mode: TestMode;
  words: Word[];
};

export type Category = {
  id: number;
  title: string;
  icon: string;
  subGroups: SubGroup[];
};

export const CATEGORIES: Category[] = [
  {
    id: 1,
    title: 'Animals',
    icon: '🦁',
    subGroups: [
      {
        id: 'animals.pets',
        title: 'Pets',
        icon: '🐶',
        mode: 'quiz',
        words: [
          { en: 'Dog', vi: 'Con chó', ipa: '/dɒɡ/', img: '🐶', ex: 'The dog is playing in the garden.' },
          { en: 'Cat', vi: 'Con mèo', ipa: '/kæt/', img: '🐱', ex: 'My cat sleeps all day.' },
          { en: 'Rabbit', vi: 'Con thỏ', ipa: '/ˈræb.ɪt/', img: '🐰', ex: 'The rabbit is eating a carrot.' },
          { en: 'Hamster', vi: 'Chuột hamster', ipa: '/ˈhæm.stər/', img: '🐹', ex: 'The hamster runs on its wheel.' },
        ],
      },
      {
        id: 'animals.wild',
        title: 'Wild Animals',
        icon: '🦁',
        mode: 'listening',
        words: [
          { en: 'Lion', vi: 'Sư tử', ipa: '/ˈlaɪ.ən/', img: '🦁', ex: 'The lion is the king of the jungle.' },
          { en: 'Elephant', vi: 'Con voi', ipa: '/ˈel.ɪ.fənt/', img: '🐘', ex: 'Elephants have a long trunk.' },
          { en: 'Giraffe', vi: 'Hươu cao cổ', ipa: '/dʒɪˈrɑːf/', img: '🦒', ex: 'The giraffe has a very long neck.' },
          { en: 'Monkey', vi: 'Con khỉ', ipa: '/ˈmʌŋ.ki/', img: '🐒', ex: 'Monkeys like to climb trees.' },
        ],
      },
      {
        id: 'animals.insects',
        title: 'Insects',
        icon: '🐝',
        mode: 'memory',
        words: [
          { en: 'Ant', vi: 'Con kiến', ipa: '/ænt/', img: '🐜', ex: 'The ant is carrying a leaf.' },
          { en: 'Bee', vi: 'Con ong', ipa: '/biː/', img: '🐝', ex: 'Bees make honey.' },
          { en: 'Butterfly', vi: 'Bươm bướm', ipa: '/ˈbʌt.ə.flaɪ/', img: '🦋', ex: 'The butterfly has colorful wings.' },
          { en: 'Spider', vi: 'Con nhện', ipa: '/ˈspaɪ.dər/', img: '🕷️', ex: 'A spider is spinning a web.' },
        ],
      },
      {
        id: 'animals.sea',
        title: 'Sea Animals',
        icon: '🐬',
        mode: 'hangman',
        words: [
          { en: 'Dolphin', vi: 'Cá heo', ipa: '/ˈdɒl.fɪn/', img: '🐬', ex: 'Dolphins are very intelligent animals.' },
          { en: 'Shark', vi: 'Cá mập', ipa: '/ʃɑːk/', img: '🦈', ex: 'A shark has very sharp teeth.' },
          { en: 'Octopus', vi: 'Bạch tuộc', ipa: '/ˈɒk.tə.pəs/', img: '🐙', ex: 'An octopus has eight arms.' },
          { en: 'Whale', vi: 'Cá voi', ipa: '/weɪl/', img: '🐋', ex: 'The whale is the largest animal in the sea.' },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Food',
    icon: '🍎',
    subGroups: [
      {
        id: 'food.fruits',
        title: 'Fruits',
        icon: '🍎',
        mode: 'memory',
        words: [
          { en: 'Apple', vi: 'Quả táo', ipa: '/ˈæp.əl/', img: '🍎', ex: 'An apple a day keeps the doctor away.' },
          { en: 'Banana', vi: 'Quả chuối', ipa: '/bəˈnɑː.nə/', img: '🍌', ex: 'Monkeys love eating bananas.' },
          { en: 'Orange', vi: 'Quả cam', ipa: '/ˈɒr.ɪndʒ/', img: '🍊', ex: 'Oranges are full of vitamin C.' },
          { en: 'Grape', vi: 'Quả nho', ipa: '/ɡreɪp/', img: '🍇', ex: 'I bought a bunch of grapes.' },
        ],
      },
      {
        id: 'food.drinks',
        title: 'Drinks',
        icon: '🥤',
        mode: 'listening',
        words: [
          { en: 'Milk', vi: 'Sữa', ipa: '/mɪlk/', img: '🥛', ex: 'Drinking milk is good for your bones.' },
          { en: 'Water', vi: 'Nước', ipa: '/ˈwɔː.tər/', img: '💧', ex: 'Please give me a glass of water.' },
          { en: 'Coffee', vi: 'Cà phê', ipa: '/ˈkɒf.i/', img: '☕', ex: 'I drink coffee every morning.' },
          { en: 'Juice', vi: 'Nước ép', ipa: '/dʒuːs/', img: '🧃', ex: 'I love fresh orange juice.' },
        ],
      },
      {
        id: 'food.meals',
        title: 'Meals',
        icon: '🍽️',
        mode: 'quiz',
        words: [
          { en: 'Bread', vi: 'Bánh mì', ipa: '/bred/', img: '🍞', ex: 'I eat bread for breakfast.' },
          { en: 'Rice', vi: 'Cơm/Gạo', ipa: '/raɪs/', img: '🍚', ex: 'Rice is a staple food in Vietnam.' },
          { en: 'Pizza', vi: 'Bánh pizza', ipa: '/ˈpiːt.sə/', img: '🍕', ex: "Let's order a large pizza for dinner." },
          { en: 'Noodle', vi: 'Mì', ipa: '/ˈnuː.dəl/', img: '🍜', ex: 'I want a bowl of hot noodles.' },
        ],
      },
      {
        id: 'food.snacks',
        title: 'Snacks',
        icon: '🍫',
        mode: 'typing',
        words: [
          { en: 'Cheese', vi: 'Phô mai', ipa: '/tʃiːz/', img: '🧀', ex: 'I love extra cheese on my pizza.' },
          { en: 'Chocolate', vi: 'Sô-cô-la', ipa: '/ˈtʃɒk.lət/', img: '🍫', ex: 'Dark chocolate is my favorite snack.' },
          { en: 'Cookie', vi: 'Bánh quy', ipa: '/ˈkʊk.i/', img: '🍪', ex: 'She baked some chocolate cookies.' },
          { en: 'Candy', vi: 'Kẹo', ipa: '/ˈkæn.di/', img: '🍬', ex: "Don't eat too much candy." },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Travel',
    icon: '✈️',
    subGroups: [
      {
        id: 'travel.transport',
        title: 'Transport',
        icon: '🚌',
        mode: 'quiz',
        words: [
          { en: 'Airplane', vi: 'Máy bay', ipa: '/ˈeə.pleɪn/', img: '✈️', ex: 'The airplane is flying high.' },
          { en: 'Train', vi: 'Tàu hỏa', ipa: '/treɪn/', img: '🚆', ex: 'The train leaves at 8 AM.' },
          { en: 'Bus', vi: 'Xe buýt', ipa: '/bʌs/', img: '🚌', ex: 'I take the bus to school.' },
          { en: 'Taxi', vi: 'Xe taxi', ipa: '/ˈtæk.si/', img: '🚕', ex: "Let's call a taxi." },
        ],
      },
      {
        id: 'travel.places',
        title: 'Places',
        icon: '🏖️',
        mode: 'matching',
        words: [
          { en: 'Beach', vi: 'Bãi biển', ipa: '/biːtʃ/', img: '🏖️', ex: 'We spent the whole day at the beach.' },
          { en: 'Mountain', vi: 'Núi', ipa: '/ˈmaʊn.tɪn/', img: '⛰️', ex: 'The mountain is covered in snow.' },
          { en: 'City', vi: 'Thành phố', ipa: '/ˈsɪt.i/', img: '🏙️', ex: 'New York is a huge city.' },
          { en: 'Hotel', vi: 'Khách sạn', ipa: '/həʊˈtel/', img: '🏨', ex: 'We stayed at a very comfortable hotel.' },
        ],
      },
      {
        id: 'travel.docs',
        title: 'Documents & Bags',
        icon: '🛂',
        mode: 'typing',
        words: [
          { en: 'Passport', vi: 'Hộ chiếu', ipa: '/ˈpɑːs.pɔːt/', img: '🛂', ex: "Don't forget your passport!" },
          { en: 'Ticket', vi: 'Vé', ipa: '/ˈtɪk.ɪt/', img: '🎫', ex: 'I bought two tickets for the show.' },
          { en: 'Map', vi: 'Bản đồ', ipa: '/mæp/', img: '🗺️', ex: 'Can you show me our location on the map?' },
          { en: 'Suitcase', vi: 'Va li', ipa: '/ˈsuːt.keɪs/', img: '🧳', ex: 'I am packing my suitcase for the trip.' },
        ],
      },
      {
        id: 'travel.activities',
        title: 'Activities',
        icon: '🏊',
        mode: 'listening',
        words: [
          { en: 'Swim', vi: 'Bơi', ipa: '/swɪm/', img: '🏊', ex: 'I love to swim in the ocean.' },
          { en: 'Hike', vi: 'Đi bộ đường dài', ipa: '/haɪk/', img: '🥾', ex: "Let's hike up the mountain." },
          { en: 'Tour', vi: 'Tham quan', ipa: '/tʊər/', img: '🚶', ex: 'We took a city tour yesterday.' },
          { en: 'Relax', vi: 'Thư giãn', ipa: '/rɪˈlæks/', img: '🌴', ex: 'I just want to relax on the beach.' },
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'Family',
    icon: '👨‍👩‍👧',
    subGroups: [
      {
        id: 'family.nuclear',
        title: 'Nuclear Family',
        icon: '👨‍👩‍👧',
        mode: 'quiz',
        words: [
          { en: 'Father', vi: 'Bố', ipa: '/ˈfɑː.ðər/', img: '👨', ex: 'My father is a teacher.' },
          { en: 'Mother', vi: 'Mẹ', ipa: '/ˈmʌð.ər/', img: '👩', ex: 'My mother cooks delicious food.' },
          { en: 'Brother', vi: 'Anh/Em trai', ipa: '/ˈbrʌð.ər/', img: '👦', ex: 'My brother likes playing football.' },
          { en: 'Sister', vi: 'Chị/Em gái', ipa: '/ˈsɪs.tər/', img: '👧', ex: 'I have one younger sister.' },
        ],
      },
      {
        id: 'family.extended',
        title: 'Extended Family',
        icon: '👴',
        mode: 'memory',
        words: [
          { en: 'Grandfather', vi: 'Ông', ipa: '/ˈɡræn.fɑː.ðər/', img: '👴', ex: 'My grandfather tells me stories.' },
          { en: 'Grandmother', vi: 'Bà', ipa: '/ˈɡræn.mʌð.ər/', img: '👵', ex: 'My grandmother is very kind.' },
          { en: 'Uncle', vi: 'Chú/Bác', ipa: '/ˈʌŋ.kəl/', img: '👨‍🦳', ex: 'My uncle lives in another city.' },
          { en: 'Aunt', vi: 'Cô/Dì', ipa: '/ɑːnt/', img: '👩‍🦳', ex: 'My aunt brought us gifts.' },
        ],
      },
      {
        id: 'family.roles',
        title: 'Family Roles',
        icon: '👶',
        mode: 'listening',
        words: [
          { en: 'Son', vi: 'Con trai', ipa: '/sʌn/', img: '👦', ex: 'They have one son and two daughters.' },
          { en: 'Daughter', vi: 'Con gái', ipa: '/ˈdɔː.tər/', img: '👧', ex: 'My daughter is in kindergarten.' },
          { en: 'Cousin', vi: 'Anh chị em họ', ipa: '/ˈkʌz.ən/', img: '🧒', ex: 'I play with my cousin every weekend.' },
          { en: 'Baby', vi: 'Em bé', ipa: '/ˈbeɪ.bi/', img: '👶', ex: 'The baby is sleeping quietly.' },
        ],
      },
    ],
  },
  {
    id: 5,
    title: 'Weather',
    icon: '☀️',
    subGroups: [
      {
        id: 'weather.sky',
        title: 'Sky',
        icon: '☀️',
        mode: 'quiz',
        words: [
          { en: 'Sun', vi: 'Mặt trời', ipa: '/sʌn/', img: '☀️', ex: 'The sun is shining brightly.' },
          { en: 'Cloud', vi: 'Mây', ipa: '/klaʊd/', img: '☁️', ex: 'There are white clouds in the sky.' },
          { en: 'Rainbow', vi: 'Cầu vồng', ipa: '/ˈreɪn.bəʊ/', img: '🌈', ex: 'A rainbow appeared after the rain.' },
          { en: 'Moon', vi: 'Mặt trăng', ipa: '/muːn/', img: '🌙', ex: 'The moon is full tonight.' },
        ],
      },
      {
        id: 'weather.wet',
        title: 'Wet & Cold',
        icon: '🌧️',
        mode: 'matching',
        words: [
          { en: 'Rain', vi: 'Mưa', ipa: '/reɪn/', img: '🌧️', ex: 'I like the sound of rain.' },
          { en: 'Snow', vi: 'Tuyết', ipa: '/snəʊ/', img: '❄️', ex: 'It rarely snows in Vietnam.' },
          { en: 'Fog', vi: 'Sương mù', ipa: '/fɒɡ/', img: '🌫️', ex: 'The fog made it hard to drive.' },
          { en: 'Ice', vi: 'Băng', ipa: '/aɪs/', img: '🧊', ex: 'There is ice on the road.' },
        ],
      },
      {
        id: 'weather.extreme',
        title: 'Extreme Weather',
        icon: '⛈️',
        mode: 'listening',
        words: [
          { en: 'Storm', vi: 'Bão', ipa: '/stɔːm/', img: '⛈️', ex: 'A big storm is coming tonight.' },
          { en: 'Thunder', vi: 'Sấm', ipa: '/ˈθʌn.dər/', img: '🌩️', ex: 'The thunder scared the dog.' },
          { en: 'Lightning', vi: 'Sét', ipa: '/ˈlaɪt.nɪŋ/', img: '⚡', ex: 'Lightning lit up the sky.' },
          { en: 'Tornado', vi: 'Lốc xoáy', ipa: '/tɔːˈneɪ.dəʊ/', img: '🌪️', ex: 'A tornado destroyed several houses.' },
        ],
      },
      {
        id: 'weather.temperature',
        title: 'Temperature',
        icon: '🌡️',
        mode: 'hangman',
        words: [
          { en: 'Hot', vi: 'Nóng', ipa: '/hɒt/', img: '🥵', ex: "It's hot today, drink more water." },
          { en: 'Cold', vi: 'Lạnh', ipa: '/kəʊld/', img: '🥶', ex: 'Wear a coat, it is very cold.' },
          { en: 'Warm', vi: 'Ấm áp', ipa: '/wɔːm/', img: '🌤️', ex: 'Spring has warm weather.' },
          { en: 'Cool', vi: 'Mát mẻ', ipa: '/kuːl/', img: '🍃', ex: 'A cool breeze blew through the window.' },
        ],
      },
    ],
  },
];

export const ALL_WORDS: Word[] = CATEGORIES.flatMap((c) =>
  c.subGroups.flatMap((sg) => sg.words)
);

export const TOTAL_SUBGROUPS = CATEGORIES.reduce(
  (n, c) => n + c.subGroups.length,
  0
);

export function findSubGroup(id: string): { category: Category; subGroup: SubGroup } | null {
  for (const category of CATEGORIES) {
    const subGroup = category.subGroups.find((sg) => sg.id === id);
    if (subGroup) return { category, subGroup };
  }
  return null;
}

export function nextSubGroupId(currentId: string): string | null {
  for (const category of CATEGORIES) {
    const idx = category.subGroups.findIndex((sg) => sg.id === currentId);
    if (idx !== -1) {
      return category.subGroups[idx + 1]?.id ?? null;
    }
  }
  return null;
}
