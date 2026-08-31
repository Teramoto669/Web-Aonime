"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Info, BookmarkCheck, ShieldAlert, Eye } from 'lucide-react';
import type { AnimeListItem } from "@/lib/types";
import { getAnimeSlug } from "@/lib/types";
import Autoplay from "embla-carousel-autoplay";

import { useBlockedFilters } from "@/lib/blocked-filters-context";
import { useUserLibrary, statusLabels, statusBadgeStyles, type LibraryStatus } from "@/lib/library-context";
import { fetchAnimeTooltip, getCachedAnimeTooltip } from "@/lib/anime-details-cache";
import { cn } from "@/lib/utils";

type SpotlightCarouselProps = {
  animes: AnimeListItem[];
};

interface SpotlightSlideProps {
  anime: AnimeListItem;
  index: number;
  blockedFiltersMode: string;
  isBlocked: boolean;
  blockedReason: string | null;
  libraryStatus?: LibraryStatus | null;
  isUnblurred: boolean;
  onToggleUnblur: (slug: string) => void;
}

const SpotlightSlide = React.memo(function SpotlightSlide({
  anime,
  index,
  blockedFiltersMode,
  isBlocked,
  blockedReason,
  libraryStatus,
  isUnblurred,
  onToggleUnblur,
}: SpotlightSlideProps) {
  const slug = getAnimeSlug(anime);
  const shouldBlur = isBlocked && blockedFiltersMode === "blur" && !isUnblurred;

  return (
    <CarouselItem key={slug}>
      <div className="w-full min-h-[440px] md:min-h-[520px] lg:min-h-[580px] relative flex items-center">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={anime.image || '/placeholder.jpg'}
            alt={anime.title}
            fill
            sizes="(max-width: 1024px) 100vw, 1280px"
            quality={65}
            className={cn(
              "object-cover transition-opacity duration-300",
              shouldBlur ? "opacity-10" : "opacity-100"
            )}
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
          />
          {/* Dark overlay — replaces expensive CSS blur */}
          <div className="absolute inset-0 bg-black/55 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-12 md:py-16 lg:py-20 flex items-center justify-between gap-8 min-h-[440px] md:min-h-[520px] lg:min-h-[580px]">
          {shouldBlur ? (
            <div className="w-full md:w-2/3 lg:w-7/12 space-y-4 pb-2 z-20">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="destructive" className="text-sm font-bold gap-1.5 px-3 py-1 shadow-md">
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                  <span>Content Blocked</span>
                </Badge>
                {blockedReason && (
                  <Badge variant="outline" className="text-xs border-destructive/40 text-destructive bg-destructive/10 font-medium">
                    {blockedReason}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white/50 blur-[3px] select-none leading-tight">
                {anime.title}
              </h1>
              <p className="text-sm text-gray-400/50 blur-[2px] select-none line-clamp-2">
                {anime.synopsis || "This item matches your content filter blocking criteria."}
              </p>
              <div className="flex items-center gap-4 pt-4">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => onToggleUnblur(slug)}
                  className="group bg-white/15 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 active:scale-95 font-semibold"
                >
                  <Eye className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" /> Reveal Content
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full md:w-2/3 lg:w-7/12 space-y-4 pb-2">
              <div className="flex flex-wrap gap-2 items-center">
                {anime.rank && (
                  <Badge className="text-sm bg-primary/90 text-primary-foreground">
                    Rank #{anime.rank}
                  </Badge>
                )}
                {libraryStatus && (
                  <Badge
                    className={cn(
                      "text-xs font-bold gap-1 px-2.5 py-1 border-0 shadow-md",
                      statusBadgeStyles[libraryStatus]
                    )}
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>{statusLabels[libraryStatus]}</span>
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg leading-tight">
                {anime.title}
              </h1>
              {anime.synopsis && (
                <p className="text-sm md:text-base text-gray-300 line-clamp-3">
                  {anime.synopsis}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {anime.type && <Badge variant="secondary">{anime.type}</Badge>}
                {anime.rating && <Badge variant="secondary">{anime.rating}</Badge>}
                {anime.date && <Badge variant="secondary">{anime.date}</Badge>}
              </div>
              <div className="flex items-center gap-4 pt-3">
                <Button
                  asChild
                  size="lg"
                  className="group relative overflow-hidden bg-primary text-primary-foreground font-bold transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 active:scale-95 px-6"
                >
                  <Link href={`/watch/${slug}`}>
                    <PlayCircle className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" /> Watch Now
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="group bg-white/10 hover:bg-white/25 border-white/25 hover:border-white/50 text-white backdrop-blur-md font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 active:scale-95 px-6"
                >
                  <Link href={`/anime/${slug}`}>
                    <Info className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" /> Details
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Poster on right side */}
          <div className="hidden md:flex items-center justify-end md:w-1/3 lg:w-4/12 pr-4 lg:pr-12">
            <div className="relative w-48 h-72 md:w-52 md:h-80 lg:w-60 lg:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/20 ring-1 ring-white/10">
              <Image
                src={anime.image || '/placeholder.jpg'}
                alt={anime.title}
                fill
                sizes="(max-width: 1024px) 220px, 260px"
                quality={80}
                className={cn(
                  "object-cover",
                  shouldBlur && "blur-xl opacity-30 scale-110"
                )}
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
              />
              {shouldBlur ? (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 text-center z-10 space-y-3">
                  <ShieldAlert className="w-10 h-10 text-destructive animate-pulse" />
                  <Badge variant="destructive" className="text-xs uppercase font-bold px-2 py-0.5">
                    Blocked
                  </Badge>
                  {blockedReason && (
                    <p className="text-xs text-muted-foreground line-clamp-2 px-1">
                      {blockedReason}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleUnblur(slug)}
                    className="text-xs bg-background/80 hover:bg-background text-foreground border border-border mt-1 transition-transform hover:scale-105"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Reveal
                  </Button>
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              )}
            </div>
          </div>
        </div>
      </div>
    </CarouselItem>
  );
});

export function SpotlightCarousel({ animes }: SpotlightCarouselProps) {
  const { isAnimeBlocked, getBlockedReason, blockedFilters } = useBlockedFilters();
  const { getLibraryStatus } = useUserLibrary();
  const [, setCacheTick] = useState(0);
  const [unblurredSlides, setUnblurredSlides] = useState<Record<string, boolean>>({});

  const toggleUnblur = useCallback((slug: string) => {
    setUnblurredSlides((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }, []);

  // Prefetch tooltip/genre info in a single batch so content filter blocking rules evaluate accurately without triggering multiple re-renders
  useEffect(() => {
    if (!animes || !blockedFilters.enabled) return;
    let mounted = true;

    const uncachedIds = animes
      .map((anime) => anime.id || anime.slug || getAnimeSlug(anime))
      .filter((id): id is string => Boolean(id) && !getCachedAnimeTooltip(id));

    if (uncachedIds.length === 0) return;

    Promise.allSettled(uncachedIds.map((id) => fetchAnimeTooltip(id))).then(() => {
      if (mounted) setCacheTick((t) => t + 1);
    });

    return () => {
      mounted = false;
    };
  }, [animes, blockedFilters.enabled]);

  // Respect user content filter mode:
  const filteredAnimes = useMemo(() => {
    if (!animes || animes.length === 0) return [];
    if (!blockedFilters.enabled) return animes;
    if (blockedFilters.mode === "hide") {
      return animes.filter((anime) => !isAnimeBlocked(anime));
    }
    return animes;
  }, [animes, blockedFilters.enabled, blockedFilters.mode, isAnimeBlocked]);

  const autoplayPlugin = useMemo(
    () =>
      Autoplay({
        delay: 5000,
        stopOnInteraction: true,
      }),
    []
  );

  if (!filteredAnimes || filteredAnimes.length === 0) return null;

  return (
    <div className="w-full relative">
      <Carousel
        className="w-full"
        plugins={[autoplayPlugin]}
        opts={{
          loop: true,
          containScroll: "trimSnaps",
        }}
      >
        <CarouselContent>
          {filteredAnimes.map((anime, index) => {
            const slug = getAnimeSlug(anime);
            const isBlocked = isAnimeBlocked(anime);
            const blockedReason = getBlockedReason(anime);
            const libraryStatus =
              getLibraryStatus(anime.id ?? slug) ||
              (anime.slug ? getLibraryStatus(anime.slug) : null);

            return (
              <SpotlightSlide
                key={slug || index}
                anime={anime}
                index={index}
                blockedFiltersMode={blockedFilters.mode}
                isBlocked={isBlocked}
                blockedReason={blockedReason}
                libraryStatus={libraryStatus}
                isUnblurred={Boolean(unblurredSlides[slug])}
                onToggleUnblur={toggleUnblur}
              />
            );
          })}
        </CarouselContent>
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-10 z-10 flex gap-2">
          <CarouselPrevious className="relative translate-x-0 translate-y-0 left-0 top-0 transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary" />
          <CarouselNext className="relative translate-x-0 translate-y-0 left-0 top-0 transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary" />
        </div>
      </Carousel>
    </div>
  );
}
