"use client"

import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { fetchVideoSource } from "./actions";

type VideoPlayerProps = {
    linkId: string;
}

export function VideoPlayer({ linkId }: VideoPlayerProps) {
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function fetchSource() {
            if (!linkId) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await fetchVideoSource(linkId);
                if (mounted) {
                    if (response.success && response.embedUrl) {
                        try {
                            const urlObj = new URL(response.embedUrl);
                            urlObj.searchParams.set('autoPlay', '1');
                            urlObj.searchParams.set('autostart', 'true');
                            setEmbedUrl(urlObj.toString());
                        } catch (e) {
                            const separator = response.embedUrl.includes('?') ? '&' : '?';
                            setEmbedUrl(`${response.embedUrl}${separator}autoPlay=1&autostart=true`);
                        }
                    } else {
                        setError(response.error || "Could not find a playable stream for this server.");
                    }
                }
            } catch (err) {
                if (mounted) {
                    console.error("Failed to fetch source:", err);
                    setError("Failed to connect to the streaming server. Please try a different server.");
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchSource();

        return () => {
            mounted = false;
        };
    }, [linkId]);

    if (isLoading) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p>Loading video player...</p>
            </div>
        );
    }

    if (error || !embedUrl) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-destructive mb-2">Error Loading Media</p>
                <p className="text-sm text-muted-foreground">{error || "Unknown error occurred"}</p>
            </div>
        );
    }

    return (
        <iframe 
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            scrolling="no"
        />
    );
}
