# AnimeKai API Usage Guide

This document describes how to use the AnimeKai API endpoints for browsing, filtering, and retrieving anime information.

## Base URL

```
https://anime-kai-api-main-test.vercel.app/api
```

---

## Endpoints

### 1. Browse Anime (`/api/browse`)

Browse and filter anime with pagination support.

**Method:** `GET`

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20, max: 100) - Number of items per page
- `type[]` (optional) - Anime type (e.g., `tv`, `movie`, `ova`, `ona`, `special`, `music`)
- `genre[]` (optional) - Genre ID (e.g., `47` for Action, `7` for Comedy)
- `status[]` (optional) - Status filter (`info`, `releasing`, `completed`)
- `season[]` (optional) - Season (`fall`, `summer`, `spring`, `winter`, `unknown`)
- `year[]` (optional) - Year (e.g., `2024`, `2025`, `1990s`)
- `rating[]` (optional) - Age rating (`g`, `pg`, `pg_13`, `r`, `r+`, `rx`)
- `country[]` (optional) - Country (`2` for China, `11` for Japan)
- `language[]` (optional) - Language type (`sub`, `softsub`, `dub`, `subdub`)
- `sort` (optional, default: `updated_date`) - Sort order (see Sort Options below)
- `keyword` (optional) - Search keyword

**Sort Options:**
- `updated_date` - Updated date (default)
- `release_date` - Release date
- `end_date` - End date
- `added_date` - Added date
- `trending` - Trending
- `title_az` - Name A-Z
- `avg_score` - Average score
- `mal_score` - MAL score
- `most_viewed` - Most viewed
- `most_followed` - Most followed
- `episode_count` - Episode count

**Example Request:**

```bash
GET /api/browse?page=1&limit=20&type[]=tv&genre[]=47&year[]=2024&sort=trending
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "jjk-season-2-yd9m",
      "title": "Jujutsu Kaisen Season 2",
      "japanese_title": "呪術廻戦 第2期",
      "poster": "https://static.anikai.to/...",
      "url": "https://anikai.to/watch/jjk-season-2-yd9m",
      "current_episode": "25",
      "sub_episodes": "25",
      "dub_episodes": "0",
      "type": "TV"
    },
    {
      "id": "aot-final-season-part-3-xp2k",
      "title": "Attack on Titan: The Final Season",
      "japanese_title": "進撃の巨人 The Final Season",
      "poster": "https://static.anikai.to/...",
      "url": "https://anikai.to/watch/aot-final-season-xp2k",
      "current_episode": "29",
      "sub_episodes": "29",
      "dub_episodes": "29",
      "type": "TV"
    }
  ]
}
```

---

### 2. Get Filters (`/api/filters`)

Retrieve all available filter options for the browse endpoint.

**Method:** `GET`

**Query Parameters:** None

**Example Request:**

```bash
GET /api/filters
```

**Example Response:**

```json
{
  "success": true,
  "type": [
    {
      "label": "Movie",
      "value": "movie"
    },
    {
      "label": "TV",
      "value": "tv"
    },
    {
      "label": "OVA",
      "value": "ova"
    },
    {
      "label": "ONA",
      "value": "ona"
    },
    {
      "label": "Special",
      "value": "special"
    },
    {
      "label": "Music",
      "value": "music"
    }
  ],
  "genre": [
    {
      "label": "Action",
      "value": "47"
    },
    {
      "label": "Adventure",
      "value": "1"
    },
    {
      "label": "Comedy",
      "value": "7"
    },
    {
      "label": "Drama",
      "value": "66"
    },
    {
      "label": "Fantasy",
      "value": "34"
    },
    {
      "label": "Romance",
      "value": "145"
    },
    {
      "label": "School",
      "value": "9"
    },
    {
      "label": "Shounen",
      "value": "37"
    }
  ],
  "status": [
    {
      "label": "Not Yet Aired",
      "value": "info"
    },
    {
      "label": "Releasing",
      "value": "releasing"
    },
    {
      "label": "Completed",
      "value": "completed"
    }
  ],
  "season": [
    {
      "label": "Fall",
      "value": "fall"
    },
    {
      "label": "Summer",
      "value": "summer"
    },
    {
      "label": "Spring",
      "value": "spring"
    },
    {
      "label": "Winter",
      "value": "winter"
    }
  ],
  "year": [
    {
      "label": "2026",
      "value": "2026"
    },
    {
      "label": "2025",
      "value": "2025"
    },
    {
      "label": "2024",
      "value": "2024"
    },
    {
      "label": "2023",
      "value": "2023"
    }
  ],
  "rating": [
    {
      "label": "G - All Ages",
      "value": "g"
    },
    {
      "label": "PG - Children",
      "value": "pg"
    },
    {
      "label": "PG 13 - Teens 13 and Older",
      "value": "pg_13"
    },
    {
      "label": "R - 17+, Violence & Profanity",
      "value": "r"
    },
    {
      "label": "R+ - Profanity & Mild Nudity",
      "value": "r+"
    },
    {
      "label": "Rx - Hentai",
      "value": "rx"
    }
  ],
  "country": [
    {
      "label": "China",
      "value": "2"
    },
    {
      "label": "Japan",
      "value": "11"
    }
  ],
  "language": [
    {
      "label": "Hard Sub",
      "value": "sub"
    },
    {
      "label": "Soft Sub",
      "value": "softsub"
    },
    {
      "label": "Dub",
      "value": "dub"
    },
    {
      "label": "Sub & Dub",
      "value": "subdub"
    }
  ]
}
```

---

### 6. Get Episodes (`/api/episodes/[slug]`)

Retrieve all episodes for a specific anime.

**Method:** `GET`

**Parameters:**
- `slug` (required, URL parameter) - Anime slug/ID (e.g., `tensei-shitara-slime-datta-ken-4th-season-4l47`)

**Example Request:**

```bash
GET /api/episodes/tensei-shitara-slime-datta-ken-4th-season-4l47
```

**Example Response:**

```json
{
  "success": true,
  "slug": "tensei-shitara-slime-datta-ken-4th-season-4l47",
  "ani_id": "dYO-9g",
  "title": "That Time I Got Reincarnated as a Slime Season 4",
  "count": 4,
  "episodes": [
    {
      "number": "1",
      "slug": "1",
      "title": "New Days",
      "japanese_title": "",
      "token": "cYTnuvrxtU7h23RB0Zvd",
      "has_sub": true,
      "has_dub": true
    },
    {
      "number": "2",
      "slug": "2",
      "title": "Episode 2",
      "japanese_title": "",
      "token": "LtfhuvLluwbnjXRB2IyI",
      "has_sub": true,
      "has_dub": true
    },
    {
      "number": "3",
      "slug": "3",
      "title": "Episode 3",
      "japanese_title": "",
      "token": "LNe4rufy4Unl0g",
      "has_sub": true,
      "has_dub": false
    },
    {
      "number": "4",
      "slug": "4",
      "title": "Episode 4",
      "japanese_title": "",
      "token": "J9m4rvP44xWh0A",
      "has_sub": true,
      "has_dub": false
    }
  ]
}
```

