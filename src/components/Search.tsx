"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/hooks/use-router";
import { SearchIcon, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import Image from "next/image";

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  image: string;
  type?: string;
  date?: string;
  score?: number;
  episodes?: {
    sub?: number;
    dub?: number;
    total?: number;
  };
}

export function Search({ isSearchExpanded, setIsSearchExpanded }: { isSearchExpanded: boolean; setIsSearchExpanded: (expanded: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Real-time search states
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const debouncedQuery = useDebounce(query, 500);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);

    const checkDeviceType = () => {
      const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      const mobileRegex = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|rim)|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i;
      const tabletRegex = /android|ipad|playbook|silk/i;

      setIsMobileDevice(mobileRegex.test(userAgent) || tabletRegex.test(userAgent));
    };

    checkDeviceType();
  }, []);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const fetchSearch = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?keyword=${encodeURIComponent(debouncedQuery)}&page=1`);
        if (!res.ok) throw new Error("Search failed");
        
        const json = await res.json();
        if (json.ok && json.data?.results) {
          setResults(json.data.results.slice(0, 5)); // Show top 5 results
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Error searching:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSearch();
  }, [debouncedQuery]);

  // Handle click outside to close dropdown and collapse search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsSearchExpanded]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&page=1`);
      setShowResults(false);
      // Optional: don't clear query so user knows what they searched for
      // setQuery("");
      setIsSearchExpanded(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(true);
  };

  const getPlaceholder = () => {
    if (!mounted) {
      return "Search anime...";
    }

    if (isMobileDevice && !isSearchExpanded) {
      return "";
    } else {
      return "Search anime...";
    }
  };

  return (
    <div className={cn("relative transition-all", isSearchExpanded ? "w-full" : "")} ref={dropdownRef}>
      <form onSubmit={handleSubmit}>
        <div 
          onClick={() => {
            if (!isSearchExpanded) {
              setIsSearchExpanded(true);
              setTimeout(() => {
                inputRef.current?.focus();
              }, 50);
            }
          }}
          className={cn(
            "group relative transition-all duration-300 ease-in-out overflow-hidden h-9 flex items-center",
            // Desktop styles (always active bar)
            "md:w-48 lg:w-64 md:border-input md:bg-background/50 md:focus-within:w-64 lg:md:focus-within:w-80 md:focus-within:ring-2 md:focus-within:ring-ring md:focus-within:ring-offset-2 md:focus-within:ring-offset-background md:rounded-full md:border md:cursor-text",
            // Mobile styles (collapses to icon, expands to full width)
            isSearchExpanded 
              ? "w-full border border-input bg-background/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background rounded-full" 
              : "w-9 border-transparent bg-transparent hover:bg-muted/50 cursor-pointer rounded-full md:hover:bg-background/50"
          )}
        >
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {isSearching ? (
              <Loader2 className="h-4 w-4 opacity-50 animate-spin" />
            ) : (
              <SearchIcon className="h-4 w-4 opacity-50" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={getPlaceholder()}
            className="flex h-9 w-full rounded-md bg-transparent py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onFocus={() => {
              setIsSearchExpanded(true);
              if (query.trim().length > 0) setShowResults(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                inputRef.current?.blur();
                setShowResults(false);
                setIsSearchExpanded(false);
              }
            }}
          />
        </div>
      </form>

      {/* Real-time search dropdown */}
      {showResults && query.trim().length > 0 && (
        <div className="absolute top-full right-0 md:left-0 md:right-0 mt-2 w-[calc(100vw-2rem)] md:w-full max-w-[360px] md:max-w-none bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {isSearching && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col max-h-[70vh] overflow-y-auto">
              {results.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.slug}`}
                  onClick={() => {
                    setShowResults(false);
                    setIsSearchExpanded(false);
                  }}
                  className="flex gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-0"
                >
                  <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={anime.image || "/placeholder.jpg"}
                      alt={anime.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex flex-col justify-center overflow-hidden">
                    <p className="text-sm font-medium line-clamp-1">{anime.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {anime.type && <span className="uppercase">{anime.type}</span>}
                      {anime.date && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span>{anime.date}</span>
                        </>
                      )}
                      {anime.score && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span className="flex items-center gap-0.5 text-yellow-500">
                            <Star className="h-3 w-3 fill-current" />
                            {anime.score}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/search?q=${encodeURIComponent(query.trim())}&page=1`);
                  setShowResults(false);
                  setIsSearchExpanded(false);
                }}
                className="p-3 text-sm text-center text-primary hover:bg-muted/50 font-medium border-t transition-colors"
              >
                View all results
              </button>
            </div>
          ) : !isSearching && debouncedQuery === query ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
