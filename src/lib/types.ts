// src/lib/types.ts
// AnimeKai API types (anime-kai-api-main-test.vercel.app/api)

// ─── Shared / List Items ─────────────────────────────────────────────────────

export type AnimeListItem = {
  id: string;
  title: string;
  japanese_title?: string;
  poster?: string;
  url?: string;
  current_episode?: string;
  sub_episodes?: string;
  dub_episodes?: string;
  type?: string;
  // Banner-specific fields (present in home.banner and anime detail)
  description?: string;
  genres?: string;
  rating?: string;
  release?: string;
  quality?: string;
  rank?: string;
};

// ─── Home ─────────────────────────────────────────────────────────────────────

export type TopTrending = {
  NOW: AnimeListItem[];
  DAY: AnimeListItem[];
  WEEK: AnimeListItem[];
  MONTH: AnimeListItem[];
};

export type HomeData = {
  success: boolean;
  banner: AnimeListItem[];
  latest_updates: AnimeListItem[];
  top_trending: TopTrending;
};

// ─── Anime Detail ─────────────────────────────────────────────────────────────

export type AnimeDetailInfo = {
  genres?: string | string[];
  date_aired?: string;
};

export type AnimeDetail = {
  success: boolean;
  al_id?: string;
  title?: string;
  description?: string;
  poster?: string;
  banner?: string;     // banner/wide image
  type?: string;
  rating?: string;
  mal_score?: string;
  detail?: AnimeDetailInfo;
  episodes?: Episode[];
};

// ─── Episodes ─────────────────────────────────────────────────────────────────

export type Episode = {
  number: string;
  slug?: string;
  title?: string;
  japanese_title?: string;
  token?: string;
  has_sub?: boolean;
  has_dub?: boolean;
};

export type AnimeEpisodes = {
  success: boolean;
  slug?: string;
  ani_id?: string;
  title?: string;
  count?: number;
  episodes: Episode[];
};

// ─── Servers & Source ─────────────────────────────────────────────────────────

export type ServerItem = {
  name?: string;
  server_id?: string;
  episode_id?: string;
  link_id?: string;
};

export type ServerCategories = {
  sub?: ServerItem[];
  softsub?: ServerItem[];
  dub?: ServerItem[];
};

export type ServersResponse = {
  success: boolean;
  watching?: string;
  servers?: ServerCategories;
};

export type VideoSource = {
  url: string;
  original_url?: string;
  isM3U8: boolean;
};

export type SkipTiming = {
  intro?: [number, number];
  outro?: [number, number];
};

export type Track = {
  kind?: string;
  url?: string;
  src?: string;
  srclang?: string;
  lang?: string;
  label?: string;
};

export type SourceResponse = {
  success: boolean;
  embed_url?: string;
  embed_origin_url?: string;
  sources?: VideoSource[];
  tracks?: Track[];
  skip?: SkipTiming;
  download?: string;
};

export type FetchVideoSourceResponse = {
  success: boolean;
  embedUrl?: string;
  m3u8Url?: string | null;
  canEmbed?: boolean;
  animeKaiUrl?: string | null;
  megaplayUrl?: string | null;
  sources?: VideoSource[];
  tracks?: Track[];
  skip?: SkipTiming;
  error?: string;
};

// ─── Browse ───────────────────────────────────────────────────────────────────

export type BrowseResponse = {
  success: boolean;
  data: AnimeListItem[];
};

export type FilterOption = {
  label: string;
  value: string;
};

export type FiltersResponse = {
  success: boolean;
  type?: FilterOption[];
  genre?: FilterOption[];
  status?: FilterOption[];
  season?: FilterOption[];
  year?: FilterOption[];
  rating?: FilterOption[];
  country?: FilterOption[];
  language?: FilterOption[];
};
