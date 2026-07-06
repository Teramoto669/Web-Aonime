"use client";

import React, { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Clock, Calendar } from "lucide-react";
import type { AnimeTooltipData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

// Session-based in-memory cache to prevent redundant API calls
const tooltipCache = new Map<string, AnimeTooltipData>();
const tooltipPromises = new Map<string, Promise<AnimeTooltipData>>();

function prefetchTooltip(id: string): Promise<AnimeTooltipData> {
  if (tooltipCache.has(id)) {
    return Promise.resolve(tooltipCache.get(id)!);
  }
  if (tooltipPromises.has(id)) {
    return tooltipPromises.get(id)!;
  }

  const promise = fetch(`/api/anime/tooltip/${id}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    })
    .then((json) => {
      if (json.ok && json.data) {
        tooltipCache.set(id, json.data);
        return json.data;
      }
      throw new Error(json.message || "Failed to load data");
    });

  tooltipPromises.set(id, promise);
  return promise;
}

interface AnimeTooltipProps {
  id?: string;
  fallbackTitle: string;
  children: React.ReactNode;
}

export function AnimeTooltip({ id, fallbackTitle, children }: AnimeTooltipProps) {
  const [open, setOpen] = useState(false);
  const prefetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isHoveredRef = React.useRef(false);
  const isScrollingRef = React.useRef(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        // When scrolling stops, if the mouse is no longer hovering this card, close the tooltip
        if (!isHoveredRef.current) {
          setOpen(false);
        }
      }, 150); // 150ms after scroll stops
    };

    // Capture scroll events from any container on the page (like carousels)
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // If there's no ID, we fall back to a simple, title-only tooltip
  if (!id) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent
            side="right"
            align="start"
            sideOffset={10}
            className="bg-card text-foreground border-border px-3 py-1.5 text-xs shadow-md rounded"
          >
            <p className="font-semibold">{fallbackTitle}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handlePointerEnter = () => {
    isHoveredRef.current = true;
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchTooltip(id);
    }, 60); // 60ms debounce to prevent spamming on fast swipes
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Defer closing slightly to let scroll events register and update isScrollingRef
      setTimeout(() => {
        // If user moved mouse back onto the trigger card, don't close it
        if (isHoveredRef.current) {
          return;
        }
        const isLoaded = tooltipCache.has(id);
        // If data is loaded and we are currently scrolling, keep it open
        if (isLoaded && isScrollingRef.current) {
          return;
        }
        setOpen(false);
      }, 50);
      return;
    }
    setOpen(nextOpen);
  };

  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger
          asChild
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {children}
        </TooltipTrigger>
        {open && (
          <TooltipContent
            side="right"
            align="start"
            sideOffset={10}
            className="w-80 p-4 border-border bg-card/95 backdrop-blur-md text-foreground shadow-2xl rounded-lg animate-in fade-in-50 duration-200 z-[100]"
          >
            <AnimeTooltipDetail id={id} fallbackTitle={fallbackTitle} />
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function AnimeTooltipDetail({ id, fallbackTitle }: { id: string; fallbackTitle: string }) {
  const [data, setData] = useState<AnimeTooltipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    prefetchTooltip(id)
      .then((tooltipData) => {
        if (active) {
          setData(tooltipData);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading anime tooltip:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <TooltipSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-2">
        <h4 className="font-bold text-sm text-white">{fallbackTitle}</h4>
        <p className="text-xs text-destructive">Failed to load preview details.</p>
      </div>
    );
  }

  const subCount = Number(data.episodes?.sub) || 0;
  const dubCount = Number(data.episodes?.dub) || 0;
  const totalEpisodes = Number(data.episodes?.total) || 0;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-bold text-sm text-white leading-tight line-clamp-2" title={data.title}>
          {data.title}
        </h4>
        {data.titleJp && data.titleJp !== data.title && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5" title={data.titleJp}>
            {data.titleJp}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {data.score && data.score !== "?" && (
          <div className="flex items-center gap-1 font-bold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
            <Star className="w-3 h-3 fill-current" />
            <span>{data.score}</span>
          </div>
        )}
        {data.quality && (
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5 font-semibold text-[10px] py-0 px-1.5">
            {data.quality}
          </Badge>
        )}
        {data.rating && data.rating !== "?" && (
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
            {data.rating}
          </Badge>
        )}
      </div>

      {data.synopsis && (
        <p className="text-xs text-muted-foreground/90 leading-normal line-clamp-4">
          {data.synopsis}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-border/60 pt-3">
        {data.status && (
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Status</span>
            <span className="font-medium text-white">{data.status}</span>
          </div>
        )}
        {data.duration && data.duration !== "?" && data.duration !== "? min" && (
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Duration</span>
            <span className="font-medium text-white flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground" /> {data.duration}
            </span>
          </div>
        )}
        {data.year && data.year !== "?" && (
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Year</span>
            <span className="font-medium text-white flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" /> {data.year}
            </span>
          </div>
        )}
        {(subCount > 0 || dubCount > 0 || totalEpisodes > 0) && (
          <div className="space-y-0.5 col-span-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Episodes</span>
            <div className="flex gap-3 font-medium text-white">
              {subCount > 0 && <span className="text-muted-foreground">SUB: <strong className="text-white">{subCount}</strong></span>}
              {dubCount > 0 && <span className="text-muted-foreground">DUB: <strong className="text-white">{dubCount}</strong></span>}
              {totalEpisodes > 0 && <span className="text-muted-foreground">Total: <strong className="text-white">{totalEpisodes}</strong></span>}
            </div>
          </div>
        )}
      </div>

      {data.genres && data.genres.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1.5">
          {data.genres.slice(0, 4).map((genre) => (
            <Badge
              key={genre}
              variant="outline"
              className="text-[9px] py-0 px-1 border-muted-foreground/20 text-muted-foreground bg-muted-foreground/5"
            >
              {genre}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function TooltipSkeleton() {
  return (
    <div className="space-y-3.5 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 bg-muted/65" />
        <Skeleton className="h-3 w-1/2 bg-muted/65" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12 bg-muted/65" />
        <Skeleton className="h-5 w-10 bg-muted/65" />
        <Skeleton className="h-5 w-16 bg-muted/65" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full bg-muted/65" />
        <Skeleton className="h-3 w-full bg-muted/65" />
        <Skeleton className="h-3 w-5/6 bg-muted/65" />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
        <div className="space-y-1">
          <Skeleton className="h-2 w-10 bg-muted/65" />
          <Skeleton className="h-3 w-16 bg-muted/65" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-2 w-10 bg-muted/65" />
          <Skeleton className="h-3 w-16 bg-muted/65" />
        </div>
      </div>
    </div>
  );
}
