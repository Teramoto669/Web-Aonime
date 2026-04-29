import { getAnimeDetails, getAnimeEpisodes } from "@/lib/api";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Star, Tv, Calendar } from "lucide-react";
import Link from 'next/link';
import { Suspense } from 'react';
import { AnimeCarousel } from "@/components/anime/AnimeCarousel";
import { EpisodeList } from "@/components/anime/EpisodeList";
import { Skeleton } from "@/components/ui/skeleton";

async function AnimeDetailsPageContent({ id }: { id: string }) {
    try {
        const [detailsData, episodesData] = await Promise.all([
            getAnimeDetails(id),
            getAnimeEpisodes(id),
        ]);

        const firstEpisode = episodesData.episodes[0];

        // Parse genres — can be string or array from the API
        const genresList = (() => {
            const g = detailsData.detail?.genres;
            let rawGenres: string[] = [];
            if (Array.isArray(g)) rawGenres = g as string[];
            else if (typeof g === 'string' && g) rawGenres = g.split(',').map(s => s.trim());
            
            return rawGenres
                .filter(Boolean)
                .map(genre => {
                    const clean = genre.replace(/^\/genres?\//i, '');
                    return clean.charAt(0).toUpperCase() + clean.slice(1);
                });
        })();

        const statItems = [
            detailsData.rating    && { icon: Star,     label: "Rating",  value: detailsData.rating },
            detailsData.type      && { icon: Tv,        label: "Type",    value: detailsData.type },
            detailsData.detail?.date_aired && { icon: Calendar, label: "Aired", value: detailsData.detail.date_aired },
        ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

        return (
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1">
                        <div className="relative aspect-[2/3] w-full">
                            <Image
                                src={detailsData.poster || '/placeholder.jpg'}
                                alt={detailsData.title ?? id}
                                fill
                                className="rounded-lg object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority
                            />
                        </div>
                    </div>
                    <div className="md:col-span-3 space-y-4">
                        <h1 className="text-4xl font-black">{detailsData.title ?? id}</h1>
                        {genresList.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {genresList.map((genre) => (
                                    <Badge key={genre} variant="secondary">{genre}</Badge>
                                ))}
                            </div>
                        )}
                        {detailsData.description && (
                            <p className="text-muted-foreground">{detailsData.description}</p>
                        )}

                        {statItems.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                                {statItems.map(item => (
                                    <div key={item.label} className="flex items-center">
                                        <item.icon className="w-5 h-5 mr-2 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{item.label}</p>
                                            <p className="font-semibold">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-6">
                            {firstEpisode && (
                                <Button asChild size="lg">
                                    <Link href={`/watch/${id}?num=${firstEpisode.number}`}>
                                        <PlayCircle className="mr-2 h-5 w-5" /> Watch Now
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {episodesData.episodes.length > 0 && (
                    <EpisodeList
                        animeId={id}
                        episodes={episodesData.episodes}
                        totalEpisodes={episodesData.count ?? episodesData.episodes.length}
                    />
                )}
            </div>
        );
    } catch (error) {
        console.error(error);
        return <p className="text-destructive text-center">Could not fetch anime details. The API might be down or the anime ID is invalid.</p>;
    }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
                <Skeleton className="w-full aspect-[2/3] rounded-lg" />
            </div>
            <div className="md:col-span-3 space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <div className="flex flex-wrap gap-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-20" />)}
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                     {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-32" />)}
                </div>
                <div className="pt-6">
                    <Skeleton className="h-12 w-36" />
                </div>
            </div>
        </div>
        <div>
            <Skeleton className="h-8 w-40 mb-4" />
            <Skeleton className="h-96 w-full" />
        </div>
    </div>
  );
}

export default async function AnimeDetailsPage({ params }: { params: { id: string } }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <AnimeDetailsPageContent id={id} />
        </Suspense>
    );
}
