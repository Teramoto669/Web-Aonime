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
  RankingWindow,
  TopTenResult,
  TrendingSidebarResult,
  TopRankingsResult,
  RecentlyUpdatedResult,
  AzListResult,
  SuggestionItem,
  RandomAnime,
  AnimeSeasons,
  LatestEpisodeResult,
  EpisodeAjaxResult,
  StreamServerItem,
  StreamInfo,
  MapperServer,
  ResolvedStream,
  StreamQualitiesResult,
  EmbedsResult,
  DownloadResult,
  MirrorStatus,
  ApiHealth,
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
  const isRefresh = path.includes('refresh=1') || options?.cache === 'no-store';
  try {
    const fetchOptions: RequestInit = {
      ...options,
      ...(isRefresh
        ? { cache: 'no-store' }
        : { next: { revalidate: 0, ...options?.next } }),
    };
    const res = await fetch(url, fetchOptions);
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

export const getHomeData = (refresh = false): Promise<HomeData> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  return fetcher<HomeData>(`/home${params.toString() ? `?${params.toString()}` : ''}`);
};

// ─── Anime Detail ────────────────────────────────────────────────────────────

export const getAnimeDetails = (slug: string, refresh = false): Promise<AnimeDetail> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  return fetcher<AnimeDetail>(`/anime/${encodeURIComponent(slug)}?${params.toString()}`);
};

export const getAnimeRelated = (slug: string, refresh = false): Promise<RelatedAnime[]> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  const path = `/anime/${encodeURIComponent(slug)}/related${params.toString() ? `?${params.toString()}` : ''}`;
  return fetcher<RelatedAnime[]>(path);
};

export const getAnimeRecommendations = (slug: string, refresh = false): Promise<AnimeListItem[]> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  const path = `/anime/${encodeURIComponent(slug)}/recommendations${params.toString() ? `?${params.toString()}` : ''}`;
  return fetcher<AnimeListItem[]>(path);
};

export const getAnimeTooltip = async (id: string, refresh = false): Promise<AnimeTooltipData> => {
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  const path = `/anime/tooltip/${encodeURIComponent(id)}${params.toString() ? `?${params.toString()}` : ''}`;
  try {
    return await fetcher<AnimeTooltipData>(path);
  } catch {
    // Fallback: If tooltip API endpoint on scrap server fails/404s, use full anime details
    const detail = await getAnimeDetails(id, refresh);
    return {
      id: detail.id || id,
      slug: detail.slug || id,
      title: detail.title || id,
      titleJp: detail.titleJp,
      rating: detail.rating,
      quality: detail.quality,
      episodes: {
        sub: detail.hasSub ? (detail.episodeCount ?? undefined) : undefined,
        dub: detail.hasDub ? (detail.episodeCount ?? undefined) : undefined,
        total: detail.episodeCount ?? undefined,
      },
      synopsis: detail.synopsis,
      otherNames: detail.alternativeTitles?.join(', '),
      score: detail.malScore,
      status: detail.status,
      genres: detail.genres,
      duration: detail.duration,
      href: `/anime/${detail.slug || id}`,
    };
  }
};

// ─── Episodes ─────────────────────────────────────────────────────────────────

export const getAnimeEpisodes = (
  slug: string,
  start?: number,
  end?: number,
  refresh = false
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

export const searchAnime = (keyword: string, refresh = false): Promise<BrowseResponse> => {
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

  const sortValue = params.sort || 'default';

  if (sortValue === 'latest-updated' && !hasExtraFilters) {
    return getUpdatedAnime({
      type: 'Latest Updated',
      sort: 'latest-updated',
      page: params.page,
      refresh: params.refresh ?? false,
    });
  }

  const qs = new URLSearchParams();

  // Always set keyword, type, and sort to avoid backend 500 errors
  qs.set('keyword', params.keyword ?? '');
  qs.set('type', sortValue === 'latest-updated' ? 'Latest Updated' : '');
  qs.set('sort', sortValue);
  if (params.refresh === true) {
    qs.set('refresh', '1');
  }

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
  if (params.refresh === true) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/updated?${qs.toString()}`);
};

export const getLatestAnime = getUpdatedAnime;

// ─── Widget Anime ────────────────────────────────────────────────────────────

export const getWidgetAnime = (name = 'updated-all', page = 1, refresh = false): Promise<BrowseResponse> => {
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
  if (params.refresh === true) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/status?${qs.toString()}`);
};

// ─── Genre ────────────────────────────────────────────────────────────────────

export const getByGenre = (genre: string, page = 1, refresh = false): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/genre/${encodeURIComponent(genre)}?${qs.toString()}`);
};

// ─── Type ─────────────────────────────────────────────────────────────────────

export const getByType = (type: string, page = 1, refresh = false): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/type/${encodeURIComponent(type)}?${qs.toString()}`);
};

