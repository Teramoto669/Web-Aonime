import { getAnimeDetails, getAnimeEpisodes, getEpisodeServers } from "@/lib/api";
import { EpisodeList } from "@/components/anime/EpisodeList";
import { VideoPlayer } from "./VideoPlayer";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

async function WatchPageContent({ animeId, episodeId: initialEpisodeId, episodeNum: initialEpisodeNum }: { animeId: string, episodeId: string, episodeNum: number }) {
    try {
        const [detailsData, episodesData] = await Promise.all([
            getAnimeDetails(animeId),
            getAnimeEpisodes(animeId)
        ]);
        
        let episodeId = initialEpisodeId;
        let episodeNum = initialEpisodeNum;

        // If no episodeId is provided in the URL, default to the first episode
        if (!episodeId && episodesData.episodes.length > 0) {
            episodeId = episodesData.episodes[0].episodeId;
            episodeNum = episodesData.episodes[0].number;
        }

        if (!episodeId) {
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
        
        // Use the resolved episodeId to fetch servers
        const serversData = await getEpisodeServers(episodeId);

        const currentEpisode = episodesData.episodes.find(e => e.number === episodeNum);

        return (
            <div className="container mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                           <VideoPlayer episodeId={episodeId} servers={serversData} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{detailsData.anime.info.name}</h1>
                            <p className="text-lg text-muted-foreground">Episode {episodeNum}{currentEpisode?.title ? `: ${currentEpisode.title}`: ''}</p>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <EpisodeList 
                            animeId={animeId} 
                            episodes={episodesData.episodes}
                            totalEpisodes={episodesData.totalEpisodes} 
                            currentEpisode={episodeNum}
                        />
                    </div>
                </div>
            </div>
        );

    } catch (error) {
        console.error(error);
        const errorAnimeId = animeId || (initialEpisodeId ? initialEpisodeId.split("?ep=")[0] : '');
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
    // params and searchParams are proxied values in Next.js App Router
    // awaiting them resolves the underlying plain objects and avoids the
    // "should be awaited before using its properties" warning.
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const animeId = resolvedParams.id;
    // Keep the full episodeId including the ?ep= part
    const episodeId = typeof resolvedSearchParams.ep === 'string' ? resolvedSearchParams.ep : '';
    const episodeNum = typeof resolvedSearchParams.num === 'string' ? Number(resolvedSearchParams.num) : 0;

    return (
        <Suspense fallback={<LoadingSkeleton />} key={`${animeId}-${episodeId}`}>
            <WatchPageContent animeId={animeId} episodeId={episodeId} episodeNum={episodeNum} />
        </Suspense>
    );
}
