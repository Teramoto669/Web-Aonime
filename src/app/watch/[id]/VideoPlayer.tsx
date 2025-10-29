"use client"

import { useState, useEffect } from "react";
import type { AnimeServers } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// Helper function to extract episode ID from full URL or ID string
function extractEpisodeId(watchUrl: string): string {
    // Handle full URLs like https://hianimez.to/watch/my-hero-academia-vigilantes-19544?ep=136197
    const epMatch = watchUrl.match(/[?&]ep=(\d+)/);
    if (epMatch) return epMatch[1];
    
    // Handle episode IDs with dash format like series-136197
    const dashMatch = watchUrl.match(/-(\d+)$/);
    if (dashMatch) return dashMatch[1];
    
    // Handle plain numeric IDs
    if (/^\d+$/.test(watchUrl)) return watchUrl;
    
    throw new Error(`Could not extract episode ID from: ${watchUrl}`);
}

type VideoPlayerProps = {
    episodeId: string;
    servers: AnimeServers;
}

export function VideoPlayer({ episodeId, servers }: VideoPlayerProps) {
    const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>(servers.sub.length > 0 ? 'sub' : 'dub');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Extract the numeric episode ID for the megaplay URL
    const numericId = extractEpisodeId(episodeId);

    // Show loading state if it's server-side
    if (!isClient) {
        return (
            <div className="relative w-full h-0 pb-[56.25%] bg-background">
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            </div>
        )
    }

    // Determine the available categories
    const hasSubbed = servers.sub.length > 0;
    const hasDubbed = servers.dub.length > 0;

    const iframeUrl = `https://megaplay.buzz/stream/s-2/${numericId}/${selectedCategory}`;

    return (
        <div className="w-full">
            <div className="relative w-full h-0 pb-[56.25%] bg-background">
                <iframe 
                    src={iframeUrl}
                    className="absolute top-0 left-0 w-full h-full"
                    allowFullScreen
                    scrolling="no"
                />
            </div>
            
            {/* Language selection UI */}
            {hasSubbed && hasDubbed && (
                <Tabs
                    value={selectedCategory}
                    onValueChange={(value) => setSelectedCategory(value as 'sub' | 'dub')}
                    className="mt-4"
                >
                    <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="sub">Subbed</TabsTrigger>
                        <TabsTrigger value="dub">Dubbed</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
        </div>
    );
}
