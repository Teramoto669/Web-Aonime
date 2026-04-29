import type { Episode } from "@/lib/types";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Mic2, Subtitles } from "lucide-react";

type EpisodeListProps = {
  animeId: string;
  episodes: Episode[];
  totalEpisodes: number;
  currentEpisode?: string;
  hideIcons?: boolean;
};

export function EpisodeList({ animeId, episodes, totalEpisodes, currentEpisode, hideIcons }: EpisodeListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Episodes ({totalEpisodes})</h3>
      <ScrollArea className="h-96 rounded-md border">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 p-4">
          {episodes.map((ep) => (
            <Button
              key={ep.token ?? ep.number}
              asChild
              variant={currentEpisode === ep.number ? "default" : "outline"}
              className={cn("justify-start h-auto py-2 flex flex-col items-start")}
              title={ep.title || `Episode ${ep.number}`}
            >
              <Link href={`/watch/${animeId}?num=${ep.number}`}>
                <div className="flex items-center gap-1 w-full">
                  <span className="font-semibold">EP {ep.number}</span>
                  {!hideIcons && (
                    <div className="flex gap-1 ml-auto">
                      {ep.has_sub && <span title="Subtitled"><Subtitles className="w-3 h-3 text-blue-400" /></span>}
                      {ep.has_dub && <span title="Dubbed"><Mic2 className="w-3 h-3 text-green-400" /></span>}
                    </div>
                  )}
                </div>
                {ep.title && ep.title !== `Episode ${ep.number}` && (
                  <span className="text-xs text-muted-foreground line-clamp-1 w-full">{ep.title}</span>
                )}
              </Link>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