// ─── Schedule ──────────────────────────────────────────────────────────────────

export const getSchedule = (tz?: number | string, refresh = false): Promise<ScheduleDay[]> => {
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
    sort: params.sort || 'default',
    keyword: params.keyword,
    genre: params.genre,
    term_type: params.term_type,
    status: params.status,
    season: params.season,
    year: params.year,
    language: params.language,
    rating: params.rating,
    refresh: params.refresh ?? false,
  });
};


export const getFilters = async (): Promise<any> => {
  const response = await fetcher<any>('/filter');
  return response.options;
};

// ─── Discovery & Listings ─────────────────────────────────────────────────────

export const getSpotlight = (refresh = false): Promise<AnimeListItem[]> =>
  fetcher<AnimeListItem[]>(`/spotlight${refresh ? '?refresh=1' : ''}`);

export const getTopTen = (refresh = false): Promise<TopTenResult> =>
  fetcher<TopTenResult>(`/top-ten${refresh ? '?refresh=1' : ''}`);

export const getTrending = (page = 1, refresh = false): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/trending?${qs.toString()}`);
};

export const getTrendingSidebar = (refresh = false): Promise<TrendingSidebarResult> =>
  fetcher<TrendingSidebarResult>(`/trending-sidebar${refresh ? '?refresh=1' : ''}`);

export const getTopRankings = (sort: RankingWindow = 'day', refresh = false): Promise<TopRankingsResult> => {
  const qs = new URLSearchParams({ sort });
  if (refresh) qs.set('refresh', '1');
  return fetcher<TopRankingsResult>(`/top-rankings?${qs.toString()}`);
};

export const getRecentlyUpdated = (
  tab: 'all' | 'sub' | 'dub' = 'all',
  page = 1,
  refresh = false
): Promise<RecentlyUpdatedResult> => {
  const qs = new URLSearchParams({ tab, page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<RecentlyUpdatedResult>(`/recently-updated?${qs.toString()}`);
};

export const getCompleted = (refresh = false): Promise<AnimeListItem[]> =>
  fetcher<AnimeListItem[]>(`/completed${refresh ? '?refresh=1' : ''}`);

export const getRandomAnime = (): Promise<RandomAnime> =>
  fetcher<RandomAnime>('/random', { cache: 'no-store' });

export const getMostPopular = (page = 1, refresh = false): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/most-popular?${qs.toString()}`);
};

export const getNewRelease = (page = 1, refresh = false): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/new-release?${qs.toString()}`);
};

export const getNewlyAdded = (page = 1, refresh = false): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/newly-added?${qs.toString()}`);
};

export const getUpcoming = (page = 1, refresh = false): Promise<BrowseResponse> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<BrowseResponse>(`/upcoming?${qs.toString()}`);
};

