
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

const VERCEL_URL = process.env.VERCEL_URL;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use relative path
    return '/api/v2/hianime';
  }
  // Server-side: use absolute path
  if (VERCEL_URL) {
    return `https://${VERCEL_URL}/api/v2/hianime`;
  }
  return NEXT_PUBLIC_APP_URL || 'http://localhost:3000/api/v2/hianime';
};


async function fetcher<T>(endpoint: string): Promise<T> {
  const API_BASE_URL = getApiBaseUrl();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, { cache: 'no-store' });
  if (!res.ok) {
    const errorInfo = await res.text();
    console.error(errorInfo);
    throw new Error(`An error occurred while fetching the data from ${endpoint}. Status: ${res.status}`);
  }
  const json = await res.json();
  if (json.success === false) {
    throw new Error(`API returned an error for endpoint ${endpoint}: ${json.message || 'Unknown error'}`);
  }
  return json.data;
}

export const getHomeData = () => fetcher<HomeData>('/home');

export const getAnimeList = (sort: string = 'a-z', page: number = 1) =>
  fetcher<AnimeList>(`/azlist/${sort}?page=${page}`);
  
export const getGenreList = (genre: string, page: number = 1) =>
  fetcher<AnimeList>(`/genre/${genre}?page=${page}`);

export const getAnimeDetails = (id: string) =>
  fetcher<AnimeAboutInfo>(`/anime/${id}`);

export const getAnimeEpisodes = (id: string) =>
  fetcher<AnimeEpisodes>(`/anime/${id}/episodes`);

export const searchAnime = (query: string, page: number = 1) =>
  fetcher<SearchResults>(`/search?q=${encodeURIComponent(query)}&page=${page}`);

export const getSearchSuggestions = (query: string) =>
  fetcher<SearchSuggestion>(`/search/suggestion?q=${encodeURIComponent(query)}`);

export const getEpisodeServers = (episodeId: string) =>
  fetcher<AnimeServers>(`/episode/servers?episodeId=${episodeId}`);

export const getEpisodeSources = (episodeId: string, server: string, category: 'sub' | 'dub' | 'raw') =>
  fetcher<AnimeSources>(`/episode/sources?episodeId=${episodeId}&server=${server}&category=${category}`);

export const getCategory = (category: string, page: number = 1) =>
  fetcher<any>(`/category/${category}?page=${page}`);
