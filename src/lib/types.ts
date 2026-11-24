// src/lib/types.ts
// Anikoto Scrap API types (anikoto-scrap.vercel.app/api)

// ─── Shared / List Items ─────────────────────────────────────────────────────

export type AnimeListItem = {
  id?: string;
  slug?: string;
  title: string;
  titleJp?: string;
  image?: string;
  href?: string;
  watchUrl?: string;
  watchHref?: string;
  type?: string;
  episodes?: {
    sub?: number;
    dub?: number;
    total?: number;
  };
  rank?: number;
  rating?: string;
  quality?: string;
  hasDub?: boolean;
  hasSub?: boolean;
  date?: string;
  synopsis?: string;
  score?: number | string;
};

// Helper function to extract slug from AnimeListItem
export function getAnimeSlug(anime: AnimeListItem): string {
  if (anime.slug) return anime.slug;
  
  if (anime.href) {
    const parts = anime.href.split('/').filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  if (anime.watchHref) {
    const match = anime.watchHref.match(/watch\/([^/]+)/);
    if (match?.[1]) return match[1];
  }
  
  return anime.id || '';
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export type HomeData = {
  spotlight?: AnimeListItem[];
  latestEpisodes?: AnimeListItem[];
  newRelease?: AnimeListItem[];
  newAdded?: AnimeListItem[];
  justCompleted?: AnimeListItem[];
  topDay?: AnimeListItem[];
  topWeek?: AnimeListItem[];
  topMonth?: AnimeListItem[];
};

// ─── Anime Detail ─────────────────────────────────────────────────────────────

export type RelatedAnime = {
  id?: string;
  title: string;
  titleJp?: string;
  image?: string;
  href?: string;
  slug?: string;
  relation?: string;
};

export type AnimeDetail = {
  id?: string;
  slug?: string;
  title?: string;
  titleJp?: string;
  alternativeTitles?: string[];
  image?: string;
  rating?: string;
  quality?: string;
  hasDub?: boolean;
  hasSub?: boolean;
  synopsis?: string;
  type?: string;
  premiered?: string;
  aired?: string;
  status?: string;
  genres?: string[];
  malScore?: number;
  duration?: string;
  episodeCount?: number | null;
  studios?: string[];
  producers?: string[];
  watchUrl?: string;
  related?: RelatedAnime[];
};

export type AnimeTooltipData = {
  id: string;
  slug: string;
  title: string;
  titleJp?: string;
  rating?: string;
  quality?: string;
  episodes?: {
    sub?: number;
    dub?: number;
    total?: number;
  };
  synopsis?: string;
  otherNames?: string;
  score?: number | string;
  year?: string;
  duration?: string;
  status?: string;
  genres?: string[];
  href?: string;
};

// ─── Episodes ─────────────────────────────────────────────────────────────────

export type Episode = {
  number: string;
  href?: string;
  id?: string;
  dataIds?: string;
  dataMal?: string;
  dataTimestamp?: string;
  hasDub?: boolean;
  hasSub?: boolean;
};

export type AnimeEpisodes = {
  animeId?: string;
  slug?: string;
  episodes: Episode[];
};

// ─── Watch / Streaming ────────────────────────────────────────────────────────

export type Track = {
  file?: string;
  label?: string;
  kind?: string;
  default?: boolean;
  proxyUrl?: string;
};

export type SkipInterval = {
  start: number;
  end: number;
};

export type SkipData = {
  intro?: SkipInterval;
  outro?: SkipInterval;
};

export type Source = {
  server?: string;
  type?: "sub" | "dub" | "hsub" | string;
  url?: string;
  m3u8?: string;
  referer?: string;
  proxyUrl?: string;
  tracks?: Track[];
  skip_data?: SkipData;
};

export type Server = {
  id?: string;
  name?: string;
  type?: "sub" | "dub" | "hsub" | string;
  svId?: string;
};

export type WatchData = {
  episode?: Episode;
  servers?: Server[];
  sources?: Source[];
  tracks?: Track[];
  skip_data?: SkipData;
  error?: string;
};

// ─── Browse / Search ──────────────────────────────────────────────────────────

export type BrowseResponse = {
  results?: AnimeListItem[];
  topRated?: AnimeListItem[];
  currentPage?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  maxPage?: number;
  minPage?: number;
  params?: Record<string, string>;
  options?: FilterOptions;
};

// ─── Filter Options ───────────────────────────────────────────────────────────

export type GenreOption = {
  id: string;
  name: string;
  slug: string;
};

export type FilterOptions = {
  genres?: GenreOption[];  // genre[] in URL uses id, not slug
  years?: string[];
  types?: string[];        // term_type[] in URL
  seasons?: string[];
  statuses?: string[];
  languages?: string[];
  ratings?: string[];
  sorts?: string[];
};

export type FilterOption = {
  label: string;
  value: string;
};

export type FiltersResponse = {
  type?: string[];
  genre?: string[];
  status?: string[];
  season?: string[];
  year?: string[];
};

// ─── Schedule ────────────────────────────────────────────────────────────────

export type ScheduleAnimeItem = {
  id: string;
  slug: string;
  title: string;
  titleJp?: string;
  image: string;
  href: string;
  type: string; // episode label e.g. "Episode 13"
  date: string; // airing time in the requested timezone e.g. "21:00"
};

export type ScheduleDay = {
  day: string; // e.g. "Sun Jul 05"
  animes: ScheduleAnimeItem[];
};

export type ScheduleResponse = {
  ok: boolean;
  data: ScheduleDay[];
};

// ─── Extended API Types (Discovery, Extras, Streaming, System) ────────────────

export type RankingWindow = 'day' | 'week' | 'month';

export type TopTenResult = {
  today: AnimeListItem[];
  week: AnimeListItem[];
  month: AnimeListItem[];
};

export type TrendingSidebarResult = {
  day: AnimeListItem[];
  week: AnimeListItem[];
  month: AnimeListItem[];
  latestEpisodes: AnimeListItem[];
};

export type TopRankingsResult = {
  sort: RankingWindow;
  results: AnimeListItem[];
};

export type RecentlyUpdatedResult = BrowseResponse & {
  tab: 'all' | 'sub' | 'dub';
};

export type AzListResult = BrowseResponse & {
  letter: string;
};

export type SuggestionItem = {
  id: string;
  slug: string;
  title: string;
  titleJp?: string;
  image: string;
  href: string;
  type?: string;
};

export type RandomAnime = AnimeDetail & {
  url: string;
};

export type SeasonItem = {
  title: string;
  slug: string;
  image: string;
  url: string;
  active: boolean;
};

export type AnimeSeasons = {
  animeId: string;
  slug: string | null;
  totalSeasons: number;
  seasons: SeasonItem[];
};

export type LatestEpisodeResult = {
  slug: string;
  animeId: string;
  totalEpisodes: number;
  latest: Episode;
};

export type EpisodeAjaxItem = {
  id: string;
  number: string;
  slug?: string;
  title?: string;
  titleJp?: string;
  malId?: string;
  timestamp?: string;
  dataIds?: string;
  hasSub: boolean;
  hasDub: boolean;
  active: boolean;
};

export type EpisodeAjaxResult = {
  animeId: string;
  filters: { name: string; options: { value: string; label: string }[] }[];
  ranges: string[];
  totalEpisodes: number;
  episodes: EpisodeAjaxItem[];
};

export type StreamServerItem = {
  type: string;
  typeLabel: string;
  epId: string;
  linkId: string;
  cmid: string;
  svId: string;
  name: string;
  normalizedName: string;
};

export type StreamInfo = {
  linkId: string;
  url: string | null;
  type: 'embed' | null;
  skipData: SkipData | null;
  backup: string | null;
};

export type MapperServer = {
  provider: string;
  type: 'sub' | 'dub';
  url: string | null;
  download: string | null;
};

export type StreamQuality = {
  label: string;
  width: number;
  height: number;
  bandwidth: number;
  url: string;
  proxyUrl: string;
};

export type ResolvedStream = {
  linkId: string;
  embedUrl: string;
  m3u8: string | null;
  type: 'hls' | null;
  referer: string | null;
  proxyUrl: string | null;
  qualities: StreamQuality[];
  subtitles: (Track & { proxyUrl: string })[];
  skipData: SkipData | null;
  backup: string | null;
  error?: string;
};

export type StreamQualitiesResult = {
  url: string;
  totalQualities: number;
  qualities: StreamQuality[];
};

export type EmbedsResult = {
  slug: string | null;
  episode: number;
  lang: 'sub' | 'dub';
  ids: { animeId: string; malId: string | null; anilistId: string | null };
  providers: { id: string; name: string; url: string; iframeReady: true; origin: string }[];
  unavailable: { id: string; name: string; reason: string }[];
};

export type DownloadLink = {
  server: string;
  serverGroup: string;
  type: string;
  typeLabel: string;
  url: string;
};

export type DownloadResult = {
  slug: string;
  episode: string;
  totalDownloads: number;
  downloads: DownloadLink[];
  note?: string;
};

export type MirrorStatus = {
  name: string;
  url: string;
  priority: number;
  status: 'online' | 'offline';
  latencyMs: number;
  httpStatus: number | null;
  isCurrent: boolean;
  coolingDown: boolean;
};

export type ApiHealth = {
  status: string;
  version: string;
  uptime: string;
  uptimeSeconds: number;
  timestamp: string;
  node: string;
  memory: { used: string; total: string };
};


