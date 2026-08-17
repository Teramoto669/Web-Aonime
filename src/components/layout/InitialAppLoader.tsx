"use client";

import React from "react";

export function InitialAppLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center space-y-5 text-center px-4">
        {/* Loading Indicator */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden relative">
          <div className="h-full bg-primary rounded-full w-full animate-pulse" />
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
          Loading account & experience...
        </p>
      </div>
    </div>
  );
}
