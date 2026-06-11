export type Word = {
  en: string;
  vi: string;
  ipa: string;
  img: string;
  ex: string;
};

export type TestMode = 'quiz' | 'matching' | 'listening' | 'typing' | 'memory' | 'hangman' | 'shadow';

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
          { en: 'Bird', vi: 'Con chim', ipa: '/bɜːd/', img: '🐦', ex: 'The bird is singing in the tree.' },
          { en: 'Goldfish', vi: 'Cá vàng', ipa: '/ˈɡəʊld.fɪʃ/', img: '🐠', ex: 'I have a goldfish in a bowl.' },
          { en: 'Parrot', vi: 'Con vẹt', ipa: '/ˈpær.ət/', img: '🦜', ex: 'The parrot can speak some words.' },
          { en: 'Turtle', vi: 'Con rùa', ipa: '/ˈtɜː.təl/', img: '🐢', ex: 'My turtle moves very slowly.' },
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
          { en: 'Tiger', vi: 'Con hổ', ipa: '/ˈtaɪ.ɡər/', img: '🐯', ex: 'The tiger has orange and black stripes.' },
          { en: 'Bear', vi: 'Con gấu', ipa: '/beər/', img: '🐻', ex: 'The bear is sleeping in the cave.' },
          { en: 'Zebra', vi: 'Ngựa vằn', ipa: '/ˈzeb.rə/', img: '🦓', ex: 'A zebra has black and white stripes.' },
          { en: 'Fox', vi: 'Con cáo', ipa: '/fɒks/', img: '🦊', ex: 'The fox runs very fast.' },
        ],
      },
      {
        id: 'animals.insects',
        title: 'Insects',
        icon: '🐝',
        mode: 'shadow',
        words: [
          { en: 'Ant', vi: 'Con kiến', ipa: '/ænt/', img: '🐜', ex: 'The ant is carrying a leaf.' },
          { en: 'Bee', vi: 'Con ong', ipa: '/biː/', img: '🐝', ex: 'Bees make honey.' },
          { en: 'Butterfly', vi: 'Bươm bướm', ipa: '/ˈbʌt.ə.flaɪ/', img: '🦋', ex: 'The butterfly has colorful wings.' },
          { en: 'Spider', vi: 'Con nhện', ipa: '/ˈspaɪ.dər/', img: '🕷️', ex: 'A spider is spinning a web.' },
          { en: 'Mosquito', vi: 'Con muỗi', ipa: '/məˈskiː.təʊ/', img: '🦟', ex: 'A mosquito bit me last night.' },
          { en: 'Fly', vi: 'Con ruồi', ipa: '/flaɪ/', img: '🪰', ex: 'A fly is buzzing around the food.' },
          { en: 'Ladybug', vi: 'Bọ rùa', ipa: '/ˈleɪ.di.bʌɡ/', img: '🐞', ex: 'A red ladybug landed on my hand.' },
          { en: 'Cricket', vi: 'Con dế', ipa: '/ˈkrɪk.ɪt/', img: '🦗', ex: 'Crickets sing at night.' },
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
          { en: 'Crab', vi: 'Con cua', ipa: '/kræb/', img: '🦀', ex: 'A crab walks sideways on the sand.' },
          { en: 'Jellyfish', vi: 'Con sứa', ipa: '/ˈdʒel.i.fɪʃ/', img: '🪼', ex: 'Be careful, a jellyfish can sting you.' },
          { en: 'Penguin', vi: 'Chim cánh cụt', ipa: '/ˈpeŋ.ɡwɪn/', img: '🐧', ex: 'Penguins live in very cold places.' },
          { en: 'Seal', vi: 'Hải cẩu', ipa: '/siːl/', img: '🦭', ex: 'The seal is swimming near the rocks.' },
        ],
      },
      {
        id: 'animals.fish',
        title: 'Fish',
        icon: '🐠',
        mode: 'quiz',
        words: [
          { en: 'Salmon', vi: 'Cá hồi', ipa: '/ˈsæm.ən/', img: '🐟', ex: 'Salmon is pink and tasty.' },
          { en: 'Tuna', vi: 'Cá ngừ', ipa: '/ˈtjuː.nə/', img: '🐟', ex: 'Tuna is often used in sandwiches.' },
          { en: 'Sardine', vi: 'Cá mòi', ipa: '/sɑːˈdiːn/', img: '🐟', ex: 'Sardines come in small cans.' },
          { en: 'Pufferfish', vi: 'Cá nóc', ipa: '/ˈpʌf.ə.fɪʃ/', img: '🐡', ex: 'A pufferfish can blow up like a ball.' },
          { en: 'Clownfish', vi: 'Cá hề', ipa: '/ˈklaʊn.fɪʃ/', img: '🐠', ex: 'A clownfish has orange and white stripes.' },
          { en: 'Stingray', vi: 'Cá đuối', ipa: '/ˈstɪŋ.reɪ/', img: '🐟', ex: 'A stingray glides through the water.' },
          { en: 'Eel', vi: 'Lươn', ipa: '/iːl/', img: '🐍', ex: 'An eel looks like a long snake.' },
        ],
      },
      {
        id: 'animals.shellfish',
        title: 'Shellfish',
        icon: '🦐',
        mode: 'matching',
        words: [
          { en: 'Shrimp', vi: 'Tôm', ipa: '/ʃrɪmp/', img: '🦐', ex: 'I love grilled shrimp with garlic.' },
          { en: 'Lobster', vi: 'Tôm hùm', ipa: '/ˈlɒb.stər/', img: '🦞', ex: 'Lobster is a fancy seafood.' },
          { en: 'Oyster', vi: 'Hàu', ipa: '/ˈɔɪ.stər/', img: '🦪', ex: 'Oysters can hide pearls inside.' },
          { en: 'Squid', vi: 'Mực', ipa: '/skwɪd/', img: '🦑', ex: 'Squid is popular in seafood dishes.' },
          { en: 'Cuttlefish', vi: 'Mực nang', ipa: '/ˈkʌt.əl.fɪʃ/', img: '🦑', ex: 'A cuttlefish can change its color.' },
          { en: 'Starfish', vi: 'Sao biển', ipa: '/ˈstɑː.fɪʃ/', img: '⭐', ex: 'A starfish has five arms.' },
          { en: 'Sea snail', vi: 'Ốc biển', ipa: '/siː sneɪl/', img: '🐌', ex: 'A sea snail moves very slowly.' },
        ],
      },
      {
        id: 'animals.marine',
        title: 'Marine Life',
        icon: '🪸',
        mode: 'listening',
        words: [
          { en: 'Walrus', vi: 'Hải mã', ipa: '/ˈwɔːl.rəs/', img: '🦭', ex: 'A walrus has two long tusks.' },
          { en: 'Sea lion', vi: 'Sư tử biển', ipa: '/siː ˈlaɪ.ən/', img: '🦭', ex: 'Sea lions bark like dogs.' },
          { en: 'Sea horse', vi: 'Cá ngựa', ipa: '/siː hɔːs/', img: '🐟', ex: 'A sea horse is a tiny fish.' },
          { en: 'Coral', vi: 'San hô', ipa: '/ˈkɒr.əl/', img: '🪸', ex: 'Coral reefs are full of bright colors.' },
          { en: 'Sea anemone', vi: 'Hải quỳ', ipa: '/siː əˈnem.ə.ni/', img: '🌺', ex: 'A sea anemone has soft tentacles.' },
          { en: 'Killer whale', vi: 'Cá voi sát thủ', ipa: '/ˌkɪl.ə ˈweɪl/', img: '🐋', ex: 'A killer whale is also called an orca.' },
        ],
      },
      {
        id: 'animals.forest',
        title: 'Forest Animals',
        icon: '🐺',
        mode: 'quiz',
        words: [
          { en: 'Wolf', vi: 'Sói', ipa: '/wʊlf/', img: '🐺', ex: 'A wolf howls at the moon.' },
          { en: 'Deer', vi: 'Hươu', ipa: '/dɪər/', img: '🦌', ex: 'The deer ran into the forest.' },
          { en: 'Squirrel', vi: 'Sóc', ipa: '/ˈskwɪr.əl/', img: '🐿️', ex: 'A squirrel is eating a nut.' },
          { en: 'Hedgehog', vi: 'Nhím', ipa: '/ˈhedʒ.hɒɡ/', img: '🦔', ex: 'A hedgehog has many spines.' },
          { en: 'Bat', vi: 'Dơi', ipa: '/bæt/', img: '🦇', ex: 'Bats sleep upside down.' },
          { en: 'Wild boar', vi: 'Lợn rừng', ipa: '/waɪld bɔːr/', img: '🐗', ex: 'A wild boar lives in the forest.' },
          { en: 'Otter', vi: 'Rái cá', ipa: '/ˈɒt.ər/', img: '🦦', ex: 'Otters love to swim and play.' },
        ],
      },
      {
        id: 'animals.exotic',
        title: 'Exotic Animals',
        icon: '🐼',
        mode: 'matching',
        words: [
          { en: 'Panda', vi: 'Gấu trúc', ipa: '/ˈpæn.də/', img: '🐼', ex: 'Pandas love to eat bamboo.' },
          { en: 'Koala', vi: 'Gấu túi', ipa: '/kəʊˈɑː.lə/', img: '🐨', ex: 'Koalas sleep in eucalyptus trees.' },
          { en: 'Kangaroo', vi: 'Chuột túi', ipa: '/ˌkæŋ.ɡəˈruː/', img: '🦘', ex: 'A kangaroo can jump very high.' },
          { en: 'Sloth', vi: 'Con lười', ipa: '/sləʊθ/', img: '🦥', ex: 'A sloth moves very slowly.' },
          { en: 'Skunk', vi: 'Chồn hôi', ipa: '/skʌŋk/', img: '🦨', ex: 'A skunk has a very bad smell.' },
          { en: 'Raccoon', vi: 'Gấu mèo', ipa: '/rəˈkuːn/', img: '🦝', ex: 'A raccoon looks like a small bandit.' },
          { en: 'Camel', vi: 'Lạc đà', ipa: '/ˈkæm.əl/', img: '🐪', ex: 'A camel can walk far in the desert.' },
        ],
      },
      {
        id: 'animals.reptiles',
        title: 'Reptiles & Giants',
        icon: '🐊',
        mode: 'listening',
        words: [
          { en: 'Crocodile', vi: 'Cá sấu', ipa: '/ˈkrɒk.ə.daɪl/', img: '🐊', ex: 'The crocodile has a long mouth.' },
          { en: 'Snake', vi: 'Rắn', ipa: '/sneɪk/', img: '🐍', ex: 'A snake has no legs.' },
          { en: 'Lizard', vi: 'Thằn lằn', ipa: '/ˈlɪz.əd/', img: '🦎', ex: 'A lizard climbs on the wall.' },
          { en: 'Rhinoceros', vi: 'Tê giác', ipa: '/raɪˈnɒs.ər.əs/', img: '🦏', ex: 'A rhinoceros has a big horn.' },
          { en: 'Hippopotamus', vi: 'Hà mã', ipa: '/ˌhɪp.əˈpɒt.ə.məs/', img: '🦛', ex: 'A hippopotamus loves the water.' },
          { en: 'Buffalo', vi: 'Trâu', ipa: '/ˈbʌf.ə.ləʊ/', img: '🐃', ex: 'The buffalo helps farmers in the fields.' },
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
        mode: 'shadow',
        words: [
          { en: 'Apple', vi: 'Quả táo', ipa: '/ˈæp.əl/', img: '🍎', ex: 'An apple a day keeps the doctor away.' },
          { en: 'Banana', vi: 'Quả chuối', ipa: '/bəˈnɑː.nə/', img: '🍌', ex: 'Monkeys love eating bananas.' },
          { en: 'Orange', vi: 'Quả cam', ipa: '/ˈɒr.ɪndʒ/', img: '🍊', ex: 'Oranges are full of vitamin C.' },
          { en: 'Grape', vi: 'Quả nho', ipa: '/ɡreɪp/', img: '🍇', ex: 'I bought a bunch of grapes.' },
          { en: 'Strawberry', vi: 'Quả dâu tây', ipa: '/ˈstrɔː.bər.i/', img: '🍓', ex: 'I put strawberries on my yogurt.' },
          { en: 'Watermelon', vi: 'Quả dưa hấu', ipa: '/ˈwɔː.təˌmel.ən/', img: '🍉', ex: 'Watermelon is sweet and juicy.' },
          { en: 'Pineapple', vi: 'Quả dứa', ipa: '/ˈpaɪnˌæp.əl/', img: '🍍', ex: 'Pineapple tastes sweet and sour.' },
          { en: 'Mango', vi: 'Quả xoài', ipa: '/ˈmæŋ.ɡəʊ/', img: '🥭', ex: 'Vietnamese mangoes are very delicious.' },
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
          { en: 'Tea', vi: 'Trà', ipa: '/tiː/', img: '🍵', ex: 'My grandfather drinks tea every afternoon.' },
          { en: 'Soda', vi: 'Nước ngọt', ipa: '/ˈsəʊ.də/', img: '🥤', ex: "Don't drink too much soda." },
          { en: 'Lemonade', vi: 'Nước chanh', ipa: '/ˌlem.əˈneɪd/', img: '🍋', ex: 'A cold lemonade is perfect in summer.' },
          { en: 'Smoothie', vi: 'Sinh tố', ipa: '/ˈsmuː.ði/', img: '🍹', ex: 'I made a banana smoothie this morning.' },
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
          { en: 'Soup', vi: 'Súp', ipa: '/suːp/', img: '🍲', ex: 'My mom cooks chicken soup when I am sick.' },
          { en: 'Salad', vi: 'Sa lát', ipa: '/ˈsæl.əd/', img: '🥗', ex: 'I eat a fresh salad for lunch.' },
          { en: 'Sandwich', vi: 'Bánh mì kẹp', ipa: '/ˈsæn.wɪdʒ/', img: '🥪', ex: 'I made a ham sandwich for school.' },
          { en: 'Egg', vi: 'Quả trứng', ipa: '/eɡ/', img: '🥚', ex: 'I eat a boiled egg every morning.' },
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
          { en: 'Ice cream', vi: 'Kem', ipa: '/ˌaɪs ˈkriːm/', img: '🍦', ex: 'I want a chocolate ice cream cone.' },
          { en: 'Cake', vi: 'Bánh ngọt', ipa: '/keɪk/', img: '🍰', ex: 'My mom baked a birthday cake.' },
          { en: 'Donut', vi: 'Bánh donut', ipa: '/ˈdəʊ.nʌt/', img: '🍩', ex: 'I had a donut with my coffee.' },
          { en: 'Popcorn', vi: 'Bỏng ngô', ipa: '/ˈpɒp.kɔːn/', img: '🍿', ex: 'We eat popcorn at the cinema.' },
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
  {
    id: 6,
    title: 'Colors',
    icon: '🎨',
    subGroups: [
      {
        id: 'colors.basic',
        title: 'Basic Colors',
        icon: '🎨',
        mode: 'quiz',
        words: [
          { en: 'Red', vi: 'Màu đỏ', ipa: '/red/', img: '🔴', ex: 'The apple is red.' },
          { en: 'Blue', vi: 'Màu xanh dương', ipa: '/bluː/', img: '🔵', ex: 'The sky is blue today.' },
          { en: 'Yellow', vi: 'Màu vàng', ipa: '/ˈjel.əʊ/', img: '🟡', ex: 'The sun looks yellow.' },
          { en: 'Green', vi: 'Màu xanh lá', ipa: '/ɡriːn/', img: '🟢', ex: 'The leaves are green in summer.' },
          { en: 'Black', vi: 'Màu đen', ipa: '/blæk/', img: '⚫', ex: 'She wore a black dress.' },
          { en: 'White', vi: 'Màu trắng', ipa: '/waɪt/', img: '⚪', ex: 'Snow is white and cold.' },
          { en: 'Pink', vi: 'Màu hồng', ipa: '/pɪŋk/', img: '🩷', ex: 'My sister loves pink flowers.' },
          { en: 'Orange', vi: 'Màu cam', ipa: '/ˈɒr.ɪndʒ/', img: '🟠', ex: 'The pumpkin is orange.' },
        ],
      },
      {
        id: 'colors.nature',
        title: 'Nature Colors',
        icon: '🟫',
        mode: 'matching',
        words: [
          { en: 'Brown', vi: 'Màu nâu', ipa: '/braʊn/', img: '🟫', ex: 'The bear has brown fur.' },
          { en: 'Purple', vi: 'Màu tím', ipa: '/ˈpɜː.pəl/', img: '🟣', ex: 'Grapes are usually purple.' },
          { en: 'Gray', vi: 'Màu xám', ipa: '/ɡreɪ/', img: '🩶', ex: 'The clouds are gray before the rain.' },
          { en: 'Gold', vi: 'Màu vàng kim', ipa: '/ɡəʊld/', img: '🟨', ex: 'She has a gold ring.' },
          { en: 'Silver', vi: 'Màu bạc', ipa: '/ˈsɪl.vər/', img: '🥈', ex: 'The spoon is made of silver.' },
          { en: 'Beige', vi: 'Màu be', ipa: '/beɪʒ/', img: '🟤', ex: 'My bag is beige.' },
        ],
      },
      {
        id: 'colors.shades',
        title: 'Shades',
        icon: '🌈',
        mode: 'listening',
        words: [
          { en: 'Light', vi: 'Nhạt/Sáng', ipa: '/laɪt/', img: '💡', ex: 'I like the light blue color.' },
          { en: 'Dark', vi: 'Đậm/Tối', ipa: '/dɑːk/', img: '🌑', ex: 'He is wearing a dark green shirt.' },
          { en: 'Bright', vi: 'Rực rỡ', ipa: '/braɪt/', img: '✨', ex: 'The flower has a bright color.' },
          { en: 'Pale', vi: 'Nhợt nhạt', ipa: '/peɪl/', img: '🌸', ex: 'Her face looks pale today.' },
        ],
      },
      {
        id: 'colors.fun',
        title: 'Fun Colors',
        icon: '✨',
        mode: 'shadow',
        words: [
          { en: 'Rainbow', vi: 'Cầu vồng', ipa: '/ˈreɪn.bəʊ/', img: '🌈', ex: 'A rainbow has seven colors.' },
          { en: 'Colorful', vi: 'Nhiều màu', ipa: '/ˈkʌl.ə.fəl/', img: '🎨', ex: 'The garden is very colorful.' },
          { en: 'Shiny', vi: 'Sáng bóng', ipa: '/ˈʃaɪ.ni/', img: '⭐', ex: 'I have a shiny new bicycle.' },
          { en: 'Sparkle', vi: 'Lấp lánh', ipa: '/ˈspɑː.kəl/', img: '💎', ex: 'The diamond sparkles in the light.' },
        ],
      },
    ],
  },
  {
    id: 7,
    title: 'Shapes',
    icon: '🔷',
    subGroups: [
      {
        id: 'shapes.basic',
        title: 'Basic Shapes',
        icon: '🔵',
        mode: 'quiz',
        words: [
          { en: 'Circle', vi: 'Hình tròn', ipa: '/ˈsɜː.kəl/', img: '⭕', ex: 'The clock has a circle shape.' },
          { en: 'Square', vi: 'Hình vuông', ipa: '/skweər/', img: '🟦', ex: 'A chessboard has many squares.' },
          { en: 'Triangle', vi: 'Hình tam giác', ipa: '/ˈtraɪ.æŋ.ɡəl/', img: '🔺', ex: 'A triangle has three sides.' },
          { en: 'Rectangle', vi: 'Hình chữ nhật', ipa: '/ˈrek.tæŋ.ɡəl/', img: '▭', ex: 'The door is a rectangle.' },
          { en: 'Oval', vi: 'Hình bầu dục', ipa: '/ˈəʊ.vəl/', img: '🥚', ex: 'An egg has an oval shape.' },
          { en: 'Diamond', vi: 'Hình thoi', ipa: '/ˈdaɪ.mənd/', img: '🔶', ex: 'A kite often has a diamond shape.' },
        ],
      },
      {
        id: 'shapes.3d',
        title: '3D Shapes',
        icon: '🧊',
        mode: 'matching',
        words: [
          { en: 'Cube', vi: 'Khối lập phương', ipa: '/kjuːb/', img: '🧊', ex: 'A dice is a cube.' },
          { en: 'Sphere', vi: 'Hình cầu', ipa: '/sfɪər/', img: '🔮', ex: 'The Earth is a sphere.' },
          { en: 'Cylinder', vi: 'Hình trụ', ipa: '/ˈsɪl.ɪn.dər/', img: '🥫', ex: 'A can of soda is a cylinder.' },
          { en: 'Cone', vi: 'Hình nón', ipa: '/kəʊn/', img: '🍦', ex: 'An ice cream cone is a cone.' },
          { en: 'Pyramid', vi: 'Hình chóp', ipa: '/ˈpɪr.ə.mɪd/', img: '🔺', ex: 'The pyramids in Egypt are very old.' },
        ],
      },
      {
        id: 'shapes.special',
        title: 'Special Shapes',
        icon: '⭐',
        mode: 'listening',
        words: [
          { en: 'Star', vi: 'Ngôi sao', ipa: '/stɑːr/', img: '⭐', ex: 'I drew a star on my notebook.' },
          { en: 'Heart', vi: 'Trái tim', ipa: '/hɑːt/', img: '❤️', ex: 'The card has a heart on it.' },
          { en: 'Arrow', vi: 'Mũi tên', ipa: '/ˈær.əʊ/', img: '➡️', ex: 'Follow the arrow to the exit.' },
          { en: 'Crescent', vi: 'Hình lưỡi liềm', ipa: '/ˈkres.ənt/', img: '🌙', ex: 'The crescent moon is in the sky.' },
        ],
      },
      {
        id: 'shapes.lines',
        title: 'Lines & Patterns',
        icon: '➖',
        mode: 'typing',
        words: [
          { en: 'Line', vi: 'Đường thẳng', ipa: '/laɪn/', img: '➖', ex: 'Draw a straight line on the page.' },
          { en: 'Curve', vi: 'Đường cong', ipa: '/kɜːv/', img: '〰️', ex: 'The road has a sharp curve.' },
          { en: 'Dot', vi: 'Dấu chấm', ipa: '/dɒt/', img: '•', ex: 'Put a dot at the end of the sentence.' },
          { en: 'Spiral', vi: 'Hình xoắn ốc', ipa: '/ˈspaɪə.rəl/', img: '🌀', ex: 'A snail shell has a spiral shape.' },
        ],
      },
    ],
  },
  {
    id: 8,
    title: 'Jobs',
    icon: '👔',
    subGroups: [
      {
        id: 'jobs.common',
        title: 'Common Jobs',
        icon: '👨‍🏫',
        mode: 'quiz',
        words: [
          { en: 'Teacher', vi: 'Giáo viên', ipa: '/ˈtiː.tʃər/', img: '👨‍🏫', ex: 'My teacher is very kind.' },
          { en: 'Doctor', vi: 'Bác sĩ', ipa: '/ˈdɒk.tər/', img: '👨‍⚕️', ex: 'The doctor helps sick people.' },
          { en: 'Nurse', vi: 'Y tá', ipa: '/nɜːs/', img: '👩‍⚕️', ex: 'A nurse takes care of patients.' },
          { en: 'Police', vi: 'Cảnh sát', ipa: '/pəˈliːs/', img: '👮', ex: 'The police keep us safe.' },
          { en: 'Firefighter', vi: 'Lính cứu hỏa', ipa: '/ˈfaɪəˌfaɪ.tər/', img: '👨‍🚒', ex: 'Firefighters are very brave.' },
          { en: 'Soldier', vi: 'Người lính', ipa: '/ˈsəʊl.dʒər/', img: '💂', ex: 'A soldier protects the country.' },
        ],
      },
      {
        id: 'jobs.service',
        title: 'Service Jobs',
        icon: '👨‍🍳',
        mode: 'matching',
        words: [
          { en: 'Chef', vi: 'Đầu bếp', ipa: '/ʃef/', img: '👨‍🍳', ex: 'The chef cooks delicious food.' },
          { en: 'Waiter', vi: 'Bồi bàn', ipa: '/ˈweɪ.tər/', img: '🤵', ex: 'The waiter brought us the menu.' },
          { en: 'Driver', vi: 'Tài xế', ipa: '/ˈdraɪ.vər/', img: '🚕', ex: 'My uncle is a taxi driver.' },
          { en: 'Farmer', vi: 'Nông dân', ipa: '/ˈfɑː.mər/', img: '👨‍🌾', ex: 'The farmer grows rice.' },
          { en: 'Pilot', vi: 'Phi công', ipa: '/ˈpaɪ.lət/', img: '👨‍✈️', ex: 'The pilot flies the airplane.' },
          { en: 'Mechanic', vi: 'Thợ máy', ipa: '/məˈkæn.ɪk/', img: '👨‍🔧', ex: 'The mechanic fixed my bike.' },
        ],
      },
      {
        id: 'jobs.creative',
        title: 'Creative & Tech',
        icon: '🎨',
        mode: 'memory',
        words: [
          { en: 'Artist', vi: 'Họa sĩ', ipa: '/ˈɑː.tɪst/', img: '👨‍🎨', ex: 'The artist paints beautiful pictures.' },
          { en: 'Singer', vi: 'Ca sĩ', ipa: '/ˈsɪŋ.ər/', img: '👨‍🎤', ex: 'My favorite singer has a concert.' },
          { en: 'Engineer', vi: 'Kỹ sư', ipa: '/ˌen.dʒɪˈnɪər/', img: '👷', ex: 'An engineer designs bridges.' },
          { en: 'Scientist', vi: 'Nhà khoa học', ipa: '/ˈsaɪ.ən.tɪst/', img: '👨‍🔬', ex: 'A scientist studies nature.' },
        ],
      },
      {
        id: 'jobs.helpers',
        title: 'Helpers',
        icon: '🧑‍🔧',
        mode: 'hangman',
        words: [
          { en: 'Dentist', vi: 'Nha sĩ', ipa: '/ˈden.tɪst/', img: '🦷', ex: 'The dentist cleaned my teeth.' },
          { en: 'Postman', vi: 'Người đưa thư', ipa: '/ˈpəʊst.mən/', img: '📮', ex: 'The postman delivers letters.' },
          { en: 'Cleaner', vi: 'Lao công', ipa: '/ˈkliː.nər/', img: '🧹', ex: 'The cleaner mops the floor.' },
          { en: 'Baker', vi: 'Thợ làm bánh', ipa: '/ˈbeɪ.kər/', img: '🥖', ex: 'The baker makes fresh bread every day.' },
        ],
      },
    ],
  },
  {
    id: 9,
    title: 'Flowers',
    icon: '🌸',
    subGroups: [
      {
        id: 'flowers.common',
        title: 'Common Flowers',
        icon: '🌹',
        mode: 'quiz',
        words: [
          { en: 'Rose', vi: 'Hoa hồng', ipa: '/rəʊz/', img: '🌹', ex: 'He gave her a red rose.' },
          { en: 'Tulip', vi: 'Hoa tulip', ipa: '/ˈtjuː.lɪp/', img: '🌷', ex: 'Tulips grow in many colors.' },
          { en: 'Sunflower', vi: 'Hoa hướng dương', ipa: '/ˈsʌnˌflaʊ.ər/', img: '🌻', ex: 'The sunflower always faces the sun.' },
          { en: 'Daisy', vi: 'Hoa cúc trắng', ipa: '/ˈdeɪ.zi/', img: '🌼', ex: 'I picked a daisy from the field.' },
          { en: 'Lily', vi: 'Hoa loa kèn', ipa: '/ˈlɪl.i/', img: '🪷', ex: 'The white lily smells lovely.' },
          { en: 'Cherry blossom', vi: 'Hoa anh đào', ipa: '/ˈtʃer.i ˈblɒs.əm/', img: '🌸', ex: 'Cherry blossoms bloom in spring.' },
        ],
      },
      {
        id: 'flowers.tropical',
        title: 'Tropical Flowers',
        icon: '🪷',
        mode: 'matching',
        words: [
          { en: 'Lotus', vi: 'Hoa sen', ipa: '/ˈləʊ.təs/', img: '🪷', ex: 'The lotus is the national flower of Vietnam.' },
          { en: 'Orchid', vi: 'Hoa lan', ipa: '/ˈɔː.kɪd/', img: '🌺', ex: 'My mom loves growing orchids.' },
          { en: 'Hibiscus', vi: 'Hoa dâm bụt', ipa: '/hɪˈbɪs.kəs/', img: '🌺', ex: 'A red hibiscus blooms in the garden.' },
          { en: 'Jasmine', vi: 'Hoa nhài', ipa: '/ˈdʒæz.mɪn/', img: '🤍', ex: 'Jasmine flowers have a sweet smell.' },
        ],
      },
      {
        id: 'flowers.garden',
        title: 'Garden Flowers',
        icon: '🌷',
        mode: 'listening',
        words: [
          { en: 'Daffodil', vi: 'Hoa thủy tiên', ipa: '/ˈdæf.ə.dɪl/', img: '🌼', ex: 'Yellow daffodils mark the start of spring.' },
          { en: 'Carnation', vi: 'Hoa cẩm chướng', ipa: '/kɑːˈneɪ.ʃən/', img: '🌷', ex: 'Pink carnations are for Mothers Day.' },
          { en: 'Marigold', vi: 'Hoa cúc vạn thọ', ipa: '/ˈmær.ɪ.ɡəʊld/', img: '🟠', ex: 'Marigolds are bright orange.' },
          { en: 'Violet', vi: 'Hoa violet', ipa: '/ˈvaɪə.lət/', img: '💜', ex: 'A small violet grew by the path.' },
        ],
      },
      {
        id: 'flowers.parts',
        title: 'Flower Parts',
        icon: '🌿',
        mode: 'typing',
        words: [
          { en: 'Petal', vi: 'Cánh hoa', ipa: '/ˈpet.əl/', img: '🌸', ex: 'A petal fell from the rose.' },
          { en: 'Stem', vi: 'Cuống/Thân', ipa: '/stem/', img: '🌱', ex: 'Be careful, the stem has thorns.' },
          { en: 'Leaf', vi: 'Lá', ipa: '/liːf/', img: '🍃', ex: 'The leaf turned yellow in autumn.' },
          { en: 'Bud', vi: 'Nụ hoa', ipa: '/bʌd/', img: '🌿', ex: 'A new bud appeared this morning.' },
        ],
      },
    ],
  },
  {
    id: 10,
    title: 'Vegetables',
    icon: '🥕',
    subGroups: [
      {
        id: 'veggies.leafy',
        title: 'Leafy Greens',
        icon: '🥬',
        mode: 'quiz',
        words: [
          { en: 'Lettuce', vi: 'Xà lách', ipa: '/ˈlet.ɪs/', img: '🥬', ex: 'I put lettuce in my sandwich.' },
          { en: 'Spinach', vi: 'Rau chân vịt', ipa: '/ˈspɪn.ɪtʃ/', img: '🥬', ex: 'Spinach makes you strong.' },
          { en: 'Cabbage', vi: 'Bắp cải', ipa: '/ˈkæb.ɪdʒ/', img: '🥬', ex: 'My mom cooks cabbage soup.' },
          { en: 'Broccoli', vi: 'Bông cải xanh', ipa: '/ˈbrɒk.əl.i/', img: '🥦', ex: 'Broccoli is very healthy.' },
          { en: 'Kale', vi: 'Cải xoăn', ipa: '/keɪl/', img: '🥬', ex: 'Kale is good in smoothies.' },
          { en: 'Celery', vi: 'Cần tây', ipa: '/ˈsel.ər.i/', img: '🥬', ex: 'I like celery with peanut butter.' },
        ],
      },
      {
        id: 'veggies.root',
        title: 'Root Vegetables',
        icon: '🥕',
        mode: 'matching',
        words: [
          { en: 'Carrot', vi: 'Cà rốt', ipa: '/ˈkær.ət/', img: '🥕', ex: 'Rabbits love eating carrots.' },
          { en: 'Potato', vi: 'Khoai tây', ipa: '/pəˈteɪ.təʊ/', img: '🥔', ex: 'I want some french fries from potatoes.' },
          { en: 'Onion', vi: 'Hành tây', ipa: '/ˈʌn.jən/', img: '🧅', ex: 'Onions make me cry when I cut them.' },
          { en: 'Sweet potato', vi: 'Khoai lang', ipa: '/swiːt pəˈteɪ.təʊ/', img: '🍠', ex: 'Sweet potatoes are orange and sweet.' },
          { en: 'Radish', vi: 'Củ cải', ipa: '/ˈræd.ɪʃ/', img: '🌶️', ex: 'A radish tastes a little spicy.' },
          { en: 'Ginger', vi: 'Gừng', ipa: '/ˈdʒɪn.dʒər/', img: '🫚', ex: 'Ginger tea is good when you have a cold.' },
        ],
      },
      {
        id: 'veggies.fruit',
        title: 'Fruit Vegetables',
        icon: '🍅',
        mode: 'listening',
        words: [
          { en: 'Tomato', vi: 'Cà chua', ipa: '/təˈmɑː.təʊ/', img: '🍅', ex: 'I put tomato in my salad.' },
          { en: 'Cucumber', vi: 'Dưa chuột', ipa: '/ˈkjuː.kʌm.bər/', img: '🥒', ex: 'A cucumber is fresh and crunchy.' },
          { en: 'Pepper', vi: 'Ớt chuông', ipa: '/ˈpep.ər/', img: '🫑', ex: 'The green pepper is sweet.' },
          { en: 'Eggplant', vi: 'Cà tím', ipa: '/ˈeɡ.plɑːnt/', img: '🍆', ex: 'My grandma fries eggplant for dinner.' },
          { en: 'Zucchini', vi: 'Bí ngòi', ipa: '/zuˈkiː.ni/', img: '🥒', ex: 'Zucchini looks like a big green cucumber.' },
          { en: 'Chili', vi: 'Ớt cay', ipa: '/ˈtʃɪl.i/', img: '🌶️', ex: 'The red chili is very hot.' },
        ],
      },
      {
        id: 'veggies.others',
        title: 'Other Veggies',
        icon: '🌽',
        mode: 'typing',
        words: [
          { en: 'Corn', vi: 'Ngô', ipa: '/kɔːn/', img: '🌽', ex: 'I love hot corn on the cob.' },
          { en: 'Mushroom', vi: 'Nấm', ipa: '/ˈmʌʃ.ruːm/', img: '🍄', ex: 'There are mushrooms on the pizza.' },
          { en: 'Pumpkin', vi: 'Bí ngô', ipa: '/ˈpʌmp.kɪn/', img: '🎃', ex: 'We carve a pumpkin for Halloween.' },
          { en: 'Garlic', vi: 'Tỏi', ipa: '/ˈɡɑː.lɪk/', img: '🧄', ex: 'Garlic adds flavor to many dishes.' },
          { en: 'Cauliflower', vi: 'Súp lơ', ipa: '/ˈkɒl.ɪˌflaʊ.ər/', img: '🥦', ex: 'Cauliflower is white and bumpy.' },
          { en: 'Bamboo shoot', vi: 'Măng', ipa: '/bæmˈbuː ʃuːt/', img: '🎋', ex: 'Bamboo shoots are crunchy in soup.' },
        ],
      },
      {
        id: 'veggies.beans',
        title: 'Beans & Pods',
        icon: '🫛',
        mode: 'memory',
        words: [
          { en: 'Pea', vi: 'Đậu Hà Lan', ipa: '/piː/', img: '🫛', ex: 'Green peas are small and round.' },
          { en: 'Bean', vi: 'Đậu', ipa: '/biːn/', img: '🫘', ex: 'Beans are full of protein.' },
          { en: 'Green bean', vi: 'Đậu que', ipa: '/ˌɡriːn ˈbiːn/', img: '🥬', ex: 'We eat green beans for dinner.' },
          { en: 'Okra', vi: 'Đậu bắp', ipa: '/ˈəʊ.krə/', img: '🌿', ex: 'Okra is soft when you cook it.' },
          { en: 'Soybean', vi: 'Đậu nành', ipa: '/ˈsɔɪ.biːn/', img: '🌱', ex: 'Soybeans are used to make tofu.' },
          { en: 'Lotus root', vi: 'Củ sen', ipa: '/ˈləʊ.təs ruːt/', img: '🪷', ex: 'Lotus root has many holes inside.' },
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
