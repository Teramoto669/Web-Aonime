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
} from './types';

const BASE_URL = process.env.API_BASE_URL;
// ─── Generic fetcher ─────────────────────────────────────────────────────────

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

async function fetcher<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
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

export const getHomeData = (): Promise<HomeData> =>
  fetcher<HomeData>('/home');

// ─── Anime Detail ────────────────────────────────────────────────────────────

export const getAnimeDetails = (slug: string): Promise<AnimeDetail> =>
  fetcher<AnimeDetail>(`/anime/${encodeURIComponent(slug)}`);

export const getAnimeTooltip = (id: string, refresh?: boolean): Promise<AnimeTooltipData> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  const path = `/anime/tooltip/${encodeURIComponent(id)}${params.toString() ? `?${params.toString()}` : ''}`;
  return fetcher<AnimeTooltipData>(path);
};

// ─── Episodes ─────────────────────────────────────────────────────────────────

export const getAnimeEpisodes = (
  slug: string,
  start?: number,
  end?: number
): Promise<AnimeEpisodes> => {
  let path = `/anime/${encodeURIComponent(slug)}/episodes`;
  const params = new URLSearchParams();
  if (start !== undefined) params.set('start', String(start));
  if (end !== undefined) params.set('end', String(end));

  if (params.toString()) {
    path += `?${params.toString()}`;
  }
  return fetcher<AnimeEpisodes>(path);
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchAnime = (keyword: string, refresh?: boolean): Promise<BrowseResponse> => {
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
  const qs = new URLSearchParams();

  // Always set keyword, type, and sort to avoid backend 500 errors
  qs.set('keyword', params.keyword ?? '');
  qs.set('type', '');
  qs.set('sort', params.sort ?? 'default');

  if (params.page) qs.set('page', String(params.page));
  if (params.refresh) qs.set('refresh', '1');

  params.genre?.forEach(g => qs.append('genre[]', g));
  params.term_type?.forEach(t => qs.append('term_type[]', t));
  params.season?.forEach(s => qs.append('season[]', s));
  params.year?.forEach(y => qs.append('year[]', y));
  params.status?.forEach(st => qs.append('status[]', st));
  params.language?.forEach(l => qs.append('language[]', l));
  params.rating?.forEach(r => qs.append('rating[]', r));

  return fetcher<BrowseResponse>(`/filter?${qs.toString()}`);
};


// ─── Latest Episodes ──────────────────────────────────────────────────────────

export type LatestParams = {
  type?: 'latest-updated' | 'new-release' | 'most-viewed';
  page?: number;
  refresh?: boolean;
};

export const getLatestAnime = (params: LatestParams = {}): Promise<BrowseResponse> => {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.page) qs.set('page', String(params.page));
  if (params.refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/latest?${qs.toString()}`);
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
  if (params.refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/status?${qs.toString()}`);
};

// ─── Genre ────────────────────────────────────────────────────────────────────

export const getByGenre = (genre: string, page = 1): Promise<BrowseResponse> =>
  fetcher<BrowseResponse>(`/genre/${encodeURIComponent(genre)}?page=${page}`);

// ─── Type ─────────────────────────────────────────────────────────────────────

export const getByType = (type: string, page = 1): Promise<BrowseResponse> =>
  fetcher<BrowseResponse>(`/type/${encodeURIComponent(type)}?page=${page}`);

// ─── Schedule ──────────────────────────────────────────────────────────────────

export const getSchedule = (tz?: number | string, refresh?: boolean): Promise<ScheduleDay[]> => {
  const params = new URLSearchParams();
  if (tz !== undefined) params.set('tz', String(tz));
  if (refresh) params.set('refresh', '1');
  return fetcher<ScheduleDay[]>(`/schedule?${params.toString()}`);
};

// ─── Watch (Streaming Sources) ────────────────────────────────────────────────

export const getWatchData = async (slug: string, ep: string | number): Promise<WatchData> => {
  const url = `${BASE_URL}/watch/${encodeURIComponent(slug)}?ep=${ep}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${url}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Cache hit → standard JSON response
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (json.ok === false) {
      throw new Error(`API error from ${url}: ${json.message ?? 'Unknown error'}`);
    }
    return json.data as WatchData;
  }

  // Cache miss → NDJSON streaming response
  // Each line is a JSON object: { type: "episode"|"servers"|"source"|"done"|"error", ... }
  const text = await res.text();
  const lines = text.split('\n').filter(line => line.trim());

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
    refresh: params.refresh,
  });
};


export const getFilters = async (): Promise<any> => {
  const response = await fetcher<any>('/filter');
  return response.options;
};
