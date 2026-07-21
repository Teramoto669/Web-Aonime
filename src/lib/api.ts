// src/lib/api.ts
// Anikoto Scrap API client — https://anikoto-scrap.vercel.app/api

import type {
  HomeData,
  AnimeDetail,
  AnimeEpisodes,
  WatchData,
  BrowseResponse,
  FiltersResponse,
  ScheduleDay,
  AnimeTooltipData,
  RelatedAnime,
  AnimeListItem,
} from './types';

const BASE_URL = process.env.API_BASE_URL;
// ─── Generic fetcher ─────────────────────────────────────────────────────────

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60, ...options?.next },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} from ${url}: ${text}`);
    }
    const json = (await res.json()) as ApiResponse<T>;
    if (json.ok === false) {
      throw new Error(`API error from ${url}: ${json.message ?? 'Unknown error'}`);
    }
    return json.data as T;
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(`Unknown error fetching ${url}`);
  }
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export const getHomeData = (refresh = true): Promise<HomeData> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  return fetcher<HomeData>(`/home${params.toString() ? `?${params.toString()}` : ''}`);
};

// ─── Anime Detail ────────────────────────────────────────────────────────────

export const getAnimeDetails = (slug: string, refresh = true): Promise<AnimeDetail> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  return fetcher<AnimeDetail>(`/anime/${encodeURIComponent(slug)}?${params.toString()}`);
};

export const getAnimeRelated = (slug: string, refresh = true): Promise<RelatedAnime[]> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  const path = `/anime/${encodeURIComponent(slug)}/related${params.toString() ? `?${params.toString()}` : ''}`;
  return fetcher<RelatedAnime[]>(path);
};

export const getAnimeRecommendations = (slug: string, refresh = true): Promise<AnimeListItem[]> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  const path = `/anime/${encodeURIComponent(slug)}/recommendations${params.toString() ? `?${params.toString()}` : ''}`;
  return fetcher<AnimeListItem[]>(path);
};

export const getAnimeTooltip = (id: string, refresh = true): Promise<AnimeTooltipData> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  const path = `/anime/tooltip/${encodeURIComponent(id)}${params.toString() ? `?${params.toString()}` : ''}`;
  return fetcher<AnimeTooltipData>(path);
};

// ─── Episodes ─────────────────────────────────────────────────────────────────

export const getAnimeEpisodes = (
  slug: string,
  start?: number,
  end?: number,
  refresh = true
): Promise<AnimeEpisodes> => {
  let path = `/anime/${encodeURIComponent(slug)}/episodes`;
  const params = new URLSearchParams();
  if (start !== undefined) params.set('start', String(start));
  if (end !== undefined) params.set('end', String(end));
  if (refresh) params.set('refresh', '1');

  if (params.toString()) {
    path += `?${params.toString()}`;
  }
  return fetcher<AnimeEpisodes>(path);
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchAnime = (keyword: string, refresh = true): Promise<BrowseResponse> => {
  const params = new URLSearchParams({ keyword });
  if (refresh) params.set('refresh', '1');
  return fetcher<BrowseResponse>(`/search?${params.toString()}`);
};

// ─── Filter ───────────────────────────────────────────────────────────────────

export type FilterParams = {
  keyword?: string;
  genre?: string[];      // genre[] = genre ids
  term_type?: string[]; // term_type[] = type names (Movie, OVA, etc.)
  season?: string[];
  year?: string[];
  status?: string[];
  language?: string[];
  rating?: string[];
  sort?: string;
  page?: number;
  refresh?: boolean;
};

export const filterAnime = (params: FilterParams = {}): Promise<BrowseResponse> => {
  const hasExtraFilters =
    Boolean(params.genre?.length) ||
    Boolean(params.term_type?.length) ||
    Boolean(params.season?.length) ||
    Boolean(params.year?.length) ||
    Boolean(params.status?.length) ||
    Boolean(params.language?.length) ||
    Boolean(params.rating?.length) ||
    Boolean(params.keyword);

  if (params.sort === 'latest-updated' && !hasExtraFilters) {
    return getUpdatedAnime({
      type: 'Latest Updated',
      sort: 'latest-updated',
      page: params.page,
      refresh: true,
    });
  }

  const qs = new URLSearchParams();

  // Always set keyword, type, and sort to avoid backend 500 errors
  qs.set('keyword', params.keyword ?? '');
  qs.set('type', params.sort === 'latest-updated' ? 'Latest Updated' : '');
  qs.set('sort', params.sort ?? 'default');
  qs.set('refresh', '1'); // Always refresh=1 for browse

  if (params.page) qs.set('page', String(params.page));

  params.genre?.forEach(g => qs.append('genre[]', g));
  params.term_type?.forEach(t => qs.append('term_type[]', t));
  params.season?.forEach(s => qs.append('season[]', s));
  params.year?.forEach(y => qs.append('year[]', y));
  params.status?.forEach(st => qs.append('status[]', st));
  params.language?.forEach(l => qs.append('language[]', l));
  params.rating?.forEach(r => qs.append('rating[]', r));

  return fetcher<BrowseResponse>(`/filter?${qs.toString()}`);
};


// ─── Updated Anime ───────────────────────────────────────────────────────────

export type LatestParams = {
  type?: string;
  sort?: string;
  page?: number;
  refresh?: boolean;
};

export const getUpdatedAnime = (params: LatestParams = {}): Promise<BrowseResponse> => {
  const qs = new URLSearchParams();
  qs.set('type', params.type ?? 'Latest Updated');
  qs.set('sort', params.sort ?? 'latest-updated');
  if (params.page) qs.set('page', String(params.page));
  if (params.refresh !== false) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/updated?${qs.toString()}`);
};

