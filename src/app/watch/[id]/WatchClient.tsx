"use client";
import { useState } from "react";
import { EpisodeList } from "@/components/anime/EpisodeList";
import { VideoPlayer } from "./VideoPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link'
import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimeAboutInfo, Episode, AnimeServers as EpisodeServerResponse } from "@/lib/types"; // Import correct types

interface WatchClientProps {
    animeId: string;
    episodeId: string;
    episodeNum: number;
    detailsData: { anime: AnimeAboutInfo }; // Corrected type
    episodesData: { episodes: Episode[]; totalEpisodes: number };
    serversData: EpisodeServerResponse; // Corrected type
}

export function WatchClient({ animeId, episodeId, episodeNum, detailsData, episodesData, serversData }: WatchClientProps) {
    const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>('sub');

    const currentEpisode = episodesData.episodes.find(e => e.number === episodeNum);
    const hasSubbed = serversData.sub.length > 0;
    const hasDubbed = serversData.dub.length > 0;

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <VideoPlayer episodeId={episodeId} servers={serversData} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{detailsData.anime.info.name}</h1>
                        <p className="text-lg text-muted-foreground">Episode {episodeNum}{currentEpisode?.title ? `: ${currentEpisode.title}` : ''}</p>
                    </div>
                    {/* Language selection UI */}
                    {hasSubbed && hasDubbed && (
                        <Tabs
                            value={selectedCategory}
                            onValueChange={(value: string) => setSelectedCategory(value as 'sub' | 'dub')}
                            className="mt-4"
                        >
                            <TabsList className="grid grid-cols-2">
                                <TabsTrigger value="sub">Subbed</TabsTrigger>
                                <TabsTrigger value="dub">Dubbed</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                    {/* Anime Info and Link - MOVED HERE */}
                    <Link href={`/anime/${detailsData.anime.info.id}`} className="flex items-center gap-4 mt-4 p-4 border rounded-lg hover:bg-accent/20 transition-colors">
                        <div className="relative h-24 w-16 flex-shrink-0">
                            <Image
                                src={detailsData.anime.info.poster}
                                alt={detailsData.anime.info.name}
                                fill
                                className="rounded-sm object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Now Watching</p>
                            <h2 className="text-xl font-bold">{detailsData.anime.info.name}</h2>
                            <p className="text-sm text-muted-foreground">{detailsData.anime.moreInfo.genres?.join(', ') || 'N/A'}</p>
                        </div>
                    </Link>
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
}