**Episode Fields:**
- `number` - Episode number
- `slug` - Episode slug/identifier
- `title` - Episode title
- `japanese_title` - Japanese episode title (if available)
- `token` - Episode token for accessing servers
- `has_sub` - Whether subbed version is available
- `has_dub` - Whether dubbed version is available

---

## Usage Examples

### Example 1: Get Home Page

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/home"
```

**Response**

---

### Example 2: Get Specific Anime Details

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/anime/one-piece-dk6r"
```

Get details for "One Piece" anime including related content and trending rankings.

---

### Example 3: Get Available Servers for an Episode

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/source/dYK69qej5A"
```

Get available streaming servers (Sub, Softsub, Dub) for playing the episode.

---

### Example 4: Get Episodes for an Anime

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/episodes/tensei-shitara-slime-datta-ken-4th-season-4l47"
```

Get all episodes with their titles, tokens, and subtitle/dub availability.

**Response:**
```json
{
  "success": true,
  "slug": "tensei-shitara-slime-datta-ken-4th-season-4l47",
  "ani_id": "dYO-9g",
  "title": "That Time I Got Reincarnated as a Slime Season 4",
  "count": 4,
  "episodes": [
    {
      "number": "1",
      "slug": "1",
      "title": "New Days",
      "token": "cYTnuvrxtU7h23RB0Zvd",
      "has_sub": true,
      "has_dub": true
    },
    {
      "number": "2",
      "slug": "2",
      "title": "Episode 2",
      "token": "LtfhuvLluwbnjXRB2IyI",
      "has_sub": true,
      "has_dub": true
    },
    {
      "number": "3",
      "slug": "3",
      "title": "Episode 3",
      "token": "LNe4rufy4Unl0g",
      "has_sub": true,
      "has_dub": false
    },
    {
      "number": "4",
      "slug": "4",
      "title": "Episode 4",
      "token": "J9m4rvP44xWh0A",
      "has_sub": true,
      "has_dub": false
    }
  ]
}
```

---

### Example 5: Get Latest Anime (Default)

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/browse?page=1&limit=10"
```

Get the first 10 latest anime updates.

---

### Example 6: Filter by Type and Genre

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/browse?type[]=tv&genre[]=47&limit=20"
```

Get TV anime with Action genre (max 20 results).

---

### Example 7: Filter by Multiple Genres

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/browse?genre[]=47&genre[]=145&genre[]=34&limit=15"
```

Get anime with Action, Romance, or Fantasy genres.

---

### Example 8: Filter by Status and Year

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/browse?status[]=releasing&year[]=2024&sort=trending"
```

Get currently releasing anime from 2024, sorted by trending.

---

### Example 9: Search with Keyword

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/browse?keyword=tensei+shitara&sort=updated_date&page=1&limit=10"
```

Search for anime with "tensei shitara" in the title, showing 10 results.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tensei-shitara-slime-datta-ken-4th-season-4l47",
      "title": "That Time I Got Reincarnated as a Slime Season 4",
      "japanese_title": "Tensei Shitara Slime Datta Ken 4th Season",
      "poster": "https://static.anikai.to/99/i/4/34/69cfd740215bb@300.jpg",
      "url": "https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47",
      "current_episode": "",
      "sub_episodes": "4",
      "dub_episodes": "2",
      "type": "TV"
    },
    {
      "id": "reincarnated-as-a-dragon-hatchling-2p61w",
      "title": "Reincarnated as a Dragon Hatchling",
      "japanese_title": "Tensei Shitara Dragon no Tamago Datta",
      "poster": "https://static.anikai.to/1f/i/1/be/696b99bc98729@300.jpg",
      "url": "https://anikai.to/watch/reincarnated-as-a-dragon-hatchling-2p61w",
      "current_episode": "",
      "sub_episodes": "12",
      "dub_episodes": "6",
      "type": "TV"
    },
    {
      "id": "megami-isekai-tensei-nani-ni-naritai-desu-ka-ore-yuusha-no-rokkotsu-de-566r3",
      "title": "My Ribdiculous Reincarnation",
      "japanese_title": "Megami \"Isekai Tensei Nani ni Naritai Desu ka\" Ore \"Yuusha no Rokkotsu de\"",
      "poster": "https://static.anikai.to/64/i/1/71/69d52d67dd0e6@300.jpg",
      "url": "https://anikai.to/watch/megami-isekai-tensei-nani-ni-naritai-desu-ka-ore-yuusha-no-rokkotsu-de-566r3",
      "current_episode": "",
      "sub_episodes": "3",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "the-greatest-demon-lord-is-reborn-as-a-typical-nobody-9n05",
      "title": "The Greatest Demon Lord Is Reborn as a Typical Nobody",
      "japanese_title": "Shijou Saikyou no Daimaou, Murabito A ni Tensei suru",
      "poster": "https://static.anikai.to/f7/i/3/74/697ae74f46ee9@300.jpg",
      "url": "https://anikai.to/watch/the-greatest-demon-lord-is-reborn-as-a-typical-nobody-9n05",
      "current_episode": "",
      "sub_episodes": "12",
      "dub_episodes": "12",
      "type": "TV"
    },
    {
      "id": "tensei-shitara-dainana-ouji-datta-node-kimama-ni-majutsu-wo-kiwamemasu-41p1",
      "title": "I Was Reincarnated as the 7th Prince so I Can Take My Time Perfecting My Magical Ability",
      "japanese_title": "Tensei Shitara Dai Nana Ouji Datta node, Kimamani Majutsu wo Kiwamemasu",
      "poster": "https://static.anikai.to/48/i/5/49/67664ac286448@300.jpg",
      "url": "https://anikai.to/watch/tensei-shitara-dainana-ouji-datta-node-kimama-ni-majutsu-wo-kiwamemasu-41p1",
      "current_episode": "",
      "sub_episodes": "12",
      "dub_episodes": "12",
      "type": "TV"
    }
  ]
}
```

---

### Example 10: Multiple Filters Combined

```bash
curl "https://anime-kai-api-main-test.vercel.app/api/browse?type[]=tv&genre[]=47&status[]=releasing&rating[]=pg_13&year[]=2024&country[]=11&sort=mal_score&limit=25"
```

Get releasing TV anime with:
- Action genre
- PG-13 rating
- From 2024
- From Japan
- Sorted by MAL score
- Max 25 results per page

---

### 3. Get Home Page (`/api/home`)

Retrieve home page data with featured banners, latest updates, and trending anime.

**Method:** `GET`

**Query Parameters:** None

**Example Request:**

```bash
GET /api/home
```

**Example Response:**

