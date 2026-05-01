"use client";
import { useState, useEffect } from "react";
import { EpisodeListClient } from "@/components/anime/EpisodeListClient";
import { VideoPlayer } from "./VideoPlayer";
import Link from 'next/link'
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnimeDetail, AnimeEpisodes, ServersResponse, ServerItem } from "@/lib/types";

interface WatchClientProps {
    animeId: string;
    anilistId?: string;
    token: string;
    episodeNum: string;
    episodeRange?: string;
    detailsData: AnimeDetail;
    episodesData: AnimeEpisodes;
    serversData: ServersResponse;
}

type CategoryType = 'sub' | 'softsub' | 'dub';

export function WatchClient({ animeId, anilistId, token, episodeNum, episodeRange, detailsData, episodesData, serversData }: WatchClientProps) {
    const servers = serversData.servers || {};
    
    // Determine available categories
    const categories: CategoryType[] = [];
    if (servers.sub && servers.sub.length > 0) categories.push('sub');
    if (servers.softsub && servers.softsub.length > 0) categories.push('softsub');
    if (servers.dub && servers.dub.length > 0) categories.push('dub');

    let defaultCategory: CategoryType = 'sub';
    if (servers.softsub && servers.softsub.length > 0) {
        defaultCategory = 'softsub';
    } else if (servers.sub && servers.sub.length > 0) {
        defaultCategory = 'sub';
    } else if (servers.dub && servers.dub.length > 0) {
        defaultCategory = 'dub';
    }

    const [selectedCategory, setSelectedCategory] = useState<CategoryType>(defaultCategory);
    
    // The current active server list based on selected category
    const activeServers: ServerItem[] = servers[selectedCategory] || [];
    
    // Default to the first server in the selected category
    const [selectedLinkId, setSelectedLinkId] = useState<string>(activeServers.length > 0 ? activeServers[0].link_id || '' : '');

    // Reset selected server when category changes
    useEffect(() => {
        const newActiveServers = servers[selectedCategory] || [];
        if (newActiveServers.length > 0 && newActiveServers[0].link_id) {
            setSelectedLinkId(newActiveServers[0].link_id);
        }
    }, [selectedCategory, servers]);

    const currentEpisode = episodesData.episodes.find(e => e.number === episodeNum);
    const title = detailsData.title || animeId;
    const fallbackCategory = selectedCategory === 'softsub' ? 'sub' : selectedCategory;
    const canUseFallback = Boolean(anilistId && episodeNum);

    const parsedGenres = (() => {
        const g = detailsData.detail?.genres;
        if (!g) return '';
        const list = Array.isArray(g) ? g : (typeof g === 'string' ? g.split(',') : []);
        return list
            .map(genre => {
                const clean = genre.trim().replace(/^\/genres?\//i, '');
                return clean.charAt(0).toUpperCase() + clean.slice(1);
            })
            .filter(Boolean)
            .join(', ');
    })();

    return (
        <div className="container mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden relative shadow-lg">
                        {selectedLinkId || canUseFallback ? (
                            <VideoPlayer
                                linkId={selectedLinkId}
                                anilistId={anilistId}
                                episodeNum={episodeNum}
                                category={fallbackCategory}
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                No server available for this episode.
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
                            <p className="text-lg text-muted-foreground mt-1">
                                {serversData.watching || `Episode ${episodeNum}${currentEpisode?.title ? `: ${currentEpisode.title}` : ''}`}
                            </p>
                        </div>
                        
                        {/* Server & Category Selection */}
                        <div className="flex flex-col sm:items-end gap-3 min-w-[200px]">
                            {categories.length > 1 && (
                                <Tabs
                                    value={selectedCategory}
                                    onValueChange={(value: string) => setSelectedCategory(value as CategoryType)}
                                    className="w-full sm:w-auto"
                                >
                                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
                                        {categories.includes('sub') && <TabsTrigger value="sub">Sub</TabsTrigger>}
                                        {categories.includes('softsub') && <TabsTrigger value="softsub">SoftSub</TabsTrigger>}
                                        {categories.includes('dub') && <TabsTrigger value="dub">Dub</TabsTrigger>}
                                    </TabsList>
                                </Tabs>
                            )}
                            
                            {activeServers.length > 0 && (
                                <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Select Server" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeServers.map((server, idx) => (
                                            <SelectItem key={`${server.server_id}-${idx}`} value={server.link_id || ''}>
                                                {server.name || `Server ${idx + 1}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <Link href={`/anime/${animeId}`} className="flex items-center gap-4 mt-6 p-4 border rounded-lg hover:bg-accent/20 transition-colors">
                        <div className="relative h-24 w-16 flex-shrink-0">
                            <Image
                                src={detailsData.poster || '/placeholder.jpg'}
                                alt={title}
                                fill
                                className="rounded-sm object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Now Watching</p>
                            <h2 className="text-xl font-bold">{title}</h2>
                            <p className="text-sm text-muted-foreground line-clamp-1">{parsedGenres || detailsData.type || 'Anime'}</p>
                        </div>
                    </Link>
                </div>
                
                <div className="lg:col-span-1">
                    <EpisodeListClient
                        animeId={animeId}
                        episodes={episodesData.episodes}
                        totalEpisodes={episodesData.count || episodesData.episodes.length}
                        currentEpisode={episodeNum}
                        hideIcons={true}
                        initialRange={episodeRange}
                    />
                </div>
            </div>
        </div>
    );
}