"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, ShieldAlert, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AnimeTooltip } from "./AnimeTooltip";
import type { AnimeListItem, AnimeTooltipData } from "@/lib/types";
import { getAnimeSlug } from "@/lib/types";
import { useBlockedFilters } from "@/lib/blocked-filters-context";
import { getCachedAnimeTooltip, fetchAnimeTooltip } from "@/lib/anime-details-cache";
import { cn } from "@/lib/utils";

type TopRatedSidebarProps = {
  topRated: AnimeListItem[];
  title?: string;
};

function TopRatedItem({ anime, rank }: { anime: AnimeListItem; rank: number }) {
  const router = useRouter();
  const { isAnimeBlocked, getBlockedReason, blockedFilters } = useBlockedFilters();
  const [unblur, setUnblur] = useState(false);
  const animeId = anime.id || anime.slug;

  const [tooltipData, setTooltipData] = useState<AnimeTooltipData | null>(() =>
    animeId ? getCachedAnimeTooltip(animeId) : null
  );

  useEffect(() => {
    if (!animeId) return;
    if (!blockedFilters.enabled) return;

    const hasDetailedInfo = (anime as any).rating || ((anime as any).genres && (anime as any).genres.length > 0);
    if (hasDetailedInfo) return;

    const cached = getCachedAnimeTooltip(animeId);
    if (cached) {
      setTooltipData(cached);
      return;
    }

    if (blockedFilters.ratings.length > 0 || blockedFilters.genres.length > 0 || blockedFilters.keywords.length > 0) {
      let isMounted = true;
      fetchAnimeTooltip(animeId).then((data) => {
        if (isMounted && data) {
          setTooltipData(data);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [animeId, blockedFilters.enabled, blockedFilters.ratings.length, blockedFilters.genres.length, blockedFilters.keywords.length, (anime as any).rating]);

  const mergedAnime = tooltipData ? { ...anime, ...tooltipData } : anime;
  const isBlocked = isAnimeBlocked(mergedAnime);
  const blockedReason = getBlockedReason(mergedAnime);

  // If in 'hide' mode and item is blocked, do not render item
  if (isBlocked && blockedFilters.mode === 'hide') {
    return null;
  }

  const shouldBlur = isBlocked && blockedFilters.mode === 'blur' && !unblur;
  const slug = getAnimeSlug(anime);
  const href = slug ? `/anime/${slug}` : "#";

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-nav="true"]')) {
      return;
    }
    if (href && href !== '#') {
      router.push(href);
    }
  };

  return (
    <AnimeTooltip id={animeId} fallbackTitle={anime.title} fallbackTitleJp={anime.titleJp}>
      <div onClick={handleCardClick} className="group block cursor-pointer">
        <Card className="relative overflow-hidden p-2 bg-card/60 hover:bg-accent/40 border-border/40 hover:border-primary/40 transition-all duration-200 shadow-xs hover:shadow-md flex items-center gap-3 rounded-xl">
          {/* Rank Badge */}
          <div
            className={cn(
              "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center font-extrabold text-xs shadow-xs z-10",
              rank === 1
                ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-amber-500/20"
                : rank === 2
                ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 shadow-slate-400/20"
                : rank === 3
                ? "bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 shadow-amber-700/20"
                : "bg-muted/80 text-muted-foreground"
            )}
          >
            {rank}
          </div>

          {/* Thumbnail Image */}
          <div className="relative w-11 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
            <Image
              src={anime.image || "/placeholder.jpg"}
              alt={anime.title}
              fill
              sizes="50px"
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-105",
                shouldBlur && "blur-md opacity-30 scale-110"
              )}
            />
            {shouldBlur && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
                <ShieldAlert className="w-5 h-5 text-destructive animate-pulse" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <h3 className={cn(
                "text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug flex-1",
                shouldBlur && "blur-xs opacity-50"
              )}>
                {anime.title}
              </h3>
              {shouldBlur && (
                <button
                  type="button"
                  data-no-nav="true"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    setUnblur(true);
                  }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex items-center flex-shrink-0 transition-colors uppercase z-20"
                >
                  <Eye className="w-2.5 h-2.5 mr-0.5" /> Reveal
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {anime.score && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  <span>{Number(anime.score).toFixed(2)}</span>
                </Badge>
              )}
              {anime.type && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/60 text-muted-foreground">
                  {anime.type}
                </Badge>
              )}
              {shouldBlur && blockedReason && (
                <span className="text-[10px] text-destructive font-medium truncate">
                  {blockedReason}
                </span>
              )}
              {!shouldBlur && anime.date && (
                <span className="text-[10px] text-muted-foreground truncate">
                  {anime.date}
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AnimeTooltip>
  );
}

export function TopRatedSidebar({ topRated, title = "Top Rated" }: TopRatedSidebarProps) {
  if (!topRated || topRated.length === 0) return null;

  return (
    <aside className="w-full space-y-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
        <div className="h-5 w-1 rounded-full bg-primary" />
        <h2 className="text-lg font-bold text-foreground">
          {title}
        </h2>
      </div>

      <div className="space-y-2.5">
        {topRated.slice(0, 10).map((anime, index) => (
          <TopRatedItem key={anime.id || anime.slug || index} anime={anime} rank={index + 1} />
        ))}
      </div>
    </aside>
  );
}
