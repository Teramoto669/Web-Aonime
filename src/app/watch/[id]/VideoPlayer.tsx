"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, Settings, Subtitles, Check, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import HLS from "hls.js";
import type { Source, Track } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type VideoPlayerProps = {
    source: Source;
    tracks: Track[];
};

type QualityLevel = {
    height: number;
    bitrate: number;
    index: number;
};

type VttCue = {
    start: number;
    end: number;
    text: string;
};

// ─── VTT Parser ───────────────────────────────────────────────────────────────

function parseVttTime(s: string): number {
    const clean = s.trim().split(" ")[0];
    const parts = clean.split(":");
    if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return 0;
}

function parseVtt(text: string): VttCue[] {
    const cues: VttCue[] = [];
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const blocks = normalized.split(/\n{2,}/);
    for (const block of blocks) {
        const lines = block.trim().split("\n");
        const timeLineIdx = lines.findIndex(l => l.includes(" --> "));
        if (timeLineIdx === -1) continue;
        const timeLine = lines[timeLineIdx];
        const arrowIdx = timeLine.indexOf(" --> ");
        const start = parseVttTime(timeLine.slice(0, arrowIdx));
        const end = parseVttTime(timeLine.slice(arrowIdx + 5));
        const rawText = lines.slice(timeLineIdx + 1).join("\n").trim();
        const cleanText = rawText.replace(/<[^>]+>/g, "").trim();
        if (cleanText && end > start) {
            cues.push({ start, end, text: cleanText });
        }
    }
    return cues;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function VideoPlayer({ source, tracks }: VideoPlayerProps) {
    const [playerUrl, setPlayerUrl] = useState<{ m3u8?: string; embed?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // CF Worker base URL (no trailing slash, always https://)
    const rawCfProxy = process.env.NEXT_PUBLIC_CF_PROXY_URL ?? '';
    const CF_PROXY = rawCfProxy
        ? (rawCfProxy.startsWith('http') ? rawCfProxy : `https://${rawCfProxy}`).replace(/\/$/, '')
        : '';
    const EXT_PROXY = 'https://anikoto-scrap.vercel.app';

    useEffect(() => {
        if (source.proxyUrl) {
            // source.proxyUrl is like "/api/proxy?url=...&referer=..."
            // CF Worker reads ?url= and ?referer= at any path, so we just
            // extract the query string and append to worker base URL
            const queryString = source.proxyUrl.includes('?')
                ? source.proxyUrl.slice(source.proxyUrl.indexOf('?'))   // "?url=...&referer=..."
                : `?url=${encodeURIComponent(source.proxyUrl)}`;

            const base = CF_PROXY || EXT_PROXY;
            setPlayerUrl({ m3u8: `${base}/${queryString}` });
        } else if (source.m3u8) {
            const base = CF_PROXY || '';
            const qs = `?url=${encodeURIComponent(source.m3u8)}${source.referer ? `&referer=${encodeURIComponent(source.referer)}` : ''}`;
            setPlayerUrl({ m3u8: base ? `${base}/${qs}` : `/api/proxy${qs}` });
        } else if (source.url) {
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
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
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

// ─── HLS Player ──────────────────────────────────────────────────────────────

function HlsPlayer({ m3u8Url, tracks }: { m3u8Url: string; tracks: Track[] }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hlsRef = useRef<HLS | null>(null);

    // Quality
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const qualityBtnRef = useRef<HTMLDivElement>(null);

    // Subtitle — default to the track marked as default, or the first available
    const defaultTrack = tracks.find(t => t.default) ?? tracks[0] ?? null;
    const [activeTrack, setActiveTrack] = useState<Track | null>(defaultTrack);
    const [showSubMenu, setShowSubMenu] = useState(false);
    const subBtnRef = useRef<HTMLDivElement>(null);
    const [cues, setCues] = useState<VttCue[]>([]);
    const [currentCue, setCurrentCue] = useState<string | null>(null);
    const [loadingSub, setLoadingSub] = useState(false);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    console.log("[HlsPlayer] tracks received:", tracks);

    // ── HLS setup ──
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        hlsRef.current?.destroy();
        setQualityLevels([]);
        setCurrentLevel(-1);

        if (HLS.isSupported()) {
            const hls = new HLS({
                debug: false,
                startLevel: -1,
                maxBufferLength: 20,
                maxMaxBufferLength: 40,
                maxBufferSize: 30 * 1000 * 1000,
                startFragPrefetch: false,
                abrBandWidthFactor: 0.8,
                abrBandWidthUpFactor: 0.6,
                // Allow cross-origin segment fetches (direct CDN)
                xhrSetup: (xhr, url) => {
                    xhr.withCredentials = false;
                },
            });
            hlsRef.current = hls;
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);

            hls.on(HLS.Events.MANIFEST_PARSED, (_, data) => {
                const levels = data.levels
                    .map((l, i) => ({ height: l.height || 0, bitrate: l.bitrate || 0, index: i }))
                    .sort((a, b) => b.height - a.height);
                setQualityLevels(levels);

                // Restore saved quality preference
                const savedHeight = Number(localStorage.getItem("preferred-quality-height") ?? "-1");
                if (savedHeight > 0) {
                    const matched = data.levels.findIndex(l => l.height === savedHeight);
                    if (matched !== -1) {
                        hls.currentLevel = matched;
                        setCurrentLevel(matched);
                    }
                }

                video.play().catch(() => { });
            });

            hls.on(HLS.Events.LEVEL_SWITCHED, (_, data) => setCurrentLevel(data.level));
            hls.on(HLS.Events.ERROR, (_, data) => {
                if (data.fatal) console.error("HLS fatal:", data.type, data.details);
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = m3u8Url;
            video.play().catch(() => { });
        }

        return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
    }, [m3u8Url]);

    // ── Fetch VTT ──
    useEffect(() => {
        if (!activeTrack) { setCues([]); setCurrentCue(null); return; }
        const url = activeTrack.proxyUrl || activeTrack.file;
        if (!url) { console.warn("[Subtitle] No URL on track:", activeTrack); return; }
        console.log("[Subtitle] Fetching VTT from:", url);
        setLoadingSub(true);
        fetch(url)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
            .then(text => {
                const parsed = parseVtt(text);
                console.log("[Subtitle] Parsed", parsed.length, "cues");
                setCues(parsed);
            })
            .catch(e => console.error("[Subtitle] Error:", e))
            .finally(() => setLoadingSub(false));
    }, [activeTrack]);

    // ── Sync cues ──
    useEffect(() => {
        const video = videoRef.current;
        if (!video || cues.length === 0) { setCurrentCue(null); return; }
        const fn = () => {
            const t = video.currentTime;
            const cue = cues.find(c => t >= c.start && t <= c.end) ?? null;
            setCurrentCue(cue ? cue.text : null);
        };
        video.addEventListener("timeupdate", fn);
        return () => video.removeEventListener("timeupdate", fn);
    }, [cues]);

    // ── Close menus on outside click ──
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!qualityBtnRef.current?.contains(e.target as Node)) setShowQualityMenu(false);
            if (!subBtnRef.current?.contains(e.target as Node)) setShowSubMenu(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Fullscreen detection (simple — we always fullscreen the container) ──
    useEffect(() => {
        const onFsChange = () => {
            const fsEl = document.fullscreenElement
                ?? (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
                ?? null;
            const isFs = !!fsEl;
            setIsFullscreen(isFs);

            if (isFs) {
                try {
                    if (window.screen && screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock("landscape").catch((err) => console.warn("Orientation lock failed:", err));
                    }
                } catch (e) {}
            } else {
                try {
                    if (window.screen && screen.orientation && screen.orientation.unlock) {
                        screen.orientation.unlock();
                    }
                } catch (e) {}
            }
        };
        document.addEventListener("fullscreenchange", onFsChange);
        document.addEventListener("webkitfullscreenchange", onFsChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFsChange);
            document.removeEventListener("webkitfullscreenchange", onFsChange);
        };
    }, []);

    // ── Custom fullscreen toggle (targets container, not video) ──
    const handleFullscreen = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const fsEl = document.fullscreenElement
            ?? (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
            ?? null;
        if (!fsEl) {
            container.requestFullscreen?.() ??
                (container as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() ??
                (document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.();
        }
    }, []);

    const handleQuality = (idx: number) => {
        if (hlsRef.current) hlsRef.current.currentLevel = idx;
        setCurrentLevel(idx);
        setShowQualityMenu(false);
        // Persist preference by height (-1 = Auto)
        if (idx === -1) {
            localStorage.removeItem("preferred-quality-height");
        } else {
            const q = qualityLevels.find(l => l.index === idx);
            if (q && q.height > 0) {
                localStorage.setItem("preferred-quality-height", String(q.height));
            }
        }
    };

    const currentQualityLabel = (): string => {
        if (currentLevel === -1) return "Auto";
        const q = qualityLevels.find(l => l.index === currentLevel);
        return q ? (q.height > 0 ? `${q.height}p` : `${Math.round(q.bitrate / 1000)}k`) : "Auto";
    };

    // Subtitle overlay style — always absolute inside container
    // (container is always the fullscreen element, so subtitle is always visible)
    const subtitleStyle: React.CSSProperties = {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: isFullscreen ? "8%" : "52px",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        padding: "0 16px",
        zIndex: 10,
    };

    return (
        <div className="w-full">
            {/* Video container — always the fullscreen target */}
            <div
                ref={containerRef}
                className="relative w-full aspect-video bg-black"
                onDoubleClick={handleFullscreen}
            >
                <video
                    ref={videoRef}
                    className="w-full h-full"
                    controls
                    autoPlay
                    playsInline
                    // Hide native fullscreen button so user always uses ours
                    // (prevents browser fullscreening video without our subtitle overlay)
                    style={{ ['--hide-fs' as string]: '1' }}
                />
                {/* Subtitle overlay — absolute in normal mode, fixed in fullscreen */}
                {currentCue && (
                    <div style={subtitleStyle}>
                        <span style={{
                            color: "#fff",
                            fontSize: isFullscreen ? "clamp(16px, 2.5vw, 28px)" : "clamp(13px, 2vw, 18px)",
                            fontWeight: 700,
                            background: "none",
                            padding: "3px 10px",
                            borderRadius: "4px",
                            whiteSpace: "pre-line",
                            lineHeight: 1.5,
                            display: "inline-block",
                            maxWidth: "90%",
                            textAlign: "center",
                            textShadow: [
                                "-2px -2px 0 #000",
                                " 2px -2px 0 #000",
                                "-2px  2px 0 #000",
                                " 2px  2px 0 #000",
                                "-2px  0   0 #000",
                                " 2px  0   0 #000",
                                " 0   -2px 0 #000",
                                " 0    2px 0 #000",
                            ].join(","),
                        }}>
                            {currentCue}
                        </span>
                    </div>
                )}
            </div>

            {/* Controls toolbar — always visible */}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-white/10">

                {/* ── Subtitle button ── */}
                {tracks.length > 0 ? (
                    <div className="relative" ref={subBtnRef}>
                        <button
                            onClick={() => { setShowSubMenu(p => !p); setShowQualityMenu(false); }}
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
                            <div className="absolute bottom-full mb-1.5 left-0 bg-zinc-900 border border-white/20 rounded-lg overflow-hidden min-w-[150px] shadow-2xl z-50">
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/10">
                                    Subtitles
                                </div>
                                <button
                                    onClick={() => { setActiveTrack(null); setShowSubMenu(false); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                                >
                                    {!activeTrack ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <span className="w-3.5" />}
                                    Off
                                </button>
                                {tracks.map((track, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setActiveTrack(track); setShowSubMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                                    >
                                        {activeTrack === track
                                            ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                            : <span className="w-3.5" />
                                        }
                                        {track.label ?? `Track ${i + 1}`}
                                    </button>
                                ))}
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
                            <div className="absolute bottom-full mb-1.5 left-0 bg-zinc-900 border border-white/20 rounded-lg overflow-hidden min-w-[120px] shadow-2xl z-50">
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/10">
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

                {/* ── Fullscreen button ── */}
                <button
                    onClick={handleFullscreen}
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    className="flex items-center justify-center w-8 h-8 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                    {isFullscreen
                        ? <Minimize2 className="w-4 h-4" />
                        : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
