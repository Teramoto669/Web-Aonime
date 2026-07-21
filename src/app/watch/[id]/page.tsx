import { getAnimeDetails, getAnimeEpisodes, getWatchData, getAnimeRelated, getAnimeRecommendations } from "@/lib/api";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { WatchClient } from "./WatchClient";

export const dynamic = 'force-dynamic';
export const revalidate = 60;

function isRedirectError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    return 'digest' in error && typeof (error as any).digest === 'string' && (error as any).digest.startsWith('NEXT_REDIRECT;');
}

function LoadingSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-5xl">
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
    let currentEp = typeof resolvedSearchParams.ep === 'string' ? resolvedSearchParams.ep : '';
    let currentRange = typeof resolvedSearchParams.range === 'string' ? resolvedSearchParams.range : '';

    try {
        // ── Happy path: ep + range already set — fire all 3 fetches at once ───
        // This is the common case when clicking an episode link (has ?ep=N&range=X-Y).
        if (currentEp && currentRange) {
            const [detailsData, episodesData, watchData, relatedData, recommendationsData] = await Promise.all([
                getAnimeDetails(animeId),
                getAnimeEpisodes(animeId),
                getWatchData(animeId, currentEp),
                getAnimeRelated(animeId).catch((err) => {
                    console.error("Failed to fetch related anime", err);
                    return [];
                }),
                getAnimeRecommendations(animeId).catch((err) => {
                    console.error("Failed to fetch recommendations", err);
                    return [];
                })
            ]);

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
                );
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
                        relatedData={relatedData}
                        recommendationsData={recommendationsData}
                        cfProxyUrl={process.env.CF_PROXY_URL}
                    />
                </Suspense>
            );
        }

        // ── Fallback: ep or range missing — resolve them then redirect ─────────
        const [detailsData, episodesData] = await Promise.all([
            getAnimeDetails(animeId),
            getAnimeEpisodes(animeId),
        ]);

        // Prefer the canonical slug from the details response
        const slug = detailsData.slug || animeId;

        if (!currentEp && episodesData.episodes.length > 0) {
            const totalEpisodes = episodesData.episodes.length;
            let firstEpObj = episodesData.episodes[0];

            // Check if episodes are sorted descending
            const firstEpNum = parseFloat(episodesData.episodes[0]?.number);
            const lastEpNum = parseFloat(episodesData.episodes[totalEpisodes - 1]?.number);
            if (!isNaN(firstEpNum) && !isNaN(lastEpNum) && firstEpNum > lastEpNum) {
                firstEpObj = episodesData.episodes[totalEpisodes - 1];
            }

            currentEp = firstEpObj.number;
        } else if (!currentEp) {
            currentEp = '1';
        }

        // Validate episode number
        const episodeExists = episodesData.episodes.some(e => e.number === currentEp);
        if (!episodeExists && episodesData.episodes.length > 0) {
            currentEp = episodesData.episodes[0].number;
        }

        if (!currentRange && episodesData.episodes.length > 0) {
            const epNum = parseInt(currentEp);
            if (!isNaN(epNum)) {
                const totalEpisodes = episodesData.episodes.length;
                const chunkIndex = Math.floor((epNum - 1) / 50);
                const start = chunkIndex * 50 + 1;
                const end = Math.min((chunkIndex + 1) * 50, totalEpisodes);
                currentRange = `${start}-${end}`;
            }
        }

        // ── Fallback render: fetch remaining details and render directly without redirecting ───
        const [watchData, relatedData, recommendationsData] = await Promise.all([
            getWatchData(slug, currentEp),
            getAnimeRelated(slug).catch((err) => {
                console.error("Failed to fetch related anime", err);
                return [];
            }),
            getAnimeRecommendations(slug).catch((err) => {
                console.error("Failed to fetch recommendations", err);
                return [];
            })
        ]);

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
                    relatedData={relatedData}
                    recommendationsData={recommendationsData}
                    cfProxyUrl={process.env.CF_PROXY_URL}
                />
            </Suspense>
        );
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }
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