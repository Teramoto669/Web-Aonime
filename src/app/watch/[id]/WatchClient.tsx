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

    // Normalize type: treat 'hsub' as a distinct category
    const getSourceType = (source: Source): "sub" | "dub" | "hsub" => {
        if (source.type === "dub") return "dub";
        if (source.type === "hsub") return "hsub";
        if (source.type === "sub") return "sub";
        if (source.url) {
            if (/\/dub(\/|$|\?)/i.test(source.url)) return "dub";
            if (/\/hsub(\/|$|\?)/i.test(source.url)) return "hsub";
            if (/\/sub(\/|$|\?)/i.test(source.url)) return "sub";
        }
        const matched = servers.find(s => s.name === source.server);
        if (matched?.type === "dub") return "dub";
        if (matched?.type === "hsub") return "hsub";
        return "sub";
    };

    // Build a merged server list: start from the explicit `servers` array,
    // then append any server from `sources` whose name+type combo is missing.
    const buildServerList = (type: "sub" | "dub" | "hsub") => {
        const fromServers = servers.filter(s => s.type === type);
        const knownNames = new Set(fromServers.map(s => s.name));
        const fromSources = allSources
            .filter(s => getSourceType(s) === type && s.server && !knownNames.has(s.server))
            .map(s => ({ name: s.server!, type }));
        // Deduplicate fromSources by name
        const seen = new Set<string>();
        const uniqueFromSources = fromSources.filter(s => {
            if (seen.has(s.name)) return false;
            seen.add(s.name);
            return true;
        });
        return [...fromServers, ...uniqueFromSources];
    };

    const subServers = buildServerList("sub");
    const hsubServers = buildServerList("hsub");
    const dubServers = buildServerList("dub");

    const hasDub = dubServers.length > 0;
    const hasHsub = hsubServers.length > 0;

    // Selected server index per category
    const [subServerIdx, setSubServerIdx] = useState(0);
    const [hsubServerIdx, setHsubServerIdx] = useState(0);
    const [dubServerIdx, setDubServerIdx] = useState(0);

    // Active source is determined by the last-clicked category
    const [activeCategory, setActiveCategory] = useState<"sub" | "dub" | "hsub">("sub");

    const handleSubChange = (idx: number) => {
        setSubServerIdx(idx);
        setActiveCategory("sub");
    };

    const handleHsubChange = (idx: number) => {
        setHsubServerIdx(idx);
        setActiveCategory("hsub");
    };

    const handleDubChange = (idx: number) => {
        setDubServerIdx(idx);
        setActiveCategory("dub");
    };

    const getActiveServers = () => {
        if (activeCategory === "sub") return subServers;
        if (activeCategory === "hsub") return hsubServers;
        return dubServers;
    };

    const getActiveServerIdx = () => {
        if (activeCategory === "sub") return subServerIdx;
        if (activeCategory === "hsub") return hsubServerIdx;
        return dubServerIdx;
    };

    const selectedServer = getActiveServers()[getActiveServerIdx()] ?? null;

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
                            {/* Category Toggle (SUB / HSUB / DUB) */}
                            {(hasDub || hasHsub) && (
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
                                    {hasHsub && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveCategory("hsub")}
                                            className={`px-3 py-1 text-xs font-bold rounded-sm transition-all uppercase ${
                                                activeCategory === "hsub"
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            HSub
                                        </button>
                                    )}
                                    {hasDub && (
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
                                    )}
                                </div>
                            )}

                            {/* Server Select Dropdown */}
                            {(getActiveServers().length > 0) && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Server</span>
                                    <Select
                                        value={String(getActiveServerIdx())}
                                        onValueChange={(v) => {
                                            const idx = parseInt(v);
                                            if (activeCategory === "sub") handleSubChange(idx);
                                            else if (activeCategory === "hsub") handleHsubChange(idx);
                                            else handleDubChange(idx);
                                        }}
                                    >
                                        <SelectTrigger className="w-[150px] border-primary">
                                            <SelectValue placeholder="Select Server" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getActiveServers().map((server, idx) => (
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