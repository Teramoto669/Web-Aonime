import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildMegaplayStreamUrl(
  anilistId?: string | number | null,
  episodeNum?: string | number | null,
  category: string = "sub"
) {
  const normalizedAnilistId = String(anilistId ?? "").trim();
  const normalizedEpisodeNum = String(episodeNum ?? "").trim();

  if (!normalizedAnilistId || !normalizedEpisodeNum) {
    return null;
  }

  const normalizedCategory = category === "dub" ? "dub" : "sub";

  return `https://megaplay.buzz/stream/ani/${encodeURIComponent(normalizedAnilistId)}/${encodeURIComponent(normalizedEpisodeNum)}/${normalizedCategory}`;
}