```json
{
  "Author": "Made By Leo Devil",
  "success": true,
  "banner": [
    {
      "id": "jujutsu-kaisen-shimetsu-kaiyuu-zenpen-792m",
      "title": "Jujutsu Kaisen: The Culling Game Part 1",
      "japanese_title": "Jujutsu Kaisen: Shimetsu Kaiyuu - Zenpen",
      "description": "Kenjaku, the one known as Noritoshi Kamo and most recently as Suguru Getou, has initiated the next step in his destructive, thousand-year plan of ordinary humans' evolution and eventual eradication. The jujutsu world higher-ups reinstate 15-year-old...",
      "poster": "https://static.anikai.to/50/i/f/1c/6966f8d2626fe.webp",
      "url": "https://anikai.to/watch/jujutsu-kaisen-shimetsu-kaiyuu-zenpen-792m",
      "sub_episodes": "12",
      "dub_episodes": "12",
      "type": "TV",
      "genres": "School, Shounen, Action",
      "rating": "R",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
      "title": "The Strongest Job is Apparently Not a Hero or a Sage, but an Appraiser (Provisional)!",
      "japanese_title": "Saikyou no Shokugyou wa Yuusha demo Kenja demo Naku Kanteishi (Kari) Rashii desu yo?",
      "description": "Hibiki, a high school student who was suddenly transferred to another world, wanders alone in a vast grassland of a fantasy world where monsters inhabit. All he has are non-combat skills such as \"Appraisal\"! From a hopeless situation, he is saved by...",
      "poster": "https://static.anikai.to/80/i/7/8f/69cbfb85a7cf1.webp",
      "url": "https://anikai.to/watch/the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
      "sub_episodes": "5",
      "dub_episodes": "",
      "type": "TV",
      "genres": "Adventure, Comedy, Fantasy",
      "rating": "?",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
      "title": "Classroom of the Elite IV",
      "japanese_title": "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4th Season 2-nensei-hen Ichi Gakki",
      "description": "As Ayanokouji and his classmates begin their second year at the Advanced Nurturing High School, they're greeted by a fresh gauntlet of exams and a fresh batch of rather unique first-year students. They'll have to get to know each other quickly, becau...",
      "poster": "https://static.anikai.to/2e/i/e/b7/69cd0433eb097.webp",
      "url": "https://anikai.to/watch/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
      "sub_episodes": "7",
      "dub_episodes": "5",
      "type": "TV",
      "genres": "School, Drama, Psychological",
      "rating": "PG 13",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
      "title": "The Angel Next Door Spoils Me Rotten 2",
      "japanese_title": "Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken 2nd Season",
      "description": "Second season of Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken.",
      "poster": "https://static.anikai.to/eb/i/7/3b/69cfebcf93a6a.webp",
      "url": "https://anikai.to/watch/otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
      "sub_episodes": "4",
      "dub_episodes": "",
      "type": "TV",
      "genres": "School, Slice of Life, Romance",
      "rating": "PG 13",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "tsue-to-tsurugi-no-wistoria-season-2-64mk",
      "title": "Wistoria: Wand and Sword Season 2",
      "japanese_title": "Tsue to Tsurugi no Wistoria Season 2",
      "description": "Second season of Tsue to Tsurugi no Wistoria.",
      "poster": "https://static.anikai.to/f9/i/7/27/69db5abf4ceb1.webp",
      "url": "https://anikai.to/watch/tsue-to-tsurugi-no-wistoria-season-2-64mk",
      "sub_episodes": "3",
      "dub_episodes": "1",
      "type": "TV",
      "genres": "Adventure, School, Fantasy",
      "rating": "PG 13",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "daemons-of-the-shadow-realm-qmy25",
      "title": "Daemons of the Shadow Realm",
      "japanese_title": "Yomi no Tsugai",
      "description": "In an isolated village, two twins were born, separated by day and night. It is years later, and while the older brother Yuru has become a hunter of animals, his sister Asa has been locked away in a cage, ordered to perform a special duty that prohibi...",
      "poster": "https://static.anikai.to/53/i/6/72/69d149720b08d.webp",
      "url": "https://anikai.to/watch/daemons-of-the-shadow-realm-qmy25",
      "sub_episodes": "4",
      "dub_episodes": "4",
      "type": "TV",
      "genres": "Adventure, Comedy, Fantasy",
      "rating": "?",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "witch-hat-atelier-3e32",
      "title": "Witch Hat Atelier",
      "japanese_title": "Tongari Boushi no Atelier",
      "description": "Coco, a humble dressmaker's daughter, has always been fascinated by magic and the witches who cast it, despite the strict precautions they take to hide their methods from the public. However, when Coco takes advantage of a golden chance to spy on the...",
      "poster": "https://static.anikai.to/8d/i/8/3a/69d52d3ab7898.webp",
      "url": "https://anikai.to/watch/witch-hat-atelier-3e32",
      "sub_episodes": "4",
      "dub_episodes": "4",
      "type": "TV",
      "genres": "Adventure, Fantasy, Drama",
      "rating": "PG 13",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "one-piece-dk6r",
      "title": "One Piece",
      "japanese_title": "ONE PIECE",
      "description": "Barely surviving in a barrel after passing through a terrible whirlpool at sea, carefree Monkey D. Luffy ends up aboard a ship under attack by fearsome pirates. Despite being a naive-looking teenager, he is not to be underestimated. Unmatched in batt...",
      "poster": "https://static.anikai.to/97/i/f/23/67664920ce561.webp",
      "url": "https://anikai.to/watch/one-piece-dk6r",
      "sub_episodes": "1159",
      "dub_episodes": "1155",
      "type": "TV",
      "genres": "",
      "rating": "PG 13",
      "release": "1999",
      "quality": "HD"
    },
    {
      "id": "tensei-shitara-slime-datta-ken-4th-season-4l47",
      "title": "That Time I Got Reincarnated as a Slime Season 4",
      "japanese_title": "Tensei Shitara Slime Datta Ken 4th Season",
      "description": "Demon Lord Rimuru's dream of creating an alliance between humans and monsters takes a step closer to being realized. As Tempest continues to prosper, Granville Rozzo and his granddaughter, Maribel Rozzo, clash with Demon Lord Rimuru over their plan t...",
      "poster": "https://static.anikai.to/ef/i/0/0a/69cfd767b7b2b.webp",
      "url": "https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47",
      "sub_episodes": "4",
      "dub_episodes": "2",
      "type": "TV",
      "genres": "Adventure, Comedy, Fantasy",
      "rating": "PG 13",
      "release": "2026",
      "quality": "HD"
    },
    {
      "id": "mistress-kanan-is-devilishly-easy-6e9lv",
      "title": "Mistress Kanan is Devilishly Easy",
      "japanese_title": "Kanan-sama wa Akumade Choroi",
      "description": "Kanan is a demon who descends upon the human world with one goal: to feast on the sweetest delicacy of all—young human souls. Disguised as a high schooler, she sets her sights on her first target, an unassuming boy named Youji Kyougi. But just as she...",
      "poster": "https://static.anikai.to/79/i/d/be/69d13b8058f82.webp",
      "url": "https://anikai.to/watch/mistress-kanan-is-devilishly-easy-6e9lv",
      "sub_episodes": "4",
      "dub_episodes": "2",
      "type": "TV",
      "genres": "Comedy, Ecchi, School",
      "rating": "?",
      "release": "2026",
      "quality": "HD"
    }
  ],
  "latest_updates": [
    {
      "id": "cheng-he-titong-2nd-season-n99k",
      "title": "How Dare You!? Season 2",
      "japanese_title": "Cheng He Titong 2",
      "poster": "https://static.anikai.to/e6/i/e/6b/6863f4ec59ac8@300.jpg",
      "url": "https://anikai.to/watch/cheng-he-titong-2nd-season-n99k",
      "current_episode": "",
      "sub_episodes": "16",
      "dub_episodes": "",
      "type": "ONA"
    },
    {
      "id": "ingoku-danchi-6eemx",
      "title": "Ingoku Danchi:Deviant's Apartment Complex",
      "japanese_title": "Ingoku Danchi",
      "poster": "https://static.anikai.to/f9/i/4/0c/69d289ba75bb4@300.jpg",
      "url": "https://anikai.to/watch/ingoku-danchi-6eemx",
      "current_episode": "",
      "sub_episodes": "4",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "one-piece-dk6r",
      "title": "One Piece",
      "japanese_title": "ONE PIECE",
      "poster": "https://static.anikai.to/c0/i/2/39/68419c0e23575@300.jpg",
      "url": "https://anikai.to/watch/one-piece-dk6r",
      "current_episode": "",
      "sub_episodes": "1159",
      "dub_episodes": "1155",
      "type": "TV"
    },
    {
      "id": "renegade-immortal-qxq7",
      "title": "Renegade Immortal",
      "japanese_title": "Xian Ni",
      "poster": "https://static.anikai.to/8a/i/a/8e/699b2920aea8c@300.jpg",
      "url": "https://anikai.to/watch/renegade-immortal-qxq7",
      "current_episode": "",
      "sub_episodes": "138",
      "dub_episodes": "",
      "type": "ONA"
    },
    {
      "id": "ghost-concert-missing-songs-n661k",
      "title": "Ghost Concert: Missing Songs",
      "japanese_title": "Ghost Concert: missing Songs",
      "poster": "https://static.anikai.to/b3/i/c/f3/69d24bd8b09ff@300.jpg",
      "url": "https://anikai.to/watch/ghost-concert-missing-songs-n661k",
      "current_episode": "",
      "sub_episodes": "4",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "the-classroom-of-a-black-cat-and-a-witch-vwp0k",
      "title": "The Classroom of a Black Cat and a Witch",
      "japanese_title": "Kuroneko to Majo no Kyoushitsu",
      "poster": "https://static.anikai.to/f6/i/c/34/69db8b1e4cd3f@300.jpg",
      "url": "https://anikai.to/watch/the-classroom-of-a-black-cat-and-a-witch-vwp0k",
      "current_episode": "",
      "sub_episodes": "3",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "the-food-diary-of-miss-maid-n6mvj",
      "title": "The Food Diary of Miss Maid",
      "japanese_title": "Maid-san wa Taberu dake",
      "poster": "https://static.anikai.to/9b/i/8/41/68c9717806574@300.jpg",
      "url": "https://anikai.to/watch/the-food-diary-of-miss-maid-n6mvj",
      "current_episode": "",
      "sub_episodes": "5",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "nippon-sangoku-rkkm9",
      "title": "Nippon Sangoku: The Three Nations of the Crimson Sun",
      "japanese_title": "Nippon Sangoku",
      "poster": "https://static.anikai.to/f3/i/2/c5/69d2528e910a2@300.jpg",
      "url": "https://anikai.to/watch/nippon-sangoku-rkkm9",
      "current_episode": "",
      "sub_episodes": "4",
      "dub_episodes": "4",
      "type": "TV"
    },
    {
      "id": "yozakura-san-chi-no-daisakusen-2nd-season-gke3",
      "title": "Mission: Yozakura Family Season 2",
      "japanese_title": "Yozakura-san Chi no Daisakusen 2nd Season",
      "poster": "https://static.anikai.to/8b/i/3/41/69db6f17d96d0@300.jpg",
      "url": "https://anikai.to/watch/yozakura-san-chi-no-daisakusen-2nd-season-gke3",
      "current_episode": "",
      "sub_episodes": "3",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "rooster-fighter-km2l",
      "title": "Rooster Fighter",
      "japanese_title": "Niwatori Fighter",
      "poster": "https://static.anikai.to/d0/i/8/11/69b6655db4ee7@300.jpg",
      "url": "https://anikai.to/watch/rooster-fighter-km2l",
      "current_episode": "",
      "sub_episodes": "7",
      "dub_episodes": "7",
      "type": "TV"
    },
    {
      "id": "diamond-no-ace-act-ii-second-season-yew6",
      "title": "Ace of Diamond Act II Season 2",
      "japanese_title": "Diamond no Ace act II: Second Season",
      "poster": "https://static.anikai.to/66/i/e/3b/69d22ba17316c@300.jpg",
      "url": "https://anikai.to/watch/diamond-no-ace-act-ii-second-season-yew6",
      "current_episode": "",
      "sub_episodes": "4",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "tsue-to-tsurugi-no-wistoria-season-2-64mk",
      "title": "Wistoria: Wand and Sword Season 2",
      "japanese_title": "Tsue to Tsurugi no Wistoria Season 2",
      "poster": "https://static.anikai.to/82/i/8/fb/69db5a708ca6c@300.jpg",
      "url": "https://anikai.to/watch/tsue-to-tsurugi-no-wistoria-season-2-64mk",
      "current_episode": "",
      "sub_episodes": "3",
      "dub_episodes": "1",
      "type": "TV"
    },
    {
      "id": "digimon-beatbreak-xj2m",
      "title": "Digimon Beatbreak",
      "japanese_title": "DIGIMON BEATBREAK",
      "poster": "https://static.anikai.to/ca/i/e/c9/68e1ea665bf2f@300.jpg",
      "url": "https://anikai.to/watch/digimon-beatbreak-xj2m",
      "current_episode": "",
      "sub_episodes": "28",
      "dub_episodes": "20",
      "type": "TV"
    },
    {
      "id": "the-other-side-of-deep-space-6e9jk",
      "title": "The Other Side of Deep Space",
      "japanese_title": "Shen Kong Bian",
      "poster": "https://static.anikai.to/e9/i/6/9f/696c518a7000c@300.jpg",
      "url": "https://anikai.to/watch/the-other-side-of-deep-space-6e9jk",
      "current_episode": "",
      "sub_episodes": "17",
      "dub_episodes": "",
      "type": "ONA"
    },
    {
      "id": "star-detective-precure-35yj9",
      "title": "Star Detective Precure!",
      "japanese_title": "Meitantei Precure!",
      "poster": "https://static.anikai.to/13/i/0/12/697ec2f1bbfce@300.jpg",
      "url": "https://anikai.to/watch/star-detective-precure-35yj9",
      "current_episode": "",
      "sub_episodes": "13",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "bakusou-kyoudai-lets-go-max-n9y9",
      "title": "Bakusou Kyoudai Let's & Go MAX",
      "japanese_title": "Bakusou Kyoudai Let's & Go!! MAX",
      "poster": "https://static.anikai.to/70/i/8/35/67a39f063ce79@300.jpg",
      "url": "https://anikai.to/watch/bakusou-kyoudai-lets-go-max-n9y9",
      "current_episode": "",
      "sub_episodes": "10",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "ichijouma-mankitsugurashi-vwwym",
      "title": "Ichijyoma Mankitsu Gurashi!",
      "japanese_title": "Ichijouma Mankitsu Gurashi!",
      "poster": "https://static.anikai.to/27/i/3/b6/69da81d93e21b@300.jpg",
      "url": "https://anikai.to/watch/ichijouma-mankitsugurashi-vwwym",
      "current_episode": "",
      "sub_episodes": "3",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "needy-girl-overdose-35yl3",
      "title": "Needy Girl Overdose",
      "japanese_title": "NEEDY GIRL OVERDOSE",
      "poster": "https://static.anikai.to/91/i/c/cd/69d13cc92294a@300.jpg",
      "url": "https://anikai.to/watch/needy-girl-overdose-35yl3",
      "current_episode": "",
      "sub_episodes": "4",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "scum-of-the-brave-kvxl",
      "title": "Scum of the Brave",
      "japanese_title": "Yuusha no Kuzu",
      "poster": "https://static.anikai.to/a8/i/5/47/6962816473307@300.jpg",
      "url": "https://anikai.to/watch/scum-of-the-brave-kvxl",
      "current_episode": "",
      "sub_episodes": "15",
      "dub_episodes": "",
      "type": "TV"
    },
    {
      "id": "agents-of-the-four-seasons-g4xe",
      "title": "Agents of the Four Seasons: Dance of Spring",
      "japanese_title": "Shunkashuutou Daikousha: Haru no Mai",
      "poster": "https://static.anikai.to/e6/i/b/83/69c804e9bae5f@300.jpg",
      "url": "https://anikai.to/watch/agents-of-the-four-seasons-g4xe",
      "current_episode": "",
      "sub_episodes": "5",
      "dub_episodes": "3",
      "type": "TV"
    }
  ],
  "top_trending": {
    "NOW": [
      {
        "id": "one-piece-dk6r",
        "rank": "1",
        "title": "One Piece",
        "japanese_title": "ONE PIECE",
        "poster": "https://static.anikai.to/c0/i/2/39/68419c0e23575@300.jpg",
        "url": "https://anikai.to/watch/one-piece-dk6r",
        "sub_episodes": "1159",
        "dub_episodes": "1155",
        "type": "TV"
      },
      {
        "id": "tsue-to-tsurugi-no-wistoria-season-2-64mk",
        "rank": "2",
        "title": "Wistoria: Wand and Sword Season 2",
        "japanese_title": "Tsue to Tsurugi no Wistoria Season 2",
        "poster": "https://static.anikai.to/82/i/8/fb/69db5a708ca6c@300.jpg",
        "url": "https://anikai.to/watch/tsue-to-tsurugi-no-wistoria-season-2-64mk",
        "sub_episodes": "3",
        "dub_episodes": "1",
        "type": "TV"
      },
      {
        "id": "daemons-of-the-shadow-realm-qmy25",
        "rank": "3",
        "title": "Daemons of the Shadow Realm",
        "japanese_title": "Yomi no Tsugai",
        "poster": "https://static.anikai.to/47/i/c/89/69d12f70ab517@300.jpg",
        "url": "https://anikai.to/watch/daemons-of-the-shadow-realm-qmy25",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "tensei-shitara-slime-datta-ken-4th-season-4l47",
        "rank": "4",
        "title": "That Time I Got Reincarnated as a Slime Season 4",
        "japanese_title": "Tensei Shitara Slime Datta Ken 4th Season",
        "poster": "https://static.anikai.to/99/i/4/34/69cfd740215bb@300.jpg",
        "url": "https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47",
        "sub_episodes": "4",
        "dub_episodes": "2",
        "type": "TV"
      },
      {
        "id": "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "rank": "5",
        "title": "Classroom of the Elite IV",
        "japanese_title": "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4th Season 2-nensei-hen Ichi Gakki",
        "poster": "https://static.anikai.to/05/i/6/44/681b448f3900c@300.jpg",
        "url": "https://anikai.to/watch/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "sub_episodes": "7",
        "dub_episodes": "5",
        "type": "TV"
      },
      {
        "id": "the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
        "rank": "6",
        "title": "The Strongest Job is Apparently Not a Hero or a Sage, but an Appraiser (Provisional)!",
        "japanese_title": "Saikyou no Shokugyou wa Yuusha demo Kenja demo Naku Kanteishi (Kari) Rashii desu yo?",
        "poster": "https://static.anikai.to/b7/i/7/fe/69cbf6e7d8ae6@300.jpg",
        "url": "https://anikai.to/watch/the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
        "sub_episodes": "5",
        "dub_episodes": "",
        "type": "TV"
      },
      {
        "id": "mistress-kanan-is-devilishly-easy-6e9lv",
        "rank": "7",
        "title": "Mistress Kanan is Devilishly Easy",
        "japanese_title": "Kanan-sama wa Akumade Choroi",
        "poster": "https://static.anikai.to/ce/i/5/e7/69d13b2de22b5@300.jpg",
        "url": "https://anikai.to/watch/mistress-kanan-is-devilishly-easy-6e9lv",
        "sub_episodes": "4",
        "dub_episodes": "2",
        "type": "TV"
      },
      {
        "id": "witch-hat-atelier-3e32",
        "rank": "8",
        "title": "Witch Hat Atelier",
        "japanese_title": "Tongari Boushi no Atelier",
        "poster": "https://static.anikai.to/0c/i/9/59/69d52d02a6610@300.jpg",
        "url": "https://anikai.to/watch/witch-hat-atelier-3e32",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "rank": "9",
        "title": "The Angel Next Door Spoils Me Rotten 2",
        "japanese_title": "Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken 2nd Season",
        "poster": "https://static.anikai.to/b8/i/d/8c/69cfd2d39aa39@300.jpg",
        "url": "https://anikai.to/watch/otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "sub_episodes": "4",
        "dub_episodes": "",
        "type": "TV"
      }
    ],
    "DAY": [
      {
        "id": "one-piece-dk6r",
        "rank": "1",
        "title": "One Piece",
        "japanese_title": "ONE PIECE",
        "poster": "https://static.anikai.to/c0/i/2/39/68419c0e23575@300.jpg",
        "url": "https://anikai.to/watch/one-piece-dk6r",
        "sub_episodes": "1159",
        "dub_episodes": "1155",
        "type": "TV"
      },
      {
        "id": "tsue-to-tsurugi-no-wistoria-season-2-64mk",
        "rank": "2",
        "title": "Wistoria: Wand and Sword Season 2",
        "japanese_title": "Tsue to Tsurugi no Wistoria Season 2",
        "poster": "https://static.anikai.to/82/i/8/fb/69db5a708ca6c@300.jpg",
        "url": "https://anikai.to/watch/tsue-to-tsurugi-no-wistoria-season-2-64mk",
        "sub_episodes": "3",
        "dub_episodes": "1",
        "type": "TV"
      },
      {
        "id": "daemons-of-the-shadow-realm-qmy25",
        "rank": "3",
        "title": "Daemons of the Shadow Realm",
        "japanese_title": "Yomi no Tsugai",
        "poster": "https://static.anikai.to/47/i/c/89/69d12f70ab517@300.jpg",
        "url": "https://anikai.to/watch/daemons-of-the-shadow-realm-qmy25",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "tensei-shitara-slime-datta-ken-4th-season-4l47",
        "rank": "4",
        "title": "That Time I Got Reincarnated as a Slime Season 4",
        "japanese_title": "Tensei Shitara Slime Datta Ken 4th Season",
        "poster": "https://static.anikai.to/99/i/4/34/69cfd740215bb@300.jpg",
        "url": "https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47",
        "sub_episodes": "4",
        "dub_episodes": "2",
        "type": "TV"
      },
      {
        "id": "the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
        "rank": "5",
        "title": "The Strongest Job is Apparently Not a Hero or a Sage, but an Appraiser (Provisional)!",
        "japanese_title": "Saikyou no Shokugyou wa Yuusha demo Kenja demo Naku Kanteishi (Kari) Rashii desu yo?",
        "poster": "https://static.anikai.to/b7/i/7/fe/69cbf6e7d8ae6@300.jpg",
        "url": "https://anikai.to/watch/the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
        "sub_episodes": "5",
        "dub_episodes": "",
        "type": "TV"
      },
      {
        "id": "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "rank": "6",
        "title": "Classroom of the Elite IV",
        "japanese_title": "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4th Season 2-nensei-hen Ichi Gakki",
        "poster": "https://static.anikai.to/05/i/6/44/681b448f3900c@300.jpg",
        "url": "https://anikai.to/watch/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "sub_episodes": "7",
        "dub_episodes": "5",
        "type": "TV"
      },
      {
        "id": "mistress-kanan-is-devilishly-easy-6e9lv",
        "rank": "7",
        "title": "Mistress Kanan is Devilishly Easy",
        "japanese_title": "Kanan-sama wa Akumade Choroi",
        "poster": "https://static.anikai.to/ce/i/5/e7/69d13b2de22b5@300.jpg",
        "url": "https://anikai.to/watch/mistress-kanan-is-devilishly-easy-6e9lv",
        "sub_episodes": "4",
        "dub_episodes": "2",
        "type": "TV"
      },
      {
        "id": "witch-hat-atelier-3e32",
        "rank": "8",
        "title": "Witch Hat Atelier",
        "japanese_title": "Tongari Boushi no Atelier",
        "poster": "https://static.anikai.to/0c/i/9/59/69d52d02a6610@300.jpg",
        "url": "https://anikai.to/watch/witch-hat-atelier-3e32",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "rank": "9",
        "title": "The Angel Next Door Spoils Me Rotten 2",
        "japanese_title": "Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken 2nd Season",
        "poster": "https://static.anikai.to/b8/i/d/8c/69cfd2d39aa39@300.jpg",
        "url": "https://anikai.to/watch/otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "sub_episodes": "4",
        "dub_episodes": "",
        "type": "TV"
      }
    ],
    "WEEK": [
      {
        "id": "one-piece-dk6r",
        "rank": "1",
        "title": "One Piece",
        "japanese_title": "ONE PIECE",
        "poster": "https://static.anikai.to/c0/i/2/39/68419c0e23575@300.jpg",
        "url": "https://anikai.to/watch/one-piece-dk6r",
        "sub_episodes": "1159",
        "dub_episodes": "1155",
        "type": "TV"
      },
      {
        "id": "tensei-shitara-slime-datta-ken-4th-season-4l47",
        "rank": "2",
        "title": "That Time I Got Reincarnated as a Slime Season 4",
        "japanese_title": "Tensei Shitara Slime Datta Ken 4th Season",
        "poster": "https://static.anikai.to/99/i/4/34/69cfd740215bb@300.jpg",
        "url": "https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47",
        "sub_episodes": "4",
        "dub_episodes": "2",
        "type": "TV"
      },
      {
        "id": "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "rank": "3",
        "title": "Classroom of the Elite IV",
        "japanese_title": "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4th Season 2-nensei-hen Ichi Gakki",
        "poster": "https://static.anikai.to/05/i/6/44/681b448f3900c@300.jpg",
        "url": "https://anikai.to/watch/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "sub_episodes": "7",
        "dub_episodes": "5",
        "type": "TV"
      },
      {
        "id": "rezero-kara-hajimeru-isekai-seikatsu-4th-season-8lj0",
        "rank": "4",
        "title": "Re:ZERO -Starting Life in Another World- Season 4",
        "japanese_title": "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season",
        "poster": "https://static.anikai.to/e8/i/6/51/69d6643067ed6@300.jpg",
        "url": "https://anikai.to/watch/rezero-kara-hajimeru-isekai-seikatsu-4th-season-8lj0",
        "sub_episodes": "3",
        "dub_episodes": "3",
        "type": "TV"
      },
      {
        "id": "witch-hat-atelier-3e32",
        "rank": "5",
        "title": "Witch Hat Atelier",
        "japanese_title": "Tongari Boushi no Atelier",
        "poster": "https://static.anikai.to/0c/i/9/59/69d52d02a6610@300.jpg",
        "url": "https://anikai.to/watch/witch-hat-atelier-3e32",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "tsue-to-tsurugi-no-wistoria-season-2-64mk",
        "rank": "6",
        "title": "Wistoria: Wand and Sword Season 2",
        "japanese_title": "Tsue to Tsurugi no Wistoria Season 2",
        "poster": "https://static.anikai.to/82/i/8/fb/69db5a708ca6c@300.jpg",
        "url": "https://anikai.to/watch/tsue-to-tsurugi-no-wistoria-season-2-64mk",
        "sub_episodes": "3",
        "dub_episodes": "1",
        "type": "TV"
      },
      {
        "id": "daemons-of-the-shadow-realm-qmy25",
        "rank": "7",
        "title": "Daemons of the Shadow Realm",
        "japanese_title": "Yomi no Tsugai",
        "poster": "https://static.anikai.to/47/i/c/89/69d12f70ab517@300.jpg",
        "url": "https://anikai.to/watch/daemons-of-the-shadow-realm-qmy25",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "i-made-friends-with-the-second-prettiest-girl-in-my-class-1989",
        "rank": "8",
        "title": "I Made Friends with the Second Prettiest Girl in My Class",
        "japanese_title": "Class de 2-banme ni Kawaii Onnanoko to Tomodachi ni Natta",
        "poster": "https://static.anikai.to/4e/i/4/d1/69d51fbf3aaad@300.jpg",
        "url": "https://anikai.to/watch/i-made-friends-with-the-second-prettiest-girl-in-my-class-1989",
        "sub_episodes": "3",
        "dub_episodes": "",
        "type": "TV"
      },
      {
        "id": "otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "rank": "9",
        "title": "The Angel Next Door Spoils Me Rotten 2",
        "japanese_title": "Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken 2nd Season",
        "poster": "https://static.anikai.to/b8/i/d/8c/69cfd2d39aa39@300.jpg",
        "url": "https://anikai.to/watch/otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "sub_episodes": "4",
        "dub_episodes": "",
        "type": "TV"
      }
    ],
    "MONTH": [
      {
        "id": "one-piece-dk6r",
        "rank": "1",
        "title": "One Piece",
        "japanese_title": "ONE PIECE",
        "poster": "https://static.anikai.to/c0/i/2/39/68419c0e23575@300.jpg",
        "url": "https://anikai.to/watch/one-piece-dk6r",
        "sub_episodes": "1159",
        "dub_episodes": "1155",
        "type": "TV"
      },
      {
        "id": "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "rank": "2",
        "title": "Classroom of the Elite IV",
        "japanese_title": "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4th Season 2-nensei-hen Ichi Gakki",
        "poster": "https://static.anikai.to/05/i/6/44/681b448f3900c@300.jpg",
        "url": "https://anikai.to/watch/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki-e4w9",
        "sub_episodes": "7",
        "dub_episodes": "5",
        "type": "TV"
      },
      {
        "id": "tensei-shitara-slime-datta-ken-4th-season-4l47",
        "rank": "3",
        "title": "That Time I Got Reincarnated as a Slime Season 4",
        "japanese_title": "Tensei Shitara Slime Datta Ken 4th Season",
        "poster": "https://static.anikai.to/99/i/4/34/69cfd740215bb@300.jpg",
        "url": "https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47",
        "sub_episodes": "4",
        "dub_episodes": "2",
        "type": "TV"
      },
      {
        "id": "witch-hat-atelier-3e32",
        "rank": "4",
        "title": "Witch Hat Atelier",
        "japanese_title": "Tongari Boushi no Atelier",
        "poster": "https://static.anikai.to/0c/i/9/59/69d52d02a6610@300.jpg",
        "url": "https://anikai.to/watch/witch-hat-atelier-3e32",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "daemons-of-the-shadow-realm-qmy25",
        "rank": "5",
        "title": "Daemons of the Shadow Realm",
        "japanese_title": "Yomi no Tsugai",
        "poster": "https://static.anikai.to/47/i/c/89/69d12f70ab517@300.jpg",
        "url": "https://anikai.to/watch/daemons-of-the-shadow-realm-qmy25",
        "sub_episodes": "4",
        "dub_episodes": "4",
        "type": "TV"
      },
      {
        "id": "rezero-kara-hajimeru-isekai-seikatsu-4th-season-8lj0",
        "rank": "6",
        "title": "Re:ZERO -Starting Life in Another World- Season 4",
        "japanese_title": "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season",
        "poster": "https://static.anikai.to/e8/i/6/51/69d6643067ed6@300.jpg",
        "url": "https://anikai.to/watch/rezero-kara-hajimeru-isekai-seikatsu-4th-season-8lj0",
        "sub_episodes": "3",
        "dub_episodes": "3",
        "type": "TV"
      },
      {
        "id": "otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "rank": "7",
        "title": "The Angel Next Door Spoils Me Rotten 2",
        "japanese_title": "Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken 2nd Season",
        "poster": "https://static.anikai.to/b8/i/d/8c/69cfd2d39aa39@300.jpg",
        "url": "https://anikai.to/watch/otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2-39rx",
        "sub_episodes": "4",
        "dub_episodes": "",
        "type": "TV"
      },
      {
        "id": "the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
        "rank": "8",
        "title": "The Strongest Job is Apparently Not a Hero or a Sage, but an Appraiser (Provisional)!",
        "japanese_title": "Saikyou no Shokugyou wa Yuusha demo Kenja demo Naku Kanteishi (Kari) Rashii desu yo?",
        "poster": "https://static.anikai.to/b7/i/7/fe/69cbf6e7d8ae6@300.jpg",
        "url": "https://anikai.to/watch/the-strongest-job-is-apparently-not-a-hero-or-a-sage-8rey0",
        "sub_episodes": "5",
        "dub_episodes": "",
        "type": "TV"
      },
      {
        "id": "saikyou-no-ousama-nidome-no-jinsei-wa-nani-wo-suru-season-2-8rek0",
        "rank": "9",
        "title": "The Beginning After the End Season 2",
        "japanese_title": "Saikyou no Ousama, Nidome no Jinsei wa Nani wo Suru? 2nd Season",
        "poster": "https://static.anikai.to/d3/i/6/d4/69cd4608a8a48@300.jpg",
        "url": "https://anikai.to/watch/saikyou-no-ousama-nidome-no-jinsei-wa-nani-wo-suru-season-2-8rek0",
        "sub_episodes": "4",
        "dub_episodes": "2",
        "type": "TV"
      }
    ]
  }
}
```

