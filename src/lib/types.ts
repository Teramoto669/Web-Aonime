// src/lib/types.ts
export type Episodes = {
  sub: number | null;
  dub: number | null;
};

export type AnimeBase = {
  id: string;
  name: string;
  poster: string;
  type?: string;
  episodes?: Episodes;
};

export type SpotlightAnime = AnimeBase & {
  jname: string;
  description: string;
  rank: number;
  otherInfo: string[];
};

export type Top10Anime = AnimeBase & {
  rank: number;
};

export type Top10Animes = {
  today: Top10Anime[];
  week: Top10Anime[];
  month: Top10Anime[];
};

export type TopAiringAnime = AnimeBase & {
  jname: string;
};

export type TrendingAnime = AnimeBase & {
  rank: number;
};

export type AnimeWithDetails = AnimeBase & {
  jname: string;
  duration: string;
  rating: string;
};

export type HomeData = {
  genres: string[];
  latestEpisodeAnimes: AnimeBase[];
  spotlightAnimes: SpotlightAnime[];
  top10Animes: Top10Animes;
  topAiringAnimes: TopAiringAnime[];
  topUpcomingAnimes: AnimeWithDetails[];
  trendingAnimes: TrendingAnime[];
  mostPopularAnimes: AnimeBase[];
  mostFavoriteAnimes: AnimeBase[];
  latestCompletedAnimes: AnimeBase[];
};

export type AnimeList = {
  sortOption: string;
  animes: AnimeWithDetails[];
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
};

export type AnimeQTip = {
  anime: {
    id: string;
    name: string;
    malscore: string;
    quality: string;
    episodes: Episodes;
    type: string;
    description: string;
    jname: string;
    synonyms: string;
    aired: string;
    status: string;
    genres: string[];
  };
};

export type PromotionalVideo = {
  title?: string;
  source?: string;
  thumbnail?: string;
};

export type CharacterVoiceActor = {
  character: {
    id: string;
    poster: string;
    name: string;
    cast: string;
  };
  voiceActor: {
    id: string;
    poster: string;
    name: string;
    cast: string;
  };
};

export type AnimeInfo = {
  id: string;
  name: string;
  poster: string;
  description: string;
  stats: {
    rating: string;
    quality: string;
    episodes: Episodes;
    type: string;
    duration: string;
  };
  promotionalVideos: PromotionalVideo[];
  characterVoiceActor: CharacterVoiceActor[];
};

export type MoreInfo = {
  aired: string;
  genres: string[];
  status: string;
  studios: string;
  duration: string;
  [key: string]: any;
};

export type MostPopularAnime = AnimeBase;

export type RelatedAnime = AnimeWithDetails;
export type RecommendedAnime = AnimeWithDetails;

export type Season = {
  id: string;
  name: string;
  title: string;
  poster: string;
  isCurrent: boolean;
};

export type AnimeAboutInfo = {
  anime: {
    info: AnimeInfo;
    moreInfo: MoreInfo;
  };
  mostPopularAnimes: MostPopularAnime[];
  recommendedAnimes: RecommendedAnime[];
  relatedAnimes: RelatedAnime[];
  seasons: Season[];
};

export type SearchResultAnime = AnimeBase & {
    duration: string;
    rating: string;
    type: string;
};

export type SearchResults = {
  animes: SearchResultAnime[];
  mostPopularAnimes: MostPopularAnime[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  searchQuery: string;
};

export type Suggestion = {
  id: string;
  name: string;
  poster: string;
  jname: string;
  moreInfo: string[];
};

export type SearchSuggestion = {
  suggestions: Suggestion[];
};

export type Episode = {
  number: number;
  title: string;
  episodeId: string;
  isFiller: boolean;
};

export type AnimeEpisodes = {
  totalEpisodes: number;
  episodes: Episode[];
};

export type Server = {
  serverId: number;
  serverName: string;
};

export type AnimeServers = {
  episodeId: string;
  episodeNo: number;
  sub: Server[];
  dub: Server[];
  raw: Server[];
};

export type Source = {
  url: string;
  isM3U8: boolean;
  quality?: string;
  html?: string;  // For iframe/embed sources
};

export type Subtitle = {
  lang: string;
  url: string;
};

export type AnimeSources = {
  headers: {
    Referer: string;
    'User-Agent': string;
    [key: string]: string;
  };
  sources: Source[];
  subtitles: Subtitle[];
  anilistID: number | null;
  malID: number | null;
  meta?: {
    embed?: {
      url: string;
      width: string;
      height: string;
      attrs: {
        frameborder: string;
        scrolling: string;
        allowfullscreen: boolean;
      };
    };
  };
};
