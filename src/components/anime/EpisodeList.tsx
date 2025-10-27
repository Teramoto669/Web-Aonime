import type { Episode } from "@/lib/types";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type EpisodeListProps = {
  animeId: string;
  episodes: Episode[];
  totalEpisodes: number;
  currentEpisode?: number;
};

export function EpisodeList({ animeId, episodes, totalEpisodes, currentEpisode }: EpisodeListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Episodes ({totalEpisodes})</h3>
      <ScrollArea className="h-96 rounded-md border">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-4">
          {episodes.map((ep) => (
            <Button
              key={ep.episodeId}
              asChild
              variant={currentEpisode === ep.number ? "default" : "outline"}
              className={cn(
                "justify-start",
                ep.isFiller && "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
              )}
              title={ep.isFiller ? `${ep.title} (Filler)` : ep.title}
            >
              <Link href={`/watch/${animeId}?ep=${ep.episodeId}&num=${ep.number}`}>
                <div className="truncate">
                    <span className="font-semibold mr-2">EP {ep.number}</span>
                    <span className="text-muted-foreground truncate">{ep.title}</span>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