---

### 4. Get Anime Details (`/api/anime/[slug]`)

Retrieve detailed information for a specific anime including banners, latest updates, and trending data.

**Method:** `GET`

**Parameters:**
- `slug` (required, URL parameter) - Anime slug/ID (e.g., `tensei-shitara-slime-datta-ken-4th-season-4l47`)

**Example Request:**

```bash
GET /api/anime/tensei-shitara-slime-datta-ken-4th-season-4l47
```

**Example Response:**

```json
{
  "success": true,
  "banner": [
    {
      "id": "tensei-shitara-slime-datta-ken-4th-season-4l47",
      "title": "That Time I Got Reincarnated as a Slime Season 4",
      "japanese_title": "Tensei Shitara Slime Datta Ken 4th Season",
      "description": "Demon Lord Rimuru's dream of creating an alliance...",
      "poster": "https://static.anikai.to/ef/i/0/0a/69cfd767b7b2b.webp",
      "url": "https://anikai.to/watch/tensei-shitara-slime-datta-ken-4th-season-4l47",
      "sub_episodes": "4",
      "dub_episodes": "2",
      "type": "TV",
      "genres": "Adventure, Comedy, Fantasy",
      "rating": "PG 13",
      "release": "2026",
      "quality": "HD"
    }
  ],
  "latest_updates": [
    {
      "id": "rooster-fighter-km2l",
      "title": "Rooster Fighter",
      "japanese_title": "Niwatori Fighter",
      "poster": "https://static.anikai.to/...",
      "url": "https://anikai.to/watch/rooster-fighter-km2l",
      "current_episode": "7",
      "sub_episodes": "7",
      "dub_episodes": "7",
      "type": "TV"
    }
  ],
  "top_trending": {
    "NOW": [...],
    "DAY": [...],
    "WEEK": [...],
    "MONTH": [...]
  }
}
```

