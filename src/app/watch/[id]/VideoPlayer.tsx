"use client"

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { fetchVideoSource } from "./actions";
import HLS from "hls.js";
import type { Track, SkipTiming } from "@/lib/types";

type VideoPlayerProps = {
    linkId: string;
    anilistId?: string;
    episodeNum?: string;
    category?: string;
}

export function VideoPlayer({ linkId, anilistId, episodeNum, category }: VideoPlayerProps) {
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [m3u8Url, setM3u8Url] = useState<string | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [skipTiming, setSkipTiming] = useState<SkipTiming | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [canEmbed, setCanEmbed] = useState<boolean>(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<HLS | null>(null);

    useEffect(() => {
        let mounted = true;

        async function fetchSource() {
            if (!linkId && !(anilistId && episodeNum)) {
                return;
            }
            
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await fetchVideoSource(linkId, {
                    anilistId,
                    episodeNum,
                    category,
                });
                if (mounted) {
                    if (response.success && response.embedUrl) {
                        setCanEmbed(response.canEmbed !== false);
                        setTracks(response.tracks || []);
                        setSkipTiming(response.skip || null);
                        
                        // Prioritize m3u8 if available
                        if (response.m3u8Url) {
                            setM3u8Url(response.m3u8Url);
                            setEmbedUrl(null);
                        } else if (response.embedUrl) {
                            try {
                                const urlObj = new URL(response.embedUrl);
                                urlObj.searchParams.set('autoPlay', '1');
                                urlObj.searchParams.set('autostart', 'true');
                                setEmbedUrl(urlObj.toString());
                            } catch (e) {
                                const separator = response.embedUrl.includes('?') ? '&' : '?';
                                setEmbedUrl(`${response.embedUrl}${separator}autoPlay=1&autostart=true`);
                            }
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
    }, [linkId, anilistId, episodeNum, category]);

    // Setup HLS player when m3u8 URL is available
    useEffect(() => {
        if (!m3u8Url || !videoRef.current) return;

        const video = videoRef.current;
        
        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (HLS.isSupported()) {
            const hls = new HLS({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
            });
            hlsRef.current = hls;

            hls.loadSource(m3u8Url);
            hls.attachMedia(video);

            hls.on(HLS.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {
                    // Autoplay failed, user will click play
                });
            });

            hls.on(HLS.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error("HLS fatal error:", data);
                    setError("Failed to load video stream");
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Fallback for Safari
            video.src = m3u8Url;
            video.play().catch(() => {
                // Autoplay failed
            });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [m3u8Url]);

    // Handle skip timing
    useEffect(() => {
        if (!videoRef.current || !skipTiming) return;

        const video = videoRef.current;

        const handleTimeUpdate = () => {
            const currentTime = video.currentTime;

            // Skip intro
            if (skipTiming.intro && currentTime >= skipTiming.intro[0] && currentTime < skipTiming.intro[1]) {
                if (video.currentTime < skipTiming.intro[1]) {
                    video.currentTime = skipTiming.intro[1];
                }
            }

            // Skip outro
            if (skipTiming.outro && currentTime >= skipTiming.outro[0] && currentTime < skipTiming.outro[1]) {
                if (video.currentTime < skipTiming.outro[1]) {
                    video.currentTime = skipTiming.outro[1];
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [skipTiming]);

    if (isLoading) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p>Loading video player...</p>
            </div>
        );
    }

    if (error || (!embedUrl && !m3u8Url)) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-destructive mb-2">Error Loading Media</p>
                <p className="text-sm text-muted-foreground">{error || "Unknown error occurred"}</p>
            </div>
        );
    }

    // Get caption tracks only (excluding thumbnails)
    const captionTracks = tracks.filter(t => t.kind === 'captions');

    // HLS/M3U8 Player
    if (m3u8Url) {
        return (
            <div className="relative w-full h-full bg-black">
                <video
                    ref={videoRef}
                    className="absolute top-0 left-0 w-full h-full"
                    controls
                    autoPlay
                    playsInline
                    crossOrigin="anonymous"
                >
                    {captionTracks.map((track, index) => (
                        <track
                            key={index}
                            kind="captions"
                            src={track.url || track.src}
                            srcLang={(track.lang || track.srclang || '').split(' ')[0].toLowerCase()}
                            label={track.label || track.lang || 'Track'}
                            default={index === 0}
                        />
                    ))}
                </video>
            </div>
        );
    }

    // Iframe fallback
    if (!canEmbed) {
        // Remove autoplay params for the external link so the browser doesn't force-mute it
        let externalUrl = embedUrl;

        try {
            const urlObj = new URL(externalUrl || '');
            urlObj.searchParams.delete('autoPlay');
            urlObj.searchParams.delete('autostart');
            externalUrl = urlObj.toString();
        } catch (e) {
            // fallback if URL parsing fails
            externalUrl = (externalUrl || '').replace(/[?&]autoPlay=1/, '').replace(/[?&]autostart=true/, '');
        }

        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                <p className="text-xl font-bold mb-2">External Player Required</p>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                    This streaming server does not allow direct embedding. Please open the video in a new tab or select a different server from the list.
                </p>
                <a 
                    href={externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                    Watch in New Tab
                </a>
            </div>
        );
    }

    // Standard iframe embed
    return (
        <iframe 
            src={embedUrl || ''}
            className="absolute top-0 left-0 w-full h-full border-0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            scrolling="no"
            referrerPolicy="origin"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
        />
    );
}
