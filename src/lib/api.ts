// src/lib/api.ts
// AnimeKai API client — https://anime-kai-api-main-test.vercel.app/api

import type {
  HomeData,
  AnimeDetail,
  AnimeEpisodes,
  ServersResponse,
  SourceResponse,
  BrowseResponse,
  FiltersResponse,
} from './types';

const BASE_URL = 'https://anime-kai-api-main-test.vercel.app/api';

// ─── Generic fetcher ─────────────────────────────────────────────────────────

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
    const json = await res.json();
    if (json.success === false) {
      throw new Error(`API error from ${url}: ${json.message ?? 'Unknown error'}`);
    }
    return json as T;
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(`Unknown error fetching ${url}`);
  }
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export const getHomeData = (): Promise<HomeData> =>
  fetcher<HomeData>('/home');

// ─── Anime Detail (includes episodes) ────────────────────────────────────────

export const getAnimeDetails = (slug: string): Promise<AnimeDetail> =>
  fetcher<AnimeDetail>(`/anime/${encodeURIComponent(slug)}`);

// ─── Episodes ─────────────────────────────────────────────────────────────────

export const getAnimeEpisodes = (slug: string): Promise<AnimeEpisodes> =>
  fetcher<AnimeEpisodes>(`/episodes/${encodeURIComponent(slug)}`);

// ─── Servers (from episode token) ────────────────────────────────────────────

/**
 * Fetches available streaming servers for an episode.
 * Pass the episode `token` returned by /api/episodes/[slug].
 */
export const getEpisodeServers = (token: string): Promise<ServersResponse> =>
  fetcher<ServersResponse>(`/servers/${encodeURIComponent(token)}`);

// ─── Source (from server link_id) ─────────────────────────────────────────────

/**
 * Resolves the embed URL for a specific server.
 * Pass the `link_id` returned by /api/servers/[token].
 */
export const getEpisodeSource = (linkId: string): Promise<SourceResponse> =>
  fetcher<SourceResponse>(`/source/${encodeURIComponent(linkId)}`);

// ─── Browse / Search ─────────────────────────────────────────────────────────

export type BrowseParams = {
  page?: number;
  limit?: number;
  sort?: string;
  keyword?: string;
  type?: string[];
  genre?: string[];
  status?: string[];
  season?: string[];
  year?: string[];
  rating?: string[];
  country?: string[];
  language?: string[];
};

export const browseAnime = (params: BrowseParams = {}): Promise<BrowseResponse> => {
  const qs = new URLSearchParams();

  if (params.page)    qs.set('page',    String(params.page));
  if (params.limit)   qs.set('limit',   String(params.limit));
  if (params.sort)    qs.set('sort',    params.sort);
  if (params.keyword) qs.set('keyword', params.keyword);

  const arrayFields = ['type', 'genre', 'status', 'season', 'year', 'rating', 'country', 'language'] as const;
  for (const key of arrayFields) {
    const values = params[key];
    if (values && values.length > 0) {
      values.forEach(v => qs.append(`${key}[]`, v));
    }
  }

  // Always exclude Boys Love (ID 184)
  qs.append('genre[]', '-184');

  const path = `/browse${qs.toString() ? `?${qs.toString()}` : ''}`;
  return fetcher<BrowseResponse>(path);
};

export const searchAnime = (keyword: string, page = 1): Promise<BrowseResponse> =>
  browseAnime({ keyword, page, limit: 20, sort: 'updated_date' });

// ─── Filters ─────────────────────────────────────────────────────────────────

export const getFilters = async (): Promise<FiltersResponse> => {
  const data = await fetcher<FiltersResponse>('/filters');
  // Hide Boys Love from filter options
  if (data && data.genre) {
    data.genre = data.genre.filter(g => g.value !== '184');
  }
  return data;
};