export const getAzList = (letter = 'all', page = 1, refresh = false): Promise<AzListResult> => {
  const qs = new URLSearchParams({ page: String(page) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<AzListResult>(`/az-list/${encodeURIComponent(letter)}?${qs.toString()}`);
};

export const getSearchSuggest = (keyword: string, refresh = false): Promise<SuggestionItem[]> => {
  const qs = new URLSearchParams({ keyword });
  if (refresh) qs.set('refresh', '1');
  return fetcher<SuggestionItem[]>(`/search/suggest?${qs.toString()}`);
};

export const getSuggestions = (keyword: string, refresh = false): Promise<AnimeListItem[]> => {
  const qs = new URLSearchParams({ keyword });
  if (refresh) qs.set('refresh', '1');
  return fetcher<AnimeListItem[]>(`/suggestions?${qs.toString()}`);
};

// ─── Anime Extras & AniList ───────────────────────────────────────────────────

export const getAnimeSeasons = (slugOrId: string, refresh = false): Promise<AnimeSeasons> =>
  fetcher<AnimeSeasons>(`/anime/${encodeURIComponent(slugOrId)}/seasons${refresh ? '?refresh=1' : ''}`);

export const getLatestEpisode = (slug: string, refresh = false): Promise<LatestEpisodeResult> =>
  fetcher<LatestEpisodeResult>(`/anime/${encodeURIComponent(slug)}/episodes/latest${refresh ? '?refresh=1' : ''}`);

export const getEpisodesAjax = (
  slugOrId: string,
  opts: { style?: string; vrf?: string; refresh?: boolean } = {}
): Promise<EpisodeAjaxResult> => {
  const qs = new URLSearchParams();
  if (opts.style) qs.set('style', opts.style);
  if (opts.vrf) qs.set('vrf', opts.vrf);
  if (opts.refresh) qs.set('refresh', '1');
  const query = qs.toString();
  return fetcher<EpisodeAjaxResult>(`/anime/${encodeURIComponent(slugOrId)}/episodes/ajax${query ? `?${query}` : ''}`);
};

export const getAnilistById = (id: number | string): Promise<Record<string, unknown>> =>
  fetcher<Record<string, unknown>>(`/anilist/${encodeURIComponent(String(id))}`);

export const getAnilistByMal = (malId: number | string): Promise<Record<string, unknown>> =>
  fetcher<Record<string, unknown>>(`/anilist?mal=${encodeURIComponent(String(malId))}`);

export const getAnilistSeason = (params: {
  season?: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
  year?: number;
  page?: number;
  perPage?: number;
} = {}): Promise<Record<string, unknown>> => {
  const qs = new URLSearchParams();
  if (params.season) qs.set('season', params.season);
  if (params.year !== undefined) qs.set('year', String(params.year));
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.perPage !== undefined) qs.set('perPage', String(params.perPage));
  const query = qs.toString();
  return fetcher<Record<string, unknown>>(`/anilist/season${query ? `?${query}` : ''}`);
};

// ─── Low-level Streaming & Downloads ──────────────────────────────────────────

export const getServers = (ids: string, slug?: string, refresh = false): Promise<StreamServerItem[]> => {
  const qs = new URLSearchParams({ ids });
  if (slug) qs.set('slug', slug);
  if (refresh) qs.set('refresh', '1');
  return fetcher<StreamServerItem[]>(`/servers?${qs.toString()}`);
};

export const getStreamInfo = (
  id: string,
  opts: { slug?: string; sv?: string; refresh?: boolean } = {}
): Promise<StreamInfo> => {
  const qs = new URLSearchParams({ id });
  if (opts.slug) qs.set('slug', opts.slug);
  if (opts.sv) qs.set('sv', opts.sv);
  if (opts.refresh) qs.set('refresh', '1');
  return fetcher<StreamInfo>(`/stream?${qs.toString()}`);
};

export const getMapperServers = (
  malId: string,
  slug: string,
  timestamp: string,
  refresh = false
): Promise<MapperServer[]> => {
  const qs = new URLSearchParams({ malId, slug, timestamp });
  if (refresh) qs.set('refresh', '1');
  return fetcher<MapperServer[]>(`/mapper-servers?${qs.toString()}`);
};

export const resolveStream = (
  id: string,
  opts: { slug?: string; sv?: string; type?: string; refresh?: boolean } = {}
): Promise<ResolvedStream> => {
  const qs = new URLSearchParams({ id });
  if (opts.slug) qs.set('slug', opts.slug);
  if (opts.sv) qs.set('sv', opts.sv);
  if (opts.type) qs.set('type', opts.type);
  if (opts.refresh) qs.set('refresh', '1');
  return fetcher<ResolvedStream>(`/stream/resolve?${qs.toString()}`);
};

export const getStreamQualities = (
  url: string,
  referer?: string,
  refresh = false
): Promise<StreamQualitiesResult> => {
  const qs = new URLSearchParams({ url });
  if (referer) qs.set('referer', referer);
  if (refresh) qs.set('refresh', '1');
  return fetcher<StreamQualitiesResult>(`/stream/qualities?${qs.toString()}`);
};

export const getStreamEmbeds = (params: {
  slug?: string;
  mal?: string;
  anilist?: string;
  ep?: number;
  lang?: 'sub' | 'dub';
  provider?: string;
  refresh?: boolean;
}): Promise<EmbedsResult> => {
  const qs = new URLSearchParams();
  if (params.slug) qs.set('slug', params.slug);
  if (params.mal) qs.set('mal', params.mal);
  if (params.anilist) qs.set('anilist', params.anilist);
  if (params.ep !== undefined) qs.set('ep', String(params.ep));
  if (params.lang) qs.set('lang', params.lang);
  if (params.provider) qs.set('provider', params.provider);
  if (params.refresh) qs.set('refresh', '1');
  return fetcher<EmbedsResult>(`/stream/embeds?${qs.toString()}`);
};

export const getDownloadLinks = (slug: string, ep: string | number, refresh = false): Promise<DownloadResult> => {
  const qs = new URLSearchParams({ slug, ep: String(ep) });
  if (refresh) qs.set('refresh', '1');
  return fetcher<DownloadResult>(`/download?${qs.toString()}`);
};

// ─── System ───────────────────────────────────────────────────────────────────

export const getApiHealth = (): Promise<ApiHealth> =>
  fetcher<ApiHealth>('/health', { cache: 'no-store' });

export const getApiMirrors = (): Promise<MirrorStatus[]> =>
  fetcher<MirrorStatus[]>('/mirrors', { cache: 'no-store' });

