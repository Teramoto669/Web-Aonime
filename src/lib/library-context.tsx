"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export type LibraryStatus = "watching" | "plan_to_watch" | "completed" | "on_hold" | "dropped";

export const statusLabels: Record<LibraryStatus, string> = {
  watching: "Watching",
  plan_to_watch: "Plan to Watch",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

export const statusBadgeStyles: Record<LibraryStatus, string> = {
  watching: "bg-emerald-600 text-white border-0 shadow-sm",
  plan_to_watch: "bg-blue-600 text-white border-0 shadow-sm",
  completed: "bg-violet-600 text-white border-0 shadow-sm",
  on_hold: "bg-amber-500 text-white border-0 shadow-sm",
  dropped: "bg-rose-600 text-white border-0 shadow-sm",
};

export function normalizeLibraryKey(key?: string | null): string {
  if (!key) return "";
  return String(key).toLowerCase().trim().replace(/\//g, "_");
}

export const LOCAL_LIBRARY_KEY = "aonime_local_library";
export const LOCAL_HISTORY_KEY = "aonime_local_history";
export const LOCAL_DATA_EVENT = "aonime-local-data-changed";

export interface LocalLibraryItem {
  id: string;
  userId: string;
  animeId: string;
  title: string;
  image: string;
  type: string;
  slug: string;
  status: LibraryStatus;
  addedAt: number;
  updatedAt: number;
  lastEpisodeWatched?: string;
  lastEpisodeWatchedAt?: number;
}

export interface LocalHistoryItem {
  id: string;
  userId: string;
  animeId: string;
  title: string;
  image: string;
  type: string;
  slug: string;
  episodeNum: string;
  watchedAt: number;
}

export function getLocalLibraryItems(): LocalLibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalLibraryItems(items: LocalLibraryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(LOCAL_DATA_EVENT));
  } catch {}
}

export function getLocalHistoryItems(): LocalHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalHistoryItems(items: LocalHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(LOCAL_DATA_EVENT));
  } catch {}
}

export function upsertLocalLibraryItem(item: {
  id?: string;
  animeId: string;
  title?: string;
  image?: string;
  type?: string;
  slug: string;
  status: LibraryStatus;
}) {
  const cleanSlug = normalizeLibraryKey(item.slug || item.animeId);
  const cleanAnimeId = normalizeLibraryKey(item.animeId || item.slug);
  const docId = item.id || `local_user_${cleanSlug}`;
  const items = getLocalLibraryItems();
  const now = Date.now();
  const idx = items.findIndex(
    (x) =>
      x.id === docId ||
      normalizeLibraryKey(x.slug) === cleanSlug ||
      normalizeLibraryKey(x.animeId) === cleanAnimeId
  );

  // Inherit last watched episode from local watch history if available
  const hist = getLocalHistoryItems().find(
    (h) => normalizeLibraryKey(h.slug) === cleanSlug || normalizeLibraryKey(h.animeId) === cleanAnimeId
  );

  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      status: item.status,
      ...(item.title ? { title: item.title } : {}),
      ...(item.image ? { image: item.image } : {}),
      ...(item.type ? { type: item.type } : {}),
      updatedAt: now,
    };
  } else {
    items.unshift({
      id: docId,
      userId: "local_user",
      animeId: cleanAnimeId,
      title: String(item.title || item.slug).trim(),
      image: String(item.image || "").trim(),
      type: String(item.type || "TV").trim(),
      slug: cleanSlug,
      status: item.status,
      addedAt: now,
      updatedAt: now,
      ...(hist ? { lastEpisodeWatched: hist.episodeNum, lastEpisodeWatchedAt: hist.watchedAt } : {}),
    });
  }
  saveLocalLibraryItems(items);
}

export function removeLocalLibraryItem(idOrSlug: string) {
  const clean = normalizeLibraryKey(idOrSlug);
  const items = getLocalLibraryItems().filter(
    (x) =>
      x.id !== idOrSlug &&
      normalizeLibraryKey(x.id) !== clean &&
      normalizeLibraryKey(x.slug) !== clean &&
      normalizeLibraryKey(x.animeId) !== clean
  );
  saveLocalLibraryItems(items);
}

