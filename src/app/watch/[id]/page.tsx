import { getAnimeDetails, getAnimeEpisodes, getEpisodeServers } from "@/lib/api";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { WatchClient } from "./WatchClient"; // Import the new Client Component

function LoadingSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <div>
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-6 w-1/2" />
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <Skeleton className="h-8 w-1/3 mb-4" />
                    <Skeleton className="h-96 w-full rounded-md" />
                </div>
            </div>
        </div>
    )
}

export default async function WatchPage({
    params,
    searchParams,
}: {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const animeId = resolvedParams.id;
    const episodeId = typeof resolvedSearchParams.ep === 'string' ? resolvedSearchParams.ep : '';
    const episodeNum = typeof resolvedSearchParams.num === 'string' ? Number(resolvedSearchParams.num) : 0;

    try {
        const [detailsData, episodesData] = await Promise.all([
            getAnimeDetails(animeId),
            getAnimeEpisodes(animeId)
        ]);

        let currentEpisodeId = episodeId;
        let currentEpisodeNum = episodeNum;

        // If no episodeId is provided in the URL, default to the first episode
        if (!currentEpisodeId && episodesData.episodes.length > 0) {
            currentEpisodeId = episodesData.episodes[0].episodeId;
            currentEpisodeNum = episodesData.episodes[0].number;
        }

        if (!currentEpisodeId) {
            return (
                <div className="container mx-auto px-4 py-8">
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>No episodes available!</AlertTitle>
                        <AlertDescription>
                            This anime doesn't seem to have any episodes yet.
                            <Link href={`/anime/${animeId}`} className="underline ml-2">Go back to details</Link>
                        </AlertDescription>
                    </Alert>
                </div>
            )
        }

        const serversData = await getEpisodeServers(currentEpisodeId);

        return (
            <Suspense fallback={<LoadingSkeleton />} key={`${animeId}-${currentEpisodeId}`}>
                <WatchClient
                    animeId={animeId}
                    episodeId={currentEpisodeId}
                    episodeNum={currentEpisodeNum}
                    detailsData={detailsData}
                    episodesData={episodesData}
                    serversData={serversData}
                />
            </Suspense>
        );
    } catch (error) {
        console.error(error);
        const errorAnimeId = animeId || (episodeId ? episodeId.split("?ep=")[0] : '');
        return (
            <div className="container mx-auto px-4 py-8">
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error loading episode!</AlertTitle>
                    <AlertDescription>
                        Could not fetch episode data. The API might be down or the episode is not available.
                        {errorAnimeId && <Link href={`/anime/${errorAnimeId}`} className="underline ml-2">Go back to details</Link>}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }
}