"use client"

import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import HLS from "hls.js";
import type { Source, Track, SkipData } from "@/lib/types";
import Artplayer from "artplayer";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";

// ─── Types ────────────────────────────────────────────────────────────────────

type VideoPlayerProps = {
    source: Source;
    tracks: Track[];
    cfProxyUrl?: string;
    skipData?: SkipData;
};

// ─── Custom Player Icons (Zenime Style) ───────────────────────────────────────

const backward10Icon = `<svg viewBox="-5 -10 75 75" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
<path d="M11.9199 45H7.20508V26.5391L2.60645 28.3154V24.3975L11.4219 20.7949H11.9199V45ZM30.1013 35.0059C30.1013 38.3483 29.4926 40.9049 28.2751 42.6758C27.0687 44.4466 25.3422 45.332 23.0954 45.332C20.8708 45.332 19.1498 44.4743 17.9323 42.7588C16.726 41.0322 16.1006 38.5641 16.0564 35.3545V30.7891C16.0564 27.4577 16.6596 24.9121 17.8659 23.1523C19.0723 21.3815 20.8044 20.4961 23.0622 20.4961C25.32 20.4961 27.0521 21.3704 28.2585 23.1191C29.4649 24.8678 30.0792 27.3636 30.1013 30.6064V35.0059ZM25.3864 30.1084C25.3864 28.2048 25.1983 26.777 24.822 25.8252C24.4457 24.8734 23.8591 24.3975 23.0622 24.3975C21.5681 24.3975 20.7933 26.1406 20.738 29.627V35.6533C20.738 37.6012 20.9262 39.0511 21.3025 40.0029C21.6898 40.9548 22.2875 41.4307 23.0954 41.4307C23.8591 41.4307 24.4236 40.988 24.7888 40.1025C25.1651 39.2061 25.3643 37.8392 25.3864 36.002V30.1084Z" fill="white"/>
<path d="M11.9894 5.45398V0L2 7.79529L11.9894 15.5914V10.3033H47.0886V40.1506H33.2442V45H52V5.45398H11.9894Z" fill="white"/>
</svg>`;

const forward10Icon = `<svg viewBox="-5 -10 75 75" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
<path d="M29.9199 45H25.2051V26.5391L20.6064 28.3154V24.3975L29.4219 20.7949H29.9199V45ZM48.1013 35.0059C48.1013 38.3483 47.4926 40.9049 46.2751 42.6758C45.0687 44.4466 43.3422 45.332 41.0954 45.332C38.8708 45.332 37.1498 44.4743 35.9323 42.7588C34.726 41.0322 34.1006 38.5641 34.0564 35.3545V30.7891C34.0564 27.4577 34.6596 24.9121 35.8659 23.1523C37.0723 21.3815 38.8044 20.4961 41.0622 20.4961C43.32 20.4961 45.0521 21.3704 46.2585 23.1191C47.4649 24.8678 48.0792 27.3636 48.1013 30.6064V35.0059ZM43.3864 30.1084C43.3864 28.2048 43.1983 26.777 42.822 25.8252C42.4457 24.8734 41.8591 24.3975 41.0622 24.3975C39.5681 24.3975 38.7933 26.1406 38.738 29.627V35.6533C38.738 37.6012 38.9262 39.0511 39.3025 40.0029C39.6898 40.9548 40.2875 41.4307 41.0954 41.4307C41.8591 41.4307 42.4236 40.988 42.7888 40.1025C43.1651 39.2061 43.3643 37.8392 43.3864 36.002V30.1084Z" fill="white"/>
<path d="M40.0106 5.45398V0L50 7.79529L40.0106 15.5914V10.3033H4.9114V40.1506H18.7558V45H2.01875e-06V5.45398H40.0106Z" fill="white"/>
</svg>`;

const volumeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="20" height="20"><path fill="#fff" d="M116.5,42.8v154.4c0,2.8-1.7,3.6-3.8,1.7l-54.1-48H29c-2.8,0-5.2-2.3-5.2-5.2V94.3c0-2.8,2.3-5.2,5.2-5.2h29.6l54.1-48C114.8,39.2,116.5,39.9,116.5,42.8z"/><path fill="#fff" d="M136.2,160v-20c11.1,0,20-8.9,20-20s-8.9-20-20-20V80c22.1,0,40,17.9,40,40S158.3,160,136.2,160z"/><path fill="#fff" d="M216.2,120c0-44.2-35.8-80-80-80v20c33.1,0,60,26.9,60,60s-26.9,60-60,60v20C180.4,199.9,216.1,164.1,216.2,120z"/></svg>`;

const muteIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="20" height="20">
    <path fill="#fff" d="M116.4,42.8v154.5c0,2.8-1.7,3.6-3.8,1.7l-54.1-48.1H28.9c-2.8,0-5.2-2.3-5.2-5.2V94.2c0-2.8,2.3-5.2,5.2-5.2h29.6l54.1-48.1C114.6,39.1,116.4,39.9,116.4,42.8z M212.3,96.4l-14.6-14.6l-23.6,23.6l-23.6-23.6l-14.6,14.6l23.6,23.6l-23.6,23.6l14.6,14.6l23.6-23.6l23.6,23.6l-14.6,14.6-23.6-23.6L212.3,96.4z"/>
</svg>`;

const loadingIcon = `<svg width="50" height="50" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_l9ve{animation:spinner_rcyq 1.2s cubic-bezier(0.52,.6,.25,.99) infinite}.spinner_cMYp{animation-delay:.4s}.spinner_gHR3{animation-delay:.8s}@keyframes spinner_rcyq{0%{transform:translate(12px,12px) scale(0);opacity:1}100%{transform:translate(0,0) scale(1);opacity:0}}</style><path class="spinner_l9ve" fill="white" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z" transform="translate(12, 12) scale(0)"/><path class="spinner_l9ve spinner_cMYp" fill="white" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z" transform="translate(12, 12) scale(0)"/><path class="spinner_l9ve spinner_gHR3" fill="white" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z" transform="translate(12, 12) scale(0)"/></svg>`;

const pipIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 5.125V9.125H22V4.155C22 3.58616 21.5389 3.125 20.97 3.125H2.03C1.46116 3.125 1 3.58613 1 4.155V17.095C1 17.6639 1.46119 18.125 2.03 18.125H12V16.125H3V5.125H20ZM14 11.875C14 11.3227 14.4477 10.875 15 10.875H22C22.5523 10.875 23 11.3227 23 11.875V17.875C23 18.4273 22.5523 18.875 22 18.875H15C14.4477 18.875 14 18.4273 14 17.875V11.875ZM6 12.375L7.79289 10.5821L5.29288 8.0821L6.7071 6.66788L9.20711 9.16789L11 7.375V12.375H6Z" fill="white"/>
</svg>`;

const playIconLg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="60" height="60"><path d="M62.8,199.5c-1,0.8-2.4,0.6-3.3-0.4c-0.4-0.5-0.6-1.1-0.5-1.8V42.6c-0.2-1.3,0.7-2.4,1.9-2.6c0.7-0.1,1.3,0.1,1.9,0.4l154.7,77.7c2.1,1.1,2.1,2.8,0,3.8L62.8,199.5z" fill="white"/></svg>`;

const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="20" height="20"><path fill="white" d="M62.8,199.5c-1,0.8-2.4,0.6-3.3-0.4c-0.4-0.5-0.6-1.1-0.5-1.8V42.6c-0.2-1.3,0.7-2.4,1.9-2.6c0.7-0.1,1.3,0.1,1.9,0.4l154.7,77.7c2.1,1.1,2.1,2.8,0,3.8L62.8,199.5z"/></svg>`;

const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="20" height="20"><path fill="white" d="M100,194.9c0.2,2.6-1.8,4.8-4.4,5c-0.2,0-0.4,0-0.6,0H65c-2.6,0.2-4.8-1.8-5-4.4c0-0.2,0-0.4,0-0.6V45c-0.2-2.6,1.8-4.8,4.4-5c0.2,0,0.4,0,0.6,0h30c2.6-0.2,4.8,1.8,5,4.4c0,0.2,0,0.4,0,0.6V194.9z M180,45.1c0.2-2.6-1.8-4.8-4.4-5c-0.2,0-0.4,0-0.6,0h-30c-2.6-0.2-4.8,1.8-5,4.4c0,0.2,0,0.4,0,0.6V195c-0.2,2.6,1.8,4.8,4.4,5c0.2,0,0.4,0,0.6,0h30c2.6,0.2,4.8-1.8,5-4.4c0-0.2,0-0.4,0-0.6V45.1z"/></svg>`;

const settingsIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="20" height="20"><path fill="white" d="M204,145l-25-14c0.8-3.6,1.2-7.3,1-11c0.2-3.7-0.2-7.4-1-11l25-14c2.2-1.6,3.1-4.5,2-7l-16-26c-1.2-2.1-3.8-2.9-6-2l-25,14c-6-4.2-12.3-7.9-19-11V35c0.2-2.6-1.8-4.8-4.4-5c-0.2,0-0.4,0-0.6,0h-30c-2.6-0.2-4.8,1.8-5,4.4c0,0.2,0,0.4,0,0.6v28c-6.7,3.1-13,6.7-19,11L56,60c-2.2-0.9-4.8-0.1-6,2L35,88c-1.6,2.2-1.3,5.3,0.9,6.9c0,0,0.1,0,0.1,0.1l25,14c-0.8,3.6-1.2,7.3-1,11c-0.2,3.7,0.2,7.4,1,11l-25,14c-2.2,1.6-3.1,4.5-2,7l16,26c1.2,2.1,3.8,2.9,6,2l25-14c5.7,4.6,12.2,8.3,19,11v28c-0.2,2.6,1.8,4.8,4.4,5c0.2,0,0.4,0,0.6,0h30c2.6,0.2,4.8-1.8,5-4.4c0-0.2,0-0.4,0-0.6v-28c7-2.3,13.5-6,19-11l25,14c2.5,1.3,5.6,0.4,7-2l15-26C206.7,149.4,206,146.7,204,145z M120,149.9c-16.5,0-30-13.4-30-30s13.4-30,30-30s30,13.4,30,30c0.3,16.3-12.6,29.7-28.9,30C120.7,149.9,120.4,149.9,120,149.9z"/></svg>`;

const fullScreenOnIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="20" height="20"><path d="M96.3,186.1c1.9,1.9,1.3,4-1.4,4.4l-50.6,8.4c-1.8,0.5-3.7-0.6-4.2-2.4c-0.2-0.6-0.2-1.2,0-1.7l8.4-50.6c0.4-2.7,2.4-3.4,4.4-1.4l14.5,14.5l28.2-28.2l14.3,14.3l-28.2,28.2L96.3,186.1z M195.8,39.1l-50.6,8.4c-2.7,0.4-3.4,2.4-1.4,4.4l14.5,14.5l-28.2,28.2l14.3,14.3l28.2-28.2l14.5,14.5c1.9,1.9,4,1.3,4.4-1.4l8.4-50.6c0.5-1.8-0.6-3.6-2.4-4.2C197,39,196.4,39,195.8,39.1L195.8,39.1z" fill="#fff"/></svg>`;

const fullScreenOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="20" height="20"><path d="M109.2,134.9l-8.4,50.1c-0.4,2.7-2.4,3.3-4.4,1.4L82,172l-27.9,27.9l-14.2-14.2l27.9-27.9l-14.4-14.4c-1.9-1.9-1.3-3.9,1.4-4.4l50.1-8.4c1.8-0.5,3.6,0.6,4.1,2.4C109.4,133.7,109.4,134.3,109.2,134.9L109.2,134.9z M172.1,82.1L200,54.2L185.8,40l-27.9,27.9l-14.4-14.4c-1.9-1.9-3.9-1.3-4.4,1.4l-8.4,50.1c-0.5,1.8,0.6,3.6,2.4,4.1c0.5,0.2,1.2,0.2,1.7,0l50.1-8.4c2.7-0.4,3.3-2.4,1.4-4.4L172.1,82.1z" fill="#fff"/></svg>`;

const logo = `<p style="display: flex; gap: 7px; align-items: center; background-color: rgba(20, 20, 20, 0.7); backdrop-filter: blur(4px); padding: 5px 8px; border-radius: 6px; margin: 0; font-family: sans-serif;">
    <span style="font-size: 14px; font-weight: bold; color: hsl(var(--primary));">
        Aonime
    </span>
