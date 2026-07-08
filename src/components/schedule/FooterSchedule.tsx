"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAnimeSlug } from "@/lib/types";
import type { ScheduleDay, ScheduleAnimeItem } from "@/lib/types";
import { Clock, Play, Calendar, AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const TIMEZONES = [
  { value: "-12", label: "GMT-12" },
  { value: "-11", label: "GMT-11" },
  { value: "-10", label: "GMT-10" },
  { value: "-9", label: "GMT-9" },
  { value: "-8", label: "GMT-8" },
  { value: "-7", label: "GMT-7" },
  { value: "-6", label: "GMT-6" },
  { value: "-5", label: "GMT-5" },
  { value: "-4", label: "GMT-4" },
  { value: "-3", label: "GMT-3" },
  { value: "-2", label: "GMT-2" },
  { value: "-1", label: "GMT-1" },
  { value: "0", label: "GMT+0 (UTC)" },
  { value: "1", label: "GMT+1" },
  { value: "2", label: "GMT+2" },
  { value: "3", label: "GMT+3" },
  { value: "4", label: "GMT+4" },
  { value: "5", label: "GMT+5" },
  { value: "6", label: "GMT+6" },
  { value: "7", label: "GMT+7" },
  { value: "8", label: "GMT+8" },
  { value: "9", label: "GMT+9" },
  { value: "10", label: "GMT+10" },
  { value: "11", label: "GMT+11" },
  { value: "12", label: "GMT+12" },
  { value: "13", label: "GMT+13" },
  { value: "14", label: "GMT+14" },
];

export function FooterSchedule() {
  const [tz, setTz] = useState<string>("0");
  const [activeTab, setActiveTab] = useState<string>("");
  const [scheduleData, setScheduleData] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Live clock updating every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: 7/5/2026 7:37:07 AM
      const formatted = now.toLocaleDateString("en-US") + " " + now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-detect browser timezone offset on mount
  useEffect(() => {
    try {
      const offsetHours = Math.round(new Date().getTimezoneOffset() / -60);
      if (offsetHours >= -12 && offsetHours <= 14) {
        setTz(String(offsetHours));
      }
    } catch (e) {
      console.error("Failed to detect timezone", e);
    }
  }, []);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTab) {
      const safeId = `schedule-tab-${activeTab.replace(/\s+/g, "-")}`;
      const activeEl = document.getElementById(safeId);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeTab]);

  // Fetch schedule whenever timezone changes
  useEffect(() => {
    let active = true;

    async function fetchSchedule() {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set("tz", tz);

        const res = await fetch(`/api/schedule?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load airing schedule (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (active) {
          if (json.ok && Array.isArray(json.data)) {
            setScheduleData(json.data);
            const daysInResponse = json.data.map((d: ScheduleDay) => d.day);
            if (!activeTab || !daysInResponse.includes(activeTab)) {
              if (json.data.length > 0) {
                setActiveTab(json.data[0].day);
              }
            }
          } else {
            throw new Error(json.message || "Invalid API response structure");
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || "An unexpected error occurred while loading the schedule.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchSchedule();

    return () => {
      active = false;
    };
  }, [tz]);

  // Navigate to previous day
  const handlePrevDay = () => {
    if (scheduleData.length === 0) return;
    const currentIndex = scheduleData.findIndex((day) => day.day === activeTab);
    const newIndex = (currentIndex - 1 + scheduleData.length) % scheduleData.length;
    setActiveTab(scheduleData[newIndex].day);
  };

  // Navigate to next day
  const handleNextDay = () => {
    if (scheduleData.length === 0) return;
    const currentIndex = scheduleData.findIndex((day) => day.day === activeTab);
    const newIndex = (currentIndex + 1) % scheduleData.length;
    setActiveTab(scheduleData[newIndex].day);
  };

  const activeDayData = scheduleData.find((day) => day.day === activeTab);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 mb-6 border-t border-border/40 text-left">
      {/* Title & Live Time indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-xl font-bold text-foreground">
            Estimated Schedule
          </h2>
          {currentTime && (
            <span className="text-sm text-muted-foreground/80">
              - Now: {currentTime}
            </span>
          )}
        </div>

        {/* Small timezone config */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium text-muted-foreground">
            TZ:
          </span>
          <Select value={tz} onValueChange={setTz}>
            <SelectTrigger className="w-[100px] h-8 bg-card/60 border-border/40 text-xs">
              <SelectValue placeholder="Timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {TIMEZONES.map((timezone) => (
                <SelectItem key={timezone.value} value={timezone.value} className="text-xs">
                  {timezone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Day Selector Navigation Row */}
      {loading && scheduleData.length === 0 ? (
        <div className="flex items-center justify-between gap-4 border-b border-border/20 pb-4 mb-4 select-none">
          <div className="h-10 w-10 rounded bg-muted/20 animate-pulse" />
          <div className="flex justify-center gap-6 overflow-x-auto scrollbar-hide py-1 flex-grow">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-10 w-16 bg-muted/20 animate-pulse rounded" />
            ))}
          </div>
          <div className="h-10 w-10 rounded bg-muted/20 animate-pulse" />
        </div>
      ) : scheduleData.length > 0 ? (
        <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4 select-none">
          <button
            onClick={handlePrevDay}
            className="p-1 hover:text-foreground text-muted-foreground/60 transition-colors duration-200"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="flex justify-start md:justify-center items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-hide flex-grow px-2">
            {scheduleData.map((day) => {
              const isActive = day.day === activeTab;
              const [dayOfWeek, month, dateStr] = day.day.split(" ");
              const formattedMonthDay = `${month.toUpperCase()} ${dateStr}`;

              return (
                <button
                  key={day.day}
                  id={`schedule-tab-${day.day.replace(/\s+/g, "-")}`}
                  onClick={() => setActiveTab(day.day)}
                  className={`flex flex-col items-center py-1 transition-all duration-300 relative min-w-[55px] ${
                    isActive
                      ? "text-foreground font-bold"
                      : "text-muted-foreground/50 hover:text-muted-foreground"
                  }`}
                >
                  <span className="text-[10px] tracking-wide mb-0.5">
                    {formattedMonthDay}
                  </span>
                  <span className="text-base font-extrabold uppercase">
                    {dayOfWeek}
                  </span>
                  
                  {/* Underline for active state */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextDay}
            className="p-1 hover:text-foreground text-muted-foreground/60 transition-colors duration-200"
            aria-label="Next day"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      ) : null}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive my-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Anime airing list container */}
      <div className="space-y-1 bg-card/10 rounded-lg overflow-hidden">
        {loading ? (
          // Skeletons during loading
          <div className="divide-y divide-border/10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="py-3.5 px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-grow">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-5 w-1/2 rounded" />
                </div>
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : activeDayData && activeDayData.animes.length > 0 ? (
          // Airing rows
          <div className="divide-y divide-border/10">
            {activeDayData.animes.map((anime: ScheduleAnimeItem) => {
              const animeSlug = getAnimeSlug(anime);
              return (
                <div
                  key={anime.id}
                  className="group py-3 px-4 flex items-center justify-between gap-4 hover:bg-secondary/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-grow">
                    {/* Time */}
                    <span className="text-sm sm:text-base font-semibold text-muted-foreground/80 w-12 flex-shrink-0">
                      {anime.date}
                    </span>
                    {/* Title */}
                    <Link
                      href={`/anime/${animeSlug}`}
                      className="text-sm sm:text-base font-medium text-foreground hover:text-primary transition-colors truncate"
                    >
                      {anime.title}
                    </Link>
                  </div>

                  {/* Episode pill button on right */}
                  <Link href={`/anime/${animeSlug}`} className="flex-shrink-0">
                    <button className="flex items-center gap-1 bg-secondary/30 hover:bg-primary border border-border/40 hover:border-transparent text-[11px] sm:text-xs py-1 px-3 sm:py-1.5 sm:px-4 rounded-full text-foreground group-hover:text-white transition-all duration-300">
                      <Play className="h-3 w-3 fill-current" />
                      <span>{anime.type}</span>
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          // No schedule found
          <div className="text-center py-12 text-muted-foreground/60 border border-dashed border-border/20 rounded-lg">
            <p className="text-sm">No episodes scheduled to air on this day.</p>
          </div>
        )}
      </div>
    </div>
  );
}
