import type { AnimeTooltipData } from "./types";

const memoryCache = new Map<string, AnimeTooltipData>();
const promiseCache = new Map<string, Promise<AnimeTooltipData | null>>();

function getSessionCached(id: string): AnimeTooltipData | null {
  if (typeof window === "undefined") return null;
  try {
    const item = sessionStorage.getItem(`aonime_tooltip_${id}`);
    if (item) return JSON.parse(item);
  } catch (e) {
    // ignore
  }
  return null;
}

function setSessionCached(id: string, data: AnimeTooltipData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`aonime_tooltip_${id}`, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

export function getCachedAnimeTooltip(id?: string): AnimeTooltipData | null {
  if (!id) return null;
  if (memoryCache.has(id)) return memoryCache.get(id)!;
  const sessionData = getSessionCached(id);
  if (sessionData) {
    memoryCache.set(id, sessionData);
    return sessionData;
  }
  return null;
}

export function fetchAnimeTooltip(id?: string): Promise<AnimeTooltipData | null> {
  if (!id) return Promise.resolve(null);

  const cached = getCachedAnimeTooltip(id);
  if (cached) return Promise.resolve(cached);

  if (promiseCache.has(id)) {
    return promiseCache.get(id)!;
  }

  const promise = fetch(`/api/anime/tooltip/${encodeURIComponent(id)}`)
    .then((res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((json) => {
      if (json && json.ok && json.data) {
        const data = json.data as AnimeTooltipData;
        memoryCache.set(id, data);
        setSessionCached(id, data);
        return data;
      }
      return null;
    })
    .catch(() => null);

  promiseCache.set(id, promise);
  return promise;
}