</p>`;

// ─── Inline Settings Submenu Icons ──────────────────────────────────────────

const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

const sizeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>`;

const colorIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35824 19.5085 5.25301 20.3541 4.70777 20.812C4.19502 21.2426 3.53504 21.4922 2.82772 21.4922C2.4936 21.4922 2.17646 21.3653 1.93333 21.1448C1.52044 20.7692 1 20.0898 1 19C1 14.5 4.5 11 9 11C10.1046 11 11 10.1046 11 9C11 7.89543 11.8954 7 13 7C14.1046 7 15 7.89543 15 9C15 10.1046 15.8954 11 17 11C18.1046 11 19 11.8954 19 13C19 14.1046 18.1046 15 17 15C15.8954 15 15 15.8954 15 17C15 18.1046 14.1046 19 13 19C12.4477 19 12 19.4477 12 20C12 20.5523 12.4477 21 13 21C13.5523 21 14 21.4477 14 22C14 22.5523 13.5523 23 13 23H12Z"/></svg>`;

const styleIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>`;

const captionsListIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><path d="M7 10h2v2H7zm0 4h10v2H7zm4-4h6v2h-6z"/></svg>`;

// Helper to rewrite any client-visible Cloudflare Worker proxy URLs to route through the local /api/proxy
function cleanProxyUrl(url: string | undefined): string {
    if (!url) return '';
    try {
        if (url.includes('?url=')) {
            const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
            const parsed = new URL(url, baseOrigin);
            const targetUrl = parsed.searchParams.get('url');
            if (targetUrl) {
                const referer = parsed.searchParams.get('referer') || '';
                return `/api/proxy?url=${encodeURIComponent(targetUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
            }
        }
    } catch (_) {}
    return url;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function VideoPlayer({ source, tracks, cfProxyUrl, skipData }: VideoPlayerProps) {
    const [playerUrl, setPlayerUrl] = useState<{ m3u8?: string; embed?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (source.proxyUrl) {
            setPlayerUrl({ m3u8: cleanProxyUrl(source.proxyUrl) });
        } else if (source.m3u8) {
            const qs = `?url=${encodeURIComponent(source.m3u8)}${source.referer ? `&referer=${encodeURIComponent(source.referer)}` : ''}`;
            setPlayerUrl({ m3u8: `/api/proxy${qs}` });
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
        return <HlsPlayer m3u8Url={playerUrl.m3u8} tracks={tracks} skipData={skipData} />;
    }

    if (playerUrl?.embed) {
        return (
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
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
        <div className="w-full aspect-video flex items-center justify-center bg-black text-white rounded-xl">
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

// ─── HLS Player (Artplayer-based) ───────────────────────────────────────────

function HlsPlayer({ m3u8Url, tracks, skipData }: { m3u8Url: string; tracks: Track[]; skipData?: SkipData }) {
    const artRef = useRef<HTMLDivElement>(null);
    const [artInstance, setArtInstance] = useState<Artplayer | null>(null);

    const tracksKey = JSON.stringify(tracks || []);

    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number>(
        tracks.length > 0 ? 0 : -1
    );
    const [subDelay, setSubDelay] = useState<number>(0);
    const [originalSubContents, setOriginalSubContents] = useState<Record<number, string>>({});
    const [processedTrackUrls, setProcessedTrackUrls] = useState<Record<number, string>>({});

    const [subConfig, setSubConfig] = useState({
        size: 1.0,
        color: '#ffffff',
        background: 'rgba(0, 0, 0, 0)',
        showOutline: true,
        showShadow: true,
    });

    // Refs to bypass stale closures in Artplayer settings click handlers
    const subDelayRef = useRef(subDelay);
    subDelayRef.current = subDelay;

    const subConfigRef = useRef(subConfig);
    subConfigRef.current = subConfig;

    const adjustDelay = (delta: number, reset = false) => {
        setSubDelay(current => {
            const next = reset ? 0 : Math.min(5, Math.max(-5, parseFloat((current + delta).toFixed(1))));
            return next;
        });
    };

    const selectedSubtitleIndexRef = useRef(selectedSubtitleIndex);
    selectedSubtitleIndexRef.current = selectedSubtitleIndex;

    const hlsRef = useRef<HLS | null>(null);
    const isDestroyedRef = useRef(false);
    const skipTargetTimeRef = useRef<number | null>(null);
    const skipDataRef = useRef(skipData);
    skipDataRef.current = skipData;

    // ── Setup Artplayer ──
    useEffect(() => {
        isDestroyedRef.current = false;
        if (!artRef.current) return;
        artRef.current.innerHTML = "";

        const playM3u8 = (video: HTMLVideoElement, url: string, art: any) => {
            if (isDestroyedRef.current) return;
            if (HLS.isSupported()) {
                if (hlsRef.current) hlsRef.current.destroy();
                const hls = new HLS({
                    debug: false,
                    startLevel: -1,
                    maxBufferLength: 20,
                    maxMaxBufferLength: 40,
                    maxBufferSize: 30 * 1000 * 1000,
                    startFragPrefetch: false,
                    abrBandWidthFactor: 0.8,
                    abrBandWidthUpFactor: 0.6,
                    enableWorker: false,
                    stretchShortVideoTrack: true,
                    xhrSetup: (xhr) => {
                        xhr.withCredentials = false;
                    },
                });
                hlsRef.current = hls;
                hls.loadSource(url);
                hls.attachMedia(video);
                art.hls = hls;

                // Load saved preferred quality height
                hls.on(HLS.Events.MANIFEST_PARSED, (_, data) => {
                    const savedHeight = Number(localStorage.getItem("preferred-quality-height") ?? "-1");
                    if (savedHeight > 0) {
                        const matched = data.levels.findIndex(l => l.height === savedHeight);
                        if (matched !== -1) {
                            hls.currentLevel = matched;
                        }
                    }
                });

                hls.on(HLS.Events.LEVEL_SWITCHED, (_, data) => {
                    if (data.level === -1) {
                        localStorage.removeItem('preferred-quality-height');
                    } else {
                        const height = hls.levels[data.level]?.height;
                        if (height) {
                            localStorage.setItem('preferred-quality-height', String(height));
                        }
                    }
                });

                art.on("destroy", () => {
                    if (hlsRef.current === hls) {
                        hls.destroy();
                        hlsRef.current = null;
                    }
                });
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = url;
            }
        };

        // Initialize Artplayer
        const art = new Artplayer({
            container: artRef.current,
            url: m3u8Url,
            type: "m3u8",
            customType: { m3u8: playM3u8 },
            autoplay: true,
            volume: 0.8,
            setting: true,
            playbackRate: true,
            pip: true,
            hotkey: true,
            fullscreen: true,
            mutex: true,
            playsInline: true,
            lock: true,
            airplay: true,
            aspectRatio: true,
            theme: "hsl(var(--primary))",
            moreVideoAttr: {
                crossOrigin: "anonymous",
                preload: "auto",
                playsInline: true,
            },
            icons: {
                play: playIcon,
                pause: pauseIcon,
                setting: settingsIcon,
                pip: pipIcon,
                state: playIconLg,
                loading: loadingIcon,
                fullscreenOn: fullScreenOnIcon,
                fullscreenOff: fullScreenOffIcon,
            },
            controls: [
                {
                    name: "volume-horizontal",
                    position: "left",
                    index: 15,
                    html: `
                        <div class="art-volume-horizontal" style="display: flex; align-items: center; gap: 4px; cursor: pointer; height: 100%; padding-inline: 4px;">
                            <div class="art-volume-horizontal-icon" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                                ${volumeIcon}
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05" 
                                value="0.8" 
                                class="art-volume-horizontal-slider" 
                                style="height: 4px; border-radius: 2px; outline: none; margin: 0; padding: 0; cursor: pointer;"
                            />
                        </div>
                    `,
                    mounted: function (element) {
                        const art = this;
                        const $el = element;
                        const $icon = $el.querySelector(".art-volume-horizontal-icon") as HTMLElement;
                        const $slider = $el.querySelector(".art-volume-horizontal-slider") as HTMLInputElement;

                        const updateSliderBackground = (val: number) => {
                            const pct = val * 100;
                            $slider.style.background = `linear-gradient(to right, hsl(var(--primary)) ${pct}%, rgba(255, 255, 255, 0.2) ${pct}%)`;
                        };

                        // Initial volume sync
                        $slider.value = String(art.volume);
                        updateSliderBackground(art.volume);

                        $slider.addEventListener("input", (e) => {
                            const val = parseFloat((e.target as HTMLInputElement).value);
                            art.volume = val;
                            art.muted = val === 0;
                            updateSliderBackground(val);
                        });

                        $icon.addEventListener("click", () => {
                            art.muted = !art.muted;
                        });

                        art.on("video:volumechange", () => {
                            const val = art.muted ? 0 : art.volume;
                            $slider.value = String(val);
                            updateSliderBackground(val);
                            if (art.muted || art.volume === 0) {
                                $icon.innerHTML = muteIcon;
                            } else {
                                $icon.innerHTML = volumeIcon;
                            }
                        });
                    }
                }
            ],
            plugins: [
                artplayerPluginHlsControl({
                    quality: {
                        setting: true,
                        getName: (level: any) => level.height + "p",
                        title: "Quality",
                        auto: "Auto",
                    },
                }),
            ],
            subtitle: {
                url: "",
                style: {
                    color: "#ffffff",
                    fontSize: "20px",
                },
                escape: false,
            },
            layers: [
                {
                    name: "watermark",
                    html: logo,
                    style: {
                        opacity: "0.8",
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        zIndex: "10",
                        transition: "opacity 0.5s ease-out",
                    },
                },
                {
                    name: "skipButton",
                    html: `
                        <button class="art-skip-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                            <span class="art-skip-btn-text">Skip Intro</span>
                        </button>
                    `,
                    style: {
                        position: "absolute",
                        bottom: "80px",
                        right: "24px",
                        zIndex: "20",
                    },
                    mounted: function(element) {
                        const art = this;
                        const $btn = element.querySelector('.art-skip-btn') as HTMLButtonElement;
                        if (!$btn) return;
                        
                        $btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (skipTargetTimeRef.current !== null) {
                                art.seek = skipTargetTimeRef.current;
                                $btn.classList.remove("show");
                            }
                        });
                    }
                }
            ],
        });



        // Lock screen orientation to landscape when in fullscreen mode on mobile devices
        art.on('fullscreen', async (state) => {
            if (state) {
                try {
                    const orientation = screen.orientation as any;
                    if (orientation && typeof orientation.lock === 'function') {
                        await orientation.lock('landscape');
                    }
                } catch (err) {
                    console.warn("Landscape orientation lock failed:", err);
                }
            } else {
                try {
                    const orientation = screen.orientation as any;
                    if (orientation && typeof orientation.unlock === 'function') {
                        orientation.unlock();
                    }
                } catch (err) {
                    console.warn("Screen orientation unlock failed:", err);
                }
            }
        });

        // Hide watermark after 3 seconds
        const timer = setTimeout(() => {
            const layer = art.layers.watermark;
            if (layer) layer.style.opacity = "0";
        }, 3000);

        // Timeupdate listener for Skip Intro / Outro button
        art.on("video:timeupdate", () => {
            const currentTime = art.currentTime;
            const skipButtonLayer = art.layers.skipButton;
            if (!skipButtonLayer) return;
            const $btn = skipButtonLayer.querySelector('.art-skip-btn') as HTMLButtonElement;
            const $btnText = skipButtonLayer.querySelector('.art-skip-btn-text') as HTMLElement;
            if (!$btn || !$btnText) return;

            let showBtn = false;
            let btnText = "";
            let targetTime: number | null = null;

            const currentSkipData = skipDataRef.current;
            if (currentSkipData) {
                const intro = currentSkipData.intro;
                const outro = currentSkipData.outro;

                if (intro && currentTime >= intro.start && currentTime <= intro.end) {
                    showBtn = true;
                    btnText = "Skip Intro";
                    targetTime = intro.end;
                } else if (outro && currentTime >= outro.start && currentTime <= outro.end) {
                    showBtn = true;
                    btnText = "Skip Outro";
                    targetTime = outro.end;
                }
            }

            if (showBtn && targetTime !== null) {
                skipTargetTimeRef.current = targetTime;
                $btnText.textContent = btnText;
                if (!$btn.classList.contains("show")) {
                    $btn.classList.add("show");
                }
            } else {
                skipTargetTimeRef.current = null;
                if ($btn.classList.contains("show")) {
                    $btn.classList.remove("show");
                }
            }
        });

        // Draw skip marker lines on progress bar track
        const drawSkipMarkers = () => {
            const duration = art.duration;
            const $progress = art.template.$progress;
            const currentSkipData = skipDataRef.current;
            if (!duration || !$progress || !currentSkipData) return;

            // Remove existing skip markers
            $progress.querySelectorAll('.art-skip-marker').forEach(el => el.remove());

            // Find visual track container (parent of the played progress bar)
            const $playedBar = $progress.querySelector('.art-progress-played');
            const $trackContainer = $playedBar ? $playedBar.parentElement : $progress;
            if (!$trackContainer) return;

            const createMarker = (start: number, end: number) => {
                const left = (start / duration) * 100;
                const width = ((end - start) / duration) * 100;

                const marker = document.createElement('div');
                marker.className = 'art-skip-marker';
                marker.style.left = `${left}%`;
                marker.style.width = `${width}%`;
                
                // Prepend to the visual track container so it aligns with height expansion
                $trackContainer.prepend(marker);
            };

            if (currentSkipData.intro) {
                createMarker(currentSkipData.intro.start, currentSkipData.intro.end);
            }
            if (currentSkipData.outro) {
                createMarker(currentSkipData.outro.start, currentSkipData.outro.end);
            }
        };

        // Draw initially if metadata is already loaded
        if (art.duration > 0) {
            drawSkipMarkers();
        }

        art.on('ready', () => {
            if (art.duration > 0) {
                drawSkipMarkers();
            }
        });
        art.on('video:loadedmetadata', drawSkipMarkers);
        art.on('video:durationchange', drawSkipMarkers);

        // Mobile Double Tap to Skip 5s Gesture (Left/Right side)
        let lastTouchTime = 0;
        let lastTouchX = 0;
        let lastTouchY = 0;

        const playerDom = art.template.$player;

        const showDoubleTapOverlay = (direction: 'forward' | 'backward') => {
            const overlay = document.createElement('div');
            overlay.className = `art-double-tap-overlay art-double-tap-${direction}`;
            
            const isFwd = direction === 'forward';
            overlay.innerHTML = `
                <div class="art-double-tap-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                    <div class="art-double-tap-icon" style="display: flex; gap: 2px;">
                        ${isFwd 
                            ? '<svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M6 18l8.5-6L6 6v12zm8.5 0L23 12l-8.5-6v12z"/></svg>' 
                            : '<svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M18 6l-8.5 6L18 18V6zm-8.5 0L1 12l8.5 6V6z"/></svg>'
                        }
                    </div>
                    <span style="color: white; font-weight: bold; font-size: 14px;">${isFwd ? '+5s' : '-5s'}</span>
                </div>
            `;

            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.bottom = '0';
            overlay.style.width = '35%';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '20';
            overlay.style.pointerEvents = 'none';
            overlay.style.background = 'rgba(255, 255, 255, 0.1)';
            overlay.style.backdropFilter = 'blur(2px)';
            overlay.style.borderRadius = isFwd ? '100% 0 0 100% / 50% 0 0 50%' : '0 100% 100% 0 / 0 50% 50% 0';
            
            if (isFwd) {
                overlay.style.right = '0';
            } else {
                overlay.style.left = '0';
            }

            overlay.animate([
                { opacity: 0, transform: isFwd ? 'scale(0.8) translateX(20px)' : 'scale(0.8) translateX(-20px)' },
                { opacity: 1, transform: 'scale(1) translateX(0)' },
                { opacity: 0, transform: isFwd ? 'scale(0.9) translateX(10px)' : 'scale(0.9) translateX(-10px)' }
            ], {
                duration: 500,
                easing: 'ease-out'
            });

            playerDom.appendChild(overlay);
            setTimeout(() => {
                overlay.remove();
            }, 500);
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;

            const target = e.target as HTMLElement;
            // Ignore touches on settings, controls, selectors, control bar, volume bar, etc.
            if (target.closest('.art-controls') || 
                target.closest('.art-settings') || 
                target.closest('.art-volume-panel') ||
                target.closest('.art-control')) {
                return;
            }

            const touch = e.touches[0];
            const now = Date.now();
            const timeDiff = now - lastTouchTime;
            const rect = playerDom.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            const width = rect.width;

            // Check if it is a double tap (within 300ms and close to the last touch position)
            const isDoubleTap = timeDiff < 300 && 
                                Math.abs(x - lastTouchX) < 50 && 
                                Math.abs(y - lastTouchY) < 50;

            if (isDoubleTap) {
                if (x < width * 0.35) {
                    e.preventDefault(); // Prevent play/pause toggle
                    art.seek = Math.max(0, art.currentTime - 5);
                    showDoubleTapOverlay('backward');
                } else if (x > width * 0.65) {
                    e.preventDefault(); // Prevent play/pause toggle
                    art.seek = Math.min(art.duration, art.currentTime + 5);
                    showDoubleTapOverlay('forward');
                }
            }

            lastTouchTime = now;
            lastTouchX = x;
            lastTouchY = y;
        };

        playerDom.addEventListener('touchstart', onTouchStart, { passive: false });

        setArtInstance(art);

        return () => {
            clearTimeout(timer);
            isDestroyedRef.current = true;
            if (playerDom) {
                playerDom.removeEventListener('touchstart', onTouchStart);
            }
            if (hlsRef.current) {
                try {
                    hlsRef.current.destroy();
                } catch (e) {
                    console.warn("HLS cleanup warning:", e);
                }
                hlsRef.current = null;
            }
            if (art) {
                try {
                    if (art.video) {
                        art.video.pause();
                        art.video.src = "";
                        art.video.load();
                    }
                } catch (e) {
                    console.warn("Artplayer cleanup warning:", e);
                }
                if (art.destroy) {
                    art.destroy(true);
                }
            }
        };
    }, [m3u8Url]);

    // ── Load/Save Subtitle Config ──
    useEffect(() => {
        const saved = localStorage.getItem("subtitle-config");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSubConfig(prev => ({
                    ...prev,
                    ...parsed
                }));
            } catch (e) {
                console.error("Failed to parse subtitle config", e);
            }
        }
    }, []);

    const updateSubConfig = (newConfig: Partial<typeof subConfig>) => {
        setSubConfig(prev => {
            const updated = { ...prev, ...newConfig };
            localStorage.setItem("subtitle-config", JSON.stringify(updated));
            return updated;
        });
    };

    // Global window functions for the subtitle size slider to avoid React re-render lags
    useEffect(() => {
        (window as any).updateArtSubtitleSizeDOM = (val: number) => {
            const playerEl = document.querySelector('.art-video-player') as HTMLElement;
            if (playerEl) {
                playerEl.style.setProperty('--subtitle-size-factor', String(val));
            }
        };

        (window as any).saveArtSubtitleSize = (val: number) => {
            const playerEl = document.querySelector('.art-video-player') as HTMLElement;
            if (playerEl) {
                playerEl.style.removeProperty('--subtitle-size-factor');
            }
            updateSubConfig({ size: val });
        };

        return () => {
            delete (window as any).updateArtSubtitleSizeDOM;
            delete (window as any).saveArtSubtitleSize;
        };
    }, [updateSubConfig]);

    // ── Inject/Sync subtitle styling into Artplayer ──
    useEffect(() => {
        const styleId = 'artplayer-subtitle-styles';
        let style = document.getElementById(styleId) as HTMLStyleElement;
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        const shadowOutline = subConfig.showOutline
            ? `-2px -2px 0 #000, 0px -2px 0 #000, 2px -2px 0 #000, 2px  0px 0 #000, 2px  2px 0 #000, 0px  2px 0 #000, -2px  2px 0 #000, -2px  0px 0 #000`
            : '';
        const shadowText = subConfig.showShadow
            ? `0px 4px 8px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,0.8)`
            : '';
        const combinedShadow = [shadowOutline, shadowText].filter(Boolean).join(', ') || 'none';

        style.textContent = `
            .art-subtitle {
                padding-inline: 0px !important;
                gap: 4px !important;
                font-family: "Outfit", "Inter", "Segoe UI", sans-serif !important;
                bottom: 30px !important;
            }
            .art-subtitle-line {
                min-width: fit-content;
                padding: 2px 8px !important;
                margin: 0px !important;
                border-radius: 4px !important;
                font-size: calc(var(--subtitle-font-size, 20px) * var(--subtitle-size-factor, ${subConfig.size})) !important;
                font-weight: 700 !important;
                line-height: 1.25 !important;
                color: ${subConfig.color} !important;
                background-color: ${subConfig.background} !important;
                text-shadow: ${combinedShadow} !important;
                text-align: center !important;
            }
            .art-subtitle-line:empty {
                display: none !important;
            }
            /* Custom styling for subtitle size range input */
            .art-subtitle-size-slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                border: none;
                transition: transform 0.1s ease;
            }
            .art-subtitle-size-slider-input::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }
            .art-subtitle-size-slider-input::-moz-range-thumb {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                border: none;
                transition: transform 0.1s ease;
            }
            .art-subtitle-size-slider-input::-moz-range-thumb:hover {
                transform: scale(1.2);
            }
            .art-volume-panel {
                padding-bottom: 20px !important;
            }
            .art-settings {
                margin-bottom: 20px !important;
                max-width: calc(100% - 20px) !important;
                max-height: calc(100% - 70px) !important;
                overflow-y: auto !important;
                scrollbar-width: thin;
            }
            .art-setting-panel {
                max-height: 100% !important;
                overflow-y: auto !important;
            }
            @media screen and (max-width: 640px) {
                .art-settings {
                    width: 220px !important;
                    max-width: calc(100% - 20px) !important;
                }
                .art-setting-item, .art-setting-header {
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    min-height: 36px !important;
                }
                .art-subtitle-size-container {
                    padding: 8px 12px !important;
                    min-width: 150px !important;
                }
            }
            /* Hide the default vertical volume panel */
            .art-control-volume {
                display: none !important;
            }
            /* Match seekbar/settings accent to theme primary HSL */
            .art-progress-played {
                background: hsl(var(--primary)) !important;
                z-index: 10 !important;
            }
            .art-slider-bar {
                background: hsl(var(--primary)) !important;
                z-index: 10 !important;
            }
            .art-setting-toggle input:checked + i {
                background: hsl(var(--primary)) !important;
            }
            /* Style custom horizontal volume slider range input */
            .art-volume-horizontal-slider {
                -webkit-appearance: none;
                width: 0px !important;
                opacity: 0 !important;
                visibility: hidden !important;
                transition: width 0.2s ease, opacity 0.2s ease, visibility 0.2s !important;
                background: rgba(255, 255, 255, 0.2);
            }
            .art-volume-horizontal:hover .art-volume-horizontal-slider {
                width: 60px !important;
                opacity: 1 !important;
                visibility: visible !important;
                margin-left: 6px !important;
                margin-right: 6px !important;
            }
            .art-volume-horizontal-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                border: none;
                transition: transform 0.1s ease;
            }
            .art-volume-horizontal-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }
            .art-volume-horizontal-slider::-moz-range-thumb {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: white;
                cursor: pointer;
                border: none;
                transition: transform 0.1s ease;
            }
            .art-volume-horizontal-slider::-moz-range-thumb:hover {
                transform: scale(1.2);
            }
            :root {
                --subtitle-font-size: clamp(14px, 3.5vw, 22px);
            }
            .art-fullscreen, :fullscreen {
                --subtitle-font-size: clamp(20px, 3.5vw, 36px) !important;
            }
            @media screen and (max-width: 370px) {
                .art-progress {
                    padding-bottom: 5px !important;
                }
                .art-controls-left .art-control {
                    justify-content: flex-start !important;
                }
                .art-controls-right .art-control {
                    justify-content: flex-end !important;
                }
                .art-controls-right .art-control svg {
                    width: 22px;
                    height: 22px;
                }
                .art-controls-left .art-control svg {
                    width: 22px;
                    height: 22px;
                }
                .art-state .art-icon svg {
                    width: 50px;
                    height: 50px;
                }
            }
            @media screen and (max-width: 350px) {
                .art-controls-right .art-control svg {
                    width: 20px;
                    height: 20px;
                }
                .art-controls-left .art-control svg {
                    width: 20px;
                    height: 20px;
                }
            }
            .art-skip-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(15, 15, 15, 0.8) !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                color: #ffffff !important;
                padding: 10px 18px !important;
                font-family: "Outfit", "Inter", sans-serif !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px) scale(0.95);
                pointer-events: none;
            }
            .art-skip-btn.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }
            .art-skip-btn:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                border-color: hsl(var(--primary)) !important;
                box-shadow: 0 0 15px hsl(var(--primary) / 0.5) !important;
                transform: translateY(-2px) scale(1.02) !important;
            }
            .art-skip-btn:active {
                transform: translateY(0) scale(0.98) !important;
            }
            .art-skip-btn svg {
                stroke: currentColor;
                fill: currentColor;
            }
            @media screen and (max-width: 640px) {
                .art-layer-skipButton {
                    bottom: 60px !important;
                    right: 16px !important;
                }
                .art-skip-btn {
                    padding: 8px 14px !important;
                    font-size: 12px !important;
                }
                .art-skip-btn svg {
                    width: 14px !important;
                    height: 14px !important;
                }
            }
            .art-skip-marker {
                position: absolute !important;
                height: 100% !important;
                top: 0 !important;
                background: #facc15 !important;
                opacity: 0.85 !important;
                pointer-events: none !important;
                z-index: 20 !important;
                border-radius: 2px !important;
            }
        `;
    }, [subConfig]);

    // ── Update Artplayer subtitles settings menus dynamically when tracks/subConfig/subDelay change ──
    useEffect(() => {
        if (!artInstance) return;

        // Remove all first to ensure clean state and correct ordering
        try {
            artInstance.setting.remove("subtitles-list");
            artInstance.setting.remove("subtitle-sync");
            artInstance.setting.remove("subtitle-size");
            artInstance.setting.remove("subtitle-color");
            artInstance.setting.remove("subtitle-style");
        } catch (e) {}

        if (tracks.length > 0) {
            // 1. Subtitles list
            const tooltipVal = selectedSubtitleIndex >= 0 && tracks[selectedSubtitleIndex]
                ? (tracks[selectedSubtitleIndex].label || "default")
                : "Off";

            artInstance.setting.add({
                name: "subtitles-list",
                html: "Subtitles",
                icon: captionsListIcon,
                position: "right",
                tooltip: tooltipVal,
                selector: [
                    {
                        html: "Off",
                        default: selectedSubtitleIndex === -1,
                        onClick: () => {
                            setSelectedSubtitleIndex(-1);
                        }
                    },
                    ...tracks.map((track, i) => ({
                        html: track.label || `Track ${i + 1}`,
                        default: selectedSubtitleIndex === i,
                        onClick: () => {
                            setSelectedSubtitleIndex(i);
                        }
                    }))
                ]
            });

            // 2. Subtitle Sync
            const delayVal = subDelay || 0;
            artInstance.setting.add({
                name: "subtitle-sync",
                html: "Subtitle Sync",
                icon: clockIcon,
                position: "right",
                tooltip: delayVal === 0 ? "Synced" : `${delayVal > 0 ? '+' : ''}${delayVal.toFixed(1)}s`,
                selector: [
                    { html: "-1.0s", onClick: () => adjustDelay(-1.0) },
                    { html: "-0.5s", onClick: () => adjustDelay(-0.5) },
                    { html: "-0.1s", onClick: () => adjustDelay(-0.1) },
                    { html: "Synced (0.0s)", onClick: () => adjustDelay(0, true) },
                    { html: "+0.1s", onClick: () => adjustDelay(0.1) },
                    { html: "+0.5s", onClick: () => adjustDelay(0.5) },
                    { html: "+1.0s", onClick: () => adjustDelay(1.0) },
                ]
            });

            // 3. Subtitle Size
            const sizeVal = subConfig.size || 1.0;
            const sizePct = Math.min(100, Math.max(0, ((sizeVal - 0.5) / 2.0) * 100));
            const sliderBg = `linear-gradient(to right, hsl(var(--primary)) ${sizePct}%, rgba(255, 255, 255, 0.2) ${sizePct}%)`;

            artInstance.setting.add({
                name: "subtitle-size",
                html: "Subtitle Size",
                icon: sizeIcon,
                position: "right",
                tooltip: `${Math.round(sizeVal * 100)}%`,
                selector: [
                    {
                        html: `
                            <div class="art-subtitle-size-container" style="display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; min-width: 170px; cursor: default;" onclick="event.stopPropagation();" onmousedown="event.stopPropagation();">
                                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: white;">
                                    <span>Scale</span>
                                    <span class="art-subtitle-size-lbl">${Math.round(sizeVal * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="2.5" 
                                    step="0.05" 
                                    value="${sizeVal}" 
                                    class="art-subtitle-size-slider-input" 
                                    style="width: 100%; height: 4px; border-radius: 2px; -webkit-appearance: none; outline: none; background: ${sliderBg}; cursor: pointer;"
                                    oninput="const val = parseFloat(this.value); const pct = Math.min(100, Math.max(0, ((val - 0.5) / 2.0) * 100)); this.style.background = 'linear-gradient(to right, hsl(var(--primary)) ' + pct + '%, rgba(255, 255, 255, 0.2) ' + pct + '%)'; this.parentNode.querySelector('.art-subtitle-size-lbl').textContent = Math.round(val * 100) + '%'; window.updateArtSubtitleSizeDOM(val);"
                                    onchange="window.saveArtSubtitleSize(parseFloat(this.value));"
                                    onclick="event.stopPropagation();"
                                    onmousedown="event.stopPropagation();"
                                />
                            </div>
                        `,
                    },
                    { html: "75%", default: sizeVal === 0.75, onClick: () => updateSubConfig({ size: 0.75 }) },
                    { html: "100%", default: sizeVal === 1.0, onClick: () => updateSubConfig({ size: 1.0 }) },
                    { html: "125%", default: sizeVal === 1.25, onClick: () => updateSubConfig({ size: 1.25 }) },
                    { html: "150%", default: sizeVal === 1.5, onClick: () => updateSubConfig({ size: 1.5 }) },
                    { html: "200%", default: sizeVal === 2.0, onClick: () => updateSubConfig({ size: 2.0 }) },
                ]
            });

            // 4. Subtitle Color
            const colorVal = subConfig.color || '#ffffff';
            const getColorName = (c: string) => {
                if (c === '#ffffff') return 'White';
                if (c === '#ffff00') return 'Yellow';
                if (c === '#00ffff') return 'Cyan';
                if (c === '#00ff00') return 'Green';
                return 'Custom';
            };
            artInstance.setting.add({
                name: "subtitle-color",
                html: "Subtitle Color",
                icon: colorIcon,
                position: "right",
                tooltip: getColorName(colorVal),
                selector: [
                    { html: "White", onClick: () => updateSubConfig({ color: '#ffffff' }) },
                    { html: "Yellow", onClick: () => updateSubConfig({ color: '#ffff00' }) },
                    { html: "Cyan", onClick: () => updateSubConfig({ color: '#00ffff' }) },
                    { html: "Green", onClick: () => updateSubConfig({ color: '#00ff00' }) },
                ]
            });

            // 5. Subtitle Style
            const showOutline = subConfig.showOutline !== false;
            const showShadow = subConfig.showShadow !== false;
            artInstance.setting.add({
                name: "subtitle-style",
                html: "Subtitle Style",
                icon: styleIcon,
                position: "right",
                tooltip: `O:${showOutline ? 'ON' : 'OFF'} S:${showShadow ? 'ON' : 'OFF'}`,
                selector: [
                    {
                        html: `Outline: ${showOutline ? 'ON' : 'OFF'}`,
                        onClick: () => {
                            updateSubConfig({ showOutline: !showOutline });
                        }
                    },
                    {
                        html: `Shadow: ${showShadow ? 'ON' : 'OFF'}`,
                        onClick: () => {
                            updateSubConfig({ showShadow: !showShadow });
                        }
                    },
                    {
                        html: `Background: ${subConfig.background !== 'rgba(0,0,0,0)' ? 'Ghost' : 'None'}`,
                        onClick: () => {
                            updateSubConfig({
                                background: subConfig.background === 'rgba(0,0,0,0)'
                                    ? 'rgba(0,0,0,0.5)'
                                    : 'rgba(0,0,0,0)'
                            });
                        }
                    }
                ]
            });
        }
    }, [tracksKey, artInstance, selectedSubtitleIndex, tracks, subConfig, subDelay]);



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
            if (artInstance) {
                artInstance.subtitle.show = false;
            }
            return;
        }

        const index = selectedSubtitleIndex;
        const track = tracks[index];
        const url = cleanProxyUrl(track.proxyUrl || track.file);
        if (!url) return;

        if (!originalSubContents[index]) {
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
                });
        }
    }, [selectedSubtitleIndex, tracksKey, originalSubContents, artInstance, tracks]);

    // ── Apply timing shift to WebVTT content and load into Artplayer ──
    useEffect(() => {
        if (selectedSubtitleIndex < 0) {
            if (artInstance) {
                artInstance.subtitle.show = false;
            }
            return;
        }

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

            if (artInstance) {
                artInstance.subtitle.show = true;
                artInstance.subtitle.switch(newUrl, {
                    name: tracks[selectedSubtitleIndex].label || `Track ${selectedSubtitleIndex + 1}`,
                    type: 'vtt',
                });
            }
        } catch (err) {
            console.error("Error processing subtitle shift:", err);
        }
    }, [selectedSubtitleIndex, subDelay, originalSubContents, artInstance, tracks]);

    // Reset subtitle states when URL/episode changes
    useEffect(() => {
        setSelectedSubtitleIndex(tracks.length > 0 ? 0 : -1);
        setSubDelay(0);
        setOriginalSubContents({});
        skipTargetTimeRef.current = null;
        setProcessedTrackUrls(prev => {
            Object.values(prev).forEach(url => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
            return {};
        });
    }, [m3u8Url, tracksKey]);



    return (
        <div className="w-full flex flex-col">
            <div className="w-full aspect-video bg-black relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <div ref={artRef} className="w-full h-full" />
            </div>
        </div>
    );
}
