"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { AnimeListItem, AnimeDetail, AnimeTooltipData } from "./types";

import { getCachedAnimeTooltip } from "./anime-details-cache";

export interface BlockedFilters {
  enabled: boolean;
  mode: "hide" | "blur";
  genres: string[];
  types: string[];
  ratings: string[];
  keywords: string[];
}

export const DEFAULT_BLOCKED_FILTERS: BlockedFilters = {
  enabled: true,
  mode: "hide",
  genres: ["Hentai"],
  types: [],
  ratings: [],
  keywords: [],
};

const LOCAL_STORAGE_KEY = "aonime_blocked_filters";

interface BlockedFiltersContextType {
  blockedFilters: BlockedFilters;
  loading: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  updateBlockedFilters: (newFilters: Partial<BlockedFilters>) => Promise<void>;
  resetBlockedFilters: () => Promise<void>;
  isAnimeBlocked: (anime: AnimeListItem | AnimeDetail | AnimeTooltipData | null | undefined) => boolean;
  getBlockedReason: (anime: AnimeListItem | AnimeDetail | AnimeTooltipData | null | undefined) => string | null;
  filterAnimeList: <T extends AnimeListItem>(list: T[]) => T[];
}

const BlockedFiltersContext = createContext<BlockedFiltersContextType | undefined>(undefined);

