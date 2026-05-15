import { getAnimeDetails, getAnimeEpisodes, getWatchData } from "@/lib/api";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { WatchClient } from "./WatchClient";

function LoadingSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <Skeleton className="aspect-video w-full rounded-lg bg-muted/20" />
                    <div>
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-6 w-1/2" />
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <Skeleton className="h-8 w-1/3 mb-4" />
                    <Skeleton className="h-[600px] w-full rounded-md" />
                </div>
            </div>
        </div>
    )
}

export default async function WatchPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const animeId = resolvedParams.id;
    let currentEp = typeof resolvedSearchParams.ep === 'string' ? resolvedSearchParams.ep : '1';
    let currentRange = typeof resolvedSearchParams.range === 'string' ? resolvedSearchParams.range : '';

    try {
        const detailsData = await getAnimeDetails(animeId);
        
        // Use the slug from details response
        const slug = detailsData.slug || animeId;
        
        const [episodesData, watchData] = await Promise.all([
            getAnimeEpisodes(slug),
            getWatchData(slug, currentEp)
        ]);

        // Validate episode number
        const episodeExists = episodesData.episodes.some(e => e.number === currentEp);
        if (!episodeExists && episodesData.episodes.length > 0) {
            currentEp = episodesData.episodes[0].number;
        }

        if (!watchData || !watchData.sources || watchData.sources.length === 0) {
            return (
                <div className="container mx-auto px-4 py-8">
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>No streaming sources available!</AlertTitle>
                        <AlertDescription>
                            This episode doesn't seem to have any streaming sources yet.
                            <Link href={`/anime/${animeId}`} className="underline ml-2">Go back to details</Link>
                        </AlertDescription>
                    </Alert>
                </div>
            )
        }

        return (
            <Suspense fallback={<LoadingSkeleton />} key={`${animeId}-${currentEp}`}>
                <WatchClient
                    animeId={animeId}
                    episodeNum={currentEp}
                    episodeRange={currentRange}
                    detailsData={detailsData}
                    episodesData={episodesData}
                    watchData={watchData}
                />
            </Suspense>
        );
    } catch (error) {
        console.error(error);
        return (
            <div className="container mx-auto px-4 py-8">
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error loading episode!</AlertTitle>
                    <AlertDescription>
                        Could not fetch episode data. The API might be down or the episode is not available.
                        <Link href={`/anime/${animeId}`} className="underline ml-2">Go back to details</Link>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }
}