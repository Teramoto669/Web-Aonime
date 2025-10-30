"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "@/components/Search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 sm:px-6">
        <div className={cn("mr-4 flex transition-all overflow-hidden", isSearchExpanded ? "opacity-0 max-w-0 pointer-events-none duration-300" : "opacity-100 max-w-full duration-700")}>
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-lg text-primary">Aonime</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Home
            </Link>
            <Link
              href="/browse"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Browse
            </Link>
          </nav>
        </div>
        <div className={cn("flex flex-1 items-center justify-between space-x-2 transition-all", isSearchExpanded ? "w-full duration-300" : "w-auto duration-700")}>
          <div className={cn("w-full flex-1 transition-all", isSearchExpanded ? "w-full duration-300" : "w-auto duration-700")}>
            <Search isSearchExpanded={isSearchExpanded} setIsSearchExpanded={setIsSearchExpanded} />
          </div>
        </div>
      </div>
    </header>
  );
}