export function BlockedFiltersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [blockedFilters, setBlockedFilters] = useState<BlockedFilters>(DEFAULT_BLOCKED_FILTERS);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Helper to load local storage
  const loadLocalFilters = (): BlockedFilters => {
    if (typeof window === "undefined") return DEFAULT_BLOCKED_FILTERS;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_BLOCKED_FILTERS, ...parsed };
      }
    } catch (e) {
      console.error("Error reading local blocked filters:", e);
    }
    return DEFAULT_BLOCKED_FILTERS;
  };

  // Helper to save local storage
  const saveLocalFilters = (filters: BlockedFilters) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.error("Error saving local blocked filters:", e);
    }
  };

  // Sync on mount or when user state changes
  useEffect(() => {
    let isMounted = true;

    async function syncFilters() {
      setLoading(true);
      if (user?.uid) {
        // Authenticated user -> load from Firestore
        const userDocRef = doc(db, "users", user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          const localFilters = loadLocalFilters();
          const hasLocalCustomizations =
            typeof window !== "undefined" && localStorage.getItem(LOCAL_STORAGE_KEY) !== null;

          if (docSnap.exists() && docSnap.data().blockedFilters) {
            const remoteFilters = docSnap.data().blockedFilters as BlockedFilters;
            const merged: BlockedFilters = {
              ...DEFAULT_BLOCKED_FILTERS,
              ...remoteFilters,
            };
            if (isMounted) setBlockedFilters(merged);
          } else {
            // Document doesn't have blockedFilters yet -> if local exists, migrate local to account, else default
            const toSave = hasLocalCustomizations ? localFilters : DEFAULT_BLOCKED_FILTERS;
            await setDoc(userDocRef, { blockedFilters: toSave }, { merge: true });
            if (isMounted) setBlockedFilters(toSave);
          }
        } catch (e) {
          console.error("Error fetching Firestore blocked filters:", e);
          if (isMounted) setBlockedFilters(loadLocalFilters());
        }
      } else {
        // Guest user -> load from localStorage
        if (isMounted) setBlockedFilters(loadLocalFilters());
      }
      if (isMounted) setLoading(false);
    }

    syncFilters();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const [savedAnimeIds, setSavedAnimeIds] = useState<Set<string>>(new Set());

  // Subscribe to user's saved library anime so saved anime are exempt from blocklist filters
  useEffect(() => {
    if (!user?.uid) {
      setSavedAnimeIds(new Set());
      return;
    }

    const q = query(collection(db, "libraries"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ids = new Set<string>();
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.animeId) ids.add(String(data.animeId).toLowerCase());
          if (data.slug) ids.add(String(data.slug).toLowerCase());
        });
        setSavedAnimeIds(ids);
      },
      (error) => {
        console.error("Error subscribing to saved library anime:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const updateBlockedFilters = async (newFilters: Partial<BlockedFilters>) => {
    const updated: BlockedFilters = { ...blockedFilters, ...newFilters };
    setBlockedFilters(updated);

    if (user?.uid) {
      // Save to Firestore
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { blockedFilters: updated }, { merge: true });
      } catch (e) {
        console.error("Error saving Firestore blocked filters:", e);
      }
    } else {
      // Save to Local Storage
      saveLocalFilters(updated);
    }
  };

  const resetBlockedFilters = async () => {
    await updateBlockedFilters(DEFAULT_BLOCKED_FILTERS);
  };

  const getBlockedReason = useCallback(
    (anime: AnimeListItem | AnimeDetail | AnimeTooltipData | null | undefined): string | null => {
      if (!anime || !blockedFilters.enabled) return null;

      const animeObj = anime as any;

      // Exemption: Anime saved in the user's library are exempt from content filter blocking/blurring everywhere
      if (savedAnimeIds.size > 0) {
        const idStr = animeObj.id ? String(animeObj.id).toLowerCase() : "";
        const slugStr = animeObj.slug ? String(animeObj.slug).toLowerCase() : "";
        const animeIdStr = animeObj.animeId ? String(animeObj.animeId).toLowerCase() : "";

        if (
          (idStr && savedAnimeIds.has(idStr)) ||
          (slugStr && savedAnimeIds.has(slugStr)) ||
          (animeIdStr && savedAnimeIds.has(animeIdStr))
        ) {
          return null;
        }
      }

      const normalizeString = (str: string): string =>
        str.toLowerCase().replace(/[^a-z0-9]/g, "");

      const extractGenres = (item: any): string[] => {
        if (!item) return [];
        const result: string[] = [];
        const addVal = (val: any) => {
          if (typeof val === "string" && val.trim()) {
            if (val.includes(",")) {
              val.split(",").forEach((v) => result.push(v.trim()));
            } else {
              result.push(val.trim());
            }
          } else if (val && typeof val === "object") {
            if (typeof val.name === "string") result.push(val.name.trim());
            if (typeof val.id === "string") result.push(val.id.trim());
            if (typeof val.slug === "string") result.push(val.slug.trim());
          }
        };

        if (Array.isArray(item.genres)) item.genres.forEach(addVal);
        else if (item.genres) addVal(item.genres);

        if (Array.isArray(item.genre)) item.genre.forEach(addVal);
        else if (item.genre) addVal(item.genre);

        if (Array.isArray(item.tags)) item.tags.forEach(addVal);
        else if (item.tags) addVal(item.tags);

        return result;
      };

      const cachedData = getCachedAnimeTooltip(animeObj.id || animeObj.slug);
      const mergedObj = cachedData ? { ...cachedData, ...animeObj } : animeObj;

      const animeGenres = extractGenres(mergedObj).map(normalizeString);
      const titleNorm = normalizeString(mergedObj.title || "");
      const titleJpNorm = normalizeString(mergedObj.titleJp || "");
      const slugNorm = normalizeString(mergedObj.slug || mergedObj.id || "");
      const synopsisNorm = normalizeString(mergedObj.synopsis || "");

      // 1. Check Genres
      if (blockedFilters.genres.length > 0) {
        for (const blockedGenre of blockedFilters.genres) {
          const normBlocked = normalizeString(blockedGenre);
          if (!normBlocked) continue;

          if (animeGenres.some((g) => g === normBlocked || g.includes(normBlocked))) {
            return `Genre: ${blockedGenre}`;
          }

          if (
            normBlocked.length >= 4 &&
            (titleNorm.includes(normBlocked) ||
              slugNorm.includes(normBlocked) ||
              synopsisNorm.includes(normBlocked))
          ) {
            return `Genre: ${blockedGenre}`;
          }
        }
      }

      // 2. Check Types
      const currentType = mergedObj.type || animeObj.type;
      if (blockedFilters.types.length > 0 && currentType) {
        const animeTypeNorm = normalizeString(currentType);
        for (const blockedType of blockedFilters.types) {
          if (animeTypeNorm === normalizeString(blockedType)) {
            return `Type: ${blockedType}`;
          }
        }
      }

      // 3. Check Ratings
      const currentRating = mergedObj.rating || animeObj.rating;
      if (blockedFilters.ratings.length > 0 && currentRating) {
        const ratingRawLower = currentRating.toLowerCase().trim();
        const normRating = normalizeString(currentRating);

        for (const blockedRating of blockedFilters.ratings) {
          const blockedRawLower = blockedRating.toLowerCase().trim();
          const normBlocked = normalizeString(blockedRating);
          if (!blockedRawLower || !normBlocked) continue;

          // Robust rating check: e.g. "R+" in "R+" or "R+ - Mild Nudity", "R-17+" or "17+" for R - 17+
          if (
            ratingRawLower === blockedRawLower ||
            ratingRawLower.includes(blockedRawLower) ||
            normRating === normBlocked ||
            (normBlocked.includes("r") && normBlocked.includes("17") && normRating.includes("17")) ||
            (normBlocked === "r" && (normRating === "r" || normRating.startsWith("r17") || normRating.startsWith("rplus"))) ||
            (normBlocked.includes("plus") && (normRating.includes("plus") || ratingRawLower.includes("r+"))) ||
            (normBlocked.includes("rx") && normRating.includes("rx"))
          ) {
            return `Rating: ${blockedRating}`;
          }
        }
      }

      // 4. Check Keywords
      if (blockedFilters.keywords.length > 0) {
        for (const keyword of blockedFilters.keywords) {
          const normKw = normalizeString(keyword);
          if (!normKw) continue;
          if (
            titleNorm.includes(normKw) ||
            titleJpNorm.includes(normKw) ||
            slugNorm.includes(normKw) ||
            synopsisNorm.includes(normKw)
          ) {
            return `Keyword: "${keyword}"`;
          }
        }
      }

      return null;
    },
    [blockedFilters, savedAnimeIds]
  );

  const isAnimeBlocked = useCallback(
    (anime: AnimeListItem | AnimeDetail | AnimeTooltipData | null | undefined): boolean => {
      return getBlockedReason(anime) !== null;
    },
    [getBlockedReason]
  );

  const filterAnimeList = useCallback(
    <T extends AnimeListItem>(list: T[]): T[] => {
      if (!list || !blockedFilters.enabled || blockedFilters.mode === "blur") {
        return list;
      }
      return list.filter((item) => !isAnimeBlocked(item));
    },
    [blockedFilters.enabled, blockedFilters.mode, isAnimeBlocked]
  );

  return (
    <BlockedFiltersContext.Provider
      value={{
        blockedFilters,
        loading,
        isModalOpen,
        openModal,
        closeModal,
        updateBlockedFilters,
        resetBlockedFilters,
        isAnimeBlocked,
        getBlockedReason,
        filterAnimeList,
      }}
    >
      {children}
    </BlockedFiltersContext.Provider>
  );
}

export function useBlockedFilters() {
  const context = useContext(BlockedFiltersContext);
  if (context === undefined) {
    throw new Error("useBlockedFilters must be used within a BlockedFiltersProvider");
  }
  return context;
}
