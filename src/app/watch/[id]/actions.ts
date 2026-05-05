"use server";

import { getEpisodeSource } from "@/lib/api";
import { buildMegaplayStreamUrl } from "@/lib/utils";

type FetchVideoSourceOptions = {
    anilistId?: string;
    episodeNum?: string;
    category?: string;
};

async function probeUrl(url: string) {
    try {
        const res = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            redirect: 'follow',
            headers: {
                'Referer': 'https://megacloud.blog/',
                'Origin': 'https://megacloud.blog',
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });

        const body = await res.text().catch(() => '');
        const normalizedBody = body.toLowerCase();
        const looksLikeMegaplayError =
            res.status === 404 ||
            res.status === 410 ||
            normalizedBody.includes('oops! something went wrong') ||
            normalizedBody.includes('the page you\'re looking for doesn\'t exist or has been moved') ||
            normalizedBody.includes('error code: 404') ||
            normalizedBody.includes('error code: 410') ||
            normalizedBody.includes('we\'re sorry!') ||
            normalizedBody.includes('copyright violation');

        return {
            ok: res.ok && !looksLikeMegaplayError,
            status: res.status,
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
        };
    }
}

export async function fetchVideoSource(linkId: string, options: FetchVideoSourceOptions = {}) {
    const megaplayUrl = buildMegaplayStreamUrl(options.anilistId, options.episodeNum, options.category);

    if (!linkId) {
        if (megaplayUrl) {
            return {
                success: true,
                embedUrl: megaplayUrl,
                m3u8Url: null,
                canEmbed: true,
                animeKaiUrl: null,
                megaplayUrl: null,
                sources: [],
                tracks: [],
            };
        }

        return {
            success: false,
            error: "Missing link id for video source"
        };
    }

    try {
        const response = await getEpisodeSource(linkId);
        let canEmbed = true;
        let m3u8Url: string | null = null;

        // Check if there's an m3u8 source available
        if (response.sources && response.sources.length > 0) {
            const m3u8Source = response.sources.find(source => source.isM3U8);
            if (m3u8Source && m3u8Source.url) {
                m3u8Url = m3u8Source.url;
            }
        }

        if (response.embed_url) {
            try {
                // Do a lightweight HEAD request to check headers
                const headRes = await fetch(response.embed_url, { method: 'HEAD' });
                const xFrameOptions = headRes.headers.get('x-frame-options');
                const csp = headRes.headers.get('content-security-policy');
                
                if (xFrameOptions && (xFrameOptions.toUpperCase() === 'DENY' || xFrameOptions.toUpperCase() === 'SAMEORIGIN')) {
                    canEmbed = false;
                }
                if (csp && csp.toLowerCase().includes('frame-ancestors')) {
                    canEmbed = false;
                }
            } catch (e) {
                // If HEAD fails, assume it might still be embeddable
            }
        }

        // If m3u8 is available, use it (no need to check embeddability)
        if (m3u8Url) {
            return {
                success: true,
                embedUrl: m3u8Url,
                m3u8Url: m3u8Url,
                canEmbed: true,
                animeKaiUrl: response.embed_url || null,
                megaplayUrl: null,
                sources: response.sources,
                tracks: response.tracks,
                skip: response.skip,
            };
        }

        // Fallback: if no m3u8 and iframe can't embed, try megaplay
        if (response.embed_url && !canEmbed && megaplayUrl) {
            const megaplayProbe = await probeUrl(megaplayUrl);

            if (megaplayProbe.ok) {
                return {
                    success: true,
                    embedUrl: megaplayUrl,
                    m3u8Url: null,
                    canEmbed: true,
                    animeKaiUrl: response.embed_url,
                    megaplayUrl,
                    sources: response.sources,
                    tracks: response.tracks,
                    skip: response.skip,
                };
            }

            return {
                success: true,
                embedUrl: response.embed_url,
                m3u8Url: null,
                canEmbed: false,
                animeKaiUrl: response.embed_url,
                megaplayUrl: null,
                sources: response.sources,
                tracks: response.tracks,
                skip: response.skip,
            };
        }

        // Normal fallback: use embed_url if available
        return { 
            success: true, 
            embedUrl: response.embed_url,
            m3u8Url: m3u8Url,
            canEmbed,
            animeKaiUrl: response.embed_url || null,
            megaplayUrl: megaplayUrl || null,
            sources: response.sources,
            tracks: response.tracks,
            skip: response.skip,
        };
    } catch (error: any) {
        if (megaplayUrl) {
            const megaplayProbe = await probeUrl(megaplayUrl);

            if (megaplayProbe.ok) {
                return {
                    success: true,
                    embedUrl: megaplayUrl,
                    m3u8Url: null,
                    canEmbed: true,
                    animeKaiUrl: null,
                    megaplayUrl,
                    sources: [],
                    tracks: [],
                };
            }
        }

        return { 
            success: false, 
            error: error.message || "Failed to fetch video source" 
        };
    }
}
