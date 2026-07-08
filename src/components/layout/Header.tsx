"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { Search } from "@/components/Search";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "@/components/auth/AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Bookmark } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";

export default function Header() {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { user, loading, logout, openAuthModal } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 sm:px-6">
        <div className={cn("mr-4 flex transition-all overflow-hidden", "md:flex md:opacity-100 md:max-w-full md:pointer-events-auto", isSearchExpanded ? "opacity-0 max-w-0 pointer-events-none duration-300" : "opacity-100 max-w-full pointer-events-auto duration-700")}>
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
            {user && (
              <Link
                href="/library"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Library
              </Link>
            )}
          </nav>
        </div>
        <div className={cn("flex flex-1 items-center justify-between space-x-4 transition-all", "md:justify-end", isSearchExpanded ? "w-full duration-300" : "w-auto duration-700")}>
          <div className={cn("w-full flex-1 transition-all", "md:w-auto md:flex-none", isSearchExpanded ? "w-full duration-300" : "w-auto duration-700")}>
            <Suspense fallback={<div className="w-[200px] h-10 bg-muted rounded-md" />}>
              <Search isSearchExpanded={isSearchExpanded} setIsSearchExpanded={setIsSearchExpanded} />
            </Suspense>
          </div>
          
          <div className={cn("items-center gap-2", isSearchExpanded ? "hidden md:flex" : "flex")}>
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden focus-visible:ring-0 focus-visible:ring-offset-0">
                    <Avatar className={cn(
                      "h-9 w-9 transition-transform duration-200 hover:scale-105 border-2",
                      user.themeColor === "violet" && "border-violet-500",
                      user.themeColor === "rose" && "border-rose-500",
                      user.themeColor === "amber" && "border-amber-500",
                      user.themeColor === "emerald" && "border-emerald-500",
                      user.themeColor === "indigo" && "border-indigo-500"
                    )}>
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                      <AvatarFallback className="text-xs bg-muted text-foreground">
                        {user.displayName?.substring(0, 2).toUpperCase() || "US"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-background/95 border-border/85 backdrop-blur-md" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/library" className="cursor-pointer flex items-center">
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>My Library</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/library?tab=profile" className="cursor-pointer flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Edit Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
            ) : (
              <Button onClick={() => openAuthModal('login')} size="sm" className="font-semibold px-4 h-9">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
      <AuthModal />
    </header>
  );
}
