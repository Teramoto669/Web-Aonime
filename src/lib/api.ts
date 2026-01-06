import type {
  HomeData,
  AnimeList,
  AnimeAboutInfo,
  AnimeEpisodes,
  AnimeServers,
  AnimeSources,
  SearchResults,
  SearchSuggestion,
} from './types';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path
    return '/api/v2/hianime';
  }
  
  // Server-side: use absolute path
  if (process.env.ANIWATCH_API_DEPLOYMENT_ENV === 'vercel') {
    return 'https://test-123-beta.vercel.app/api/v2/hianime';
  }

  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  
  // Ensure https protocol, unless it's localhost
  const protocol = url && url.includes('localhost') ? 'http' : 'https';

  if (url) {
    // Ensure no trailing slash and append the api path
    if (url.includes('localhost')) {
      return `${protocol}://${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api/v2/hianime`;
    }
    return `${protocol}://${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api/v2/hianime`;
  }

  // Fallback for local development
  return 'https://test-123-beta.vercel.app/api/v2/hianime';
};


async function fetcher<T>(endpoint: string, url?: string): Promise<T> {
  const API_BASE_URL = url === '' ? '' : (url || getApiBaseUrl());
  let fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (process.env.ANIWATCH_API_DEPLOYMENT_ENV === 'vercel' && process.env.VERCEL_BYPASS_TOKEN) {
    const bypassToken = process.env.VERCEL_BYPASS_TOKEN;
    const separator = fullUrl.includes('?') ? '&' : '?';
    fullUrl = `${fullUrl}${separator}x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypassToken}`;
  }
  
  try {
      const res = await fetch(fullUrl);
      if (!res.ok) {
        const errorInfo = await res.text();
        console.error(`Error fetching from ${fullUrl}: ${res.status}`, errorInfo);
        throw new Error(`An error occurred while fetching the data from ${endpoint}. Status: ${res.status}`);
      }
      const json = await res.json();
      if (json.success === false) {
        throw new Error(`API returned an error for endpoint ${endpoint}: ${json.message || 'Unknown error'}`);
      }
      return json.data;
  } catch(e) {
    if (e instanceof Error) {
        console.error(`Failed to fetch ${fullUrl}: ${e.message}`);
        throw new Error(`Failed to fetch from ${endpoint}: ${e.message}`);
    }
    throw new Error(`An unknown error occurred while fetching from ${endpoint}`);
  }
}

async function fetcherRaw<T>(endpoint: string, url?: string): Promise<{ success: boolean; data: T; message?: string }> {
  const API_BASE_URL = url === '' ? '' : (url || getApiBaseUrl());
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(fullUrl);
    if (!res.ok) {
      const errorInfo = await res.text();
      console.error(`Error fetching from ${fullUrl}: ${res.status}`, errorInfo);
      throw new Error(`An error occurred while fetching the data from ${endpoint}. Status: ${res.status}`);
    }
    const json = await res.json();
    return json;
  } catch (e) {
    if (e instanceof Error) {
      console.error(`Failed to fetch ${fullUrl}: ${e.message}`);
      throw new Error(`Failed to fetch from ${endpoint}: ${e.message}`);
    }
    throw new Error(`An unknown error occurred while fetching from ${endpoint}`);
  }
}

export const getHomeData = () => fetcher<HomeData>('/home');

export const getAnimeList = (sort: string = 'a', page: number = 1) => {
  const validSort = sort === 'a-z' ? 'a' : sort;
  return fetcher<AnimeList>(`/azlist/${validSort}?page=${page}`);
};
  
export const getGenreList = (genre: string, page: number = 1) =>
  fetcher<AnimeList>(`/genre/${genre}?page=${page}`);

export const getCategoryList = (category: string, page: number = 1) =>
  fetcher<AnimeList>(`/category/${category}?page=${page}`);

export const getAnimeDetails = (id: string) =>
  fetcher<AnimeAboutInfo>(`/anime/${id}`);

export const getAnimeEpisodes = (id: string) =>
  fetcher<AnimeEpisodes>(`/anime/${id}/episodes`);

export const searchAnime = (query: string, page: number = 1, sort: string = '_relevance') => {
  const formattedSort = sort.replace(/_/g, '-');
  const sortParam = formattedSort === '-relevance' ? '' : `&sort=${formattedSort}`;
  return fetcher<SearchResults>(`/search?q=${encodeURIComponent(query)}&page=${page}${sortParam}`);
};

export const getSearchSuggestions = (query: string) =>
  fetcher<SearchSuggestion>(`/search/suggestion?q=${encodeURIComponent(query)}`);

