"use client"

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, Settings, Subtitles, ChevronDown, Check, Palette, Type, RotateCcw } from "lucide-react";
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

type SubConfig = {
    size: number;
    color: string;
    background: string;
    showOutline: boolean;
    showShadow: boolean;
};

// ─── Main Video Player (Orchestrator) ────────────────────────────────────────

export function VideoPlayer({ source, tracks }: VideoPlayerProps) {
    const [playerUrl, setPlayerUrl] = useState<{ m3u8?: string; embed?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<HLS | null>(null);

    // CF Worker base URL
    const rawCfProxy = process.env.NEXT_PUBLIC_CF_PROXY_URL ?? '';
    const CF_PROXY = rawCfProxy
        ? (rawCfProxy.startsWith('http') ? rawCfProxy : `https://${rawCfProxy}`).replace(/\/$/, '')
        : '';
    const EXT_PROXY = 'https://anikoto-scrap.vercel.app';

    useEffect(() => {
        if (source.proxyUrl) {
            const queryString = source.proxyUrl.includes('?')
                ? source.proxyUrl.slice(source.proxyUrl.indexOf('?'))
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

    return (
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl" id="player-wrapper">
            <div className="w-full aspect-video bg-black relative group">
                {playerUrl?.m3u8 ? (
                    <HlsEngine
                        m3u8Url={playerUrl.m3u8}
                        tracks={tracks}
                        videoRef={videoRef}
                        hlsRef={hlsRef}
                    />
                ) : playerUrl?.embed ? (
                    <iframe
                        src={playerUrl.embed}
                        className="w-full h-full border-0"
                        allowFullScreen
                        allow="autoplay; encrypted-media; fullscreen"
                        referrerPolicy="origin"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                        <AlertCircle className="w-10 h-10 text-yellow-500 mr-2" />
                        No playable stream found.
                    </div>
                )}
            </div>

            {/* Controls are now sibling of the video container */}
            {playerUrl?.m3u8 && (
                <PlayerControls
                    videoRef={videoRef}
                    hlsRef={hlsRef}
                    tracks={tracks}
                />
            )}
        </div>
    );
}

// ─── HLS Engine (Core Logic) ────────────────────────────────────────────────

function HlsEngine({ m3u8Url, tracks, videoRef, hlsRef }: {
    m3u8Url: string;
    tracks: Track[];
    videoRef: React.RefObject<HTMLVideoElement>;
    hlsRef: React.MutableRefObject<HLS | null>;
}) {
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        hlsRef.current?.destroy();

        if (HLS.isSupported()) {
            const hls = new HLS({
                debug: false,
                startLevel: -1,
                maxBufferLength: 20,
                maxMaxBufferLength: 40,
                maxBufferSize: 30 * 1000 * 1000,
                xhrSetup: (xhr) => { xhr.withCredentials = false; },
            });
            hlsRef.current = hls;
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);

            hls.on(HLS.Events.MANIFEST_PARSED, () => {
                const savedHeight = Number(localStorage.getItem("preferred-quality-height") ?? "-1");
                if (savedHeight > 0) {
                    const matched = hls.levels.findIndex(l => l.height === savedHeight);
                    if (matched !== -1) hls.currentLevel = matched;
                }
                video.play().catch(() => { });
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = m3u8Url;
            video.play().catch(() => { });
        }

        return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
    }, [m3u8Url]);

    return (
        <video
            ref={videoRef}
            className="w-full h-full block"
            controls
            autoPlay
            crossOrigin="anonymous"
            playsInline
        >
            {tracks.map((track, i) => (
                <track
                    key={i}
                    kind="subtitles"
                    src={track.proxyUrl || track.file}
                    srcLang={track.label?.substring(0, 2).toLowerCase() || 'en'}
                    label={track.label || `Track ${i + 1}`}
                />
            ))}
        </video>
    );
}

// ─── Player Controls (UI) ────────────────────────────────────────────────────

function PlayerControls({ videoRef, hlsRef, tracks }: {
    videoRef: React.RefObject<HTMLVideoElement>;
    hlsRef: React.MutableRefObject<HLS | null>;
    tracks: Track[];
}) {
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(-1);
    const [activeTrack, setActiveTrack] = useState<Track | null>(null);
    const [loadingSub, setLoadingSub] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showSubMenu, setShowSubMenu] = useState(false);
    const [showSubConfig, setShowSubConfig] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [subConfig, setSubConfig] = useState<SubConfig>({
        size: 1,
        color: '#ffffff',
        background: 'rgba(0, 0, 0, 0)',
        showOutline: true,
        showShadow: true,
    });

    const subBtnRef = useRef<HTMLDivElement>(null);
    const qualityBtnRef = useRef<HTMLDivElement>(null);

    // Sync HLS data
    useEffect(() => {
        const hls = hlsRef.current;
        if (!hls) return;

        const updateLevels = () => {
            const levels = hls.levels.map((l, i) => ({ height: l.height || 0, bitrate: l.bitrate || 0, index: i }))
                .sort((a, b) => b.height - a.height);
            setQualityLevels(levels);
            setCurrentLevel(hls.currentLevel);
        };

        hls.on(HLS.Events.MANIFEST_PARSED, updateLevels);
        hls.on(HLS.Events.LEVEL_SWITCHED, (_, data) => setCurrentLevel(data.level));
        return () => {
            hls.off(HLS.Events.MANIFEST_PARSED, updateLevels);
        };
    }, [hlsRef.current]);

    // Subtitle management
    const handleSubtitleChange = (index: number) => {
        const video = videoRef.current;
        if (!video || !video.textTracks) return;

        setLoadingSub(true);
        for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = 'hidden';

        if (index >= 0 && index < video.textTracks.length) {
            video.textTracks[index].mode = 'showing';
            setActiveTrack(tracks[index]);
        } else {
            setActiveTrack(null);
        }
        setLoadingSub(false);
    };

    // Auto-enable first sub
    useEffect(() => {
        const timer = setTimeout(() => handleSubtitleChange(0), 1000);
        return () => clearTimeout(timer);
    }, [tracks]);

    // Quality management
    const handleQuality = (levelIndex: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelIndex;
            if (levelIndex === -1) {
                localStorage.removeItem('preferred-quality-height');
            } else {
                localStorage.setItem('preferred-quality-height', String(hlsRef.current.levels[levelIndex]?.height || -1));
            }
            setCurrentLevel(levelIndex);
            setShowQualityMenu(false);
        }
    };

    // Subtitle styling logic
    useEffect(() => {
        const saved = localStorage.getItem("subtitle-config");
        if (saved) { try { setSubConfig(JSON.parse(saved)); } catch (e) { } }
    }, []);

    const updateSubConfig = (newConfig: Partial<SubConfig>) => {
        const updated = { ...subConfig, ...newConfig };
        setSubConfig(updated);
        localStorage.setItem("subtitle-config", JSON.stringify(updated));
    };

    const resetSubConfig = () => {
        const def = { size: 1, color: '#ffffff', background: 'rgba(0, 0, 0, 0)', showOutline: true, showShadow: true };
        setSubConfig(def);
        localStorage.removeItem("subtitle-config");
    };

    // Fullscreen and styles
    useEffect(() => {
        const handleFs = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            document.documentElement.style.setProperty('--is-fullscreen', fs ? '1' : '0');
        };
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, []);

    useEffect(() => {
        const styleId = 'video-subtitle-styles';
        let style = document.getElementById(styleId) as HTMLStyleElement;
        if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style); }
        style.textContent = `
            video::cue {
                font-family: "Outfit", "Inter", sans-serif !important;
                font-size: calc(var(--subtitle-font-size) * ${subConfig.size}) !important;
                font-weight: 700 !important;
                background: ${subConfig.background} !important;
                color: ${subConfig.color} !important;
                padding: 2px 8px !important;
                border-radius: 4px !important;
                line-height: 1.3 !important;
                text-align: center !important;
                text-shadow: ${[
                subConfig.showOutline ? `-2px -2px 0 #000, 0px -2px 0 #000, 2px -2px 0 #000, 2px  0px 0 #000, 2px  2px 0 #000, 0px  2px 0 #000, -2px  2px 0 #000, -2px  0px 0 #000` : '',
                subConfig.showShadow ? `0px 4px 8px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,0.8)` : ''
            ].filter(Boolean).join(', ') || 'none'} !important;
            }
            video::-webkit-media-text-track-container { transform: translateY(-28px) !important; }
            :root { --subtitle-font-size: clamp(12px, 4vw, 20px); }
            :root[style*="--is-fullscreen: 1"] { --subtitle-font-size: clamp(20px, 6vw, 38px); }
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        `;
    }, [isFullscreen, subConfig]);

    useEffect(() => {
        const handleClickAway = (e: MouseEvent) => {
            if (subBtnRef.current && !subBtnRef.current.contains(e.target as Node)) { setShowSubMenu(false); setShowSubConfig(false); }
            if (qualityBtnRef.current && !qualityBtnRef.current.contains(e.target as Node)) setShowQualityMenu(false);
        };
        document.addEventListener("mousedown", handleClickAway);
        return () => document.removeEventListener("mousedown", handleClickAway);
    }, []);

    const currentQualityLabel = () => {
        if (currentLevel === -1) return 'Auto';
        const level = qualityLevels.find(l => l.index === currentLevel);
        return level ? `${level.height}p` : 'Auto';
    };

    return (
        <div className="relative flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-white/10">
            {/* Subtitle Control */}
            {tracks.length > 0 ? (
                <div ref={subBtnRef}>
                    <button
                        onClick={() => { if (showSubMenu) setShowSubConfig(false); setShowSubMenu(!showSubMenu); setShowQualityMenu(false); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${activeTrack ? "bg-primary text-white border-primary" : "bg-white/10 text-white border-white/20"}`}
                    >
                        <Subtitles className="w-3.5 h-3.5" />
                        <span>{loadingSub ? "..." : (activeTrack?.label ?? "Subtitle")}</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSubMenu && (
                        <div className="absolute bottom-full mb-2 left-2 right-2 sm:left-3 sm:right-auto sm:w-auto sm:min-w-[240px] bg-zinc-950/95 backdrop-blur-md border border-white/20 rounded-xl overflow-y-auto max-h-[280px] sm:max-h-[420px] shadow-2xl z-50 custom-scrollbar">
                            {showSubConfig ? (
                                <div className="p-3 space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                        <button onClick={() => setShowSubConfig(false)} className="text-[10px] text-white/40 hover:text-white flex items-center gap-1"><ChevronDown className="w-3 h-3 rotate-90" /> Back</button>
                                        <button onClick={resetSubConfig} className="text-[10px] text-red-400 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset</button>
                                    </div>
                                    {/* Size */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] text-white/60"><div className="flex items-center gap-2"><Type className="w-3 h-3" /> Size</div><span className="text-primary font-bold">{Math.round(subConfig.size * 100)}%</span></div>
                                        <input type="range" min="0.5" max="2.5" step="0.05" value={subConfig.size} onChange={(e) => updateSubConfig({ size: parseFloat(e.target.value) })} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
                                    </div>
                                    {/* Color */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] text-white/60"><Palette className="w-3 h-3" /> Color</div>
                                        <div className="flex gap-2">
                                            {['#ffffff', '#ffff00', '#00ffff', '#00ff00'].map(c => <button key={c} onClick={() => updateSubConfig({ color: c })} className={`w-6 h-6 rounded-full border-2 ${subConfig.color === c ? 'border-primary scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                                        </div>
                                    </div>
                                    {/* Edge */}
                                    <div className="space-y-2">
                                        <div className="text-[10px] text-white/60">Edge Style</div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <button onClick={() => updateSubConfig({ showOutline: !subConfig.showOutline })} className={`py-1 text-[10px] rounded border ${subConfig.showOutline ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>Outline</button>
                                            <button onClick={() => updateSubConfig({ showShadow: !subConfig.showShadow })} className={`py-1 text-[10px] rounded border ${subConfig.showShadow ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>Shadow</button>
                                        </div>
                                    </div>
                                    {/* Bg */}
                                    <div className="space-y-2">
                                        <div className="text-[10px] text-white/60">Background</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[{ l: 'None', v: 'rgba(0,0,0,0)' }, { l: 'Ghost', v: 'rgba(0,0,0,0.5)' }].map(b => <button key={b.v} onClick={() => updateSubConfig({ background: b.v })} className={`py-1 text-[10px] rounded border ${subConfig.background === b.v ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>{b.l}</button>)}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="sticky top-0 bg-zinc-900 px-3 py-1.5 flex justify-between border-b border-white/10 z-10"><span className="text-[10px] text-white/40 uppercase">Subtitles</span><button onClick={() => setShowSubConfig(true)} className="p-1 hover:bg-white/10 rounded transition-colors text-white/60"><Settings className="w-3 h-3" /></button></div>
                                    <button onClick={() => { handleSubtitleChange(-1); setShowSubMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10">{!activeTrack ? <Check className="w-3.5 h-3.5 text-primary" /> : <div className="w-3.5" />}Off</button>
                                    {tracks.map((track, i) => <button key={i} onClick={() => { handleSubtitleChange(i); setShowSubMenu(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10">{activeTrack === track ? <Check className="w-3.5 h-3.5 text-primary" /> : <div className="w-3.5" />}{track.label ?? `Track ${i + 1}`}</button>)}
                                </>
                            )}
                        </div>
                    )}
                </div>
            ) : <span className="text-xs text-white/30 px-2">No subtitle</span>}

            {/* Quality Control */}
            {qualityLevels.length > 1 && (
                <div ref={qualityBtnRef}>
                    <button
                        onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSubMenu(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-white/10 text-white border border-white/20 hover:bg-white/20 cursor-pointer"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        <span>{currentQualityLabel()}</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {showQualityMenu && (
                        <div className="absolute bottom-full mb-2 left-2 right-2 sm:left-auto sm:right-3 sm:w-auto sm:min-w-[140px] bg-zinc-950/95 backdrop-blur-md border border-white/20 rounded-xl overflow-y-auto max-h-[250px] sm:max-h-[350px] shadow-2xl z-50 custom-scrollbar">
                            <div className="sticky top-0 bg-zinc-900 px-3 py-1.5 text-[10px] text-white/40 uppercase border-b border-white/10 z-10">Quality</div>
                            <button onClick={() => handleQuality(-1)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10">{currentLevel === -1 ? <Check className="w-3.5 h-3.5 text-primary" /> : <div className="w-3.5" />}Auto</button>
                            {qualityLevels.map(level => <button key={level.index} onClick={() => handleQuality(level.index)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-white/10">{currentLevel === level.index ? <Check className="w-3.5 h-3.5 text-primary" /> : <div className="w-3.5" />}{level.height > 0 ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`}</button>)}
                        </div>
                    )}
                </div>
            )}

            {/* Status */}
            <div className="ml-auto text-xs text-white/30 flex items-center gap-2">
                {activeTrack && !loadingSub && <span className="text-green-400">● {activeTrack.label}</span>}
                {loadingSub && <span className="text-yellow-400 animate-pulse">● Loading...</span>}
            </div>
        </div>
    );
}
