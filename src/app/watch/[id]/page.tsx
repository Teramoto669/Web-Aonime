import { getAnimeDetails, getAnimeEpisodes, getEpisodeServers } from "@/lib/api";
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
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const animeId = resolvedParams.id;
    let currentToken = typeof resolvedSearchParams.token === 'string' ? resolvedSearchParams.token : '';
    let currentNum = typeof resolvedSearchParams.num === 'string' ? resolvedSearchParams.num : '';
    let currentRange = typeof resolvedSearchParams.range === 'string' ? resolvedSearchParams.range : '';

    try {
        const [detailsData, episodesData] = await Promise.all([
            getAnimeDetails(animeId),
            getAnimeEpisodes(animeId)
        ]);

        // Find token if not provided but num is
        if (!currentToken && currentNum) {
            const ep = episodesData.episodes.find(e => e.number === currentNum);
            if (ep) {
                currentToken = ep.token || '';
            }
        }

        // Default to the first episode if none specified
        if (!currentToken && episodesData.episodes.length > 0) {
            currentToken = episodesData.episodes[0].token || '';
            currentNum = episodesData.episodes[0].number;
        }

        if (!currentToken) {
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

        const serversData = await getEpisodeServers(currentToken);

        return (
            <Suspense fallback={<LoadingSkeleton />} key={`${animeId}-${currentToken}`}>
                <WatchClient
                    animeId={animeId}
                    token={currentToken}
                    episodeNum={currentNum}
                    episodeRange={currentRange}
                    detailsData={detailsData}
                    episodesData={episodesData}
                    serversData={serversData}
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