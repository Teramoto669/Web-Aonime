"use server";

import { getEpisodeSource } from "@/lib/api";

export async function fetchVideoSource(linkId: string) {
    try {
        const response = await getEpisodeSource(linkId);
        let canEmbed = true;
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

        return { 
            success: true, 
            embedUrl: response.embed_url,
            canEmbed
        };
    } catch (error: any) {
        return { 
            success: false, 
            error: error.message || "Failed to fetch video source" 
        };
    }
}