export function upsertLocalHistoryItem(item: {
  animeId: string;
  title: string;
  image: string;
  slug: string;
  episodeNum: string;
  type?: string;
}) {
  const cleanTargetId = normalizeLibraryKey(item.slug || item.animeId);
  if (!cleanTargetId) return;
  const now = Date.now();
  const docId = `local_user_${cleanTargetId}`;
  const history = getLocalHistoryItems().filter(
    (h) => h.id !== docId && normalizeLibraryKey(h.slug) !== cleanTargetId
  );
  history.unshift({
    id: docId,
    userId: "local_user",
    animeId: cleanTargetId,
    title: String(item.title || cleanTargetId).trim(),
    image: String(item.image || "").trim(),
    type: String(item.type || "TV").trim(),
    slug: cleanTargetId,
    episodeNum: String(item.episodeNum || "1"),
    watchedAt: now,
  });
  saveLocalHistoryItems(history);

  // Also update lastEpisodeWatched in local library if tracked
  const lib = getLocalLibraryItems();
  let libChanged = false;
  for (const l of lib) {
    if (normalizeLibraryKey(l.slug) === cleanTargetId || normalizeLibraryKey(l.animeId) === cleanTargetId) {
      l.lastEpisodeWatched = String(item.episodeNum || "1");
      l.lastEpisodeWatchedAt = now;
      libChanged = true;
    }
  }
  if (libChanged) saveLocalLibraryItems(lib);
}

export function removeLocalHistoryItem(id: string) {
  saveLocalHistoryItems(getLocalHistoryItems().filter((h) => h.id !== id));
}

export function clearLocalHistory() {
  saveLocalHistoryItems([]);
}

interface LibraryContextType {
  libraryMap: Record<string, LibraryStatus>;
  docIdMap: Record<string, string>;
  getLibraryStatus: (idOrSlug?: string | null) => LibraryStatus | null;
  getLibraryDocId: (idOrSlug?: string | null) => string | null;
  isInLibrary: (idOrSlug?: string | null) => boolean;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextType>({
  libraryMap: {},
  docIdMap: {},
  getLibraryStatus: () => null,
  getLibraryDocId: () => null,
  isInLibrary: () => false,
  loading: false,
});

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [libraryMap, setLibraryMap] = useState<Record<string, LibraryStatus>>({});
  const [docIdMap, setDocIdMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setLibraryMap({});
      setDocIdMap({});
      setLoading(false);
      return;
    }

    if (user.isLocal) {
      const syncLocal = () => {
        const sMap: Record<string, LibraryStatus> = {};
        const dMap: Record<string, string> = {};
        const items = getLocalLibraryItems();
        items.forEach((data) => {
          const status = data.status;
          if (status) {
            const uniqueKeys: string[] = [];
            if (data.animeId) uniqueKeys.push(normalizeLibraryKey(data.animeId));
            if (data.slug) uniqueKeys.push(normalizeLibraryKey(data.slug));
            const idAfterUid = normalizeLibraryKey(data.id.replace(`local_user_`, ""));
            if (idAfterUid) uniqueKeys.push(idAfterUid);
            uniqueKeys.forEach((k) => {
              if (k) {
                sMap[k] = status;
                dMap[k] = data.id;
              }
            });
          }
        });
        setLibraryMap(sMap);
        setDocIdMap(dMap);
        setLoading(false);
      };

      syncLocal();
      window.addEventListener(LOCAL_DATA_EVENT, syncLocal);
      window.addEventListener("storage", syncLocal);
      return () => {
        window.removeEventListener(LOCAL_DATA_EVENT, syncLocal);
        window.removeEventListener("storage", syncLocal);
      };
    }

    setLoading(true);
    const q = query(
      collection(db, "libraries"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sMap: Record<string, LibraryStatus> = {};
        const dMap: Record<string, string> = {};

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const status = data.status as LibraryStatus;
          if (status) {
            const uniqueKeys: string[] = [];
            if (data.animeId) uniqueKeys.push(normalizeLibraryKey(data.animeId));
            if (data.slug) uniqueKeys.push(normalizeLibraryKey(data.slug));
            const idAfterUid = normalizeLibraryKey(docSnap.id.replace(`${user.uid}_`, ""));
            if (idAfterUid) uniqueKeys.push(idAfterUid);

            uniqueKeys.forEach((k) => {
              if (k) {
                sMap[k] = status;
                dMap[k] = docSnap.id;
              }
            });
          }
        });

        setLibraryMap(sMap);
        setDocIdMap(dMap);
        setLoading(false);
      },
      (error) => {
        console.error("LibraryContext Firestore sync error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const getLibraryStatus = useMemo(() => {
    return (idOrSlug?: string | null): LibraryStatus | null => {
      const key = normalizeLibraryKey(idOrSlug);
      if (!key) return null;
      return libraryMap[key] || null;
    };
  }, [libraryMap]);

  const getLibraryDocId = useMemo(() => {
    return (idOrSlug?: string | null): string | null => {
      const key = normalizeLibraryKey(idOrSlug);
      if (!key) return null;
      return docIdMap[key] || null;
    };
  }, [docIdMap]);

  const isInLibrary = useMemo(() => {
    return (idOrSlug?: string | null): boolean => {
      return getLibraryStatus(idOrSlug) !== null;
    };
  }, [getLibraryStatus]);

  return (
    <LibraryContext.Provider
      value={{
        libraryMap,
        docIdMap,
        getLibraryStatus,
        getLibraryDocId,
        isInLibrary,
        loading,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useUserLibrary() {
  return useContext(LibraryContext);
}
