import type { AnimeTooltipData } from "./types";

const memoryCache = new Map<string, AnimeTooltipData>();
const promiseCache = new Map<string, Promise<AnimeTooltipData | null>>();

const STORAGE_PREFIX = "aonime_tt_";
const LEGACY_STORAGE_PREFIX = "aonime_tooltip_";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL

interface CacheEnvelope {
  data: AnimeTooltipData;
  ts: number;
}

let hasCleanedUpExpired = false;

function cleanExpiredCache() {
  if (typeof window === "undefined" || hasCleanedUpExpired) return;
  hasCleanedUpExpired = true;

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(STORAGE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as CacheEnvelope;
            if (!parsed.ts || now - parsed.ts > DEFAULT_TTL_MS) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore localStorage access errors
  }
}

function getPersistentCached(id: string): AnimeTooltipData | null {
  if (typeof window === "undefined") return null;

  // 1. Check localStorage with TTL
  try {
    const key = `${STORAGE_PREFIX}${id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as CacheEnvelope;
      if (parsed && parsed.data && parsed.ts) {
        if (Date.now() - parsed.ts <= DEFAULT_TTL_MS) {
          return parsed.data;
        } else {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // localStorage may be disabled or in private browsing
  }

  // 2. Fallback to legacy sessionStorage if available
  try {
    const legacyItem = sessionStorage.getItem(`${LEGACY_STORAGE_PREFIX}${id}`);
    if (legacyItem) {
      const data = JSON.parse(legacyItem) as AnimeTooltipData;
      if (data) {
        setPersistentCached(id, data);
        return data;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

function pruneOldestEntries() {
  try {
    const entries: { key: string; ts: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw) as CacheEnvelope;
            entries.push({ key: k, ts: parsed.ts || 0 });
          }
        } catch {
          entries.push({ key: k, ts: 0 });
        }
      }
    }

    entries.sort((a, b) => a.ts - b.ts);
    const countToRemove = Math.max(10, Math.ceil(entries.length * 0.2));
    for (let i = 0; i < Math.min(countToRemove, entries.length); i++) {
      localStorage.removeItem(entries[i].key);
    }
  } catch {
    // Ignore
  }
}

function setPersistentCached(id: string, data: AnimeTooltipData) {
  if (typeof window === "undefined" || !data) return;

  const key = `${STORAGE_PREFIX}${id}`;
  const envelope: CacheEnvelope = {
    data,
    ts: Date.now(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Handle QuotaExceededError by pruning oldest 20%
    try {
      pruneOldestEntries();
      localStorage.setItem(key, JSON.stringify(envelope));
    } catch {
      // Fallback to session storage if localStorage is full/blocked
      try {
        sessionStorage.setItem(`${LEGACY_STORAGE_PREFIX}${id}`, JSON.stringify(data));
      } catch {
        // Ignore
      }
    }
  }
}

export function getCachedAnimeTooltip(id?: string): AnimeTooltipData | null {
  if (!id) return null;
  if (memoryCache.has(id)) return memoryCache.get(id)!;

  const persistentData = getPersistentCached(id);
  if (persistentData) {
    memoryCache.set(id, persistentData);
    return persistentData;
  }
  return null;
}

export function setCachedAnimeTooltip(id: string, data: AnimeTooltipData) {
  if (!id || !data) return;
  memoryCache.set(id, data);
  setPersistentCached(id, data);
}

export function fetchAnimeTooltip(id?: string): Promise<AnimeTooltipData | null> {
  if (!id) return Promise.resolve(null);

  // Trigger lazy cleanup once on client
  if (typeof window !== "undefined" && !hasCleanedUpExpired) {
    setTimeout(cleanExpiredCache, 2000);
  }

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
        setPersistentCached(id, data);
        return data;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      promiseCache.delete(id);
    });

  promiseCache.set(id, promise);
  return promise;
}

export function clearAnimeTooltipCache() {
  memoryCache.clear();
  promiseCache.clear();
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(STORAGE_PREFIX) || key.startsWith(LEGACY_STORAGE_PREFIX))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}
