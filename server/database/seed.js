const bcrypt = require('bcryptjs');
const db = require('./db');
const config = require('../config');

// Video streaming sources pool with Japanese, English Dub, and Hindi Dub
const sampleVideoSources = [
  {
    server: 'Kaizen (HLS Multi-Bitrate)',
    type: 'hls',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    quality: '1080p Auto',
    audio: 'ja',
    audioLabel: 'Japanese (Original Audio)'
  },
  {
    server: 'Titan (Direct HD)',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    quality: '1080p',
    audio: 'en',
    audioLabel: 'English Dub'
  },
  {
    server: 'Apex CDN (Hindi Audio)',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    quality: '720p',
    audio: 'hi',
    audioLabel: 'Hindi Dub'
  },
  {
    server: 'Mirror (Direct 1080p)',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    quality: '1080p',
    audio: 'ja',
    audioLabel: 'Japanese (HQ)'
  }
];

const sampleSubtitles = [
  { label: 'English', lang: 'en', src: '' },
  { label: 'Español', lang: 'es', src: '' },
  { label: 'Hindi', lang: 'hi', src: '' },
  { label: 'Français', lang: 'fr', src: '' }
];

const comprehensiveAnimeCatalog = [
  {
    title: 'Solo Leveling',
    japanese_title: '俺だけレベルアップな件',
    slug: 'solo-leveling',
    anilist_id: 151807,
    synopsis: 'In a world where hunters, humans who possess supernatural powers, battle deadly monsters to protect mankind from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival. One day, after narrowly surviving an overwhelmingly powerful double dungeon, a mysterious quest window only he can see appears before him. Jinwoo accepts the quest and begins leveling up, while others cannot.',
    poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.8,
    status: 'Airing',
    type: 'TV',
    season: 'Winter',
    year: 2024,
    studio: 'A-1 Pictures',
    genres: ['Action', 'Fantasy', 'Supernatural', 'Adventure'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 342100,
    featured: true,
    published: true,
    episodes: [
      { ep: 1, title: 'I\'m Used to It', duration: '23:40', intro_start: 90, intro_end: 180 },
      { ep: 2, title: 'If I Had One More Chance', duration: '24:10', intro_start: 85, intro_end: 175 },
      { ep: 3, title: 'It\'s Like a Game', duration: '23:55', intro_start: 85, intro_end: 175 },
      { ep: 4, title: 'I\'ve Gotta Get Stronger', duration: '24:15', intro_start: 85, intro_end: 175 },
      { ep: 5, title: 'A Pretty Good Deal', duration: '23:50', intro_start: 85, intro_end: 175 },
      { ep: 6, title: 'The Real Hunt Begins', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Jujutsu Kaisen: Shibuya Incident',
    japanese_title: '呪術廻戦 渋谷事変',
    slug: 'jujutsu-kaisen-season-2',
    anilist_id: 145064,
    synopsis: 'October 31, 2020. A curtain descends over Shibuya Station, trapping countless civilians. To rescue them, Satoru Gojo descends into the bustling underworld alone. However, an orchestrated trap by Suguru Geto and cursed spirits awaits him, triggering an unprecedented war of jujutsu sorcery that will reshape the world forever.',
    poster_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.1,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2023,
    studio: 'MAPPA',
    genres: ['Action', 'Dark Fantasy', 'Supernatural', 'Shounen'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 589400,
    featured: true,
    published: true,
    episodes: [
      { ep: 1, title: 'Shibuya Incident', duration: '23:50', intro_start: 90, intro_end: 180 },
      { ep: 2, title: 'Gate, Open', duration: '24:00', intro_start: 88, intro_end: 178 },
      { ep: 3, title: 'Dull Knife', duration: '23:45', intro_start: 85, intro_end: 175 },
      { ep: 4, title: 'Thunderclap', duration: '24:20', intro_start: 85, intro_end: 175 },
      { ep: 5, title: 'Metamorphosis', duration: '24:05', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Demon Slayer: Hashira Training Arc',
    japanese_title: '鬼滅の刃 柱稽古編',
    slug: 'demon-slayer-hashira-training',
    anilist_id: 166240,
    synopsis: 'Tanjiro goes to see the Stone Hashira, Himejima, who intends to prepare him for the battles to come. The training to become a Hashira—a high-ranking member of the Demon Slayer Corps—is intense and demanding, earning Himejima\'s approval seems impossible, but Tanjiro won\'t give up!',
    poster_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.7,
    status: 'Airing',
    type: 'TV',
    season: 'Spring',
    year: 2024,
    studio: 'ufotable',
    genres: ['Action', 'Historical', 'Supernatural', 'Shounen'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 410000,
    featured: true,
    published: true,
    episodes: [
      { ep: 1, title: 'To Defeat Muzan Kibutsuji', duration: '49:10', intro_start: 90, intro_end: 180 },
      { ep: 2, title: 'The Water Hashira\'s Pain', duration: '23:45', intro_start: 85, intro_end: 175 },
      { ep: 3, title: 'Tanjiro Fully Recovered', duration: '24:10', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Attack on Titan: The Final Season',
    japanese_title: '進撃の巨人 The Final Season',
    slug: 'attack-on-titan-final-season',
    anilist_id: 110277,
    synopsis: 'Gabi Braun and Falco Grice have been training their entire lives to inherit one of the seven Titans under Marley\'s control. When Eren Jaeger reappears with an unforgiving scheme to eradicate all enemies of Eldia, the boundary between hero and monster collapses into total apocalyptic devastation.',
    poster_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.0,
    status: 'Completed',
    type: 'TV',
    season: 'Winter',
    year: 2023,
    studio: 'MAPPA',
    genres: ['Action', 'Military', 'Mystery', 'Super Power', 'Drama'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 720000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'The Other Side of the Sea', duration: '24:00', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'Midnight Train', duration: '23:50', intro_start: 85, intro_end: 175 },
      { ep: 3, title: 'The Door of Hope', duration: '24:10', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Frieren: Beyond Journey\'s End',
    japanese_title: '葬送のフリーレン',
    slug: 'frieren-beyond-journeys-end',
    anilist_id: 154587,
    synopsis: 'The adventure is over, but life goes on for an elf mage just beginning to learn what living is about. Elf mage Frieren and her courageous fellow adventurers have defeated the Demon King and brought peace to the land. But Frieren will long outlive the rest of her former party. How will she come to understand what life means to the people around her?',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.3,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2023,
    studio: 'Madhouse',
    genres: ['Adventure', 'Drama', 'Fantasy', 'Magic'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: false,
    views_count: 482000,
    featured: true,
    published: true,
    episodes: [
      { ep: 1, title: 'The Journey\'s End', duration: '24:30', intro_start: 95, intro_end: 185 },
      { ep: 2, title: 'It Didn\'t Have to Be Magic...', duration: '24:10', intro_start: 85, intro_end: 175 },
      { ep: 3, title: 'Killing Magic', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'One Piece: Egghead Arc',
    japanese_title: 'ワンピース エッグヘッド編',
    slug: 'one-piece-egghead',
    anilist_id: 21,
    synopsis: 'Monkey D. Luffy and the Straw Hat Pirates finally arrive at Egghead, the Island of the Future, where the world\'s greatest scientific genius Dr. Vegapunk resides. Unveiling long-hidden secrets of the Void Century, Devil Fruits, and the Ancient Kingdom, the World Government sends an unprecedented naval fleet to erase Egghead from existence.',
    poster_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.2,
    status: 'Airing',
    type: 'TV',
    season: 'Winter',
    year: 2024,
    studio: 'Toei Animation',
    genres: ['Action', 'Adventure', 'Comedy', 'Super Power', 'Fantasy'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 1450000,
    featured: true,
    published: true,
    episodes: [
      { ep: 1089, title: 'Entering a New Chapter! Luffy and Bonney\'s Paths!', duration: '24:00', intro_start: 85, intro_end: 175 },
      { ep: 1090, title: 'A New Island! Future Island Egghead', duration: '24:00', intro_start: 85, intro_end: 175 },
      { ep: 1091, title: 'Filled with the Future! An Adventure on the Island of Science!', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Naruto Shippuden',
    japanese_title: 'ナルト 疾風伝',
    slug: 'naruto-shippuden',
    anilist_id: 1735,
    synopsis: 'It has been two and a half years since Naruto Uzumaki left Konohagakure, the Hidden Leaf Village, for intense training following events which fueled his desire to become stronger. Now Akatsuki, the mysterious organization of rogue elite ninja, is closing in on their grand plan which may threaten the safety of the entire shinobi world.',
    poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.9,
    status: 'Completed',
    type: 'TV',
    season: 'Winter',
    year: 2007,
    studio: 'Studio Pierrot',
    genres: ['Action', 'Adventure', 'Martial Arts', 'Shounen'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 2100000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Homecoming', duration: '23:30', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'The Akatsuki Makes Its Move', duration: '23:30', intro_start: 85, intro_end: 175 },
      { ep: 3, title: 'The Results of Training', duration: '23:30', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Bleach: Thousand-Year Blood War',
    japanese_title: 'BLEACH 千年血戦篇',
    slug: 'bleach-thousand-year-blood-war',
    anilist_id: 114446,
    synopsis: 'The peace is suddenly broken when warning sirens blare through the Soul Society. Residents are disappearing without a trace, and a dark shadow looms toward Ichigo and his friends in Karakura Town. Yhwach, the father of all Quincies, declares war on the Shinigami, triggering the final apocalyptic battle.',
    poster_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.0,
    status: 'Airing',
    type: 'TV',
    season: 'Fall',
    year: 2022,
    studio: 'Studio Pierrot',
    genres: ['Action', 'Supernatural', 'Shounen'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 850000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'The Blood Warfare', duration: '24:10', intro_start: 90, intro_end: 180 },
      { ep: 2, title: 'Foundation Stones', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Chainsaw Man',
    japanese_title: 'チェンソーマン',
    slug: 'chainsaw-man',
    anilist_id: 127230,
    synopsis: 'Denji is a young boy living with Pochita, the Chainsaw Devil. While paying off his father\'s massive debt, he is betrayed and killed. As he loses consciousness, Pochita makes a contract with him, resurrecting Denji as "Chainsaw Man"—the devil with a chainsaw heart.',
    poster_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.6,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2022,
    studio: 'MAPPA',
    genres: ['Action', 'Gore', 'Supernatural', 'Comedy'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: false,
    views_count: 530000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Dog & Chainsaw', duration: '24:00', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'Arrival in Tokyo', duration: '23:50', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Cyberpunk: Edgerunners',
    japanese_title: 'サイバーパンク エッジランナーズ',
    slug: 'cyberpunk-edgerunners',
    anilist_id: 120377,
    synopsis: 'In a dystopian city plagued by corruption, cybernetic implants, and crime, a street kid named David Martinez loses everything in a drive-by shooting. Desperate to survive, he chooses to stay alive by becoming an edgerunner: a mercenary outlaw also known as a cyberpunk.',
    poster_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.9,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2022,
    studio: 'Trigger',
    genres: ['Action', 'Sci-Fi', 'Psychological'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: false,
    views_count: 610000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Let You Down', duration: '24:30', intro_start: 80, intro_end: 170 },
      { ep: 2, title: 'Like a Boy', duration: '23:50', intro_start: 80, intro_end: 170 }
    ]
  },
  {
    title: 'Death Note',
    japanese_title: 'デスノート',
    slug: 'death-note',
    anilist_id: 1535,
    synopsis: 'Light Yagami, a brilliant high school student, stumbles upon the "Death Note"—a supernatural notebook dropped by the Shinigami Ryuk. Any human whose name is written in its pages shall die. Light embarks on a crusade to eliminate criminals and rule as god of a new peaceful world, until the enigmatic detective L challenges his existence.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.0,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2006,
    studio: 'Madhouse',
    genres: ['Psychological', 'Mystery', 'Supernatural', 'Thriller'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 980000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Rebirth', duration: '23:30', intro_start: 75, intro_end: 165 },
      { ep: 2, title: 'Confrontation', duration: '23:40', intro_start: 75, intro_end: 165 }
    ]
  },
  {
    title: 'Kaiju No. 8',
    japanese_title: '怪獣8号',
    slug: 'kaiju-no-8',
    anilist_id: 153288,
    synopsis: 'In a world plagued by dangerous monsters known as Kaiju, Kafka Hibino works as a cleanup crew member disposing of fallen Kaiju carcasses. After a small Kaiju enters his body through his mouth, Kafka gains the ability to transform into Kaiju No. 8 while retaining his human consciousness!',
    poster_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.5,
    status: 'Airing',
    type: 'TV',
    season: 'Spring',
    year: 2024,
    studio: 'Production I.G',
    genres: ['Action', 'Sci-Fi', 'Supernatural'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 380000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'The Man Who Became a Kaiju', duration: '24:00', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'The Kaiju That Defeats Kaiju', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Spy x Family',
    japanese_title: 'スパイファミリー',
    slug: 'spy-x-family',
    anilist_id: 140960,
    synopsis: 'Master spy Twilight must create a fake family to infiltrate an elite school and prevent war. Unbeknownst to him, his newly adopted daughter Anya is a telepath, and his hired wife Yor is a deadly assassin. Together, this bizarre trio navigates suburban domestic life with hilarious chaos.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.7,
    status: 'Completed',
    type: 'TV',
    season: 'Spring',
    year: 2022,
    studio: 'Wit Studio & CloverWorks',
    genres: ['Action', 'Comedy', 'Slice of Life'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 670000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Operation Strix', duration: '24:10', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'Secure a Wife', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Hunter x Hunter (2011)',
    japanese_title: 'ハンター×ハンター',
    slug: 'hunter-x-hunter-2011',
    anilist_id: 11061,
    synopsis: 'Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness. With his friends Killua, Kurapika, and Leorio, Gon embarks on a perilous adventure through the Hunter Exam, the Heavens Arena, Yorknew City, and the infamous Chimera Ant continent.',
    poster_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.1,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2011,
    studio: 'Madhouse',
    genres: ['Action', 'Adventure', 'Fantasy', 'Shounen'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 1200000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Departure x And x Friends', duration: '23:40', intro_start: 75, intro_end: 165 },
      { ep: 2, title: 'Test x of x Tests', duration: '23:45', intro_start: 75, intro_end: 165 }
    ]
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    japanese_title: '鋼の錬金術師 FULLMETAL ALCHEMIST',
    slug: 'fullmetal-alchemist-brotherhood',
    anilist_id: 5114,
    synopsis: 'After a horrifying alchemy experiment goes wrong, brothers Edward and Alphonse Elric pay a terrible price. In search of the legendary Philosopher\'s Stone to restore their bodies, the Elric brothers uncover a deep government conspiracy threatening the entire nation of Amestris.',
    poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.3,
    status: 'Completed',
    type: 'TV',
    season: 'Spring',
    year: 2009,
    studio: 'Bones',
    genres: ['Action', 'Adventure', 'Drama', 'Fantasy', 'Military'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 1950000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Fullmetal Alchemist', duration: '24:15', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'The First Day', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Blue Lock',
    japanese_title: 'ブルーロック',
    slug: 'blue-lock',
    anilist_id: 137822,
    synopsis: 'Following the 2018 World Cup failure, Japan hires eccentric coach Jinpachi Ego to create the world\'s ultimate selfish striker. 300 high school strikers are locked in a prison-like facility called "Blue Lock". Only one egoist will emerge to lead Japan to soccer glory.',
    poster_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.4,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2022,
    studio: '8bit',
    genres: ['Sports', 'Action', 'Psychological'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 420000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Dream', duration: '24:00', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'Monster', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Tokyo Ghoul',
    japanese_title: '東京喰種トーキョーグール',
    slug: 'tokyo-ghoul',
    anilist_id: 20605,
    synopsis: 'Tokyo is haunted by flesh-eating ghouls who blend into human society. Ken Kaneki, an ordinary college student, barely survives a deadly date with a ghoul named Rize. Following emergency organ transplant surgery, Kaneki awakens to discover he has become the first human-ghoul hybrid.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.5,
    status: 'Completed',
    type: 'TV',
    season: 'Summer',
    year: 2014,
    studio: 'Studio Pierrot',
    genres: ['Action', 'Dark Fantasy', 'Horror', 'Psychological'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 1100000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Tragedy', duration: '24:10', intro_start: 80, intro_end: 170 },
      { ep: 2, title: 'Incubation', duration: '24:00', intro_start: 80, intro_end: 170 }
    ]
  },
  {
    title: 'One Punch Man',
    japanese_title: 'ワンパンマン',
    slug: 'one-punch-man',
    anilist_id: 21087,
    synopsis: 'Saitama is a hero for fun who trained so hard that his hair fell out—and he became so strong he can defeat any enemy with just a single punch. Bored by the lack of challenge, Saitama seeks an opponent who can push him to his limits.',
    poster_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.9,
    status: 'Completed',
    type: 'TV',
    season: 'Fall',
    year: 2015,
    studio: 'Madhouse',
    genres: ['Action', 'Comedy', 'Parody', 'Super Power'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 1600000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'The Strongest Man', duration: '24:10', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'The Lone Cyborg', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Hell\'s Paradise',
    japanese_title: '地獄楽',
    slug: 'hells-paradise',
    anilist_id: 128893,
    synopsis: 'Gabimaru the Hollow, a ninja of Iwagakure Village, is sentenced to execution. When nothing can kill him, executioner Sagiri Yamada Asaemon offers him a full pardon if he travels to the mysterious island of Shinsenkyo to retrieve the Elixir of Immortality.',
    poster_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 8.4,
    status: 'Completed',
    type: 'TV',
    season: 'Spring',
    year: 2023,
    studio: 'MAPPA',
    genres: ['Action', 'Dark Fantasy', 'Supernatural'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: true,
    views_count: 360000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'The Criminal and the Executioner', duration: '24:00', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'Screening and Choosing', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  },
  {
    title: 'Vinland Saga Season 2',
    japanese_title: 'ヴィンランド・サガ 2期',
    slug: 'vinland-saga-season-2',
    anilist_id: 136430,
    synopsis: 'A new millennium begins in the southern part of the Jutland peninsula in Denmark. Thorfin is bought by the landowner Ketil as a "slave" and engages in land reclamation work on his farm. Thorfinn meets Einar, a fellow slave, and begins questioning his path of bloodshed.',
    poster_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&h=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1920&h=800&q=80',
    rating: 9.1,
    status: 'Completed',
    type: 'TV',
    season: 'Winter',
    year: 2023,
    studio: 'MAPPA',
    genres: ['Action', 'Adventure', 'Drama', 'Historical'],
    has_sub: true,
    has_dub: true,
    has_hindi_dub: false,
    views_count: 510000,
    featured: false,
    published: true,
    episodes: [
      { ep: 1, title: 'Slave', duration: '24:30', intro_start: 85, intro_end: 175 },
      { ep: 2, title: 'Ketil\'s Farm', duration: '24:00', intro_start: 85, intro_end: 175 }
    ]
  }
];

async function seedDatabase(seedCatalog = false) {
  // 1. Create Default Master Admin if missing (Password hashed with 12 salt rounds)
  const adminPasswordHash = await bcrypt.hash(config.adminDefault.password, 12);

  if (!db.data.users || db.data.users.length === 0) {
    db.data.users = [];
    db.createUser({
      username: config.adminDefault.username,
      email: config.adminDefault.email,
      password_hash: adminPasswordHash,
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80',
      bio: 'APEX Master Administrator & Platform Owner'
    });
    db.saveSync();
  }

  if (!seedCatalog) {
    console.log('[Seed] Admin and User accounts ready. Anime catalog left clean for custom admin additions.');
    return;
  }

  console.log('[Seed] Populating full anime catalog with 20+ legendary titles...');

  // Reset database arrays if forcing catalog population
  db.data.anime = [];
  db.data.episodes = [];
  db.data.watchlist = [];
  db.data.watch_history = [];
  db.data.comments = [];
  db.data.ratings = [];

  const admin = db.data.users.find(u => u.role === 'admin');
  const demoUser = db.data.users.find(u => u.role === 'user');

  // 2. Insert all anime and episodes
  for (const item of comprehensiveAnimeCatalog) {
    const { episodes, ...animeData } = item;
    const createdAnime = db.createAnime(animeData);

    if (episodes && episodes.length > 0) {
      for (const ep of episodes) {
        db.createEpisode({
          anime_id: createdAnime.id,
          episode_number: ep.ep,
          title: ep.title,
          thumbnail_url: createdAnime.banner_url,
          duration: ep.duration,
          duration_seconds: 1440,
          video_url: sampleVideoSources[0].url,
          sources: sampleVideoSources,
          subtitles: sampleSubtitles,
          intro_start: ep.intro_start,
          intro_end: ep.intro_end,
          outro_start: 1350,
          outro_end: 1440,
          published: true
        });
      }
    }
  }

  // 3. Create Seed Watchlist & Watch History for Demo User
  const allAnime = db.data.anime;
  if (allAnime.length >= 5) {
    db.setWatchlistStatus(demoUser.id, allAnime[0].id, 'watching');
    db.setWatchlistStatus(demoUser.id, allAnime[1].id, 'plan_to_watch');
    db.setWatchlistStatus(demoUser.id, allAnime[2].id, 'completed');
    db.setWatchlistStatus(demoUser.id, allAnime[3].id, 'watching');
    db.setWatchlistStatus(demoUser.id, allAnime[4].id, 'plan_to_watch');

    const episodesForFirst = db.getEpisodesByAnimeId(allAnime[0].id);
    if (episodesForFirst.length > 0) {
      db.savePlaybackProgress(demoUser.id, allAnime[0].id, episodesForFirst[0].id, 450, 1440);

      db.addComment(
        demoUser.id,
        episodesForFirst[0].id,
        allAnime[0].id,
        'The animation quality from A-1 Pictures here is unbelievable! Sung Jinwoo\'s aura is insane.',
        false
      );
      db.addComment(
        admin.id,
        episodesForFirst[0].id,
        allAnime[0].id,
        'Welcome to APEX! You can switch between Japanese, English Dub, and Hindi Dub audio streams right inside the player controls!',
        false
      );
      db.addComment(
        demoUser.id,
        episodesForFirst[0].id,
        allAnime[0].id,
        'Spoiler Alert: Watch out for the giant stone statue smiling in episode 2!',
        true
      );
    }
  }

  db.saveSync();
  console.log(`[Seed] Successfully seeded ${db.data.anime.length} anime series and ${db.data.episodes.length} episodes.`);
}

if (require.main === module) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
