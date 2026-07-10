"use client"

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, Settings, Subtitles, ChevronDown, Check, Palette, Type, RotateCcw, Clock } from "lucide-react";
import HLS from "hls.js";
import type { Source, Track } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type VideoPlayerProps = {
    source: Source;
    tracks: Track[];
    cfProxyUrl?: string;
};

type QualityLevel = {
    height: number;
    bitrate: number;
    index: number;
};

// ─── Main export ─────────────────────────────────────────────────────────────

export function VideoPlayer({ source, tracks, cfProxyUrl }: VideoPlayerProps) {
    const [playerUrl, setPlayerUrl] = useState<{ m3u8?: string; embed?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // CF Worker base URL (no trailing slash, always https://)
    const rawCfProxy = cfProxyUrl ?? '';
    const CF_PROXY = rawCfProxy
        ? (rawCfProxy.startsWith('http') ? rawCfProxy : `https://${rawCfProxy}`).replace(/\/$/, '')
        : '';
    const EXT_PROXY = 'https://anikoto-private-hosted.vercel.app';

    useEffect(() => {
        console.log("[VideoPlayer] source:", JSON.stringify(source, null, 2), "CF_PROXY:", CF_PROXY);
        if (source.proxyUrl) {
            // source.proxyUrl is like "/api/proxy?url=...&referer=..."
            // CF Worker reads ?url= and ?referer= at any path, so we just
            // extract the query string and append to worker base URL
            const queryString = source.proxyUrl.includes('?')
                ? source.proxyUrl.slice(source.proxyUrl.indexOf('?'))   // "?url=...&referer=..."
                : `?url=${encodeURIComponent(source.proxyUrl)}`;

            if (CF_PROXY) {
                // queryString starts with '?', so no '/' separator needed
                const finalUrl = `${CF_PROXY}${queryString}`;
                console.log("[VideoPlayer] final m3u8 URL (proxyUrl+CF):", finalUrl);
                setPlayerUrl({ m3u8: finalUrl });
            } else {
                console.log("[VideoPlayer] final m3u8 URL (proxyUrl local):", source.proxyUrl);
                setPlayerUrl({ m3u8: source.proxyUrl });
            }
        } else if (source.m3u8) {
            const base = CF_PROXY || '';
            const qs = `?url=${encodeURIComponent(source.m3u8)}${source.referer ? `&referer=${encodeURIComponent(source.referer)}` : ''}`;
            // qs starts with '?', so no '/' separator needed between base and qs
            const finalUrl = base ? `${base}${qs}` : `/api/proxy${qs}`;
            console.log("[VideoPlayer] final m3u8 URL (m3u8):", finalUrl);
            setPlayerUrl({ m3u8: finalUrl });
        } else if (source.url) {
            console.log("[VideoPlayer] embed URL:", source.url);
            setPlayerUrl({ embed: source.url });
        } else {
            setError("No streaming source available");
        }
        setIsLoading(false);
    }, [source]);

    if (isLoading) {
        return (
            <div className="w-full aspect-video flex items-center justify-center bg-black text-white">
                <Loader2 className="w-10 h-10 animate-spin text-primary mr-3" />
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full aspect-video flex flex-col items-center justify-center bg-black/90 text-white p-6">
                <AlertCircle className="w-12 h-12 text-destructive mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
            </div>
        );
    }

    if (playerUrl?.m3u8) {
        return <HlsPlayer m3u8Url={playerUrl.m3u8} tracks={tracks} />;
    }

    if (playerUrl?.embed) {
        return (
            <div className="w-full aspect-video">
                <iframe
                    src={playerUrl.embed}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="autoplay; encrypted-media; fullscreen"
                    referrerPolicy="origin"
                />
            </div>
        );
    }

    return (
        <div className="w-full aspect-video flex items-center justify-center bg-black text-white">
            <AlertCircle className="w-10 h-10 text-yellow-500 mr-2" />
            No playable stream found.
        </div>
    );
}

// ─── WebVTT Shift Utility Functions ──────────────────────────────────────────

function timeToSeconds(timeStr: string): number {
    const parts = timeStr.trim().split(':');
    let hrs = 0;
    let mins = 0;
    let secs = 0;

    if (parts.length === 3) {
        hrs = parseFloat(parts[0]);
        mins = parseFloat(parts[1]);
        secs = parseFloat(parts[2]);
    } else if (parts.length === 2) {
        mins = parseFloat(parts[0]);
        secs = parseFloat(parts[1]);
    } else {
        secs = parseFloat(parts[0]);
    }
    return hrs * 3600 + mins * 60 + secs;
}

function secondsToTime(seconds: number): string {
    if (seconds < 0) seconds = 0;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');

    return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
}

function shiftWebVTT(vttText: string, delay: number): string {
    if (delay === 0) return vttText;
    const lines = vttText.split(/\r?\n/);
    const shiftedLines = lines.map(line => {
        const match = line.match(/^([^\s]+)\s*-->\s*([^\s]+)(.*)$/);
        if (match) {
            const startStr = match[1];
            const endStr = match[2];
            const settings = match[3] || "";
            if (startStr.includes(':') && endStr.includes(':')) {
                const startSec = Math.max(0, timeToSeconds(startStr) + delay);
                const endSec = Math.max(0, timeToSeconds(endStr) + delay);
                return `${secondsToTime(startSec)} --> ${secondsToTime(endSec)}${settings}`;
            }
        }
        return line;
    });
    return shiftedLines.join('\n');
}

// ─── HLS Player ──────────────────────────────────────────────────────────────

function HlsPlayer({ m3u8Url, tracks }: { m3u8Url: string; tracks: Track[] }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<HLS | null>(null);

    // Create a stable string representation of tracks to avoid infinite loops
    // caused by tracks array reference changing on every render.
    const tracksKey = JSON.stringify(tracks || []);

    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number>(-1);
    const [activeTrack, setActiveTrack] = useState<Track | null>(null);
    const [loadingSub, setLoadingSub] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showSubMenu, setShowSubMenu] = useState(false);
    const [showSubConfig, setShowSubConfig] = useState(false);

    const [subConfig, setSubConfig] = useState({
        size: 1, // multiplier
        color: '#ffffff',
        background: 'rgba(0, 0, 0, 0)',
        showOutline: true,
        showShadow: true,
    });

    const [subDelay, setSubDelay] = useState<number>(0);
    const [originalSubContents, setOriginalSubContents] = useState<Record<number, string>>({});
    const [processedTrackUrls, setProcessedTrackUrls] = useState<Record<number, string>>({});

    const subBtnRef = useRef<HTMLDivElement>(null);
    const qualityBtnRef = useRef<HTMLDivElement>(null);

    console.log("[HlsPlayer] manifest URL:", m3u8Url, "tracks:", tracks);

    // ── HLS setup ──
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleNativeError = () => {
            if (video.error) {
                console.error("[HTML5 Video Native Error] Code:", video.error.code, "Message:", video.error.message);
            }
        };
        video.addEventListener('error', handleNativeError);

        hlsRef.current?.destroy();
        setQualityLevels([]);
        setCurrentLevel(-1);

        if (HLS.isSupported()) {
            const hls = new HLS({
                debug: true,
                startLevel: -1,
                maxBufferLength: 20,
                maxMaxBufferLength: 40,
                maxBufferSize: 30 * 1000 * 1000,
                startFragPrefetch: false,
                abrBandWidthFactor: 0.8,
                abrBandWidthUpFactor: 0.6,
                // Disable web worker — avoids codec negotiation issues with HE-AAC v2
                // (mp4a.40.29) in MPEG-TS streams which Chrome MSE can't always buffer.
                enableWorker: false,
                // Don't let the manifest's declared codec string override what MSE reports.
                // This prevents bufferAppendingError when the stream declares HE-AAC v2.
                stretchShortVideoTrack: true,
                xhrSetup: (xhr, url) => {
                    xhr.withCredentials = false;
                },
            });
            hlsRef.current = hls;
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);

            hls.on(HLS.Events.MANIFEST_PARSED, (_, data) => {
                console.log("[HLS] MANIFEST_PARSED — levels:", data.levels.map(l => `${l.height}p`));
                const levels = data.levels
                    .map((l, i) => ({ height: l.height || 0, bitrate: l.bitrate || 0, index: i }))
                    .sort((a, b) => b.height - a.height);
                setQualityLevels(levels);

                const savedHeight = Number(localStorage.getItem("preferred-quality-height") ?? "-1");
                if (savedHeight > 0) {
                    const matched = data.levels.findIndex(l => l.height === savedHeight);
                    if (matched !== -1) {
                        hls.currentLevel = matched;
                        setCurrentLevel(matched);
                    }
                }

                video.play().catch((e) => { console.warn("[HLS] video.play() rejected:", e); });
            });

            hls.on(HLS.Events.FRAG_LOADED, (_, data) => {
                console.log("[HLS] FRAG_LOADED:", data.frag.url.substring(0, 120));
            });

            hls.on(HLS.Events.LEVEL_LOADED, (_, data) => {
                console.log("[HLS] LEVEL_LOADED — fragments:", data.details.fragments.length);
            });

            hls.on(HLS.Events.LEVEL_SWITCHED, (_, data) => setCurrentLevel(data.level));
            let mediaErrorRecoveryAttempts = 0;
            hls.on(HLS.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    console.error("[HLS] FATAL ERROR:", data.type, data.details, "url:", (data as any).url?.substring(0, 120));
                    switch (data.type) {
                        case HLS.ErrorTypes.MEDIA_ERROR:
                            mediaErrorRecoveryAttempts++;
                            console.warn(`[HLS] Fatal media error encountered (attempt ${mediaErrorRecoveryAttempts}/3)...`);
                            if (mediaErrorRecoveryAttempts <= 3) {
                                hls.recoverMediaError();
                            } else {
                                console.error("[HLS] Fatal media error recovery failed 3 times. Reloading source...");
                                hls.loadSource(m3u8Url);
                                mediaErrorRecoveryAttempts = 0;
                            }
                            break;
                        case HLS.ErrorTypes.NETWORK_ERROR:
                            console.warn("[HLS] Fatal network error encountered, retrying...");
                            hls.startLoad();
                            break;
                        default:
                            console.error("[HLS] Unrecoverable fatal error, destroying player.");
                            hls.destroy();
                            break;
                    }
                } else {
                    console.warn("[HLS] Non-fatal error:", data.type, data.details, "url:", (data as any).url?.substring(0, 120));
                    // Reset recovery counter on successful playback progress or non-fatal events
                    const detailsStr = data.details as any;
                    if (detailsStr === 'bufferSeekOverhole' || detailsStr === 'bufferNudgeOnStall') {
                        mediaErrorRecoveryAttempts = 0;
                    }
                }
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = m3u8Url;
            video.play().catch(() => { });
        }

        return () => {
            video.removeEventListener('error', handleNativeError);
            hlsRef.current?.destroy();
            hlsRef.current = null;
        };
    }, [m3u8Url]);

    // ── Handle subtitle selection ──
    const handleSubtitleChange = (index: number) => {
        const video = videoRef.current;
        if (!video || !video.textTracks) return;

        setLoadingSub(true);
        // Hide all tracks
        for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = 'hidden';
        }

        // Show selected track if index >= 0
        if (index >= 0 && index < video.textTracks.length) {
            video.textTracks[index].mode = 'showing';
            setSelectedSubtitleIndex(index);
            setActiveTrack(tracks[index]);
            console.log("[HlsPlayer] Subtitle switched to:", video.textTracks[index].label);
        } else {
            setSelectedSubtitleIndex(-1);
            setActiveTrack(null);
            console.log("[HlsPlayer] Subtitles disabled");
        }
        setLoadingSub(false);
    };

    // ── Auto-enable first subtitle track on load ──
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !tracks.length) return;

        const enableSubtitle = () => {
            if (video.textTracks && video.textTracks.length > 0) {
                handleSubtitleChange(0);
            }
        };

        enableSubtitle();
        const timer = setTimeout(enableSubtitle, 500);
        return () => clearTimeout(timer);
    }, [tracksKey]);

    // ── Handle tracks changing (episode change) ──
    useEffect(() => {
        setOriginalSubContents({});
        setProcessedTrackUrls(prev => {
            Object.values(prev).forEach(url => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
            return {};
        });
        setSubDelay(0);
    }, [tracksKey]);

    // ── Cleanup Blob URLs on unmount ──
    useEffect(() => {
        return () => {
            setProcessedTrackUrls(prev => {
                Object.values(prev).forEach(url => {
                    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                });
                return {};
            });
        };
    }, []);

    // ── Fetch original subtitle text on-demand ──
    useEffect(() => {
        if (selectedSubtitleIndex < 0 || !tracks[selectedSubtitleIndex]) {
            return;
        }

        const index = selectedSubtitleIndex;
        const track = tracks[index];
        const url = track.proxyUrl || track.file;
        if (!url) return;

        if (!originalSubContents[index]) {
            setLoadingSub(true);
            fetch(url)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch subtitle");
                    return res.text();
                })
                .then(text => {
                    setOriginalSubContents(prev => ({ ...prev, [index]: text }));
                })
                .catch(err => {
                    console.error("Failed to load subtitle:", err);
                })
                .finally(() => {
                    setLoadingSub(false);
                });
        }
    }, [selectedSubtitleIndex, tracksKey, originalSubContents]);

    // ── Apply timing shift to WebVTT content ──
    useEffect(() => {
        if (selectedSubtitleIndex < 0) return;
        const text = originalSubContents[selectedSubtitleIndex];
        if (!text) return;

        const prevUrl = processedTrackUrls[selectedSubtitleIndex];
        if (prevUrl && prevUrl.startsWith('blob:')) {
            URL.revokeObjectURL(prevUrl);
        }

        try {
            const shiftedText = shiftWebVTT(text, subDelay);
            const blob = new Blob([shiftedText], { type: 'text/vtt' });
            const newUrl = URL.createObjectURL(blob);
            setProcessedTrackUrls(prev => ({ ...prev, [selectedSubtitleIndex]: newUrl }));
        } catch (err) {
            console.error("Error processing subtitle shift:", err);
        }
    }, [selectedSubtitleIndex, subDelay, originalSubContents]);

    // ── Reinforce track showing mode when processed url changes ──
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !video.textTracks || selectedSubtitleIndex < 0) return;

        const timer = setTimeout(() => {
            if (video.textTracks && video.textTracks[selectedSubtitleIndex]) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    video.textTracks[i].mode = 'hidden';
                }
                video.textTracks[selectedSubtitleIndex].mode = 'showing';
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [processedTrackUrls, selectedSubtitleIndex]);

    // ── Handle quality change ──
    const handleQuality = (levelIndex: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex;
            if (levelIndex === -1) {
                localStorage.removeItem('preferred-quality-height');
            } else {
                localStorage.setItem('preferred-quality-height',
                    String(hlsRef.current.levels[levelIndex]?.height || -1));
            }
            setCurrentLevel(levelIndex);
            setShowQualityMenu(false);
            console.log("[HlsPlayer] Quality changed to level", levelIndex);
        }
    };

    const currentQualityLabel = () => {
        if (currentLevel === -1) return 'Auto';
        const level = qualityLevels.find(l => l.index === currentLevel);
        if (!level) return 'Auto';
        return level.height > 0 ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}k`;
    };

    // ── Click away listener ──
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (subBtnRef.current && !subBtnRef.current.contains(event.target as Node)) {
                setShowSubMenu(false);
                setShowSubConfig(false);
            }
            if (qualityBtnRef.current && !qualityBtnRef.current.contains(event.target as Node)) {
                setShowQualityMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── Load/Save Subtitle Config ──
    useEffect(() => {
        const saved = localStorage.getItem("subtitle-config");
        if (saved) {
            try {
                setSubConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse subtitle config", e);
            }
        }
    }, []);

    const updateSubConfig = (newConfig: Partial<typeof subConfig>) => {
        const updated = { ...subConfig, ...newConfig };
        setSubConfig(updated);
        localStorage.setItem("subtitle-config", JSON.stringify(updated));
    };

    const resetSubConfig = () => {
        const def = { size: 1, color: '#ffffff', background: 'rgba(0, 0, 0, 0)', showOutline: true, showShadow: true };
        setSubConfig(def);
        setSubDelay(0);
        localStorage.removeItem("subtitle-config");
    };

    // ── Track fullscreen changes ──
    useEffect(() => {
        const handleFullscreenChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            // Update CSS variable for responsive font sizing
            document.documentElement.style.setProperty('--is-fullscreen', fs ? '1' : '0');
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // ── Inject subtitle styling ──
    useEffect(() => {
        const styleId = 'video-subtitle-styles';
        let style = document.getElementById(styleId) as HTMLStyleElement;
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        style.textContent = `
                video::cue {
                    font-family: "Outfit", "Inter", "Segoe UI", sans-serif !important;
                    font-size: calc(var(--subtitle-font-size) * ${subConfig.size}) !important;
                    font-weight: 700 !important;
                    background: ${subConfig.background} !important;
                    color: ${subConfig.color} !important;
                    padding: 2px 8px !important;
                    border-radius: 4px !important;
                    line-height: 1.3 !important;
                    white-space: pre-line !important;
                    display: inline-block !important;
                    max-width: 90% !important;
                    text-align: center !important;
                    text-shadow: ${[
                subConfig.showOutline ? `-2px -2px 0 #000, 0px -2px 0 #000, 2px -2px 0 #000, 2px  0px 0 #000, 2px  2px 0 #000, 0px  2px 0 #000, -2px  2px 0 #000, -2px  0px 0 #000` : '',
                subConfig.showShadow ? `0px 4px 8px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,0.8)` : ''
            ].filter(Boolean).join(', ') || 'none'} !important;
                }
                /* Prevent subtitles from jumping and move them higher */
                video::-webkit-media-text-track-container {
                    transform: translateY(-28px) !important;
                }
                /* Ensure native fullscreen button is visible */
                video::-webkit-media-controls-fullscreen-button {
                    display: flex !important;
                }
                :root {
                    --subtitle-font-size: clamp(12px, 4vw, 20px);
                }
                :root[style*="--is-fullscreen: 1"] {
                    --subtitle-font-size: clamp(16px, 5vw, 26px);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `;
    }, [isFullscreen, subConfig]);

    return (
        <div className="w-full relative rounded-xl border border-white/10 bg-zinc-900 shadow-2xl" id="player-wrapper">
            {/* Video Player Container */}
            <div className="w-full aspect-video bg-black relative group overflow-hidden rounded-t-xl">
                <video
                    ref={videoRef}
                    className="w-full h-full block"
                    controls
                    autoPlay
                    crossOrigin="anonymous"
                    playsInline
                >
                    {/* Native fallback tracks for iOS Safari and browsers without HLS.js */}
                    {tracks.map((track, i) => (
                        <track
                            key={i}
                            kind="subtitles"
                            src={processedTrackUrls[i] || track.proxyUrl || track.file}
                            srcLang={track.label?.substring(0, 2).toLowerCase() || 'en'}
                            label={track.label || `Track ${i + 1}`}
                            default={selectedSubtitleIndex === i}
                        />
                    ))}
                </video>
            </div>

            {/* Controls toolbar — always visible */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-white/10 rounded-b-xl z-20">

                {/* ── Subtitle button ── */}
                {tracks.length > 0 ? (
                    <div className="relative" ref={subBtnRef}>
                        <button
                            onClick={() => {
                                if (showSubMenu) setShowSubConfig(false);
                                setShowSubMenu(p => !p);
                                setShowQualityMenu(false);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${activeTrack
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                                }`}
                        >
                            <Subtitles className="w-3.5 h-3.5" />
                            <span>{loadingSub ? "Loading…" : (activeTrack?.label ?? "Subtitle")}</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showSubMenu && (
                            <div className="fixed inset-x-0 bottom-0 z-[1000] sm:absolute sm:inset-x-auto sm:bottom-full sm:mb-3 sm:left-0 bg-zinc-900 border-t sm:border border-white/20 rounded-t-2xl sm:rounded-xl overflow-y-auto max-h-[70vh] sm:max-h-[400px] w-full sm:w-[280px] shadow-2xl custom-scrollbar animate-in fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-2 duration-300">
                                {showSubConfig ? (
                                    <div className="flex flex-col h-full">
                                        <div className="sticky top-0 bg-zinc-900 px-3 py-2 flex items-center justify-between border-b border-white/10 z-20">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowSubConfig(false); }}
                                                className="text-[10px] font-semibold text-white/40 hover:text-white uppercase tracking-wider flex items-center gap-1 p-1"
                                            >
                                                <ChevronDown className="w-3 h-3 rotate-90" />
                                                Back
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); resetSubConfig(); }}
                                                className="text-[10px] font-semibold text-red-400 hover:text-red-300 uppercase tracking-wider flex items-center gap-1 p-1"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                Reset
                                            </button>
                                        </div>
                                        <div className="p-3 space-y-4 overflow-y-auto">

                                            {/* Size */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-[10px] font-medium text-white/60">
                                                    <div className="flex items-center gap-2">
                                                        <Type className="w-3 h-3" /> Size
                                                    </div>
                                                    <span className="text-primary font-bold">{Math.round(subConfig.size * 100)}%</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="range"
                                                        min="0.5"
                                                        max="2.5"
                                                        step="0.05"
                                                        value={subConfig.size}
                                                        onChange={(e) => updateSubConfig({ size: parseFloat(e.target.value) })}
                                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 gap-1">
                                                    {[0.75, 1, 1.25, 1.5].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateSubConfig({ size: s })}
                                                            className={`py-2 text-[10px] rounded border transition-all cursor-pointer ${subConfig.size === s ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                                        >
                                                            {s * 100}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Subtitle Sync (Delay) */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-[10px] font-medium text-white/60">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5" /> Subtitle Sync
                                                    </div>
                                                    <span className={`font-bold ${subDelay === 0 ? 'text-white/60' : subDelay < 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                                                        {subDelay === 0 ? "Synced" : `${subDelay > 0 ? '+' : ''}${subDelay.toFixed(1)}s`}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSubDelay(d => Math.max(-5, parseFloat((d - 0.1).toFixed(1))))}
                                                        className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors font-bold cursor-pointer"
                                                        title="Muncul lebih cepat (-0.1s)"
                                                    >
                                                        -0.1s
                                                    </button>

                                                    <input
                                                        type="range"
                                                        min="-5"
                                                        max="5"
                                                        step="0.1"
                                                        value={subDelay}
                                                        onChange={(e) => setSubDelay(parseFloat(parseFloat(e.target.value).toFixed(1)))}
                                                        className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />

                                                    <button
                                                        onClick={() => setSubDelay(d => Math.min(5, parseFloat((d + 0.1).toFixed(1))))}
                                                        className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors font-bold cursor-pointer"
                                                        title="Muncul lebih lambat (+0.1s)"
                                                    >
                                                        +0.1s
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-5 gap-1">
                                                    {[-1.0, -0.5, 0, 0.5, 1.0].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setSubDelay(s)}
                                                            className={`py-1 text-[10px] rounded border transition-all cursor-pointer ${subDelay === s ? 'bg-primary border-primary text-white font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                                        >
                                                            {s === 0 ? 'Reset' : `${s > 0 ? '+' : ''}${s}s`}
                                                        </button>
                                                    ))}
                                                </div>

                                                {subDelay !== 0 && (
                                                    <p className="text-[9px] text-white/40 text-center italic">
                                                        {subDelay < 0
                                                            ? "Subtitle dipercepat agar muncul lebih awal."
                                                            : "Subtitle diperlambat agar muncul lebih lambat."}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Color */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-white/60">
                                                    <Palette className="w-3 h-3" /> Text Color
                                                </div>
                                                <div className="flex gap-3">
                                                    {['#ffffff', '#ffff00', '#00ffff', '#00ff00'].map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => updateSubConfig({ color: c })}
                                                            className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${subConfig.color === c ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Edge Options */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-white/60">
                                                    <div className="w-3 h-3 border-2 border-white/40 rounded-full" /> Edge Style
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => updateSubConfig({ showOutline: !subConfig.showOutline })}
                                                        className={`py-2 text-[10px] rounded border transition-all cursor-pointer ${subConfig.showOutline ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                                                    >
                                                        Outline
                                                    </button>
                                                    <button
                                                        onClick={() => updateSubConfig({ showShadow: !subConfig.showShadow })}
                                                        className={`py-2 text-[10px] rounded border transition-all cursor-pointer ${subConfig.showShadow ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                                                    >
                                                        Shadow
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Background */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-white/60">
                                                    <div className="w-3 h-3 border border-white/40 rounded-sm" /> Background
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { l: 'None', v: 'rgba(0,0,0,0)' },
                                                        { l: 'Ghost', v: 'rgba(0,0,0,0.5)' }
                                                    ].map(b => (
                                                        <button
                                                            key={b.v}
                                                            onClick={() => updateSubConfig({ background: b.v })}
                                                            className={`py-2 text-[10px] rounded border transition-all cursor-pointer ${subConfig.background === b.v ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                                                        >
                                                            {b.l}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="sticky top-0 bg-zinc-900 px-3 py-1.5 flex items-center justify-between border-b border-white/10 z-10">
                                            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Subtitles</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowSubConfig(true); }}
                                                className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white group"
                                                title="Subtitle Settings"
                                            >
                                                <Settings className="w-3 h-3 transition-transform group-hover:rotate-45" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => { handleSubtitleChange(-1); setShowSubMenu(false); }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                                        >
                                            {!activeTrack ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <span className="w-3.5" />}
                                            Off
                                        </button>
                                        {tracks.map((track, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { handleSubtitleChange(i); setShowSubMenu(false); }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                                            >
                                                {activeTrack === track
                                                    ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                    : <span className="w-3.5" />
                                                }
                                                {track.label ?? `Track ${i + 1}`}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-white/30 px-2">No subtitle</span>
                )}

                {/* ── Quality button ── */}
                {qualityLevels.length > 1 && (
                    <div className="relative" ref={qualityBtnRef}>
                        <button
                            onClick={() => { setShowQualityMenu(p => !p); setShowSubMenu(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{currentQualityLabel()}</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showQualityMenu && (
                            <div className="absolute bottom-full mb-1.5 left-0 bg-zinc-900 border border-white/20 rounded-lg overflow-y-auto max-h-[350px] min-w-[120px] shadow-2xl z-50 custom-scrollbar">
                                <div className="sticky top-0 bg-zinc-900 px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/10 z-10">
                                    Quality
                                </div>
                                <button
                                    onClick={() => handleQuality(-1)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                                >
                                    {currentLevel === -1 ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <span className="w-3.5" />}
                                    Auto
                                </button>
                                {qualityLevels.map(level => (
                                    <button
                                        key={level.index}
                                        onClick={() => handleQuality(level.index)}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                                    >
                                        {currentLevel === level.index ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <span className="w-3.5" />}
                                        {level.height > 0 ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Status indicator */}
                <div className="ml-auto text-xs text-white/30 flex items-center gap-2">
                    {activeTrack && !loadingSub && <span className="text-green-400">● {activeTrack.label}</span>}
                    {loadingSub && <span className="text-yellow-400">● Loading subtitle…</span>}
                </div>
            </div>
        </div>
    );
}
