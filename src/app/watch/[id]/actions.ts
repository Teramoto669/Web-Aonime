"use server";

import { getEpisodeSource } from "@/lib/api";

export async function fetchVideoSource(linkId: string) {
    try {
        const response = await getEpisodeSource(linkId);
        return { 
            success: true, 
            embedUrl: response.embed_url 
        };
    } catch (error: any) {
        return { 
            success: false, 
            error: error.message || "Failed to fetch video source" 
        };
    }
}
