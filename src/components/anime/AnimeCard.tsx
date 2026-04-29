import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayIcon, Tv, Clapperboard } from 'lucide-react';
import type { AnimeListItem } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AnimeCardProps = {
  anime: AnimeListItem;
  className?: string;
};

export function AnimeCard({ anime, className }: AnimeCardProps) {
  const subCount = Number(anime.sub_episodes) || 0;
  const dubCount = Number(anime.dub_episodes) || 0;
  const hasEpisodes = subCount > 0 || dubCount > 0;

  return (
    <Link href={`/anime/${anime.id}`} className={`group block h-full ${className}`}>
      <Card className="overflow-visible border-0 bg-transparent shadow-sm rounded-lg h-full flex flex-col">
        <div className="relative aspect-[2/3] w-full">
          {/* wrapper scales and has shadow so the shadow grows with the image */}
          <div className="relative overflow-hidden rounded-md transition-transform duration-300 group-hover:scale-105 shadow-lg w-full h-full">
            <Image
              src={anime.poster || '/placeholder.jpg'}
              alt={anime.title}
              fill
              sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 15vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <PlayIcon className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          {anime.rank && (
            <Badge
              variant="destructive"
              className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-lg font-bold border-0"
            >
              #{anime.rank}
            </Badge>
          )}
          {anime.type && (
            <Badge className="absolute top-2 right-2 border-0">
              {anime.type === 'TV' ? <Tv className="w-3 h-3 mr-1"/> : <Clapperboard className="w-3 h-3 mr-1"/>}
              {anime.type}
            </Badge>
          )}
        </div>
        <CardContent className="p-0 pt-3 flex-grow flex flex-col">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-semibold text-base leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                  {anime.title}
                </h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{anime.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {hasEpisodes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {subCount > 0 && <span>SUB: {subCount}</span>}
              {subCount > 0 && dubCount > 0 && <span className="text-muted-foreground/50">|</span>}
              {dubCount > 0 && <span>DUB: {dubCount}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
