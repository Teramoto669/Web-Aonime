"use client";
import React, { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  writeBatch, 
  deleteDoc, 
  updateDoc,
  serverTimestamp,
  type Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCommentSettings, formatCooldown } from "@/lib/system-settings";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MessageSquare, 
  Trash2, 
  Loader2, 
  Lock, 
  AlertCircle, 
  Send,
  Sparkles,
  CornerDownRight,
  ThumbsUp,
  ThumbsDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface CommentSectionProps {
  animeId: string;
  episodeNum?: string;
  animeTitle?: string;
}

interface CommentType {
  id: string;
  animeId: string;
  episodeNum: string | null;
  targetId: string;
  userId: string;
  userName: string;
  userPhoto: string | null;
  userThemeColor?: string;
  content: string;
  createdAt: Timestamp | null;
  parentId?: string | null;
  parentUserName?: string | null;
  likesCount?: number;
  dislikesCount?: number;
  isEdited?: boolean;
  updatedAt?: Timestamp | null;
}

const getThemeTextClass = (theme?: string) => {
  switch (theme) {
    case "rose": return "text-rose-500 hover:text-rose-400";
    case "amber": return "text-amber-500 hover:text-amber-400";
    case "emerald": return "text-emerald-500 hover:text-emerald-400";
    case "indigo": return "text-indigo-500 hover:text-indigo-400";
    default: return "text-violet-500 hover:text-violet-400";
  }
};

// Safe React parser for bold (**), italic (*), underline (<u>), strikethrough (~~)
function renderFormattedText(text: string): React.ReactNode[] {
  const regex = /(\*\*.+?\*\*|\*.+?\*|<u>.+?<\/u>|~~.+?~~)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("<u>") && part.endsWith("</u>") && part.length > 7) {
      return <u key={index} className="underline">{part.slice(3, -4)}</u>;
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      return <del key={index} className="line-through opacity-75">{part.slice(2, -2)}</del>;
    }
    return <span key={index}>{part}</span>;
  });
}

// Discord-style Hover/Click Reveal Spoiler Block
function SpoilerBlock({ content }: { content: string }) {
  const [clicked, setClicked] = useState(false);

  return (
    <span
      onClick={() => setClicked(!clicked)}
      className={cn(
        "inline-block rounded-sm px-1.5 py-0.5 transition-all duration-150 cursor-pointer select-none align-baseline mx-0.5",
        clicked
          ? "bg-foreground/15 text-foreground border border-border/30"
          : "bg-foreground/85 text-transparent hover:bg-foreground/15 hover:text-foreground border border-transparent hover:border-border/30"
      )}
      title="Spoiler (hover or click to reveal)"
    >
      {renderFormattedText(content)}
    </span>
  );
}

// Comment Content Renderer (Parses formatting, spoilers, and GIFs)
function CommentContentRenderer({ content }: { content: string }) {
  const spoilerRegex = /(\|\|[\s\S]+?\|\||\[spoiler\][\s\S]+?\[\/spoiler\])/gi;
  const segments = content.split(spoilerRegex);

  return (
    <div className="space-y-1 text-sm text-foreground/90 leading-relaxed break-words">
      {segments.map((segment, idx) => {
        if (!segment) return null;

        if (
          (segment.startsWith("||") && segment.endsWith("||") && segment.length >= 4) ||
          (segment.startsWith("[spoiler]") && segment.endsWith("[/spoiler]") && segment.length >= 19)
        ) {
          const rawInner = segment.startsWith("||")
            ? segment.slice(2, -2)
            : segment.slice(9, -10);
          return <SpoilerBlock key={idx} content={rawInner} />;
        }

        const gifPattern = /!\[gif\]\((https?:\/\/[^\s\)]+)\)|\[gif:(https?:\/\/[^\s\]]+)\]/gi;
        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = gifPattern.exec(segment)) !== null) {
          if (match.index > lastIndex) {
            const textBefore = segment.substring(lastIndex, match.index);
            nodes.push(<React.Fragment key={`text-${lastIndex}`}>{renderFormattedText(textBefore)}</React.Fragment>);
          }

          const gifUrl = match[1] || match[2];
          if (gifUrl) {
            nodes.push(
              <div key={`gif-${match.index}`} className="my-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gifUrl}
                  alt="GIF"
                  className="max-w-[280px] max-h-[200px] rounded-lg object-cover border border-border/40 shadow-sm"
                  loading="lazy"
                />
              </div>
            );
          }

          lastIndex = gifPattern.lastIndex;
        }

        if (lastIndex < segment.length) {
          const remainingText = segment.substring(lastIndex);
          nodes.push(<React.Fragment key={`text-${lastIndex}`}>{renderFormattedText(remainingText)}</React.Fragment>);
        }

        return <React.Fragment key={idx}>{nodes}</React.Fragment>;
      })}
    </div>
  );
}

