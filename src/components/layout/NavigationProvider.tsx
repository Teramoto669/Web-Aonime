"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

function NavigationEvents({
  isNavigating,
  setIsNavigating,
}: {
  isNavigating: boolean;
  setIsNavigating: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reset navigating state when pathname or searchParams change
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams, setIsNavigating]);

  return null;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  const startNavigation = () => setIsNavigating(true);
  const stopNavigation = () => setIsNavigating(false);

  // Trickling progress bar logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNavigating) {
      setProgress(10);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const remaining = 90 - prev;
          const step = Math.max(1, Math.floor(remaining * 0.1));
          return prev + step;
        });
      }, 200);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => {
        setProgress(0);
      }, 300);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(interval);
  }, [isNavigating]);

  // Safety fallback timeout
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isNavigating) {
      timeout = setTimeout(() => {
        setIsNavigating(false);
      }, 5000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isNavigating]);

  // Intercept local anchor clicks
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (isNavigating) {
        const anchor = (e.target as HTMLElement).closest("a");
        if (anchor) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        // Start navigation state
        setIsNavigating(true);
      } catch (err) {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [isNavigating]);

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation, stopNavigation }}>
      <Suspense fallback={null}>
        <NavigationEvents isNavigating={isNavigating} setIsNavigating={setIsNavigating} />
      </Suspense>

      {/* Premium Top Progress Bar */}
      {progress > 0 && (
        <div
          className="fixed top-0 left-0 h-[3px] bg-primary z-[99999] transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            boxShadow: "0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary))",
          }}
        />
      )}

      {/* Invisible blocker overlay to prevent clicks/interactions during transition */}
      {isNavigating && (
        <div
          className="fixed inset-0 z-[99998] cursor-wait bg-black/5 pointer-events-auto select-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {children}
    </NavigationContext.Provider>
  );
}