---

### 5. Get Episode Servers (`/api/source/[linkId]`)

Retrieve available streaming servers for a specific episode/link.

**Method:** `GET`

**Parameters:**
- `linkId` (required, URL parameter) - Link ID for the episode (e.g., `dYK69qej5A`)

**Example Request:**

```bash
GET /api/source/dYK69qej5A
```

**Example Response:**

```json
{
  "success": true,
  "watching": "You are watching Episode 1",
  "servers": {
    "sub": [
      {
        "name": "Server 1",
        "server_id": "3",
        "episode_id": "cIW48aWn",
        "link_id": "dYK69qej5A"
      },
      {
        "name": "Server 2",
        "server_id": "2",
        "episode_id": "cIW48aWn",
        "link_id": "dYK69qej4w"
      }
    ],
    "softsub": [
      {
        "name": "Server 1",
        "server_id": "3",
        "episode_id": "cIW48aWo",
        "link_id": "dYK69qej4A"
      },
      {
        "name": "Server 2",
        "server_id": "2",
        "episode_id": "cIW48aWo",
        "link_id": "dYK69qei6Q"
      }
    ],
    "dub": [
      {
        "name": "Server 1",
        "server_id": "3",
        "episode_id": "cIW496ek",
        "link_id": "dYK6-KWn4A"
      },
      {
        "name": "Server 2",
        "server_id": "2",
        "episode_id": "cIW496ek",
        "link_id": "dYK6-KWm6Q"
      }
    ]
  }
}
```

