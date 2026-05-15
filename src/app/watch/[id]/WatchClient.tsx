"use client";
import { useState } from "react";
import { EpisodeListClient } from "@/components/anime/EpisodeListClient";
import { VideoPlayer } from "./VideoPlayer";
import Link from 'next/link';
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnimeDetail, AnimeEpisodes, WatchData, Source } from "@/lib/types";

interface WatchClientProps {
    animeId: string;
    episodeNum: string;
    episodeRange?: string;
    detailsData: AnimeDetail;
    episodesData: AnimeEpisodes;
    watchData: WatchData;
}

export function WatchClient({ animeId, episodeNum, episodeRange, detailsData, episodesData, watchData }: WatchClientProps) {
    const allSources = watchData.sources || [];
    const servers = watchData.servers || [];

    // Map each source to its type (sub/dub) using the servers array
    const getSourceType = (source: Source): string => {
        const matched = servers.find(s => s.name === source.server);
        return matched?.type ?? "sub";
    };

    const subSources = allSources.filter(s => getSourceType(s) !== "dub");
    const dubSources = allSources.filter(s => getSourceType(s) === "dub");

    const hasDub = dubSources.length > 0;
    const hasSub = subSources.length > 0;

    // Active category: "sub" or "dub"
    const [category, setCategory] = useState<"sub" | "dub">(hasSub ? "sub" : "dub");
    const [subServerIdx, setSubServerIdx] = useState(0);
    const [dubServerIdx, setDubServerIdx] = useState(0);

    const currentSources = category === "sub" ? subSources : dubSources;
    const currentServerIdx = category === "sub" ? subServerIdx : dubServerIdx;
    const setCurrentServerIdx = category === "sub" ? setSubServerIdx : setDubServerIdx;
    const currentSource = currentSources[currentServerIdx] ?? null;

    const slug = detailsData.slug || animeId;
    const title = detailsData.title || animeId;

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-4">
                    {/* Video Player */}
                    <div className="w-full bg-black rounded-lg shadow-lg">
                        {currentSource ? (
                            <VideoPlayer
                                source={currentSource}
                                tracks={currentSource.tracks || []}
                            />
                        ) : (
                            <div className="aspect-video flex items-center justify-center text-muted-foreground">
                                No server available for this episode.
                            </div>
                        )}
                    </div>

                    {/* Title & Server Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
                            <p className="text-lg text-muted-foreground mt-1">Episode {episodeNum}</p>
                        </div>

                        {/* Sub / Dub + Server selector */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Sub/Dub toggle */}
                            <div className="flex rounded-lg overflow-hidden border border-border">
                                {hasSub && (
                                    <button
                                        onClick={() => setCategory("sub")}
                                        className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                            category === "sub"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background text-muted-foreground hover:bg-muted"
                                        }`}
                                    >
                                        SUB
                                    </button>
                                )}
                                {hasDub && (
                                    <button
                                        onClick={() => setCategory("dub")}
                                        className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                            category === "dub"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background text-muted-foreground hover:bg-muted"
                                        }`}
                                    >
                                        DUB
                                    </button>
                                )}
                            </div>

                            {/* Server selector */}
                            {currentSources.length > 1 && (
                                <Select
                                    value={String(currentServerIdx)}
                                    onValueChange={(v) => setCurrentServerIdx(parseInt(v))}
                                >
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Select Server" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currentSources.map((source, idx) => (
                                            <SelectItem key={`server-${idx}`} value={String(idx)}>
                                                {source.server || `Server ${idx + 1}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* Anime info link */}
                    <Link href={`/anime/${slug}`} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/20 transition-colors">
                        <div className="relative h-24 w-16 flex-shrink-0">
                            <Image
                                src={detailsData.image || '/placeholder.jpg'}
                                alt={title}
                                fill
                                className="rounded-sm object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Now Watching</p>
                            <h2 className="text-xl font-bold">{title}</h2>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                                {detailsData.genres?.join(', ') || detailsData.type || 'Anime'}
                            </p>
                        </div>
                    </Link>
                </div>

                <div className="lg:col-span-1">
                    <EpisodeListClient
                        animeId={slug}
                        episodes={episodesData.episodes}
                        totalEpisodes={episodesData.episodes.length}
                        currentEpisode={episodeNum}
                        hideIcons={true}
                        initialRange={episodeRange}
                    />
                </div>
            </div>
        </div>
    );
}