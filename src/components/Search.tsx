"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Search({ isSearchExpanded, setIsSearchExpanded }: { isSearchExpanded: boolean; setIsSearchExpanded: (expanded: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&page=1`);
      setQuery("");
      setIsSearchExpanded(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
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
    <form onSubmit={handleSubmit} className="relative transition-all">
      <div className={cn("group relative rounded-lg border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-all", isSearchExpanded ? "w-full duration-300" : "w-auto duration-700")}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <SearchIcon className="h-4 w-4 opacity-50" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={getPlaceholder()}
          className="flex h-10 w-full rounded-md bg-transparent py-3 pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          onBlur={() => {
            setTimeout(() => setIsSearchExpanded(false), 200);
          }}
          onFocus={() => {
            setIsSearchExpanded(true);
          }}
        />
      </div>
    </form>
  );
}