**Server Fields:**
- `name` - Server/provider name
- `server_id` - Internal server identifier
- `episode_id` - Episode identifier
- `link_id` - Link ID to resolve video source

---

All endpoints return a JSON response with the following structure:

**Success Response:**
```json
{
  "success": true,
  "data": [...]
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Rate Limiting

- Cache is set to 60 seconds for browse results
- Cache is set to 3600 seconds (1 hour) for filters
- No explicit rate limiting currently implemented

---

## Field Descriptions

**LatestItem fields:**
- `id` - Unique anime identifier (used in watch URLs)
- `title` - English/romanized anime title
- `japanese_title` - Japanese anime title
- `poster` - URL to poster image
- `url` - Full URL to anime watch page
- `current_episode` - Episode number currently being watched (if applicable)
- `sub_episodes` - Total number of subbed episodes available
- `dub_episodes` - Total number of dubbed episodes available
- `type` - Anime type (TV, Movie, OVA, ONA, Special, Music)

---

## Implementation Tips

### Full Workflow Example: Displaying an Anime and Playing an Episode

**Step 1: Fetch home page for UI**
```bash
GET /api/home
```

**Step 2: User clicks on an anime**
```bash
GET /api/anime/one-piece-dk6r
```

**Step 3: User selects an episode and language**
```bash
# Get servers for that episode
GET /api/source/dYK69qej5A
```

**Step 4: User selects a server**
```bash
# Use the server_id and episode_id to get the actual video player
# This depends on your player implementation
```

---

### JavaScript/TypeScript Example:

```typescript
// Fetch home page data
const homeData = await fetch('/api/home').then(r => r.json());

