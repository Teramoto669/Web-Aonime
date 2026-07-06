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

export type Source = {
  server?: string;
  type?: "sub" | "dub" | "hsub" | string;
  url?: string;
  m3u8?: string;
  referer?: string;
  proxyUrl?: string;
  tracks?: Track[];
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
};

// ─── Browse / Search ──────────────────────────────────────────────────────────

export type BrowseResponse = {
  results?: AnimeListItem[];
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

