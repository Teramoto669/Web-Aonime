"use client";

import Link from "next/link";
import { useState, Suspense, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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
import { User, LogOut, Bookmark, Menu } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export default function Header() {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { user, loading, logout, openAuthModal } = useAuth();
  const pathname = usePathname();

  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/browse", label: "Browse" },
    ...(user ? [{ href: "/library", label: "Library" }] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = navLinks.findIndex((link) => isActive(link.href));

      if (activeIndex !== -1) {
        const activeEl = linkRefs.current[activeIndex];
        const containerEl = containerRef.current;
        if (activeEl && containerEl) {
          const containerRect = containerEl.getBoundingClientRect();
          const activeRect = activeEl.getBoundingClientRect();
          setIndicatorStyle({
            left: activeRect.left - containerRect.left,
            width: activeRect.width,
            opacity: 1,
          });
        }
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    // Use requestAnimationFrame to let DOM settle, then measure
    const handle = requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    
    return () => {
      cancelAnimationFrame(handle);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [pathname, user, navLinks.length]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <div className={cn("mr-4 flex items-center h-full transition-all overflow-hidden md:opacity-100 md:max-w-full md:pointer-events-auto", isSearchExpanded ? "opacity-0 max-w-0 pointer-events-none duration-300" : "opacity-100 max-w-full pointer-events-auto duration-700")}>
          {/* Mobile Navigation Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden mr-2 h-9 w-9 text-foreground/60 hover:text-foreground hover:bg-muted/50"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background/95 border-r border-border/80 backdrop-blur-md p-6 flex flex-col">
              <SheetHeader className="text-left border-b border-border/40 pb-4 mb-4">
                <SheetTitle className="text-xl font-black text-primary">Aonime</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1.5 text-sm font-medium">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <SheetClose key={link.href} asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center px-3 py-2.5 rounded-md transition-all relative overflow-hidden group font-medium",
                          active
                            ? "text-primary bg-primary/10 font-semibold"
                            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                        )}
                        <span className={cn("transition-all duration-200", active && "pl-2")}>
                          {link.label}
                        </span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-lg text-primary">Aonime</span>
          </Link>

          {/* Desktop Navigation */}
          <nav ref={containerRef} className="hidden md:flex relative items-center gap-6 text-sm py-1.5">
            {/* Sliding highlight indicator */}
            <span
              className="absolute bottom-0 h-[2px] bg-primary transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
              }}
            />
            {navLinks.map((link, idx) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  ref={(el) => {
                    linkRefs.current[idx] = el;
                  }}
                  className={cn(
                    "relative pb-1 pt-1 transition-colors duration-200 z-10 font-medium",
                    active
                      ? "text-primary font-semibold"
                      : "text-foreground/60 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4 transition-all duration-300">
          <div className={cn(
            "transition-all duration-300",
            isSearchExpanded ? "w-full md:w-auto" : "w-auto"
          )}>
            <Suspense fallback={<div className="w-9 h-9 md:w-48 lg:w-64 bg-muted rounded-full animate-pulse" />}>
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