// KLIPY GIF Picker Popover Component
function KlipyGifPicker({ onSelectGif }: { onSelectGif: (url: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("Anime");
  const [gifs, setGifs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [cache, setCache] = useState<Record<string, string[]>>({});
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -120 : 120,
        behavior: "smooth",
      });
    }
  };

  const categories = [
    "Anime",
    "Reaction",
    "Fight",
    "Dance",
    "Laugh",
    "Meme",
    "Cute",
    "Sad",
    "Wow",
    "Love",
    "Angry"
  ];

  const fallbackPresets: Record<string, string[]> = {
    Anime: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FwOXEzYXZ1Mm8zc3k5bmpsNXJ5OXAwYmdhdTNxczN2OHRvaHQybCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13fTar4VVaFlG8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGcxcnphZHJkZXRscnh0ZXdwMWswNGMxcXFvZmlrbXRna2syeXB4dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L2F6C7c4V0eM/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm5wMmV5d2gwcXlwdmhybHNxcTZ5MGc3aHh1eW9td2t4azhjcXlsYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/c6X5zoem5mVpy/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZsaGtjeGttanIwcTdrOWdla3BhdjB2eG5mZnlycmU0OTJtMGh5NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d4aVHC1HKnButuXC/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1dnBucmx0MGVscWFxcWJkMXd6dHZ4NDFiMmYwb2psYmd0OGg0bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/yC7D21M9wI50I/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnVzajJmNzVzYzllcXU0dDRrZ2o1NmI1eWtwMTBnMHptc3Jtbnh4MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Od0QRnzwRBYm4/giphy.gif"
    ],
    Reaction: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtuY25zdzJrdmxqMHhjcms1dXJ1ODl5aTJrdnEycWZocmQxeWw1eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a3IWyIG8JUy3u/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1dnBucmx0MGVscWFxcWJkMXd6dHZ4NDFiMmYwb2psYmd0OGg0bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/yC7D21M9wI50I/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnVzajJmNzVzYzllcXU0dDRrZ2o1NmI1eWtwMTBnMHptc3Jtbnh4MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Od0QRnzwRBYm4/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVycXlydWNldGNqMWU5b2YyYWFsbG9ydXJrdnhxNWt5cTUxeXkwaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/u0vGv6UQ72L1m/giphy.gif"
    ],
    Fight: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm1iaXZ4bjdrOHBnNnY4cmgzdWNreGcxbmcyMmx6NHFhczJzZXhndSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/X14dDAj24t83e/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJvbXRmZjJnaWhsdXdrM3RyeXJodzhsdGZ3ODRma29vMnZ4eHRvOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BumuKalq5hS92/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWNra2JodHJ0eTJ0MGp0ZXBic2g1djZydnhjcmlvNDdqMmRrbWZ1dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/480e60bgSrgvS/giphy.gif"
    ],
    Dance: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHRkMmtuZjh6cGNkMnlnYmd6cmhjcW5uazVyb2lxbmtjMGswMXplZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kFfbnGQ72OGD6/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmxlZnNucXRocm4wdzcyYXRpdnhxMHNveWpwb2sxaW1zMWxrczgwZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11r19abx6m5o64/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjdsanIwdzhhNmd6amc0dGZtMnJjNW0ydDFmdGN1Y3ptemVlZnJkMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/blSTtZehjAZ8I/giphy.gif"
    ],
    Laugh: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1dnBucmx0MGVscWFxcWJkMXd6dHZ4NDFiMmYwb2psYmd0OGg0bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/yC7D21M9wI50I/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGcxcnphZHJkZXRscnh0ZXdwMWswNGMxcXFvZmlrbXRna2syeXB4dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L2F6C7c4V0eM/giphy.gif"
    ],
    Meme: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnVzajJmNzVzYzllcXU0dDRrZ2o1NmI1eWtwMTBnMHptc3Jtbnh4MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Od0QRnzwRBYm4/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmtuY25zdzJrdmxqMHhjcms1dXJ1ODl5aTJrdnEycWZocmQxeWw1eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a3IWyIG8JUy3u/giphy.gif"
    ],
    Cute: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FwOXEzYXZ1Mm8zc3k5bmpsNXJ5OXAwYmdhdTNxczN2OHRvaHQybCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13fTar4VVaFlG8/giphy.gif",
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHRkMmtuZjh6cGNkMnlnYmd6cmhjcW5uazVyb2lxbmtjMGswMXplZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kFfbnGQ72OGD6/giphy.gif"
    ],
    Sad: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZsaGtjeGttanIwcTdrOWdla3BhdjB2eG5mZnlycmU0OTJtMGh5NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d4aVHC1HKnButuXC/giphy.gif"
    ],
    Wow: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm5wMmV5d2gwcXlwdmhybHNxcTZ5MGc3aHh1eW9td2t4azhjcXlsYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/c6X5zoem5mVpy/giphy.gif"
    ],
    Love: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FwOXEzYXZ1Mm8zc3k5bmpsNXJ5OXAwYmdhdTNxczN2OHRvaHQybCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13fTar4VVaFlG8/giphy.gif"
    ],
    Angry: [
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZm1iaXZ4bjdrOHBnNnY4cmgzdWNreGcxbmcyMmx6NHFhczJzZXhndSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/X14dDAj24t83e/giphy.gif"
    ]
  };

  useEffect(() => {
    let isSubscribed = true;
    const queryKey = searchQuery.trim() ? searchQuery.trim().toLowerCase() : activeCategory;

    // Check if already cached
    if (cache[queryKey] && cache[queryKey].length > 0) {
      setGifs(cache[queryKey]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const searchTerm = searchQuery.trim() ? queryKey : `${queryKey} anime`;

      const safeFetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const text = await res.text();
          if (!text || !text.trim()) return null;
          return JSON.parse(text);
        } catch {
          return null;
        }
      };

      // 1. KLIPY API
      const klipyKey = process.env.NEXT_PUBLIC_KLIPY_API_KEY;
      if (klipyKey && klipyKey.trim()) {
        try {
          const endpoint = searchQuery.trim()
            ? `https://api.klipy.com/api/v1/${klipyKey.trim()}/gifs/search?q=${encodeURIComponent(searchTerm)}&limit=30`
            : `https://api.klipy.com/api/v1/${klipyKey.trim()}/gifs/search?q=${encodeURIComponent(activeCategory)}&limit=30`;

          const json = await safeFetchJson(endpoint);
          if (json) {
            let list: any[] = [];
            if (Array.isArray(json)) list = json;
            else if (Array.isArray(json.data)) list = json.data;
            else if (json.data && Array.isArray(json.data.data)) list = json.data.data;
            else if (json.data && Array.isArray(json.data.items)) list = json.data.items;
            else if (json.data && Array.isArray(json.data.gifs)) list = json.data.gifs;
            else if (Array.isArray(json.results)) list = json.results;
            else if (Array.isArray(json.items)) list = json.items;
            else if (Array.isArray(json.gifs)) list = json.gifs;

            const apiUrls = list
              .map((item: any) => {
                // Official KLIPY schema: prioritize small file sizes (sm / xs) for fast loading & low bandwidth
                const f = item.file || item.files;
                if (f && typeof f === "object") {
                  return (
                    f.sm?.gif?.url ||
                    f.sm?.webp?.url ||
                    f.xs?.gif?.url ||
                    f.xs?.webp?.url ||
                    f.md?.gif?.url ||
                    f.md?.webp?.url ||
                    f.hd?.gif?.url ||
                    f.url
                  );
                }
                return (
                  item.images?.fixed_height?.url ||
                  item.images?.downsized?.url ||
                  item.images?.original?.url ||
                  item.media?.gif?.url ||
                  item.media_formats?.gif?.url ||
                  item.url ||
                  item.gif_url
                );
              })
              .filter(Boolean);

            if (apiUrls.length > 0 && isSubscribed) {
              setGifs(apiUrls);
              setCache((prev) => ({ ...prev, [queryKey]: apiUrls }));
              setPage(1);
              setHasNext(json.data?.has_next ?? json.has_next ?? apiUrls.length >= 20);
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("KLIPY API fetch error:", err);
        }
      }

      // 2. Fallback to local presets
      if (isSubscribed) {
        const fallback = fallbackPresets[activeCategory] || fallbackPresets.Anime || Object.values(fallbackPresets).flat();
        setGifs(fallback);
        setPage(1);
        setHasNext(false);
        setIsLoading(false);
      }
    }, searchQuery.trim() ? 300 : 0);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeCategory]);

  const handleLoadMore = async () => {
    const klipyKey = process.env.NEXT_PUBLIC_KLIPY_API_KEY;
    if (!klipyKey || !klipyKey.trim() || isLoadingMore || !hasNext) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    const queryKey = searchQuery.trim() ? searchQuery.trim().toLowerCase() : activeCategory;
    const searchTerm = searchQuery.trim() ? queryKey : `${queryKey} anime`;

    try {
      const endpoint = searchQuery.trim()
        ? `https://api.klipy.com/api/v1/${klipyKey.trim()}/gifs/search?q=${encodeURIComponent(searchTerm)}&page=${nextPage}&limit=24`
        : `https://api.klipy.com/api/v1/${klipyKey.trim()}/gifs/search?q=${encodeURIComponent(activeCategory)}&page=${nextPage}&limit=24`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        let list: any[] = [];
        if (Array.isArray(json)) list = json;
        else if (Array.isArray(json.data)) list = json.data;
        else if (json.data && Array.isArray(json.data.data)) list = json.data.data;
        else if (json.data && Array.isArray(json.data.items)) list = json.data.items;

        const newUrls = list
          .map((item: any) => {
            const f = item.file || item.files;
            if (f && typeof f === "object") {
              return (
                f.sm?.gif?.url ||
                f.sm?.webp?.url ||
                f.xs?.gif?.url ||
                f.xs?.webp?.url ||
                f.md?.gif?.url ||
                f.md?.webp?.url ||
                f.hd?.gif?.url ||
                f.url
              );
            }
            return (
              item.images?.fixed_height?.url ||
              item.images?.downsized?.url ||
              item.images?.original?.url ||
              item.media?.gif?.url ||
              item.url
            );
          })
          .filter(Boolean);

        if (newUrls.length > 0) {
          setGifs((prev) => [...prev, ...newUrls]);
          setPage(nextPage);
          setHasNext(json.data?.has_next ?? json.has_next ?? newUrls.length >= 10);
        } else {
          setHasNext(false);
        }
      } else {
        setHasNext(false);
      }
    } catch (err) {
      console.error("Load more GIFs error:", err);
      setHasNext(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch search suggestions from KLIPY API
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const klipyKey = process.env.NEXT_PUBLIC_KLIPY_API_KEY;
    if (!klipyKey || !klipyKey.trim()) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.klipy.com/api/v1/${klipyKey.trim()}/search-suggestions/${encodeURIComponent(trimmed)}?limit=8`
        );
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data)) {
            setSuggestions(json.data);
          }
        }
      } catch (err) {
        console.error("KLIPY suggestions error:", err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
          <ImageIcon className="w-3.5 h-3.5 text-primary" />
          <span>GIFs</span>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">powered by KLIPY</span>
      </div>

      <div className="space-y-1.5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 px-3 py-1 text-xs bg-background border border-border/60 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2.5 top-2 text-muted-foreground" />
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(suggestion);
                  setSuggestions([]);
                }}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 hover:bg-primary/20 hover:text-primary border border-border/40 transition-colors text-muted-foreground font-medium flex-shrink-0 cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {!searchQuery && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollCategories("left")}
            className="h-6 w-6 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 border border-border/40 cursor-pointer"
            title="Previous Categories"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            ref={categoryScrollRef}
            className="flex-1 flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide scroll-smooth"
          >
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-2.5 py-0.5 text-[10px] font-semibold rounded-full border transition-all flex-shrink-0 cursor-pointer",
                  activeCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/40"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories("right")}
            className="h-6 w-6 rounded-md bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0 border border-border/40 cursor-pointer"
            title="Next Categories"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        {isLoading && gifs.length === 0 ? (
          <div className="col-span-2 py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading GIFs...</span>
          </div>
        ) : (
          gifs.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => onSelectGif(url)}
              className="group relative aspect-video rounded-lg overflow-hidden border border-border/40 hover:border-primary transition-all focus:outline-none cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="GIF"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </button>
          ))
        )}

        {gifs.length > 0 && hasNext && !isLoading && (
          <div className="col-span-2 pt-2 pb-1 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full text-xs h-7 gap-1.5 font-semibold text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted/50 transition-colors"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span>Loading more GIFs...</span>
                </>
              ) : (
                <span>Load More GIFs</span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Formatting Toolbar for Textarea
function FormattingToolbar({
  onInsert,
  onInsertGif,
  disabled = false,
}: {
  onInsert: (type: "bold" | "italic" | "underline" | "strikethrough" | "spoiler") => void;
  onInsertGif: (url: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-muted/30 border border-border/50 rounded-t-lg border-b-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onInsert("bold")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground font-bold"
        title="Bold (**text**)"
      >
        <Bold className="w-3.5 h-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onInsert("italic")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground italic"
        title="Italic (*text*)"
      >
        <Italic className="w-3.5 h-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onInsert("underline")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground underline"
        title="Underline (<u>text</u>)"
      >
        <Underline className="w-3.5 h-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onInsert("strikethrough")}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground line-through"
        title="Strikethrough (~~text~~)"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </Button>

      {Boolean(process.env.NEXT_PUBLIC_KLIPY_API_KEY && process.env.NEXT_PUBLIC_KLIPY_API_KEY.trim()) && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-7 px-1.5 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Insert GIF"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>GIF</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-[360px] sm:w-[400px] p-3.5 bg-card border-border shadow-2xl z-[100]">
            <KlipyGifPicker onSelectGif={onInsertGif} />
          </PopoverContent>
        </Popover>
      )}

      <div className="h-3.5 w-[1px] bg-border/60 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => onInsert("spoiler")}
        className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1 font-semibold"
        title="Add Spoiler (||text||)"
      >
        <EyeOff className="w-3.5 h-3.5" />
        <span>Spoiler</span>
      </Button>
    </div>
  );
}

export function CommentSection({ animeId, episodeNum, animeTitle }: CommentSectionProps) {
  const { user, openAuthModal, updateLastCommentedAt } = useAuth();
  const { settings: commentSettings } = useCommentSettings();
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; isReply?: boolean } | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  // Reply states
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Reaction states
  const [reactions, setReactions] = useState<Record<string, "like" | "dislike">>({});

  // Textarea Refs for inserting formatting
  const mainTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleInsertFormatting = (
    type: "bold" | "italic" | "underline" | "strikethrough" | "spoiler",
    isReply = false
  ) => {
    const textarea = isReply ? replyTextareaRef.current : mainTextareaRef.current;
    const currentText = isReply ? replyText : commentText;
    const setText = isReply ? setReplyText : setCommentText;

    let prefix = "";
    let suffix = "";

    switch (type) {
      case "bold": prefix = "**"; suffix = "**"; break;
      case "italic": prefix = "*"; suffix = "*"; break;
      case "underline": prefix = "<u>"; suffix = "</u>"; break;
      case "strikethrough": prefix = "~~"; suffix = "~~"; break;
      case "spoiler": prefix = "||"; suffix = "||"; break;
    }

    if (textarea) {
      const start = textarea.selectionStart ?? currentText.length;
      const end = textarea.selectionEnd ?? currentText.length;
      const selected = currentText.substring(start, end) || "text";
      const replacement = `${prefix}${selected}${suffix}`;
      const newText = (currentText.substring(0, start) + replacement + currentText.substring(end)).slice(0, 500);
      setText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      }, 0);
    } else {
      setText((prev) => (prev + `${prefix}text${suffix}`).slice(0, 500));
    }
  };

  const handleInsertGif = (gifUrl: string, isReply = false) => {
    const setText = isReply ? setReplyText : setCommentText;
    const gifCode = `![gif](${gifUrl})`;
    setText((prev) => {
      const space = prev && !prev.endsWith(" ") ? " " : "";
      return (prev + space + gifCode).slice(0, 500);
    });
  };

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleStartEdit = (comment: CommentType) => {
    setEditingId(comment.id);
    setEditText(comment.content);
  };

  const handleEditSave = async (commentId: string) => {
    if (!user) return;
    const trimmed = editText.trim();
    if (!trimmed) return;

    setIsSavingEdit(true);
    try {
      const commentRef = doc(db, "comments", commentId);
      await updateDoc(commentRef, {
        content: trimmed,
        isEdited: true,
        updatedAt: serverTimestamp(),
      });

      setEditingId(null);
      setEditText("");
      toast({
        title: "Comment updated!",
        description: "Your comment has been edited successfully.",
      });
    } catch (error: any) {
      console.error("Error updating comment:", error);
      toast({
        variant: "destructive",
        title: "Failed to update comment",
        description: error.message || "An error occurred while saving changes.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleInsertEditFormatting = (
    type: "bold" | "italic" | "underline" | "strikethrough" | "spoiler"
  ) => {
    const textarea = editTextareaRef.current;
    let prefix = "";
    let suffix = "";

    switch (type) {
      case "bold": prefix = "**"; suffix = "**"; break;
      case "italic": prefix = "*"; suffix = "*"; break;
      case "underline": prefix = "<u>"; suffix = "</u>"; break;
      case "strikethrough": prefix = "~~"; suffix = "~~"; break;
      case "spoiler": prefix = "||"; suffix = "||"; break;
    }

    if (textarea) {
      const start = textarea.selectionStart ?? editText.length;
      const end = textarea.selectionEnd ?? editText.length;
      const selected = editText.substring(start, end) || "text";
      const replacement = `${prefix}${selected}${suffix}`;
      const newText = (editText.substring(0, start) + replacement + editText.substring(end)).slice(0, 500);
      setEditText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      }, 0);
    } else {
      setEditText((prev) => (prev + `${prefix}text${suffix}`).slice(0, 500));
    }
  };

  const handleInsertEditGif = (gifUrl: string) => {
    const gifCode = `![gif](${gifUrl})`;
    setEditText((prev) => {
      const space = prev && !prev.endsWith(" ") ? " " : "";
      return (prev + space + gifCode).slice(0, 500);
    });
  };

  // Target ID: different scopes for details page vs. specific episode
  const targetId = episodeNum ? `${animeId}_ep_${episodeNum}` : animeId;

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cooldown calculation helper
  const getRemainingCooldown = (lastComment: Date | string | number | any) => {
    if (!lastComment || !commentSettings.enabled || commentSettings.cooldownSeconds <= 0) return 0;
    const now = new Date();
    const dateObj = typeof lastComment?.toDate === "function" 
      ? lastComment.toDate() 
      : (lastComment instanceof Date ? lastComment : new Date(lastComment));
    const lastTime = dateObj instanceof Date && !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0;
    if (!lastTime) return 0;
    const diffMs = now.getTime() - lastTime;
    const cooldownMs = commentSettings.cooldownSeconds * 1000;
    return Math.max(0, cooldownMs - diffMs);
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (!user?.lastCommentedAt || !commentSettings.enabled || commentSettings.cooldownSeconds <= 0) {
      setRemainingMs(0);
      return;
    }

    const updateTimer = () => {
      const ms = getRemainingCooldown(user.lastCommentedAt!);
      setRemainingMs(ms);
      return ms;
    };

    const initialMs = updateTimer();
    if (initialMs <= 0) {
      setRemainingMs(0);
      return;
    }

    const interval = setInterval(() => {
      const ms = updateTimer();
      if (ms <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.lastCommentedAt, commentSettings.enabled, commentSettings.cooldownSeconds]);

  // Listen to user's comment reactions
  useEffect(() => {
    if (!user) {
      setReactions({});
      return;
    }

    const q = query(
      collection(db, "comment_reactions"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeReactions: Record<string, "like" | "dislike"> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.commentId && data.type) {
          activeReactions[data.commentId] = data.type;
        }
      });
      setReactions(activeReactions);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time comments listener
  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("targetId", "==", targetId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CommentType[];

      // Sort client-side to avoid needing composite indexes in Firestore
      fetchedComments.sort((a, b) => {
        const aTime = a.createdAt
          ? (typeof a.createdAt.toDate === "function"
            ? a.createdAt.toDate().getTime()
            : new Date(a.createdAt as any).getTime())
          : Date.now();
        const bTime = b.createdAt
          ? (typeof b.createdAt.toDate === "function"
            ? b.createdAt.toDate().getTime()
            : new Date(b.createdAt as any).getTime())
          : Date.now();
        return bTime - aTime;
      });

      setComments(fetchedComments);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to comments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedText = commentText.trim();
    if (!trimmedText) return;

    if (remainingMs > 0) {
      toast({
        variant: "destructive",
        title: "Slow down!",
        description: `Please wait ${formatCooldown(remainingMs)} before commenting again.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, "comments"));
      const userRef = doc(db, "users", user.uid);

      batch.set(commentRef, {
        animeId,
        episodeNum: episodeNum || null,
        targetId,
        userId: user.uid,
        userName: user.displayName || "Anonymous User",
        userPhoto: user.photoURL || null,
        userThemeColor: user.themeColor || "violet",
        content: trimmedText,
        createdAt: serverTimestamp(),
        parentId: null,
        parentUserName: null,
        likesCount: 0,
        dislikesCount: 0,
      });

      batch.update(userRef, {
        lastCommentedAt: serverTimestamp(),
      });

      await batch.commit();

      // Start client cooldown instantly
      const localTime = new Date();
      updateLastCommentedAt(localTime);
      setCommentText("");
      
      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully.",
      });
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      toast({
        variant: "destructive",
        title: "Failed to post comment",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string, parentUserName: string, parentUserId?: string) => {
    if (!user) return;

    const trimmedText = replyText.trim();
    if (!trimmedText) return;

    if (remainingMs > 0) {
      toast({
        variant: "destructive",
        title: "Slow down!",
        description: `Please wait ${formatCooldown(remainingMs)} before replying.`,
      });
      return;
    }

    setIsSubmittingReply(true);
    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, "comments"));
      const userRef = doc(db, "users", user.uid);

      batch.set(commentRef, {
        animeId,
        episodeNum: episodeNum || null,
        targetId,
        userId: user.uid,
        userName: user.displayName || "Anonymous User",
        userPhoto: user.photoURL || null,
        userThemeColor: user.themeColor || "violet",
        content: trimmedText,
        createdAt: serverTimestamp(),
        parentId,
        parentUserName,
        likesCount: 0,
        dislikesCount: 0,
      });

      batch.update(userRef, {
        lastCommentedAt: serverTimestamp(),
      });

      // Write notification for the parent comment owner if it is not the current user
      if (parentUserId && parentUserId !== user.uid) {
        const notifRef = doc(collection(db, "notifications"));
        const displayAnimeName = animeTitle || animeId;
        const msg = `${user.displayName || "Someone"} replied to your comment on ${displayAnimeName}${episodeNum ? ` Ep ${episodeNum}` : ""}: "${trimmedText.substring(0, 50)}${trimmedText.length > 50 ? "..." : ""}"`;

        batch.set(notifRef, {
          userId: parentUserId,
          type: "reply",
          title: "New Reply",
          message: msg,
          link: episodeNum 
            ? `/watch/${animeId}?ep=${episodeNum}` 
            : `/anime/${animeId}`,
          isRead: false,
          createdAt: serverTimestamp(),
          senderId: user.uid,
          senderName: user.displayName || "Anonymous User",
        });
      }

      await batch.commit();

      // Start client cooldown instantly
      const localTime = new Date();
      updateLastCommentedAt(localTime);
      setReplyText("");
      setReplyToId(null);
      
      toast({
        title: "Reply posted!",
        description: "Your reply has been added successfully.",
      });
    } catch (error: any) {
      console.error("Error submitting reply:", error);
      toast({
        variant: "destructive",
        title: "Failed to post reply",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReaction = async (commentId: string, reactionType: "like" | "dislike") => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    const currentReaction = reactions[commentId];
    const reactionRef = doc(db, "comment_reactions", `${commentId}_${user.uid}`);
    const commentRef = doc(db, "comments", commentId);

    try {
      const batch = writeBatch(db);

      let likesDelta = 0;
      let dislikesDelta = 0;

      if (!currentReaction) {
        batch.set(reactionRef, {
          userId: user.uid,
          commentId,
          type: reactionType,
          createdAt: serverTimestamp(),
        });
        if (reactionType === "like") likesDelta = 1;
        else dislikesDelta = 1;
      } else if (currentReaction === reactionType) {
        batch.delete(reactionRef);
        if (reactionType === "like") likesDelta = -1;
        else dislikesDelta = -1;
      } else {
        batch.update(reactionRef, {
          type: reactionType,
          updatedAt: serverTimestamp(),
        });
        if (reactionType === "like") {
          likesDelta = 1;
          dislikesDelta = -1;
        } else {
          likesDelta = -1;
          dislikesDelta = 1;
        }
      }

      const commentDoc = comments.find((c) => c.id === commentId);
      const currentLikes = commentDoc?.likesCount || 0;
      const currentDislikes = commentDoc?.dislikesCount || 0;

      batch.update(commentRef, {
        likesCount: Math.max(0, currentLikes + likesDelta),
        dislikesCount: Math.max(0, currentDislikes + dislikesDelta),
      });

      await batch.commit();
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast({
        variant: "destructive",
        title: "Reaction failed",
        description: "An error occurred while updating your reaction.",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !commentToDelete) return;
    const targetCommentId = commentToDelete.id;
    const isReply = commentToDelete.isReply;
    setDeletingId(targetCommentId);

    try {
      await deleteDoc(doc(db, "comments", targetCommentId));
      toast({
        title: isReply ? "Reply deleted" : "Comment deleted",
        description: isReply ? "Your reply has been successfully removed." : "Your comment has been successfully removed.",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: "You do not have permission to delete this comment.",
      });
    } finally {
      setDeletingId(null);
      setCommentToDelete(null);
    }
  };

  // Separation of comments and replies
  const parentComments = comments.filter(c => !c.parentId);

  const getRepliesFor = (parentId: string) => {
    return comments
      .filter(c => c.parentId === parentId)
      .sort((a, b) => {
        const aTime = a.createdAt
          ? (typeof a.createdAt.toDate === "function"
            ? a.createdAt.toDate().getTime()
            : new Date(a.createdAt as any).getTime())
          : 0;
        const bTime = b.createdAt
          ? (typeof b.createdAt.toDate === "function"
            ? b.createdAt.toDate().getTime()
            : new Date(b.createdAt as any).getTime())
          : 0;
        return aTime - bTime; // oldest replies first
      });
  };

  if (!mounted) {
    return (
      <div className="space-y-6 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading comments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-8 border-t border-border/50">
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            Comments
            <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {comments.length}
            </span>
          </h2>
        </div>
      </div>

      {/* Write Comment Form */}
      <div className="p-1 rounded-xl bg-gradient-to-br from-card/30 to-card/10 border border-border/40 shadow-inner">
        {!user ? (
          <div className="p-6 text-center space-y-4 rounded-lg bg-card/20 backdrop-blur-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Join the Discussion</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Sign in to share your thoughts on this {episodeNum ? "episode" : "anime"} with the community.
              </p>
            </div>
            <Button
              onClick={() => openAuthModal("login")}
              variant="default"
              className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all duration-300"
            >
              Log In to Comment
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 rounded-lg bg-card/25 backdrop-blur-sm">
            {/* Countdown / Cooldown Warning */}
            {remainingMs > 0 && (
              <div className="flex items-center gap-3 p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg animate-pulse">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">
                  You can post another comment in <strong className="font-bold underline">{formatCooldown(remainingMs)}</strong>.
                </span>
              </div>
            )}

            <div className="flex gap-4 items-start">
              <Link href={`/library?user=${user.uid}`} className="hover:opacity-85 transition-opacity">
                <Avatar className="h-10 w-10 border border-border ring-2 ring-primary/20">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-1 text-foreground/90">
                    Posting as <Link href={`/library?user=${user.uid}`} className={`font-bold hover:underline ${getThemeTextClass(user.themeColor)}`}>{user.displayName}</Link>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {commentText.length}/500
                  </span>
                </div>

                <div className="space-y-0">
                  <FormattingToolbar
                    disabled={isSubmitting || remainingMs > 0}
                    onInsert={(type) => handleInsertFormatting(type, false)}
                    onInsertGif={(gifUrl) => handleInsertGif(gifUrl, false)}
                  />
                  <Textarea
                    ref={mainTextareaRef}
                    placeholder={
                      remainingMs > 0
                        ? "Commenting is locked during cooldown..."
                        : `Write a comment about this ${episodeNum ? "episode" : "anime"}...`
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                    disabled={isSubmitting || remainingMs > 0}
                    className="min-h-[100px] resize-none bg-background/50 border-border/60 focus-visible:ring-primary focus-visible:border-primary/60 transition-all rounded-b-lg rounded-t-none"
                    required
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={isSubmitting || remainingMs > 0 || !commentText.trim()}
                    className="font-bold flex items-center gap-2 px-5 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all duration-300 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse p-4 rounded-lg bg-card/15 border border-border/30">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : parentComments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/40 rounded-xl bg-card/5 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="text-foreground/80 font-semibold">No comments yet</p>
              <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {parentComments.map((comment) => {
              const isOwner = user?.uid === comment.userId;
              const formattedTime = comment.createdAt
                ? formatDistanceToNow(
                  typeof comment.createdAt.toDate === "function"
                    ? comment.createdAt.toDate()
                    : new Date(comment.createdAt as any),
                  { addSuffix: true }
                )
                : "Just now";

              const parentReplies = getRepliesFor(comment.id);

              return (
                <div key={comment.id} className="space-y-4">
                  {/* Parent Comment */}
                  <div className="group flex gap-4 p-4 rounded-xl border border-border/50 bg-card/10 hover:bg-card/20 transition-all duration-300 shadow-sm">
                    <Link href={`/library?user=${comment.userId}`} className="hover:opacity-85 transition-opacity">
                      <Avatar className="h-10 w-10 border border-border/80">
                        <AvatarImage src={comment.userPhoto || undefined} alt={comment.userName} />
                        <AvatarFallback className="bg-primary/5 text-primary font-semibold text-xs">
                          {comment.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <Link href={`/library?user=${comment.userId}`} className="hover:underline">
                            <span className={`text-sm font-bold ${getThemeTextClass(comment.userThemeColor)}`}>
                              {comment.userName}
                            </span>
                          </Link>
                          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                            {formattedTime}
                            {comment.isEdited && <span className="text-[10px] text-muted-foreground/70 italic">(edited)</span>}
                          </span>
                        </div>

                        {isOwner && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(comment)}
                              disabled={deletingId === comment.id || isSavingEdit}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                              title="Edit Comment"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCommentToDelete({ id: comment.id, isReply: false })}
                              disabled={deletingId === comment.id || isSavingEdit}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Delete Comment"
                            >
                              {deletingId === comment.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingId === comment.id ? (
                        <div className="mt-2 space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                            <span className="font-semibold text-foreground">Editing Comment</span>
                            <span>{editText.length}/500</span>
                          </div>
                          <div className="space-y-0">
                            <FormattingToolbar
                              disabled={isSavingEdit}
                              onInsert={(type) => handleInsertEditFormatting(type)}
                              onInsertGif={(gifUrl) => handleInsertEditGif(gifUrl)}
                            />
                            <Textarea
                              ref={editTextareaRef}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value.slice(0, 500))}
                              disabled={isSavingEdit}
                              className="min-h-[80px] text-xs resize-none bg-background/60 border-border/50 focus-visible:ring-primary rounded-b-lg rounded-t-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              disabled={isSavingEdit}
                              className="text-xs h-8 px-3 font-semibold"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleEditSave(comment.id)}
                              disabled={isSavingEdit || !editText.trim()}
                              className="text-xs h-8 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1.5"
                            >
                              {isSavingEdit ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <CommentContentRenderer content={comment.content} />
                      )}

                      {/* Comment Action Bar */}
                      <div className="flex items-center gap-4 pt-1.5 border-t border-border/10">
                        <button
                          onClick={() => {
                            if (!user) {
                              openAuthModal("login");
                              return;
                            }
                            setReplyToId(replyToId === comment.id ? null : comment.id);
                            setReplyText("");
                          }}
                          className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Reply
                        </button>

                        <button
                          onClick={() => handleReaction(comment.id, "like")}
                          className={cn(
                            "text-xs font-semibold flex items-center gap-1.5 transition-colors hover:text-green-500",
                            reactions[comment.id] === "like"
                              ? "text-green-500 font-bold"
                              : "text-muted-foreground"
                          )}
                          title="Like"
                        >
                          <ThumbsUp className={cn("w-3.5 h-3.5", reactions[comment.id] === "like" && "fill-current")} />
                          <span>{comment.likesCount || 0}</span>
                        </button>

                        <button
                          onClick={() => handleReaction(comment.id, "dislike")}
                          className={cn(
                            "text-xs font-semibold flex items-center gap-1.5 transition-colors hover:text-rose-500",
                            reactions[comment.id] === "dislike"
                              ? "text-rose-500 font-bold"
                              : "text-muted-foreground"
                          )}
                          title="Dislike"
                        >
                          <ThumbsDown className={cn("w-3.5 h-3.5", reactions[comment.id] === "dislike" && "fill-current")} />
                          <span>{comment.dislikesCount || 0}</span>
                        </button>
                      </div>

                      {/* Inline Reply Form */}
                      {replyToId === comment.id && (
                        <div className="mt-3 p-3 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                          {remainingMs > 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-amber-500 font-semibold animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Cooldown active: wait {formatCooldown(remainingMs)} before replying.</span>
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                {user?.displayName?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                                <span>Replying to <span className="font-bold">@{comment.userName}</span></span>
                                <span>{replyText.length}/500</span>
                              </div>
                              <div className="space-y-0">
                                <FormattingToolbar
                                  disabled={isSubmittingReply || remainingMs > 0}
                                  onInsert={(type) => handleInsertFormatting(type, true)}
                                  onInsertGif={(gifUrl) => handleInsertGif(gifUrl, true)}
                                />
                                <Textarea
                                  ref={replyTextareaRef}
                                  placeholder="Type your reply here..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                                  disabled={isSubmittingReply || remainingMs > 0}
                                  className="min-h-[70px] text-xs resize-none bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 rounded-b-lg rounded-t-none"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReplyToId(null)}
                                  disabled={isSubmittingReply}
                                  className="text-xs h-8 font-semibold"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isSubmittingReply || remainingMs > 0 || !replyText.trim()}
                                  onClick={() => handleReplySubmit(comment.id, comment.userName, comment.userId)}
                                  className="text-xs h-8 bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1.5"
                                >
                                  {isSubmittingReply ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Replying...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3 h-3" />
                                      Reply
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replies (Threaded Indentation) */}
                  {parentReplies.length > 0 && (
                    <div className="pl-4 sm:pl-10 border-l border-border/50 ml-5 space-y-3 pt-1">
                      {parentReplies.map((reply) => {
                        const isReplyOwner = user?.uid === reply.userId;
                        const replyTime = reply.createdAt
                          ? formatDistanceToNow(
                            typeof reply.createdAt.toDate === "function"
                              ? reply.createdAt.toDate()
                              : new Date(reply.createdAt as any),
                            { addSuffix: true }
                          )
                          : "Just now";

                        return (
                          <div 
                            key={reply.id} 
                            className="group/reply flex gap-3 p-3 rounded-xl border border-border/30 bg-card/5 hover:bg-card/10 transition-all duration-200"
                          >
                            <Link href={`/library?user=${reply.userId}`} className="hover:opacity-85 transition-opacity">
                              <Avatar className="h-8 w-8 border border-border/80">
                                <AvatarImage src={reply.userPhoto || undefined} alt={reply.userName} />
                                <AvatarFallback className="bg-primary/5 text-primary font-semibold text-[10px]">
                                  {reply.userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </Link>

                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <Link href={`/library?user=${reply.userId}`} className="hover:underline">
                                    <span className={`text-xs font-bold ${getThemeTextClass(reply.userThemeColor)}`}>
                                      {reply.userName}
                                    </span>
                                  </Link>
                                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                    <CornerDownRight className="w-3 h-3 text-muted-foreground/50" />
                                    {replyTime}
                                    {reply.isEdited && <span className="text-[9px] text-muted-foreground/70 italic">(edited)</span>}
                                  </span>
                                </div>

                                {isReplyOwner && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover/reply:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStartEdit(reply)}
                                      disabled={deletingId === reply.id || isSavingEdit}
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                      title="Edit Reply"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setCommentToDelete({ id: reply.id, isReply: true })}
                                      disabled={deletingId === reply.id || isSavingEdit}
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                      title="Delete Reply"
                                    >
                                      {deletingId === reply.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {editingId === reply.id ? (
                                <div className="mt-2 space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                                    <span className="font-semibold text-foreground">Editing Reply</span>
                                    <span>{editText.length}/500</span>
                                  </div>
                                  <div className="space-y-0">
                                    <FormattingToolbar
                                      disabled={isSavingEdit}
                                      onInsert={(type) => handleInsertEditFormatting(type)}
                                      onInsertGif={(gifUrl) => handleInsertEditGif(gifUrl)}
                                    />
                                    <Textarea
                                      ref={editTextareaRef}
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value.slice(0, 500))}
                                      disabled={isSavingEdit}
                                      className="min-h-[70px] text-xs resize-none bg-background/60 border-border/50 focus-visible:ring-primary rounded-b-lg rounded-t-none"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingId(null)}
                                      disabled={isSavingEdit}
                                      className="text-xs h-7 px-3 font-semibold"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleEditSave(reply.id)}
                                      disabled={isSavingEdit || !editText.trim()}
                                      className="text-xs h-7 px-3 bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1.5"
                                    >
                                      {isSavingEdit ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3" />
                                          Save
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-xs text-primary font-semibold mr-1">@{reply.parentUserName || comment.userName}</span>
                                  <CommentContentRenderer content={reply.content} />
                                </div>
                              )}

                              {/* Reply Action Bar */}
                              <div className="flex items-center gap-4 pt-1.5 mt-1 border-t border-border/5">
                                <button
                                  onClick={() => {
                                    if (!user) {
                                      openAuthModal("login");
                                      return;
                                    }
                                    setReplyToId(replyToId === reply.id ? null : reply.id);
                                    setReplyText("");
                                  }}
                                  className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  Reply
                                </button>

                                <button
                                  onClick={() => handleReaction(reply.id, "like")}
                                  className={cn(
                                    "text-[10px] font-semibold flex items-center gap-1 transition-colors hover:text-green-500",
                                    reactions[reply.id] === "like"
                                      ? "text-green-500 font-bold"
                                      : "text-muted-foreground"
                                  )}
                                  title="Like"
                                >
                                  <ThumbsUp className={cn("w-3 h-3", reactions[reply.id] === "like" && "fill-current")} />
                                  <span>{reply.likesCount || 0}</span>
                                </button>

                                <button
                                  onClick={() => handleReaction(reply.id, "dislike")}
                                  className={cn(
                                    "text-[10px] font-semibold flex items-center gap-1 transition-colors hover:text-rose-500",
                                    reactions[reply.id] === "dislike"
                                      ? "text-rose-500 font-bold"
                                      : "text-muted-foreground"
                                  )}
                                  title="Dislike"
                                >
                                  <ThumbsDown className={cn("w-3 h-3", reactions[reply.id] === "dislike" && "fill-current")} />
                                  <span>{reply.dislikesCount || 0}</span>
                                </button>
                              </div>

                              {/* Inline Reply Form under Reply */}
                              {replyToId === reply.id && (
                                <div className="mt-3 p-3 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                                  {remainingMs > 0 && (
                                    <div className="flex items-center gap-2 text-[10px] text-amber-500 font-semibold animate-pulse">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      <span>Cooldown active: wait {formatCooldown(remainingMs)} before replying.</span>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 border border-border">
                                      <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                        {user?.displayName?.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-2">
                                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                                        <span>Replying to <span className="font-bold">@{reply.userName}</span></span>
                                        <span>{replyText.length}/500</span>
                                      </div>
                                      <div className="space-y-0">
                                        <FormattingToolbar
                                          disabled={isSubmittingReply || remainingMs > 0}
                                          onInsert={(type) => handleInsertFormatting(type, true)}
                                          onInsertGif={(gifUrl) => handleInsertGif(gifUrl, true)}
                                        />
                                        <Textarea
                                          ref={replyTextareaRef}
                                          placeholder="Type your reply here..."
                                          value={replyText}
                                          onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                                          disabled={isSubmittingReply || remainingMs > 0}
                                          className="min-h-[70px] text-xs resize-none bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary/50 rounded-b-lg rounded-t-none"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setReplyToId(null)}
                                          disabled={isSubmittingReply}
                                          className="text-xs h-8 font-semibold"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={isSubmittingReply || remainingMs > 0 || !replyText.trim()}
                                          onClick={() => handleReplySubmit(comment.id, reply.userName, reply.userId)}
                                          className="text-xs h-8 bg-primary hover:bg-primary/95 text-primary-foreground font-bold flex items-center gap-1.5"
                                        >
                                          {isSubmittingReply ? (
                                            <>
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              Replying...
                                            </>
                                          ) : (
                                            <>
                                              <Send className="w-3 h-3" />
                                              Reply
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && !deletingId && setCommentToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {commentToDelete?.isReply ? "Reply" : "Comment"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {commentToDelete?.isReply ? "reply" : "comment"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={!!deletingId}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {deletingId ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
