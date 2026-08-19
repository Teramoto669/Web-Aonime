"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Star, Tv, Calendar, ShieldAlert, Eye, Settings } from "lucide-react";
import LibraryButton from "@/components/anime/LibraryButton";
import { RecommendationsSection } from "@/components/anime/RecommendationsSection";
import { EpisodeListClient } from "@/components/anime/EpisodeListClient";
import { RelatedSection } from "@/components/anime/RelatedSection";
import { CommentSection } from "@/components/anime/CommentSection";
import { useBlockedFilters } from "@/lib/blocked-filters-context";
import { cn } from "@/lib/utils";
import type { AnimeDetail, AnimeEpisodes, RelatedAnime, AnimeListItem } from "@/lib/types";

interface AnimeDetailClientProps {
  slug: string;
  detailsData: AnimeDetail;
  episodesData: AnimeEpisodes;
  relatedData: RelatedAnime[];
  recommendationsData: AnimeListItem[];
}

export function AnimeDetailClient({
  slug,
  detailsData,
  episodesData,
  relatedData,
  recommendationsData,
}: AnimeDetailClientProps) {
  const { isAnimeBlocked, getBlockedReason, openModal } = useBlockedFilters();
  const isBlocked = isAnimeBlocked(detailsData);
  const blockedReason = getBlockedReason(detailsData);
  const [revealed, setRevealed] = useState(false);

  const genresList = (detailsData.genres || []).map(
    (genre) => genre.charAt(0).toUpperCase() + genre.slice(1)
  );

  const statItems = [
    detailsData.malScore != null && {
      icon: Star,
      label: "Star Rating",
      value: detailsData.malScore.toFixed(2),
    },
    detailsData.rating && {
      icon: ShieldAlert,
      label: "Age Rating",
      value: detailsData.rating,
    },
    detailsData.type && { icon: Tv, label: "Type", value: detailsData.type },
    detailsData.aired && { icon: Calendar, label: "Aired", value: detailsData.aired },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  const isNotYetAired = detailsData.status?.toLowerCase().includes("not yet aired");
  const hasEpisodes = episodesData.episodes && episodesData.episodes.length > 0;

  return (
    <div className="space-y-12">
      {/* Blocked Filter Warning Banner */}
      {isBlocked && !revealed && (
        <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-destructive/20 rounded-lg text-destructive flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-destructive">
                Content Filter Warning
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                This anime matches your active Content Blocklist ({blockedReason}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={openModal}
              className="text-xs h-8 gap-1.5 border-destructive/40 hover:bg-destructive/10"
            >
              <Settings className="w-3.5 h-3.5" /> Adjust Filters
            </Button>
            <Button
              size="sm"
              onClick={() => setRevealed(true)}
              className="text-xs h-8 gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              <Eye className="w-3.5 h-3.5" /> View Anyway
            </Button>
          </div>
        </div>
      )}

      {/* Main Details Section */}
      <div className={`flex flex-col md:flex-row gap-8 ${isBlocked && !revealed ? "blur-md opacity-40 select-none pointer-events-none transition-all duration-300 transform-gpu [will-change:filter]" : ""}`}>
        <div className="w-full md:w-[240px] lg:w-[280px] xl:w-[320px] flex-shrink-0">
          <div className="relative aspect-[2/3] w-full">
            <Image
              src={detailsData.image || "/placeholder.jpg"}
              alt={detailsData.title ?? slug}
              fill
              className="rounded-lg object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-4xl font-black">{detailsData.title ?? slug}</h1>
            {detailsData.titleJp && detailsData.titleJp.trim() !== (detailsData.title || "").trim() && (
              <p className="text-base sm:text-lg text-muted-foreground font-medium mt-1">
                {detailsData.titleJp}
              </p>
            )}
          </div>
          {genresList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genresList.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
          {detailsData.synopsis && (
            <p className="text-muted-foreground">{detailsData.synopsis}</p>
          )}

          {statItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
              {statItems.map((item) => (
                <div key={item.label} className="flex items-center">
                  <item.icon className="w-5 h-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-6 flex flex-wrap gap-4 items-center">
            {!isNotYetAired && hasEpisodes && (
              <Button asChild size="lg" className="font-bold">
                <Link href={`/watch/${slug}`}>
                  <PlayCircle className="mr-2 h-5 w-5" /> Watch Now
                </Link>
              </Button>
            )}
            <LibraryButton
              animeId={detailsData.id || slug}
              title={detailsData.title || slug}
              image={detailsData.image || ""}
              type={detailsData.type || "TV"}
              slug={slug}
              className="h-11 px-5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className={cn("mt-10 space-y-10", isBlocked && !revealed ? "blur-md opacity-40 select-none pointer-events-none" : "")}>
        {episodesData.episodes.length > 0 && (
          <EpisodeListClient
            animeId={slug}
            episodes={episodesData.episodes}
            totalEpisodes={episodesData.episodes.length}
          />
        )}

        {relatedData && relatedData.length > 0 && (
          <RelatedSection related={relatedData} />
        )}

        {recommendationsData && recommendationsData.length > 0 && (
          <RecommendationsSection recommendations={recommendationsData} />
        )}

        <CommentSection animeId={slug} animeTitle={detailsData.title || slug} />
      </div>
    </div>
  );
}
