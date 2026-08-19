"use client";
import { useState, useEffect, useMemo } from "react";
import { EpisodeListClient } from "@/components/anime/EpisodeListClient";
import { RelatedSection } from "@/components/anime/RelatedSection";
import { VideoPlayer } from "./VideoPlayer";
import Link from 'next/link';
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnimeDetail, AnimeEpisodes, WatchData, Source, RelatedAnime, AnimeListItem } from "@/lib/types";
import LibraryButton from "@/components/anime/LibraryButton";
import { CommentSection } from "@/components/anime/CommentSection";
import { RecommendationsSection } from "@/components/anime/RecommendationsSection";
import { useAuth } from "@/lib/auth-context";
import { useBlockedFilters } from "@/lib/blocked-filters-context";
import { ShieldAlert, Eye, Settings, Terminal, ChevronLeft, ChevronRight, PlayCircle, Star, Tv, Calendar, Clock, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "@/hooks/use-router";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

interface WatchClientProps {
    animeId: string;
    episodeNum: string;
    episodeRange?: string;
    detailsData: AnimeDetail;
    episodesData: AnimeEpisodes;
    watchData: WatchData;
    relatedData?: RelatedAnime[];
    recommendationsData?: AnimeListItem[];
    cfProxyUrl?: string;
}

export function WatchClient({ animeId, episodeNum, episodeRange, detailsData, episodesData, watchData, relatedData = [], recommendationsData = [], cfProxyUrl }: WatchClientProps) {
    const router = useRouter();
    const { isAnimeBlocked, getBlockedReason, openModal } = useBlockedFilters();
    const isBlocked = isAnimeBlocked(detailsData);
    const blockedReason = getBlockedReason(detailsData);
    const [revealed, setRevealed] = useState(false);

    // Auto Play Next episode state
    const [autoPlay, setAutoPlay] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("aonime_autoplay_next");
            return saved !== null ? saved === "true" : true;
        }
        return true;
    });

    const handleAutoPlayChange = (enabled: boolean) => {
        setAutoPlay(enabled);
        if (typeof window !== "undefined") {
            localStorage.setItem("aonime_autoplay_next", String(enabled));
        }
    };

    // Seamless episode navigation state
    const [currentEpNum, setCurrentEpNum] = useState<string>(episodeNum);
    const [watchDataState, setWatchDataState] = useState<WatchData>(watchData);
    const [isFetchingEpisode, setIsFetchingEpisode] = useState(false);

    const slug = detailsData.slug || animeId;
    const title = detailsData.title || animeId;

    const [showFullSynopsis, setShowFullSynopsis] = useState(false);
    const genresList = useMemo(() => {
        return (detailsData.genres || []).map(
            (genre) => genre.charAt(0).toUpperCase() + genre.slice(1)
        );
    }, [detailsData.genres]);

    // Calculate episode list sorting & adjacent episode info
    const sortedEpisodes = useMemo(() => {
        if (!episodesData?.episodes || episodesData.episodes.length === 0) return [];
        return [...episodesData.episodes].sort((a, b) => {
            const numA = parseFloat(a.number);
            const numB = parseFloat(b.number);
            if (isNaN(numA) || isNaN(numB)) return a.number.localeCompare(b.number, undefined, { numeric: true });
            return numA - numB;
        });
    }, [episodesData?.episodes]);

    const currentEpIdx = useMemo(() => {
        return sortedEpisodes.findIndex(
            e => parseFloat(e.number) === parseFloat(currentEpNum) || e.number === currentEpNum
        );
    }, [sortedEpisodes, currentEpNum]);

    const getEpRange = (epNumStr: string, totalCount: number) => {
        const num = parseInt(epNumStr);
        if (isNaN(num) || totalCount <= 50) return totalCount > 50 ? "1-50" : `1-${totalCount}`;
        const chunkIndex = Math.floor((num - 1) / 50);
        const start = chunkIndex * 50 + 1;
        const end = Math.min((chunkIndex + 1) * 50, totalCount);
        return `${start}-${end}`;
    };

    const changeEpisode = async (newEpNum: string, newRangeStr?: string) => {
        if (newEpNum === currentEpNum || isFetchingEpisode) return;
        setIsFetchingEpisode(true);

        const rangeStr = newRangeStr || getEpRange(newEpNum, sortedEpisodes.length);
        const newUrl = `/watch/${slug}?ep=${newEpNum}&range=${rangeStr}`;
        if (typeof window !== "undefined") {
            window.history.pushState(null, '', newUrl);
        }

        setCurrentEpNum(newEpNum);

        try {
            const res = await fetch(`/api/watch?slug=${encodeURIComponent(slug)}&ep=${encodeURIComponent(newEpNum)}`);
            if (res.ok) {
                const data = await res.json();
                setWatchDataState(data);
            }
        } catch (err) {
            console.error("Failed to fetch next episode watch data:", err);
        } finally {
            setIsFetchingEpisode(false);
        }
    };

    const prevEpisodeInfo = useMemo(() => {
        if (currentEpIdx > 0) {
            const prev = sortedEpisodes[currentEpIdx - 1];
            return {
                number: prev.number,
                url: `/watch/${slug}?ep=${prev.number}&range=${getEpRange(prev.number, sortedEpisodes.length)}`
            };
        }
        return null;
    }, [currentEpIdx, sortedEpisodes, slug]);

    const nextEpisodeInfo = useMemo(() => {
        if (currentEpIdx !== -1 && currentEpIdx < sortedEpisodes.length - 1) {
            const next = sortedEpisodes[currentEpIdx + 1];
            return {
                number: next.number,
                url: `/watch/${slug}?ep=${next.number}&range=${getEpRange(next.number, sortedEpisodes.length)}`
            };
        }
        return null;
    }, [currentEpIdx, sortedEpisodes, slug]);

    const handleNavigatePrev = () => {
        if (prevEpisodeInfo) {
            changeEpisode(prevEpisodeInfo.number);
        }
    };

    const handleNavigateNext = () => {
        if (nextEpisodeInfo) {
            changeEpisode(nextEpisodeInfo.number);
        }
    };

    const allSources = watchDataState.sources || [];
    const servers = watchDataState.servers || [];

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

    // Build a merged server list
    const buildServerList = (type: "sub" | "dub" | "hsub") => {
        const fromServers = servers.filter(s => s.type === type);
        const knownNames = new Set(fromServers.map(s => s.name));
        const fromSources = allSources
            .filter(s => getSourceType(s) === type && s.server && !knownNames.has(s.server))
            .map(s => ({ name: s.server!, type }));
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

    const [subServerIdx, setSubServerIdx] = useState(0);
    const [hsubServerIdx, setHsubServerIdx] = useState(0);
    const [dubServerIdx, setDubServerIdx] = useState(0);
    const [activeCategory, setActiveCategory] = useState<"sub" | "dub" | "hsub">("sub");

    const handleSubChange = (idx: number) => { setSubServerIdx(idx); setActiveCategory("sub"); };
    const handleHsubChange = (idx: number) => { setHsubServerIdx(idx); setActiveCategory("hsub"); };
    const handleDubChange = (idx: number) => { setDubServerIdx(idx); setActiveCategory("dub"); };

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

    useEffect(() => {
        setSubServerIdx(0);
        setHsubServerIdx(0);
        setDubServerIdx(0);
    }, [watchDataState]);

    const selectedServer = getActiveServers()[getActiveServerIdx()] ?? null;
    const currentSource = useMemo(() => {
        if (selectedServer) {
            const matched = allSources.find(s =>
                s.server === selectedServer.name &&
                (s.type === selectedServer.type || getSourceType(s) === selectedServer.type)
            );
            if (matched) return matched;
        }
        return allSources[0] ?? null;
    }, [selectedServer, allSources, servers]);

    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const saveWatchHistory = async () => {
            try {
                const targetId = detailsData.id || animeId;
                if (!targetId) return;
                // 1. Save/update watch history entry
                const historyRef = doc(db, "watch_history", `${user.uid}_${targetId}`);
                await setDoc(historyRef, {
                    userId: user.uid,
                    animeId: targetId,
                    title: detailsData.title || animeId,
                    image: detailsData.image || "",
                    slug: detailsData.slug || animeId,
                    episodeNum: currentEpNum,
                    watchedAt: serverTimestamp()
                }, { merge: true });

                // 2. Update library item if it exists
                const libraryRef = doc(db, "libraries", `${user.uid}_${targetId}`);
                const librarySnap = await getDoc(libraryRef);
                if (librarySnap.exists()) {
                    await updateDoc(libraryRef, {
                        lastEpisodeWatched: currentEpNum,
                        lastEpisodeWatchedAt: serverTimestamp()
                    });
                }
            } catch (error) {
                console.error("Error saving watch history:", error);
            }
        };

        saveWatchHistory();
    }, [user, detailsData.id, animeId, currentEpNum, detailsData.title, detailsData.image, detailsData.type, detailsData.slug]);

    return (
        <div className="container mx-auto max-w-screen-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {isBlocked && !revealed && (
                <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-destructive/20 rounded-lg text-destructive flex-shrink-0">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-destructive">Content Filter Warning</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">This anime matches your active Content Blocklist ({blockedReason}).</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button variant="outline" size="sm" onClick={openModal} className="text-xs h-8 gap-1.5 border-destructive/40 hover:bg-destructive/10"><Settings className="w-3.5 h-3.5" /> Adjust Filters</Button>
                        <Button size="sm" onClick={() => setRevealed(true)} className="text-xs h-8 gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"><Eye className="w-3.5 h-3.5" /> Unblock & Watch</Button>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 ${isBlocked && !revealed ? "blur-md opacity-30 select-none pointer-events-none transition-all duration-300" : ""}`}>
                {/* Main Content Column (Desktop: Left 3 cols, Mobile: contents) */}
                <div className="contents lg:flex lg:flex-col lg:col-span-3 lg:space-y-6">
                    {/* Video Player & Title/Server Selector */}
                    <div className="order-1 space-y-4">
                        <div className="relative z-10 w-full bg-black rounded-lg shadow-lg overflow-hidden border border-border/20">
                            {currentSource ? (
                                <VideoPlayer
                                    key="aonime-player"
                                    source={currentSource}
                                    tracks={currentSource.tracks || watchDataState.tracks || []}
                                    cfProxyUrl={cfProxyUrl}
                                    skipData={watchDataState.skip_data}
                                    autoPlay={autoPlay}
                                    onAutoPlayChange={handleAutoPlayChange}
                                    prevEpisode={prevEpisodeInfo}
                                    onNavigatePrev={handleNavigatePrev}
                                    nextEpisode={nextEpisodeInfo}
                                    onNavigateNext={handleNavigateNext}
                                />
                            ) : (
                                <div className="aspect-video flex items-center justify-center p-4 sm:p-8 bg-black/90 text-foreground">
                                    <Alert variant="destructive" className="max-w-md bg-destructive/10 border-destructive/30 text-left">
                                        <Terminal className="h-4 w-4" />
                                        <AlertTitle>{watchDataState?.error || "No streaming sources available!"}</AlertTitle>
                                        <AlertDescription className="mt-1">{watchDataState?.error ? watchDataState.error : "This episode doesn't seem to have any streaming sources yet."}</AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-2">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold break-words">{title}</h1>
                                    {detailsData.titleJp && detailsData.titleJp.trim() !== title.trim() && (
                                        <p className="text-sm md:text-base text-muted-foreground font-medium mt-0.5">{detailsData.titleJp}</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2.5 py-0.5">
                                        Episode {currentEpNum}
                                    </Badge>
                                    {detailsData.malScore != null && (
                                        <div className="flex items-center gap-1 font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            <span>{detailsData.malScore.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {detailsData.type && (
                                        <Badge variant="outline" className="text-xs font-semibold gap-1">
                                            <Tv className="w-3 h-3 text-primary" /> {detailsData.type}
                                        </Badge>
                                    )}
                                    {detailsData.rating && (
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {detailsData.rating}
                                        </Badge>
                                    )}
                                    {detailsData.aired && (
                                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-primary" /> {detailsData.aired}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap sm:flex-nowrap sm:self-start">
                                {(hasDub || hasHsub) && (
                                    <div className="flex rounded-md bg-muted p-1 select-none border">
                                        <button type="button" onClick={() => setActiveCategory("sub")} className={`px-3 py-1 text-xs font-bold rounded-sm transition-all uppercase ${activeCategory === "sub" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Sub</button>
                                        {hasHsub && <button type="button" onClick={() => setActiveCategory("hsub")} className={`px-3 py-1 text-xs font-bold rounded-sm transition-all uppercase ${activeCategory === "hsub" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>HSub</button>}
                                        {hasDub && <button type="button" onClick={() => setActiveCategory("dub")} className={`px-3 py-1 text-xs font-bold rounded-sm transition-all uppercase ${activeCategory === "dub" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Dub</button>}
                                    </div>
                                )}
                                {(getActiveServers().length > 0) && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Server</span>
                                        <Select value={String(getActiveServerIdx())} onValueChange={(v) => { const idx = parseInt(v); if (activeCategory === "sub") handleSubChange(idx); else if (activeCategory === "hsub") handleHsubChange(idx); else handleDubChange(idx); }}>
                                            <SelectTrigger className="w-[140px] text-xs font-semibold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getActiveServers().map((server, i) => (
                                                    <SelectItem key={`${server.name}-${i}`} value={String(i)} className="text-xs">
                                                        {server.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Comment Section (Desktop: 3rd in left column, Mobile: 5th after details) */}
                    <div className="order-5 lg:order-2">
                        <CommentSection animeId={slug} episodeNum={currentEpNum} animeTitle={title} />
                    </div>
                </div>

                {/* Sidebar Column (Desktop: Right 1 col, Mobile: contents) */}
                <div className="contents lg:flex lg:flex-col lg:col-span-1 lg:space-y-6">
                    {/* Episode List */}
                    <div className="order-2 lg:order-1">
                        <EpisodeListClient
                            animeId={slug}
                            episodes={episodesData.episodes}
                            totalEpisodes={episodesData.episodes.length}
                            currentEpisode={currentEpNum}
                            hideIcons={true}
                            initialRange={episodeRange}
                            onSelectEpisode={(epNum, rangeStr) => changeEpisode(epNum, rangeStr)}
                        />
                    </div>

                    {/* Anime Detail Card */}
                    <div className="order-3 lg:order-2">
                        <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/50 space-y-4">
                            <div className="flex flex-col gap-3">
                                <Link href={`/anime/${slug}`} className="flex items-start gap-3 group">
                                    {detailsData.image && (
                                        <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-border/40 group-hover:opacity-90 transition-opacity shadow-md">
                                            <Image src={detailsData.image} alt={title} fill className="object-cover" sizes="80px" />
                                        </div>
                                    )}
                                    <div className="min-w-0 space-y-1 flex-1">
                                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">{title}</h3>
                                        {detailsData.titleJp && detailsData.titleJp.trim() !== title.trim() && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">{detailsData.titleJp}</p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                                            {detailsData.status && (
                                                <span>Status: <strong className="text-foreground font-medium">{detailsData.status}</strong></span>
                                            )}
                                            {detailsData.duration && detailsData.duration !== "?" && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-primary" /> {detailsData.duration}
                                                </span>
                                            )}
                                            {detailsData.studios && detailsData.studios.length > 0 && (
                                                <span>Studio: <strong className="text-foreground font-medium">{detailsData.studios.join(', ')}</strong></span>
                                            )}
                                        </div>
                                    </div>
                                </Link>

                                {genresList.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {genresList.map((genre) => (
                                            <Badge key={genre} variant="secondary" className="text-[11px] py-0 px-2 font-normal">
                                                {genre}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-1">
                                    <Button variant="outline" size="sm" asChild className="flex-1 h-9 text-xs gap-1.5 border-border/60">
                                        <Link href={`/anime/${slug}`}>
                                            <Info className="w-3.5 h-3.5 text-primary" /> Details
                                        </Link>
                                    </Button>
                                    <LibraryButton animeId={detailsData.id || animeId} title={title} image={detailsData.image || ""} type={detailsData.type || "TV"} slug={slug} className="flex-1 h-9 text-xs px-3" />
                                </div>
                            </div>

                            {detailsData.synopsis && (
                                <div className="pt-3 border-t border-border/40 text-xs text-muted-foreground leading-relaxed">
                                    <p className={showFullSynopsis ? "" : "line-clamp-3"}>
                                        {detailsData.synopsis}
                                    </p>
                                    {detailsData.synopsis.length > 150 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                                            className="mt-1 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                        >
                                            {showFullSynopsis ? (
                                                <>Show Less <ChevronUp className="w-3 h-3" /></>
                                            ) : (
                                                <>Read More <ChevronDown className="w-3 h-3" /></>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {relatedData && relatedData.length > 0 && (
                <div className="mt-10">
                    <RelatedSection related={relatedData} />
                </div>
            )}

            {recommendationsData && recommendationsData.length > 0 && (
                <div className="mt-10">
                    <RecommendationsSection recommendations={recommendationsData} />
                </div>
            )}
        </div>
    );
}