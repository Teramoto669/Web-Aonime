"use client";

import { AnimeCard } from "./AnimeCard";
import type { AnimeListItem } from "@/lib/types";
import { useBlockedFilters } from "@/lib/blocked-filters-context";

type AnimeGridProps = {
  animes: AnimeListItem[];
};

export function AnimeGrid({ animes }: AnimeGridProps) {
  const { filterAnimeList } = useBlockedFilters();
  const visibleAnimes = filterAnimeList(animes);

  if (!visibleAnimes || visibleAnimes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No anime available or all items match your Blocked Content Filter.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-[repeat(14,minmax(0,1fr))] gap-4 md:gap-6">
      {visibleAnimes.map((anime) => (
        <AnimeCard key={anime.id || anime.slug || anime.title} anime={anime} />
      ))}
    </div>
  );
}
