import { getAnimeDetails, getAnimeEpisodes, getAnimeRelated, getAnimeRecommendations } from "@/lib/api";
import { Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { AnimeDetailClient } from "@/components/anime/AnimeDetailClient";

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function AnimeDetailsPageContent({ id }: { id: string }) {
    try {
        const detailsData = await getAnimeDetails(id);
        const slug = detailsData.slug || id;
        
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

        return (
            <AnimeDetailClient
                slug={slug}
                detailsData={detailsData}
                episodesData={episodesData}
                relatedData={relatedData}
                recommendationsData={recommendationsData}
            />
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