// Display featured anime from banner
homeData.banner.forEach(anime => {
  console.log(`${anime.title} - ${anime.rating}`);
});

// Get anime details when user clicks on it
const slug = 'one-piece-dk6r';
const animeDetail = await fetch(`/api/anime/${slug}`).then(r => r.json());

// Get available servers for an episode
const linkId = 'dYK69qej5A';
const servers = await fetch(`/api/source/${linkId}`).then(r => r.json());

// Display available servers
servers.servers.sub.forEach(server => {
  console.log(`${server.name} - Link ID: ${server.link_id}`);
});
```

### Python Example:

```python
import requests

# Fetch home page
home = requests.get('https://anime-kai-api-main-test.vercel.app/api/home').json()
print(f"Banner anime: {len(home['banner'])} items")
print(f"Latest updates: {len(home['latest_updates'])} items")

# Get anime details
anime = requests.get('https://anime-kai-api-main-test.vercel.app/api/anime/one-piece-dk6r').json()
print(f"Anime: {anime['banner'][0]['title']}")
print(f"Episodes: {anime['banner'][0]['sub_episodes']} sub, {anime['banner'][0]['dub_episodes']} dub")

# Get available servers
servers = requests.get('https://anime-kai-api-main-test.vercel.app/api/source/dYK69qej5A').json()
for lang, server_list in servers['servers'].items():
    print(f"\n{lang.upper()} servers:")
    for server in server_list:
        print(f"  - {server['name']}")
