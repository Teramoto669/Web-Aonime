import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { RelatedAnime } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { PlayIcon } from 'lucide-react';
import { AnimeTooltip } from './AnimeTooltip';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useBlockedFilters } from '@/lib/blocked-filters-context';

interface RelatedSectionProps {
    related: RelatedAnime[];
}

function getRelatedSlug(item: RelatedAnime): string | null {
    if (item.slug) return item.slug;
    if (item.href) {
        // Strip query parameters and hash first
        const pathOnly = item.href.split('?')[0].split('#')[0];
        
        // Extract slug from watch URL
        const match = pathOnly.match(/\/watch\/([^/]+)/);
        if (match?.[1]) return match[1];
        
        // Fallback: last path segment
        const parts = pathOnly.replace(/\/$/, '').split('/').filter(Boolean);
        if (parts.length > 0) {
            const lastSegment = parts[parts.length - 1];
            if (lastSegment !== 'anime') {
                return lastSegment;
            }
        }
    }
    return null;
}

const RelatedCard = React.memo(function RelatedCard({ item }: { item: RelatedAnime }) {
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
        const slug = getRelatedSlug(item);
        href = slug ? `/anime/${slug}` : (item.href ?? '#');
        isExternal = !slug && !!item.href?.startsWith('http');
    }

    const content = (
        <div className="group flex-shrink-0 w-[130px] sm:w-[150px] select-none">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md shadow-md transition-transform duration-300 group-hover:scale-105">
                <Image
                    src={item.image || '/placeholder.jpg'}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 130px, 150px"
                    className="object-cover pointer-events-none"
                    draggable={false}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 pointer-events-none">
                    <PlayIcon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                {item.relation && (
                    <Badge className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 capitalize border-0 bg-primary/90 text-primary-foreground pointer-events-none">
                        {item.relation}
                    </Badge>
                )}
            </div>
            <p className="mt-2 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {item.title}
            </p>
        </div>
    );

    if (isExternal) {
        return (
            <AnimeTooltip id={item.id} fallbackTitle={item.title}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="block select-none" draggable={false}>
                    {content}
                </a>
            </AnimeTooltip>
        );
    }

    return (
        <AnimeTooltip id={item.id} fallbackTitle={item.title}>
            <Link href={href} className="block select-none" draggable={false}>
                {content}
            </Link>
        </AnimeTooltip>
    );
});

export function RelatedSection({ related }: RelatedSectionProps) {
    const { filterAnimeList } = useBlockedFilters();
    const visibleRelated = useMemo(
        () => filterAnimeList(related as any) as RelatedAnime[],
        [related, filterAnimeList]
    );

    if (!visibleRelated || visibleRelated.length === 0) return null;

    return (
        <section className="space-y-4 my-8">
            <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-bold">Related Anime</h2>
                <span className="text-sm text-muted-foreground ml-auto">{visibleRelated.length} titles</span>
            </div>
            <Carousel
                opts={{
                    align: "start",
                    dragFree: true,
                    containScroll: "trimSnaps",
                }}
                className="w-full relative"
            >
                <CarouselContent className="-ml-3 sm:-ml-4">
                    {visibleRelated.map((item) => (
                        <CarouselItem key={item.id ?? item.title} className="pl-3 sm:pl-4 basis-auto">
                            <RelatedCard item={item} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="-left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-md" />
                <CarouselNext className="-right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-md" />
            </Carousel>
        </section>
    );
}
