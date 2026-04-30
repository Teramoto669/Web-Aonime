"use client";

import { useState, useMemo } from "react";
import type { Episode } from "@/lib/types";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Mic2, Subtitles, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EpisodeListClientProps = {
  animeId: string;
  episodes: Episode[];
  totalEpisodes: number;
  currentEpisode?: string;
  hideIcons?: boolean;
  initialRange?: string;
};

export function EpisodeListClient({
  animeId,
  episodes,
  totalEpisodes,
  currentEpisode,
  hideIcons,
  initialRange,
}: EpisodeListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRange, setSelectedRange] = useState<string>(initialRange || "1-50");

  // Filter episodes based on search query and range
  const filteredEpisodes = useMemo(() => {
    let result = episodes;

    // Apply search filter first (search across all episodes)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((ep) => {
        const epNumStr = ep.number.toString();
        const title = ep.title?.toLowerCase() || "";
        return epNumStr.includes(query) || title.includes(query);
      });
    } else {
      // Only apply range filter if no search query
      if (selectedRange) {
        const [start, end] = selectedRange.split("-").map(Number);
        result = result.filter((ep) => {
          const epNum = parseInt(ep.number);
          return epNum >= start && epNum <= end;
        });
      }
    }

    return result;
  }, [episodes, searchQuery, selectedRange]);

  const handleClearFilters = () => {
    setSearchQuery("");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Episodes ({totalEpisodes})</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Search and Range Controls */}
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex gap-3 items-end">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by episode number or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Episode Range */}
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Episode Range
            </label>
            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All Episodes" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {Array.from({ length: Math.ceil(totalEpisodes / 50) }, (_, i) => {
                  const rangeStart = i * 50 + 1;
                  const rangeEnd = Math.min((i + 1) * 50, totalEpisodes);
                  return (
                    <SelectItem key={`range-${i}`} value={`${rangeStart}-${rangeEnd}`}>
                      EP {rangeStart}-{rangeEnd}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="text-xs text-muted-foreground pt-2">
            Showing {filteredEpisodes.length} of {episodes.length} episodes
          </div>
        )}
      </div>

      {/* Episodes List */}
      {filteredEpisodes.length > 0 ? (
        <ScrollArea className="h-96 rounded-md border">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 p-4">
            {filteredEpisodes.map((ep) => (
              <Button
                key={ep.token ?? ep.number}
                asChild
                variant={currentEpisode === ep.number ? "default" : "outline"}
                className={cn("justify-start h-auto py-2 flex flex-col items-start")}
                title={ep.title || `Episode ${ep.number}`}
              >
                <Link href={`/watch/${animeId}?num=${ep.number}&range=${selectedRange}`}>
                  <div className="flex items-center gap-1 w-full">
                    <span className="font-semibold">EP {ep.number}</span>
                    {!hideIcons && (
                      <div className="flex gap-1 ml-auto">
                        {ep.has_sub && (
                          <span title="Subtitled">
                            <Subtitles className="w-3 h-3 text-blue-400" />
                          </span>
                        )}
                        {ep.has_dub && (
                          <span title="Dubbed">
                            <Mic2 className="w-3 h-3 text-green-400" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {ep.title && ep.title !== `Episode ${ep.number}` && (
                    <span className="text-xs text-muted-foreground line-clamp-1 w-full">
                      {ep.title}
                    </span>
                  )}
                </Link>
              </Button>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <p>No episodes found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
