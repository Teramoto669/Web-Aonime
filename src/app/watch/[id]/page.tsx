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
        const episodesData = await getAnimeEpisodes(animeId);
        
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

        const [detailsData, serversData] = await Promise.all([
            getAnimeDetails(animeId),
            getEpisodeServers(episodeId)
        ]);

        const currentEpisode = episodesData.episodes.find(e => e.number === episodeNum);

        return (
            <div className="container mx-auto px-4 py-8">
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

export default function WatchPage({ params, searchParams }: { 
    params: { id: string },
    searchParams: { [key: string]: string | string[] | undefined } 
}) {
    const animeId = params.id;
    const rawEpisodeId = typeof searchParams.ep === 'string' ? searchParams.ep : '';
    // The episodeId might contain extra query params, so we clean it up.
    const episodeId = rawEpisodeId.split('?')[0];
    const episodeNum = typeof searchParams.num === 'string' ? Number(searchParams.num) : 0;

    return (
        <Suspense fallback={<LoadingSkeleton />} key={`${animeId}-${episodeId}`}>
            <WatchPageContent animeId={animeId} episodeId={episodeId} episodeNum={episodeNum} />
        </Suspense>
    );
}
