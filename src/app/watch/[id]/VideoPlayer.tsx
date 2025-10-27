"use client"

import { useState } from "react";
import { getEpisodeSources } from "@/lib/api";
import type { AnimeServers, AnimeSources, Server } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, Tv } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

    const handleGetSources = async (server: Server, category: 'sub' | 'dub') => {
        setIsLoading(true);
        setError(null);
        setSources(null);
        setSelectedServer(server);
        setSelectedCategory(category);
        try {
            const data = await getEpisodeSources(episodeId, server.serverName, category);
            setSources(data);
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

    if (!selectedServer) {
        handleGetSources(servers.sub[0] || servers.dub[0], servers.sub.length > 0 ? 'sub' : 'dub');
    }

    return (
        <div className="w-full h-full flex flex-col bg-card rounded-lg">
            <div className="aspect-video bg-black flex items-center justify-center relative">
                {isLoading && <Loader2 className="w-10 h-10 animate-spin text-primary" />}
                {error && !isLoading && (
                     <Alert variant="destructive" className="w-auto m-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                           Failed to load video sources. Try another server.
                        </AlertDescription>
                    </Alert>
                )}
                {!isLoading && !error && !sources && (
                    <div className="text-center text-muted-foreground">
                        <Tv className="w-16 h-16 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">Select a server to start watching</h3>
                    </div>
                )}
                {!isLoading && sources?.sources[0] && (
                     <div className="text-center text-muted-foreground">
                        <h3 className="text-xl font-semibold mb-4">Video Player Placeholder</h3>
                        <p>In a real app, a video player would be here.</p>
                        <p className="text-xs break-all mt-2">Source: {sources.sources[0].url}</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Servers:</p>
                <Tabs defaultValue="sub" className="w-full">
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
