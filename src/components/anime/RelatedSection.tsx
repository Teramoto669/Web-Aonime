import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { RelatedAnime } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { PlayIcon, ShieldAlert, Eye } from 'lucide-react';
import { AnimeTooltip } from './AnimeTooltip';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useBlockedFilters } from '@/lib/blocked-filters-context';
import { getCachedAnimeTooltip, fetchAnimeTooltip } from '@/lib/anime-details-cache';
import { cn } from '@/lib/utils';

interface RelatedSectionProps {
    related: RelatedAnime[];
}

function getRelatedSlug(item: RelatedAnime): string | null {
    if (item.slug) return item.slug;
    if (item.href && !item.href.includes('keyword=')) {
        // Strip query parameters and hash first
        const pathOnly = item.href.split('?')[0].split('#')[0];
        
        // Extract slug from watch URL
        const match = pathOnly.match(/\/watch\/([^/]+)/);
        if (match?.[1]) return match[1];
        
        // Fallback: last path segment
        const parts = pathOnly.replace(/\/$/, '').split('/').filter(Boolean);
        if (parts.length > 0) {
            const lastSegment = parts[parts.length - 1];
            if (lastSegment !== 'anime' && lastSegment !== 'filter') {
                return lastSegment;
            }
        }
    }
    return null;
}

const RelatedCard = React.memo(function RelatedCard({ item }: { item: RelatedAnime }) {
    const { isAnimeBlocked, getBlockedReason, blockedFilters } = useBlockedFilters();
    const [unblur, setUnblur] = useState(false);

    const slug = getRelatedSlug(item);
    const lookupId = item.id || slug || undefined;

    useEffect(() => {
        if (!lookupId || !blockedFilters.enabled) return;
        if (getCachedAnimeTooltip(lookupId)) return;
        if (
            blockedFilters.ratings.length > 0 ||
            blockedFilters.genres.length > 0 ||
            blockedFilters.keywords.length > 0
        ) {
            fetchAnimeTooltip(lookupId);
        }
    }, [
        lookupId,
        blockedFilters.enabled,
        blockedFilters.ratings.length,
        blockedFilters.genres.length,
        blockedFilters.keywords.length,
    ]);

    const itemWithSlug = slug && !item.slug ? { ...item, slug } : item;
    const isBlocked = isAnimeBlocked(itemWithSlug);
    const blockedReason = getBlockedReason(itemWithSlug);

    if (isBlocked && blockedFilters.mode === 'hide') {
        return null;
    }

    const shouldBlur = isBlocked && blockedFilters.mode === 'blur' && !unblur;

    let href = '#';
    let isExternal = false;

    if (item.href && item.href.includes('keyword=')) {
        try {
            const url = new URL(item.href, 'http://localhost');
            const keywordVal = url.searchParams.get('keyword');
            if (keywordVal) {
                href = `/browse?keyword=${encodeURIComponent(keywordVal)}`;
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        href = slug ? `/anime/${slug}` : (item.href ?? '#');
        isExternal = !slug && !!item.href?.startsWith('http');
    }

    const content = (
        <div className="group shrink-0 w-[130px] sm:w-[150px] select-none">
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-md shadow-md transition-transform duration-300 group-hover:scale-105">
                <Image
                    src={item.image || '/placeholder.jpg'}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 130px, 150px"
                    className={cn(
                        "object-cover pointer-events-none transition-all duration-300",
                        shouldBlur && "blur-md scale-105 opacity-30 transform-gpu will-change-[filter]"
                    )}
                    draggable={false}
                    loading="lazy"
                />
                {shouldBlur ? (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-2 text-center z-10 space-y-1.5 transform-gpu">
                        <ShieldAlert className="w-7 h-7 text-destructive animate-pulse" />
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
                    <>
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 pointer-events-none">
                            <PlayIcon className="h-10 w-10 text-white drop-shadow-lg" />
                        </div>
                        {item.relation && (
                            <Badge className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 capitalize border-0 bg-primary/90 text-primary-foreground pointer-events-none">
                                {item.relation}
                            </Badge>
                        )}
                    </>
                )}
            </div>
            <p className="mt-2 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {item.title}
            </p>
        </div>
    );

    if (isExternal) {
        return (
            <AnimeTooltip id={lookupId} fallbackTitle={item.title} fallbackTitleJp={item.titleJp}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="block select-none" draggable={false}>
                    {content}
                </a>
            </AnimeTooltip>
        );
    }

    return (
        <AnimeTooltip id={lookupId} fallbackTitle={item.title} fallbackTitleJp={item.titleJp}>
            <Link href={href} className="block select-none" draggable={false}>
                {content}
            </Link>
        </AnimeTooltip>
    );
});

export function RelatedSection({ related }: RelatedSectionProps) {
    const { filterAnimeList } = useBlockedFilters();
    const [api, setApi] = useState<CarouselApi>();
    const [displayLimit, setDisplayLimit] = useState(24);

    const visibleRelated = useMemo(
        () => filterAnimeList(related),
        [related, filterAnimeList]
    );

    const itemsToRender = useMemo(
        () => visibleRelated.slice(0, displayLimit),
        [visibleRelated, displayLimit]
    );

    useEffect(() => {
        if (!api) return;

        const checkAndExpand = () => {
            const selectedIndex = api.selectedScrollSnap();
            if (selectedIndex >= itemsToRender.length - 6 && itemsToRender.length < visibleRelated.length) {
                setDisplayLimit((prev) => Math.min(prev + 24, visibleRelated.length));
            }
        };

        api.on("select", checkAndExpand);
        api.on("scroll", checkAndExpand);
        return () => {
            api.off("select", checkAndExpand);
            api.off("scroll", checkAndExpand);
        };
    }, [api, itemsToRender.length, visibleRelated.length]);

    if (!visibleRelated || visibleRelated.length === 0) return null;

    return (
        <section className="space-y-4 my-8">
            <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-bold">Related Anime</h2>
                <span className="text-sm text-muted-foreground ml-auto">{visibleRelated.length} titles</span>
            </div>
            <Carousel
                setApi={setApi}
                opts={{
                    align: "start",
                    dragFree: true,
                    containScroll: "trimSnaps",
                }}
                className="w-full relative"
            >
                <CarouselContent className="-ml-3 sm:-ml-4">
                    {itemsToRender.map((item) => (
                        <CarouselItem key={item.id ?? item.title} className="pl-3 sm:pl-4 basis-auto">
                            <RelatedCard item={item} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="-left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-md" />
                <CarouselNext className="-right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-md" />
            </Carousel>
        </section>
    );
}