```

### React Component Example:

```jsx
import { useEffect, useState } from 'react';

export function AnimeHome() {
  const [home, setHome] = useState(null);

  useEffect(() => {
    fetch('/api/home')
      .then(r => r.json())
      .then(data => setHome(data));
  }, []);

  if (!home) return <div>Loading...</div>;

  return (
    <div>
      <h1>Featured Anime</h1>
      <div className="banner">
        {home.banner.map(anime => (
          <div key={anime.id} className="banner-item">
            <img src={anime.poster} alt={anime.title} />
            <h2>{anime.title}</h2>
            <p>{anime.description}</p>
            <span>{anime.rating} • {anime.genres}</span>
          </div>
        ))}
      </div>

      <h1>Latest Updates</h1>
      <div className="latest">
        {home.latest_updates.map(anime => (
          <div key={anime.id} className="latest-item">
            <img src={anime.poster} alt={anime.title} />
            <h3>{anime.title}</h3>
            <p>{anime.sub_episodes} Sub • {anime.dub_episodes} Dub</p>
          </div>
        ))}
      </div>

      <h1>Trending Now</h1>
      <ol>
        {home.top_trending.NOW.map(anime => (
          <li key={anime.id}>
            #{anime.rank} - {anime.title}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

---

## Notes

- All filter values should be URL-encoded when making requests
- Array parameters use `[]` notation (e.g., `genre[]`, `type[]`)
- Multiple values for the same parameter can be added by repeating the parameter
- The API respects the browser page structure and filter availability
- Filter options are cached for 1 hour to reduce server load
- Maximum limit is 100 items per page (pagination caps at 453 pages)

