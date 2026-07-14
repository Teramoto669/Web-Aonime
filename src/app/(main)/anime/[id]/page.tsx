import { getAnimeDetails, getAnimeEpisodes, getAnimeRelated, getAnimeRecommendations } from "@/lib/api";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Star, Tv, Calendar, ShieldAlert } from "lucide-react";
import Link from 'next/link';
import LibraryButton from "@/components/anime/LibraryButton";
import { Suspense } from 'react';
import { RecommendationsSection } from "@/components/anime/RecommendationsSection";
import { EpisodeListClient } from "@/components/anime/EpisodeListClient";
import { RelatedSection } from "@/components/anime/RelatedSection";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentSection } from "@/components/anime/CommentSection";

async function AnimeDetailsPageContent({ id }: { id: string }) {
    try {
        const detailsData = await getAnimeDetails(id);
        
        // Use the slug from details response for fetching episodes
        const slug = detailsData.slug || id;
        
        // Fetch episodes, related and recommendations in parallel
        const [episodesData, relatedData, recommendationsData] = await Promise.all([
            getAnimeEpisodes(slug),
            getAnimeRelated(slug).catch((err) => {
                console.error("Failed to fetch related anime", err);
                return [];
            }),
            getAnimeRecommendations(slug).catch((err) => {
                console.error("Failed to fetch recommendations", err);
                return [];
            })
        ]);

        // Parse genres — already an array from the new API
        const genresList = (detailsData.genres || []).map(genre => 
            genre.charAt(0).toUpperCase() + genre.slice(1)
        );

        const statItems = [
            detailsData.malScore != null && { icon: Star, label: "Star Rating", value: detailsData.malScore.toFixed(2) },
            detailsData.rating && { icon: ShieldAlert, label: "Age Rating", value: detailsData.rating },
            detailsData.type && { icon: Tv, label: "Type", value: detailsData.type },
            detailsData.aired && { icon: Calendar, label: "Aired", value: detailsData.aired },
        ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

        const isNotYetAired = detailsData.status?.toLowerCase().includes("not yet aired");
        const hasEpisodes = episodesData.episodes && episodesData.episodes.length > 0;

        return (
            <div className="space-y-12">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-[240px] lg:w-[280px] xl:w-[320px] flex-shrink-0">
                        <div className="relative aspect-[2/3] w-full">
                            <Image
                                src={detailsData.image || '/placeholder.jpg'}
                                alt={detailsData.title ?? id}
                                fill
                                className="rounded-lg object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority
                            />
                        </div>
                    </div>
                    <div className="flex-1 space-y-4">
                        <h1 className="text-4xl font-black">{detailsData.title ?? id}</h1>
                        {genresList.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {genresList.map((genre) => (
                                    <Badge key={genre} variant="secondary">{genre}</Badge>
                                ))}
                            </div>
                        )}
                        {detailsData.synopsis && (
                            <p className="text-muted-foreground">{detailsData.synopsis}</p>
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

                        <div className="pt-6 flex flex-wrap gap-4 items-center">
                            {!isNotYetAired && hasEpisodes && (
                                <Button asChild size="lg" className="font-bold">
                                    <Link href={`/watch/${slug}`}>
                                        <PlayCircle className="mr-2 h-5 w-5" /> Watch Now
                                    </Link>
                                </Button>
                            )}
                            <LibraryButton
                                animeId={detailsData.id || id}
                                title={detailsData.title || id}
                                image={detailsData.image || ""}
                                type={detailsData.type || "TV"}
                                slug={slug}
                                className="h-11 px-5 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {episodesData.episodes.length > 0 && (
                    <EpisodeListClient
                        animeId={slug}
                        episodes={episodesData.episodes}
                        totalEpisodes={episodesData.episodes.length}
                    />
                )}

                {relatedData && relatedData.length > 0 && (
                    <RelatedSection related={relatedData} />
                )}

                {recommendationsData && recommendationsData.length > 0 && (
                    <RecommendationsSection recommendations={recommendationsData} />
                )}

                <CommentSection animeId={slug} animeTitle={detailsData.title || id} />
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
        <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-[240px] lg:w-[280px] xl:w-[320px] flex-shrink-0">
                <Skeleton className="w-full aspect-[2/3] rounded-lg" />
            </div>
            <div className="flex-1 space-y-4">
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

export default async function AnimeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <AnimeDetailsPageContent id={id} />
        </Suspense>
    );
}
