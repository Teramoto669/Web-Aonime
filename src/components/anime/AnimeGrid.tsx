"use client";

import { useEffect, useState } from "react";
import { AnimeCard } from "./AnimeCard";
import type { AnimeListItem } from "@/lib/types";
import { useBlockedFilters } from "@/lib/blocked-filters-context";
import { fetchAnimeTooltip, getCachedAnimeTooltip } from "@/lib/anime-details-cache";
import { Loader2 } from "lucide-react";

type AnimeGridProps = {
  animes: AnimeListItem[];
  fetchNextPage?: (nextPageNum: number) => Promise<AnimeListItem[]>;
  currentPage?: number;
  targetCount?: number;
};

export function AnimeGrid({
  animes,
  fetchNextPage,
  currentPage = 1,
  targetCount = 24,
}: AnimeGridProps) {
  const { isAnimeBlocked, filterAnimeList, blockedFilters } = useBlockedFilters();
  const [extraAnimes, setExtraAnimes] = useState<AnimeListItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToFetch, setNextPageToFetch] = useState(currentPage + 1);
  const [hasNoMorePages, setHasNoMorePages] = useState(false);
  const [, setResolvedCount] = useState(0);

  // Pre-resolve initial items metadata in background so blocked initial items are known quickly
  useEffect(() => {
    if (!blockedFilters.enabled || blockedFilters.mode !== "hide") return;
    if (!animes || animes.length === 0) return;
    if (blockedFilters.ratings.length === 0 && blockedFilters.genres.length === 0) return;

    let isMounted = true;
    animes.forEach((item) => {
      if (item.id && !(item as any).rating && !getCachedAnimeTooltip(item.id)) {
        fetchAnimeTooltip(item.id).then((data) => {
          if (isMounted && data) {
            setResolvedCount((prev) => prev + 1);
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [animes, blockedFilters.enabled, blockedFilters.mode, blockedFilters.ratings.length, blockedFilters.genres.length]);

  // Combine initial animes + dynamically fetched extra animes
  const allRawAnimes = [...animes, ...extraAnimes];
  const visibleAnimes = filterAnimeList(allRawAnimes);

  // Reset extraAnimes whenever initial animes array changes (e.g. page change or filter change)
  useEffect(() => {
    setExtraAnimes([]);
    setNextPageToFetch(currentPage + 1);
    setHasNoMorePages(false);
  }, [animes, currentPage]);

  // Auto-refill effect: if 'hide' mode is enabled, and visible items < targetCount, fetch next page
  useEffect(() => {
    if (!blockedFilters.enabled || blockedFilters.mode !== "hide") return;
    if (visibleAnimes.length >= targetCount || hasNoMorePages || loadingMore) return;
    if (!animes || animes.length === 0) return;

    let isMounted = true;
    setLoadingMore(true);

    const loadMore = async () => {
      try {
        let newItems: AnimeListItem[] = [];
        if (fetchNextPage) {
          newItems = await fetchNextPage(nextPageToFetch);
        } else {
          // Default client fetch via internal /api/filter or current window URL params
          const searchParams = new URLSearchParams(window.location.search);
          searchParams.set("page", String(nextPageToFetch));
          const res = await fetch(`/api/filter?${searchParams.toString()}`);
          if (res.ok) {
            const json = await res.json();
            const results = json.data?.results || json.data || [];
            if (Array.isArray(results)) {
              newItems = results;
            }
          }
        }

        if (!isMounted) return;

        if (!newItems || newItems.length === 0) {
          setHasNoMorePages(true);
        } else {
          // Pre-resolve metadata for new items to filter out blocked items BEFORE adding to state
          const resolvedNewItems = await Promise.all(
            newItems.map(async (item) => {
              if (!item.id) return item;
              const hasDetail =
                (item as any).rating ||
                ((item as any).genres && (item as any).genres.length > 0);
              if (hasDetail) return item;

              const cached = getCachedAnimeTooltip(item.id);
              if (cached) return { ...cached, ...item };

              if (
                blockedFilters.ratings.length > 0 ||
                blockedFilters.genres.length > 0
              ) {
                const data = await fetchAnimeTooltip(item.id);
                if (data) return { ...data, ...item };
              }
              return item;
            })
          );

          if (!isMounted) return;

          // Filter out blocked items and duplicates BEFORE adding to state
          const unblockedNewItems = resolvedNewItems.filter(
            (item) => !isAnimeBlocked(item)
          );

          setExtraAnimes((prev) => {
            const existingIds = new Set(
              [...animes, ...prev].map((a) => a.id || a.slug)
            );
            const fresh = unblockedNewItems.filter(
              (item) => !existingIds.has(item.id || item.slug)
            );
            return [...prev, ...fresh];
          });
          setNextPageToFetch((prev) => prev + 1);
        }
      } catch (err) {
        console.error("Error auto-refilling blocked anime grid items:", err);
        if (isMounted) setHasNoMorePages(true);
      } finally {
        if (isMounted) setLoadingMore(false);
      }
    };

    loadMore();

    return () => {
      isMounted = false;
    };
  }, [
    visibleAnimes.length,
    targetCount,
    blockedFilters.enabled,
    blockedFilters.mode,
    blockedFilters.ratings.length,
    blockedFilters.genres.length,
    nextPageToFetch,
    hasNoMorePages,
    loadingMore,
    animes,
    fetchNextPage,
    isAnimeBlocked,
  ]);

  if (!visibleAnimes || visibleAnimes.length === 0) {
    if (loadingMore) {
      return (
        <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading unblocked content...</span>
        </div>
      );
    }
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No anime available or all items match your Blocked Content Filter.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-[repeat(14,minmax(0,1fr))] gap-4 md:gap-6">
        {visibleAnimes.slice(0, targetCount).map((anime) => (
          <AnimeCard key={anime.id || anime.slug || anime.title} anime={anime} />
        ))}
      </div>
      {loadingMore && (
        <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Refilling grid with unblocked anime...</span>
        </div>
      )}
    </div>
  );
}
