export type PhonemeType = 'vowel-short' | 'vowel-long' | 'diphthong' | 'consonant';

export type Phoneme = {
  ipa: string;
  type: PhonemeType;
  examples: string[];
  vi: string;
};

export const PHONEMES: Phoneme[] = [
  // ── Nguyên âm ngắn (short monophthongs) ─────────────────────────────
  { ipa: '/ɪ/', type: 'vowel-short', examples: ['sit', 'big', 'ship'], vi: 'Như "i" trong tiếng Việt nhưng ngắn và lỏng hơn, môi không kéo căng.' },
  { ipa: '/e/', type: 'vowel-short', examples: ['bed', 'ten', 'red'], vi: 'Giống "e" trong "em", miệng mở vừa.' },
  { ipa: '/æ/', type: 'vowel-short', examples: ['cat', 'bad', 'map'], vi: 'Nằm giữa "a" và "e", miệng mở rộng theo chiều ngang.' },
  { ipa: '/ʌ/', type: 'vowel-short', examples: ['cup', 'luck', 'sun'], vi: 'Như "ă" rất ngắn và gọn, lưỡi ở giữa miệng.' },
  { ipa: '/ɒ/', type: 'vowel-short', examples: ['hot', 'rock', 'dog'], vi: 'Như "o" trong "ọi" nhưng ngắn, môi tròn nhẹ (giọng Anh-Anh).' },
  { ipa: '/ʊ/', type: 'vowel-short', examples: ['put', 'foot', 'book'], vi: 'Như "u" trong "ngủ" rất ngắn, môi tròn nhưng không căng.' },
  { ipa: '/ə/', type: 'vowel-short', examples: ['about', 'banana', 'sofa'], vi: 'Schwa — âm trung tính, mờ nhạt như "ờ" yếu, thường ở âm tiết không trọng âm.' },

  // ── Nguyên âm dài (long monophthongs) ───────────────────────────────
  { ipa: '/iː/', type: 'vowel-long', examples: ['see', 'tree', 'meet'], vi: 'Như "i" trong "đi" nhưng kéo dài, môi cười rộng.' },
  { ipa: '/ɑː/', type: 'vowel-long', examples: ['car', 'far', 'park'], vi: 'Như "a" trong "ba" kéo dài, miệng mở to.' },
  { ipa: '/ɔː/', type: 'vowel-long', examples: ['call', 'four', 'door'], vi: 'Như "o" trong "to" kéo dài, môi tròn căng.' },
  { ipa: '/uː/', type: 'vowel-long', examples: ['blue', 'food', 'moon'], vi: 'Như "u" trong "tu" kéo dài, môi tròn căng.' },
  { ipa: '/ɜː/', type: 'vowel-long', examples: ['bird', 'learn', 'girl'], vi: 'Như "ơ" kéo dài, lưỡi ở giữa miệng, môi thả lỏng.' },

  // ── Nhị trùng âm (diphthongs) ───────────────────────────────────────
  { ipa: '/eɪ/', type: 'diphthong', examples: ['day', 'face', 'rain'], vi: 'Như "ây" trong "đây" — bắt đầu /e/ rồi trượt sang /ɪ/.' },
  { ipa: '/aɪ/', type: 'diphthong', examples: ['my', 'time', 'high'], vi: 'Như "ai" trong "tai" — bắt đầu /a/ rồi trượt sang /ɪ/.' },
  { ipa: '/ɔɪ/', type: 'diphthong', examples: ['boy', 'join', 'coin'], vi: 'Như "oi" trong "tôi" — bắt đầu /ɔ/ rồi trượt sang /ɪ/.' },
  { ipa: '/aʊ/', type: 'diphthong', examples: ['now', 'out', 'house'], vi: 'Như "ao" trong "sao" — bắt đầu /a/ rồi trượt sang /ʊ/.' },
  { ipa: '/əʊ/', type: 'diphthong', examples: ['go', 'home', 'phone'], vi: 'Như "âu" trong "đâu" — bắt đầu /ə/ rồi trượt sang /ʊ/ (Anh-Anh).' },
  { ipa: '/ɪə/', type: 'diphthong', examples: ['near', 'here', 'beer'], vi: 'Trượt từ /ɪ/ sang /ə/, gần giống "ia".' },
  { ipa: '/eə/', type: 'diphthong', examples: ['hair', 'where', 'care'], vi: 'Trượt từ /e/ sang /ə/, gần giống "e-ơ".' },
  { ipa: '/ʊə/', type: 'diphthong', examples: ['tour', 'pure', 'cure'], vi: 'Trượt từ /ʊ/ sang /ə/, gần giống "u-ơ" (đang dần biến mất, hay hợp thành /ɔː/).' },

  // ── Phụ âm (consonants) — plosives ──────────────────────────────────
  { ipa: '/p/', type: 'consonant', examples: ['pen', 'happy', 'top'], vi: 'Tắc môi — như "p" trong "pin", có bật hơi ở đầu từ.' },
  { ipa: '/b/', type: 'consonant', examples: ['book', 'baby', 'job'], vi: 'Tắc môi có rung dây thanh — như "b" trong "ba".' },
  { ipa: '/t/', type: 'consonant', examples: ['time', 'water', 'cat'], vi: 'Tắc đầu lưỡi-lợi, bật hơi mạnh hơn "t" tiếng Việt.' },
  { ipa: '/d/', type: 'consonant', examples: ['day', 'lady', 'red'], vi: 'Tắc đầu lưỡi-lợi có rung — như "đ" trong "đi" nhưng nặng hơn.' },
  { ipa: '/k/', type: 'consonant', examples: ['cat', 'school', 'back'], vi: 'Tắc cuống lưỡi-vòm mềm, bật hơi — như "c" cứng trong "ca".' },
  { ipa: '/ɡ/', type: 'consonant', examples: ['go', 'bag', 'finger'], vi: 'Tắc cuống lưỡi có rung — như "g" trong "gà".' },

  // ── Phụ âm — fricatives ─────────────────────────────────────────────
  { ipa: '/f/', type: 'consonant', examples: ['fish', 'phone', 'leaf'], vi: 'Răng trên chạm môi dưới, thổi hơi — như "ph" trong "phở".' },
  { ipa: '/v/', type: 'consonant', examples: ['voice', 'live', 'over'], vi: 'Giống /f/ nhưng có rung dây thanh — như "v" trong "vui".' },
  { ipa: '/θ/', type: 'consonant', examples: ['think', 'three', 'bath'], vi: 'Đặt đầu lưỡi giữa hai hàng răng rồi thổi hơi (không có trong tiếng Việt).' },
  { ipa: '/ð/', type: 'consonant', examples: ['this', 'father', 'they'], vi: 'Giống /θ/ nhưng có rung dây thanh.' },
  { ipa: '/s/', type: 'consonant', examples: ['see', 'sun', 'bus'], vi: 'Đầu lưỡi gần lợi trên, hơi xát ra — như "x" trong "xa".' },
  { ipa: '/z/', type: 'consonant', examples: ['zoo', 'busy', 'rose'], vi: 'Giống /s/ nhưng có rung — như "d" miền Bắc trong "do".' },
  { ipa: '/ʃ/', type: 'consonant', examples: ['she', 'wash', 'sure'], vi: 'Giống "sh" tiếng Anh, môi tròn nhẹ, lưỡi co lại — đậm hơn "s/x".' },
  { ipa: '/ʒ/', type: 'consonant', examples: ['vision', 'measure', 'beige'], vi: 'Giống /ʃ/ nhưng có rung — như "j" trong "vision".' },
  { ipa: '/h/', type: 'consonant', examples: ['hat', 'hello', 'who'], vi: 'Hơi thoát ra nhẹ từ thanh hầu — như "h" trong "hôm".' },

  // ── Phụ âm — affricates ─────────────────────────────────────────────
  { ipa: '/tʃ/', type: 'consonant', examples: ['cheese', 'watch', 'rich'], vi: 'Tắc-xát — như "ch" trong "chào".' },
  { ipa: '/dʒ/', type: 'consonant', examples: ['judge', 'job', 'age'], vi: 'Giống /tʃ/ nhưng có rung — như "j" trong "judge".' },

  // ── Phụ âm — nasals ─────────────────────────────────────────────────
  { ipa: '/m/', type: 'consonant', examples: ['man', 'summer', 'arm'], vi: 'Mũi đóng môi — như "m" trong "ma".' },
  { ipa: '/n/', type: 'consonant', examples: ['no', 'sun', 'down'], vi: 'Mũi đầu lưỡi-lợi — như "n" trong "na".' },
  { ipa: '/ŋ/', type: 'consonant', examples: ['sing', 'long', 'thing'], vi: 'Mũi cuống lưỡi-vòm mềm — như "ng" cuối từ trong "song".' },

  // ── Phụ âm — approximants ───────────────────────────────────────────
  { ipa: '/l/', type: 'consonant', examples: ['look', 'fall', 'light'], vi: 'Đầu lưỡi chạm lợi, hơi đi hai bên — như "l" trong "la".' },
  { ipa: '/r/', type: 'consonant', examples: ['run', 'red', 'very'], vi: 'Đầu lưỡi cong lên nhẹ, không chạm vòm; môi tròn (giọng Mỹ).' },
  { ipa: '/w/', type: 'consonant', examples: ['we', 'water', 'quick'], vi: 'Môi tròn căng rồi mở ra — như "qu" trong "qua".' },
  { ipa: '/j/', type: 'consonant', examples: ['yes', 'you', 'yellow'], vi: 'Lưỡi gần vòm cứng — như "i" trong "yêu".' },
];

export const PHONEME_GROUPS: { key: PhonemeType; label: string; icon: string }[] = [
  { key: 'vowel-short', label: 'Nguyên âm ngắn', icon: '🔵' },
  { key: 'vowel-long', label: 'Nguyên âm dài', icon: '🟢' },
  { key: 'diphthong', label: 'Nhị trùng âm', icon: '🟣' },
  { key: 'consonant', label: 'Phụ âm', icon: '🟠' },
];

export function youtubeSearchUrl(ipa: string): string {
  const query = `english pronunciation ${ipa} sound`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
