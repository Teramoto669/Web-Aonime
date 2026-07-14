"use client";

import { useState, useMemo } from "react";
import type { Episode } from "@/lib/types";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
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
  const defaultRange = useMemo(() => {
    if (currentEpisode) {
      const epNum = parseInt(currentEpisode);
      if (!isNaN(epNum)) {
        if (totalEpisodes <= 50) {
          return `1-${totalEpisodes}`;
        }
        const chunkIndex = Math.floor((epNum - 1) / 50);
        const start = chunkIndex * 50 + 1;
        const end = Math.min((chunkIndex + 1) * 50, totalEpisodes);
        if (start <= totalEpisodes && start >= 1) {
          return `${start}-${end}`;
        }
      }
    }
    return totalEpisodes > 50 ? "1-50" : `1-${totalEpisodes}`;
  }, [currentEpisode, totalEpisodes]);

  const [selectedRange, setSelectedRange] = useState<string>(initialRange || defaultRange);

  // Filter episodes based on search query and range
  const filteredEpisodes = useMemo(() => {
    let result = episodes;

    // Apply both search query and range filter
        return episodes.filter((ep) => {
            const epNumber = parseInt(ep.number);
        
            // 1. Range Filter Check (Must pass if selectedRange exists)
            const isInRange = selectedRange 
                ? (() => {
                    try {
                        const [start, end] = selectedRange.split("-").map(Number);
                        return epNumber >= start && epNumber <= end;
                    } catch (e) {
                        // Fallback if range format is invalid
                        return true; 
                    }
                })() 
                : true;

            if (!isInRange) return false;

            // 2. Search Query Check (Must pass if searchQuery exists)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const epNumStr = ep.number.toString();
                return epNumStr.includes(query);
            }
        
            // If no filters, only the range check matters (which passed above)
            return true;
        });
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
              placeholder="Search by episode number..."
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
                {/* Generate range options (1-50, 51-100, etc.) */}
                {Array.from({ length: Math.ceil(totalEpisodes / 50) }).map((_, i) => {
                  const start = i * 50 + 1;
                  const end = Math.min((i + 1) * 50, totalEpisodes);
                  const rangeValue = `${start}-${end}`;
                  return (
                    <SelectItem key={rangeValue} value={rangeValue}>
                      EP {start}-{end}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 5xl:grid-cols-6 gap-2 p-4">
            {filteredEpisodes.map((ep) => (
              <Button
                key={ep.id ?? ep.number}
                asChild
                variant={currentEpisode === ep.number ? "default" : "outline"}
                className={cn("justify-start h-auto py-2 flex flex-col items-start")}
                title={`Episode ${ep.number}`}
              >
                <Link href={`/watch/${animeId}?ep=${ep.number}&range=${selectedRange}`}>
                  <div className="flex items-center gap-1 w-full">
                    <span className="font-semibold">EP {ep.number}</span>
                    {!hideIcons && (
                      <div className="flex gap-1 ml-auto">
                        {ep.hasSub && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 leading-none">SUB</span>
                        )}
                        {ep.hasDub && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-500/20 text-green-400 leading-none">DUB</span>
                        )}
                      </div>
                    )}
                  </div>
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

