"use client"

import { useState, useEffect } from "react";
import ReactPlayer from 'react-player/lazy'
import { getEpisodeSources } from "@/lib/api";
import type { AnimeServers, AnimeSources, Server } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, Tv } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type VideoPlayerProps = {
    episodeId: string;
    servers: AnimeServers;
}

export function VideoPlayer({ episodeId, servers }: VideoPlayerProps) {
    const [selectedCategory, setSelectedCategory] = useState<'sub' | 'dub'>(servers.sub.length > 0 ? 'sub' : 'dub');
    const [selectedServer, setSelectedServer] = useState<Server | null>(servers[selectedCategory][0] || null);
    const [sources, setSources] = useState<AnimeSources | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (selectedServer) {
            handleGetSources(selectedServer, selectedCategory);
        } else if (servers.sub.length > 0) {
            setSelectedCategory('sub');
            setSelectedServer(servers.sub[0]);
        } else if (servers.dub.length > 0) {
            setSelectedCategory('dub');
            setSelectedServer(servers.dub[0]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [episodeId, servers]);

    const handleGetSources = async (server: Server, category: 'sub' | 'dub') => {
        setIsLoading(true);
        setError(null);
        setSources(null);
        setSelectedServer(server);
        setSelectedCategory(category);
        try {
            const data = await getEpisodeSources(episodeId, server.serverName, category);
            const hlsSource = data.sources.find(s => s.isM3U8);
            if (hlsSource) {
                 setSources(data);
            } else {
                setError("No playable video source found.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    const renderServerList = (category: 'sub' | 'dub') => {
        const serverList = servers[category];
        if (!serverList || serverList.length === 0) {
            return <p className="text-sm text-muted-foreground p-4 text-center">No {category} servers available.</p>;
        }
        return (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {serverList.map(server => (
                    <Button 
                        key={server.serverId} 
                        variant={selectedServer?.serverId === server.serverId && selectedCategory === category ? 'default' : 'outline'}
                        onClick={() => handleGetSources(server, category)}
                        disabled={isLoading}
                    >
                        {server.serverName}
                    </Button>
                ))}
            </div>
        )
    }

    const hlsSource = sources?.sources.find(s => s.isM3U8);

    return (
        <div className="w-full h-full flex flex-col bg-card rounded-lg">
            <div className="aspect-video bg-black flex items-center justify-center relative">
                {!isClient && <Loader2 className="w-10 h-10 animate-spin text-primary" />}
                {isClient && isLoading && <Loader2 className="w-10 h-10 animate-spin text-primary" />}
                {isClient && error && !isLoading && (
                     <Alert variant="destructive" className="w-auto m-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                           Failed to load video sources. Try another server.
                           <p className="text-xs mt-2">{error}</p>
                        </AlertDescription>
                    </Alert>
                )}
                {isClient && !isLoading && !error && !hlsSource && (
                    <div className="text-center text-muted-foreground">
                        <Tv className="w-16 h-16 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">Select a server to start watching</h3>
                    </div>
                )}
                {isClient && hlsSource && (
                     <ReactPlayer
                        url={hlsSource.url}
                        playing
                        controls
                        width='100%'
                        height='100%'
                        config={{
                            file: {
                                forceHLS: true,
                                attributes: {
                                    crossOrigin: 'anonymous'
                                },
                                hlsOptions: {
                                    // You can add HLS.js options here
                                },
                                hlsVersion: '1.5.11'
                            }
                        }}
                     />
                )}
            </div>
            <div className="p-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Servers:</p>
                <Tabs defaultValue={selectedCategory} value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as 'sub' | 'dub')} className="w-full">
                    <TabsList>
                        {servers.sub.length > 0 && <TabsTrigger value="sub">SUB</TabsTrigger>}
                        {servers.dub.length > 0 && <TabsTrigger value="dub">DUB</TabsTrigger>}
                    </TabsList>
                    {servers.sub.length > 0 && <TabsContent value="sub">{renderServerList('sub')}</TabsContent>}
                    {servers.dub.length > 0 && <TabsContent value="dub">{renderServerList('dub')}</TabsContent>}
                </Tabs>
            </div>
        </div>
    )
}