export const getLatestAnime = getUpdatedAnime;

// ─── Widget Anime ────────────────────────────────────────────────────────────

export const getWidgetAnime = (name = 'updated-all', page = 1, refresh = true): Promise<BrowseResponse> => {
  const qs = new URLSearchParams();
  qs.set('name', name);
  qs.set('page', String(page));
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/widget?${qs.toString()}`);
};

// ─── Status ────────────────────────────────────────────────────────────────────

export type StatusParams = {
  type?: 'currently-airing' | 'finished-airing' | 'not-yet-aired';
  page?: number;
  refresh?: boolean;
};

export const getByStatus = (params: StatusParams = {}): Promise<BrowseResponse> => {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.page) qs.set('page', String(params.page));
  if (params.refresh !== false) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/status?${qs.toString()}`);
};

// ─── Genre ────────────────────────────────────────────────────────────────────

export const getByGenre = (genre: string, page = 1, refresh = true): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/genre/${encodeURIComponent(genre)}?${qs.toString()}`);
};

// ─── Type ─────────────────────────────────────────────────────────────────────

export const getByType = (type: string, page = 1, refresh = true): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/type/${encodeURIComponent(type)}?${qs.toString()}`);
};

// ─── Schedule ──────────────────────────────────────────────────────────────────

export const getSchedule = (tz?: number | string, refresh = true): Promise<ScheduleDay[]> => {
  const params = new URLSearchParams();
  if (tz !== undefined) params.set('tz', String(tz));
  if (refresh) params.set('refresh', '1');
  return fetcher<ScheduleDay[]>(`/schedule?${params.toString()}`);
};

// ─── Watch (Streaming Sources) ────────────────────────────────────────────────

export const getWatchData = async (slug: string, ep: string | number): Promise<WatchData> => {
  const url = `${BASE_URL}/watch/${encodeURIComponent(slug)}?ep=${ep}`;
  const res = await fetch(url, { next: { revalidate: 180 } });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${url}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  const trimmed = text.trim();

  // Try to parse the entire text as a single standard JSON response if it looks like one
  // or if the content-type is application/json.
  if (contentType.includes('application/json') || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const json = JSON.parse(trimmed);
      if (json && typeof json === 'object' && 'ok' in json) {
        if (json.ok === false) {
          throw new Error(`API error from ${url}: ${json.message ?? 'Unknown error'}`);
        }
        if (json.data) {
          return json.data as WatchData;
        }
      }
    } catch (e) {
      if (contentType.includes('application/json') || (e instanceof Error && e.message.startsWith('API error from'))) {
        throw e;
      }
    }
  }

  // Cache miss / NDJSON streaming response fallback
  // Each line is a JSON object: { type: "episode"|"servers"|"source"|"done"|"error", ... }
  const lines = trimmed.split('\n').filter(line => line.trim());

  const result: WatchData = { sources: [] };

  for (const line of lines) {
    let cleanedLine = line.trim();
    if (cleanedLine.startsWith('data:')) {
      cleanedLine = cleanedLine.substring(5).trim();
    }
    if (!cleanedLine) continue;

    try {
      const chunk = JSON.parse(cleanedLine);
      if (chunk.type === 'episode') {
        result.episode = chunk.episode;
      } else if (chunk.type === 'servers') {
        result.servers = chunk.servers;
      } else if (chunk.type === 'source') {
        result.sources!.push(chunk.source);
      } else if (chunk.type === 'skip_data' || chunk.skip_data) {
        result.skip_data = chunk.skip_data;
      } else if (chunk.type === 'error') {
        throw new Error(`API stream error from ${url}: ${chunk.message ?? 'Unknown error'}`);
      }
      // 'done' type is just a signal, no data to extract
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.warn(`[getWatchData] Skipping malformed NDJSON line: ${line.substring(0, 100)}`);
        continue;
      }
      throw e;
    }
  }

  return result;
};

// ─── Legacy Browse/Filters (for backwards compatibility) ──────────────────────

export type BrowseParams = {
  page?: number;
  limit?: number;
  sort?: string;
  keyword?: string;
  genre?: string[];      // genre ids
  term_type?: string[];  // type names (Movie, OVA, etc.)
  status?: string[];
  season?: string[];
  year?: string[];
  rating?: string[];
  language?: string[];
  refresh?: boolean;
};

export const browseAnime = (params: BrowseParams = {}): Promise<BrowseResponse> => {
  return filterAnime({
    page: params.page,
    sort: params.sort,
    keyword: params.keyword,
    genre: params.genre,
    term_type: params.term_type,
    status: params.status,
    season: params.season,
    year: params.year,
    language: params.language,
    rating: params.rating,
    refresh: params.refresh ?? true,
  });
};


export const getFilters = async (): Promise<any> => {
  const response = await fetcher<any>('/filter?refresh=1');
  return response.options;
};
