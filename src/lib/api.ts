
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
    const bypassToken = process.env.VERCEL_BYPASS_TOKEN;
    if (bypassToken) {
      return `https://test-123-beta.vercel.app/api/v2/hianime?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypassToken}`;
    }
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
  return 'http://localhost:9002/api/v2/hianime';
};


async function fetcher<T>(endpoint: string, url?: string): Promise<T> {
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

// Returns the full API response object { success, data, message? }
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
  // Valid options for azlist are: 'all', 'other', '0-9', or single letters a-z
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
  const sortParam = sort === '_relevance' ? '' : `&sort=${sort}`;
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

// Extracts the numeric episode ID from a Hianime watch URL or episode ID string
const extractEpisodeId = (watchUrl: string): string => {
  // Handle full URLs like https://hianimez.to/watch/my-hero-academia-vigilantes-19544?ep=136197
  const epMatch = watchUrl.match(/[?&]ep=(\d+)/);
  if (epMatch) return epMatch[1];
  
  // Handle episode IDs with dash format like series-136197
  const dashMatch = watchUrl.match(/-(\d+)$/);
  if (dashMatch) return dashMatch[1];
  
  // Handle plain numeric IDs
  if (/^\d+$/.test(watchUrl)) return watchUrl;
  
  throw new Error(`Could not extract episode ID from: ${watchUrl}`);
};

export const getEpisodeServers = async (animeEpisodeId: string) => {
  // Format the animeEpisodeId correctly (make sure it contains ?ep=)
  const formattedId = animeEpisodeId.includes('?ep=') ? 
    animeEpisodeId : 
    animeEpisodeId.replace(/[-](\d+)$/, '?ep=$1');
  const data = await fetcher<AnimeServersResponse>(`/episode/servers?animeEpisodeId=${formattedId}`);

  // Prioritize megaplay/megacloud servers first for direct iframe embedding
  const priority = ['megacloud', 'mega'];

  const prioritize = (list: AnimeServer[] = []) => {
    const lowerMap = list.map(s => ({ ...s, _name: s.serverName.toLowerCase() }));
    const prioritized: AnimeServer[] = [];
    const rest: AnimeServer[] = [];

    lowerMap.forEach(item => {
      if (priority.includes(item._name)) {
        // place in prioritized according to priority order
        // ensure order by priority array index
        prioritized.push({ serverId: item.serverId, serverName: item.serverName });
      } else {
        rest.push({ serverId: item.serverId, serverName: item.serverName });
      }
    });

    // Sort prioritized according to the priority array
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

// Return the raw API envelope if you need the outer { success: true, data: { ... } }
export const getEpisodeServersFull = async (animeEpisodeId: string) => {
  const formattedId = animeEpisodeId.includes('?ep=') ? animeEpisodeId : animeEpisodeId.replace(/[-](\d+)$/, '?ep=$1');
  const endpoint = `/episode/servers?animeEpisodeId=${formattedId}`;
  return fetcherRaw<AnimeServersResponse>(endpoint);
};

// Calls an external Yuma API that wraps the Hianime Video API / Megaplay provider.
// It expects the episodeId with `?ep=` replaced by `$episode$` per the API contract.
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
  server: string = 'vidstreaming', // Default to vidstreaming if available
  category: 'sub' | 'dub' | 'raw' = 'sub' // Default to sub
) => {
  try {
    // First get available servers
    const servers = await getEpisodeServers(episodeId);
    
    // Find available servers for the selected category
    const availableServers = servers[category];
    
    if (!availableServers || availableServers.length === 0) {
      throw new Error(`No servers available for ${category}`);
    }

    // Build a rotation starting from the preferred server name so we can try alternatives
    // Prefer the default internal API endpoint first. This should return the
    // structured envelope with headers and sources suitable for the client.
    const baseUrl = getApiBaseUrl();
    const primaryEndpoint = `/episode/sources?animeEpisodeId=${encodeURIComponent(episodeId)}&server=${encodeURIComponent(server)}&category=${encodeURIComponent(category)}`;
    try {
      console.info(`[api] trying primary endpoint ${primaryEndpoint}`);
      const primary = await fetcher<AnimeSources>(primaryEndpoint);
      if (primary && Array.isArray(primary.sources) && primary.sources.length > 0 && primary.sources[0].url) {
        // If this is a megaplay/megacloud style server, ensure Referer points to megacloud.blog
        try {
          const lowerServer = server?.toLowerCase() ?? '';
          if (lowerServer.includes('mega') || lowerServer.includes('megacloud')) {
            primary.headers = primary.headers || {};
            if (!primary.headers['Referer'] && !primary.headers['referer']) {
              primary.headers['Referer'] = 'https://megacloud.blog/';
            }
          }
        } catch (hdrErr) {
          console.debug('[api] warning while normalizing primary headers', hdrErr);
        }

        console.info('[api] primary API returned usable sources, returning');
        return primary;
      }
      console.info('[api] primary API returned no usable sources, falling back to server rotation');
    } catch (e: any) {
      console.warn('[api] primary API request failed:', e?.message || e);
    }

    // Build a rotation starting from the preferred server name so we can try alternatives
    const preferredIndex = availableServers.findIndex(s => s.serverName.toLowerCase() === server.toLowerCase());
    const tryOrder = preferredIndex >= 0 ?
      [...availableServers.slice(preferredIndex), ...availableServers.slice(0, preferredIndex)] :
      [...availableServers];

    console.info(`[api] attempting source fetch for episodeId=${episodeId}, category=${category}`);
    console.info(`[api] server order:`, tryOrder.map(s => s.serverName));

    let lastError: Error | null = null;
    for (const candidate of tryOrder) {
      console.info(`[api] trying server ${candidate.serverName}`);
      try {
          // For mega servers, always use the embed player directly
          if (candidate.serverName.toLowerCase().includes('mega')) {
            const epId = extractEpisodeId(episodeId);
            const embedUrl = `https://megaplay.buzz/stream/s-2/${epId}/${category}`;
            console.info(`[api] using Megaplay embed URL: ${embedUrl}`);
            
            return {
              sources: [{
                url: embedUrl,
                isM3U8: false,
                quality: 'auto',
                html: `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>`
              }],
              headers: {
                'Referer': 'https://megacloud.blog/',
                'User-Agent': 'Mozilla/5.0'
              },
              subtitles: [],
              anilistID: null,
              malID: null
            };
          }
        
        // If Megaplay failed or isn't applicable, try the fallback endpoint
        const baseUrl = getApiBaseUrl();
        console.info(`[api] all Yuma API attempts failed for server ${candidate.serverName}, trying fallback endpoint`);

        const endpoint = `${baseUrl}/episode/sources?animeEpisodeId=${episodeId}&server=${candidate.serverName}&category=${category}`;
        const result = await fetcher<AnimeSources>(endpoint, '');
        // If this candidate looks like a megaplay/megacloud server, ensure Referer header is set to megacloud.blog
        try {
          const lowerName = (candidate.serverName || '').toLowerCase();
          if (lowerName.includes('mega') || lowerName.includes('megacloud')) {
            result.headers = result.headers || {} as any;
            if (!result.headers['Referer'] && !result.headers['referer']) {
              (result.headers as any)['Referer'] = 'https://megacloud.blog/';
            }
          }
        } catch (hdrErr) {
          console.debug('[api] warning while normalizing fallback headers', hdrErr);
        }
        // successful fetch
        if (candidate.serverName.toLowerCase() !== server.toLowerCase()) {
          console.debug(`getEpisodeSources: preferred server '${server}' failed, using fallback '${candidate.serverName}'`);
        }
        return result;
      } catch (err: any) {
        // Record and continue to next candidate (useful if upstream returns 403/timeout)
        console.warn(`getEpisodeSources: server ${candidate.serverName} failed: ${err?.message || err}`);
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }

    // If we get here, all servers failed
    throw lastError ?? new Error('Failed to fetch episode sources from all available servers');
  } catch (error) {
    console.error('Error getting episode sources:', error);
    throw error;
  }
}

export const getCategory = (category: string, page: number = 1) =>
  fetcher<any>(`/category/${category}?page=${page}`);
