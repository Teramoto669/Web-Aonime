import { AnimeCard } from "./AnimeCard";
import type { AnimeListItem } from "@/lib/types";

type AnimeGridProps = {
  animes: AnimeListItem[];
}

export function AnimeGrid({ animes }: AnimeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-[repeat(14,minmax(0,1fr))] gap-4 md:gap-6">
      {animes.map(anime => (
        <AnimeCard key={anime.id} anime={anime} />
      ))}
    </div>
  );
}
