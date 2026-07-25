"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayIcon, Tv, Clapperboard, ShieldAlert, Eye, BookmarkCheck } from 'lucide-react';
import type { AnimeListItem, AnimeTooltipData } from '@/lib/types';
import { getAnimeSlug } from '@/lib/types';
import { AnimeTooltip } from './AnimeTooltip';
import { useBlockedFilters } from '@/lib/blocked-filters-context';
import { useUserLibrary, statusLabels, statusBadgeStyles } from '@/lib/library-context';
import { getCachedAnimeTooltip, fetchAnimeTooltip } from '@/lib/anime-details-cache';
import { cn } from '@/lib/utils';

type AnimeCardProps = {
  anime: AnimeListItem;
  className?: string;
};

export function AnimeCard({ anime, className }: AnimeCardProps) {
  const { isAnimeBlocked, getBlockedReason, blockedFilters } = useBlockedFilters();
  const { getLibraryStatus } = useUserLibrary();
  const libraryStatus =
    getLibraryStatus(anime.id) ||
    getLibraryStatus(anime.slug) ||
    getLibraryStatus(getAnimeSlug(anime));

  const [tooltipData, setTooltipData] = useState<AnimeTooltipData | null>(() =>
    getCachedAnimeTooltip(anime.id)
  );

  useEffect(() => {
    if (!anime.id) return;
    if (!blockedFilters.enabled) return;

    // Check if we need deeper metadata (rating / genres)
    const hasDetailedInfo = (anime as any).rating || ((anime as any).genres && (anime as any).genres.length > 0);
    if (hasDetailedInfo) return;

    const cached = getCachedAnimeTooltip(anime.id);
    if (cached) {
      setTooltipData(cached);
      return;
    }

    if (blockedFilters.ratings.length > 0 || blockedFilters.genres.length > 0) {
      let isMounted = true;
      fetchAnimeTooltip(anime.id).then((data) => {
        if (isMounted && data) {
          setTooltipData(data);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [anime.id, blockedFilters.enabled, blockedFilters.ratings.length, blockedFilters.genres.length, (anime as any).rating]);

  const mergedAnime = tooltipData ? { ...tooltipData, ...anime } : anime;
  const isBlocked = isAnimeBlocked(mergedAnime);
  const blockedReason = getBlockedReason(mergedAnime);
  const [unblur, setUnblur] = useState(false);

  const subCount = Number(anime.episodes?.sub) || 0;
  const dubCount = Number(anime.episodes?.dub) || 0;
  const hasEpisodes = subCount > 0 || dubCount > 0;

  // If in 'hide' mode and item is blocked, hide completely
  if (isBlocked && blockedFilters.mode === 'hide') {
    return null;
  }

  const shouldBlur = isBlocked && blockedFilters.mode === 'blur' && !unblur;

  return (
    <AnimeTooltip id={anime.id} fallbackTitle={anime.title}>
      <Link href={`/anime/${getAnimeSlug(anime)}`} className={`group block h-full ${className}`}>
        <Card className="overflow-visible border-0 bg-transparent shadow-sm rounded-lg h-full flex flex-col">
          <div className="relative aspect-[2/3] w-full">
            {/* wrapper scales and has shadow so the shadow grows with the image */}
            <div className="relative overflow-hidden rounded-md transition-transform duration-300 group-hover:scale-105 shadow-lg w-full h-full">
              <Image
                src={anime.image || '/placeholder.jpg'}
                alt={anime.title}
                fill
                sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 15vw"
                className={`object-cover transition-all duration-300 ${
                  shouldBlur ? 'blur-md scale-105 opacity-30 transform-gpu [will-change:filter]' : ''
                }`}
              />
              {shouldBlur ? (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-2 text-center z-10 space-y-2 transform-gpu">
                  <ShieldAlert className="w-8 h-8 text-destructive animate-pulse" />
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0.5 px-2">
                    Blocked
                  </Badge>
                  {blockedReason && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 px-1">
                      {blockedReason}
                    </p>
                  )}
                  <button
                    type="button"
                    data-no-nav="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setUnblur(true);
                    }}
                    className="mt-1 text-[10px] bg-background/80 hover:bg-background text-foreground px-2 py-1 rounded flex items-center gap-1 border border-border"
                  >
                    <Eye className="w-3 h-3" /> Reveal
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <PlayIcon className="h-12 w-12 text-white" />
                  </div>
                </div>
              )}
            </div>
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start pointer-events-none">
              {anime.rank && (
                <Badge
                  variant="destructive"
                  className="bg-primary/90 text-primary-foreground text-xs font-bold border-0 shadow-md"
                >
                  #{anime.rank}
                </Badge>
              )}
              {libraryStatus && (
                <Badge
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md border-0 bg-emerald-600 text-white flex items-center gap-1 tracking-tight transition-transform duration-200 group-hover:scale-105"
                  )}
                >
                  <BookmarkCheck className="w-3 h-3 flex-shrink-0" />
                  <span>{statusLabels[libraryStatus]}</span>
                </Badge>
              )}
            </div>
            {anime.type && (
              <Badge className="absolute top-2 right-2 border-0 shadow-md pointer-events-none">
                {anime.type === 'TV' ? <Tv className="w-3 h-3 mr-1"/> : <Clapperboard className="w-3 h-3 mr-1"/>}
                {anime.type}
              </Badge>
            )}
          </div>
          <CardContent className="p-0 pt-3 flex-grow flex flex-col">
            <h3 className="font-semibold text-base leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {anime.title}
            </h3>
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
    </AnimeTooltip>
  );
}
