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
    cfProxyUrl?: string;
}

export function WatchClient({ animeId, episodeNum, episodeRange, detailsData, episodesData, watchData, cfProxyUrl }: WatchClientProps) {
    const allSources = watchData.sources || [];
    const servers = watchData.servers || [];

    // Detect sub/dub from the source object itself, source URL, or fallback to server list
    const getSourceType = (source: Source): "sub" | "dub" => {
        if (source.type) {
            return source.type === "dub" ? "dub" : "sub";
        }
        if (source.url) {
            if (/\/dub(\/|$|\?)/i.test(source.url)) return "dub";
            if (/\/sub(\/|$|\?)/i.test(source.url)) return "sub";
        }
        const matched = servers.find(s => s.name === source.server);
        return (matched?.type === "dub") ? "dub" : "sub";
    };

    // Group servers by type to populate sub and dub server selections correctly
    const subServers = servers.length > 0
        ? servers.filter(s => s.type === "sub")
        : allSources.filter(s => getSourceType(s) === "sub").map(s => ({ name: s.server || "", type: "sub" }));

    const dubServers = servers.length > 0
        ? servers.filter(s => s.type === "dub")
        : allSources.filter(s => getSourceType(s) === "dub").map(s => ({ name: s.server || "", type: "dub" }));

    const hasDub = dubServers.length > 0;

    // Selected server index per category
    const [subServerIdx, setSubServerIdx] = useState(0);
    const [dubServerIdx, setDubServerIdx] = useState(0);

    // Active source is determined by the last-clicked category
    const [activeCategory, setActiveCategory] = useState<"sub" | "dub">("sub");

    const handleSubChange = (idx: number) => {
        setSubServerIdx(idx);
        setActiveCategory("sub");
    };

    const handleDubChange = (idx: number) => {
        setDubServerIdx(idx);
        setActiveCategory("dub");
    };

    const selectedServer = activeCategory === "sub"
        ? (subServers[subServerIdx] ?? null)
        : (dubServers[dubServerIdx] ?? null);

    const currentSource = selectedServer
        ? allSources.find(s => 
            s.server === selectedServer.name && 
            (s.type === selectedServer.type || getSourceType(s) === selectedServer.type)
          ) ?? null
        : null;

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
                                cfProxyUrl={cfProxyUrl}
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

                        {/* Server selectors — Premium Segmented Toggle & Single Server Select */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Category Toggle (SUB / DUB) */}
                            {hasDub && (
                                <div className="flex rounded-md bg-muted p-1 select-none border">
                                    <button
                                        type="button"
                                        onClick={() => setActiveCategory("sub")}
                                        className={`px-3 py-1 text-xs font-bold rounded-sm transition-all uppercase ${
                                            activeCategory === "sub"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Sub
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveCategory("dub")}
                                        className={`px-3 py-1 text-xs font-bold rounded-sm transition-all uppercase ${
                                            activeCategory === "dub"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Dub
                                    </button>
                                </div>
                            )}

                            {/* Server Select Dropdown */}
                            {((activeCategory === "sub" ? subServers : dubServers).length > 0) && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Server</span>
                                    <Select
                                        value={activeCategory === "sub" ? String(subServerIdx) : String(dubServerIdx)}
                                        onValueChange={(v) => {
                                            if (activeCategory === "sub") {
                                                handleSubChange(parseInt(v));
                                            } else {
                                                handleDubChange(parseInt(v));
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-[150px] border-primary">
                                            <SelectValue placeholder="Select Server" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(activeCategory === "sub" ? subServers : dubServers).map((server, idx) => (
                                                <SelectItem key={`${activeCategory}-${idx}`} value={String(idx)}>
                                                    {server.name || `Server ${idx + 1}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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