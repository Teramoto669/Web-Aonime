"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SearchIcon, Loader2, Film } from "lucide-react";

import { cn } from "@/lib/utils";
import { getSearchSuggestions } from "@/lib/api";
import type { Suggestion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Search({ isSearchExpanded, setIsSearchExpanded }: { isSearchExpanded: boolean; setIsSearchExpanded: (expanded: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        setIsLoading(true);
        try {
          const data = await getSearchSuggestions(query);
          setSuggestions(data.suggestions);
        } catch (error) {
          console.error("Failed to fetch search suggestions:", error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (query.length > 2 && suggestions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query, suggestions]);

  const handleSelect = useCallback((id: string) => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    router.push(`/anime/${id}`);
  }, [router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}&sort=-relevance&page=1`);
      setQuery("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative transition-all">
      <Command
        ref={commandRef}
        shouldFilter={false}
        className="overflow-visible bg-transparent"
      >
        <div className={cn("group relative rounded-lg border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-all", isSearchExpanded ? "w-full duration-300" : "w-auto duration-700")}>
          {/* Icon positioned absolutely to avoid duplicate icons and ensure consistent spacing */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon className="h-4 w-4 opacity-50" />
          </div>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={isSearchExpanded ? "" : "Search anime..."}
            className="flex h-10 w-full rounded-md bg-transparent py-3 pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 200);
              setIsSearchExpanded(false);
            }}
            onFocus={() => {
              if (query.length > 2) setIsOpen(true);
              setIsSearchExpanded(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim().length > 0) {
                e.preventDefault();
                handleSubmit(e as any); // Cast to any because React.FormEvent<HTMLFormElement> is expected
              }
            }}
          />
        </div>

        <CommandList className="absolute top-full mt-2 w-full scrollbar-hide">
          {isOpen && (
            <div className="animate-in fade-in-0 zoom-in-95 rounded-lg border bg-popover text-popover-foreground shadow-md outline-none overflow-hidden">
              {isLoading && (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {!isLoading && suggestions.length === 0 && query.length > 2 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              {!isLoading && suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.id}
                      value={suggestion.name}
                      onSelect={() => handleSelect(suggestion.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className="relative h-16 w-12 flex-shrink-0">
                          <Image
                            src={suggestion.poster}
                            alt={suggestion.name}
                            fill
                            className="rounded-sm object-cover"
                          />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="font-semibold truncate">
                                  {suggestion.name}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{suggestion.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="text-xs text-muted-foreground truncate">
                            {suggestion.jname}
                          </p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            {suggestion.moreInfo.map((info, i) => (
                              <span key={i}>{info}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </div>
          )}
        </CommandList>
      </Command>
    </form>
  );
}