export interface AnimeServer {
  serverId: number;
  serverName: string;
}

export interface AnimeServersResponse {
  episodeId: string;
  episodeNo: number;
  sub: AnimeServer[];
  dub: AnimeServer[];
  raw: AnimeServer[];
}

const extractEpisodeId = (watchUrl: string): string => {
  const epMatch = watchUrl.match(/[?&]ep=(\d+)/);
  if (epMatch) return epMatch[1];
  
  const dashMatch = watchUrl.match(/-(\d+)$/);
  if (dashMatch) return dashMatch[1];
  
  if (/^\d+$/.test(watchUrl)) return watchUrl;
  
  throw new Error(`Could not extract episode ID from: ${watchUrl}`);
};

export const getEpisodeServers = async (animeEpisodeId: string) => {
  const formattedId = animeEpisodeId.includes('?ep=') ? 
    animeEpisodeId : 
    animeEpisodeId.replace(/[-](\d+)$/, '?ep=$1');
  const data = await fetcher<AnimeServersResponse>(`/episode/servers?animeEpisodeId=${formattedId}`);

  const priority = ['megacloud', 'mega'];

  const prioritize = (list: AnimeServer[] = []) => {
    const lowerMap = list.map(s => ({ ...s, _name: s.serverName.toLowerCase() }));
    const prioritized: AnimeServer[] = [];
    const rest: AnimeServer[] = [];

    lowerMap.forEach(item => {
      if (priority.includes(item._name)) {
        prioritized.push({ serverId: item.serverId, serverName: item.serverName });
      } else {
        rest.push({ serverId: item.serverId, serverName: item.serverName });
      }
    });

    prioritized.sort((a, b) => priority.indexOf(a.serverName.toLowerCase()) - priority.indexOf(b.serverName.toLowerCase()));

    return [...prioritized, ...rest];
  };

  return {
    ...data,
    sub: prioritize(data.sub),
    dub: prioritize(data.dub),
    raw: prioritize(data.raw),
  } as AnimeServersResponse;
};

export const getEpisodeServersFull = async (animeEpisodeId: string) => {
  const formattedId = animeEpisodeId.includes('?ep=') ? animeEpisodeId : animeEpisodeId.replace(/[-](\d+)$/, '?ep=$1');
  const endpoint = `/episode/servers?animeEpisodeId=${formattedId}`;
  return fetcherRaw<AnimeServersResponse>(endpoint);
};

export const getAnimeStreamingVideos = async ({
  animeEpisodeId,
  type = 'sub',
}: {
  animeEpisodeId: string;
  type?: string;
}) => {
  const formattedEpisodeId = animeEpisodeId.replace('?ep=', '$episode$');
  const qs: string[] = [`episodeId=${encodeURIComponent(formattedEpisodeId)}`, `type=${encodeURIComponent(type)}`];
  const url = `https://yumaapi.vercel.app/watch?${qs.join('&')}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Yuma API returned ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data as any;
};

const getMegaplayEmbed = (epId: string, category: string): AnimeSources => {
  const embedUrl = `https://megaplay.buzz/stream/s-2/${epId}/${category}`;
  console.info(`[api] creating Megaplay embed URL: ${embedUrl}`);
  
  return {
    sources: [{
      url: embedUrl,
      isM3U8: false,
      quality: 'auto'
    }],
    headers: {
      'Referer': 'https://megacloud.blog/',
      'User-Agent': 'Mozilla/5.0'
    },
    subtitles: [],
    anilistID: null,
    malID: null,
    meta: {
      embed: {
        url: embedUrl,
        width: '100%',
        height: '100%',
        attrs: {
          frameborder: '0',
          scrolling: 'no',
          allowfullscreen: true
        }
      }
    }
  };
};

export const getEpisodeSources = async (
  episodeId: string, 
  server: string = 'megacloud',
  category: 'sub' | 'dub' | 'raw' = 'sub'
) => {
  // Force Megaplay only
  try {
    const epId = extractEpisodeId(episodeId);
    const embedUrl = `https://megaplay.buzz/stream/s-2/${epId}/${category}`;
    return {
      sources: [{
        url: embedUrl,
        isM3U8: false,
        quality: 'auto'
      }],
      headers: {
        'Referer': 'https://megacloud.blog/',
        'User-Agent': 'Mozilla/5.0'
      },
      subtitles: [],
      anilistID: null,
      malID: null
    } as AnimeSources;
  } catch (error) {
    console.error('Error getting megaplay source:', error);
    throw error;
  }
}

export const getCategory = (category: string, page: number = 1) =>
  fetcher<any>(`/category/${category}?page=${page}`);
