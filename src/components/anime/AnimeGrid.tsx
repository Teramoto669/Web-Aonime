import { AnimeCard } from "./AnimeCard";
import type { AnimeBase } from "@/lib/types";

type AnimeGridProps = {
  animes: (AnimeBase & { rank?: number })[];
}

export function AnimeGrid({ animes }: AnimeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {animes.map(anime => (
        <AnimeCard key={anime.id} anime={anime} />
      ))}
    </div>
  );
}
