"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookmarkCheck, Plus, Trash, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserLibrary, type LibraryStatus, statusLabels, normalizeLibraryKey } from "@/lib/library-context";

interface LibraryButtonProps {
  animeId: string;
  title: string;
  image: string;
  type: string;
  slug: string;
  className?: string;
}

const statusColors: Record<LibraryStatus, string> = {
  watching: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
  plan_to_watch: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
  completed: "bg-violet-600 hover:bg-violet-700 text-white border-violet-600",
  on_hold: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500",
  dropped: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600",
};

export default function LibraryButton({ animeId, title, image, type, slug, className }: LibraryButtonProps) {
  const { user, openAuthModal } = useAuth();
  const { toast } = useToast();
  const { getLibraryStatus, getLibraryDocId, loading: libraryLoading } = useUserLibrary();
  const [actionLoading, setActionLoading] = useState(false);

  const cleanSlug = normalizeLibraryKey(slug);
  const cleanAnimeId = normalizeLibraryKey(animeId);
  const fallbackKey = user?.uid ? `${user.uid}_${cleanSlug || cleanAnimeId}` : "";

  // Status is resolved reactively from LibraryContext across slug, animeId
  const currentStatus: LibraryStatus | null =
    getLibraryStatus(slug) ||
    getLibraryStatus(animeId) ||
    null;

  const targetDocId =
    getLibraryDocId(slug) ||
    getLibraryDocId(animeId) ||
    fallbackKey;

  const handleAdd = async () => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email address to add anime to your library.",
      });
      return;
    }

    setActionLoading(true);
    try {
      const docKey = targetDocId || fallbackKey;
      if (!docKey) return;

      // Check if watch history exists for this anime to inherit lastEpisodeWatched
      let lastEp = null;
      let lastEpAt = null;
      try {
        const historyKey = `${user.uid}_${cleanSlug || cleanAnimeId}`;
        const historyRef = doc(db, "watch_history", historyKey);
        const historySnap = await getDoc(historyRef);
        if (historySnap.exists()) {
          const histData = historySnap.data();
          lastEp = histData.episodeNum || null;
          lastEpAt = histData.watchedAt || null;
        }
      } catch (_) {}

      const docRef = doc(db, "libraries", docKey);
      await setDoc(
        docRef,
        {
          userId: user.uid,
          animeId: cleanAnimeId || cleanSlug,
          title: String(title || slug).trim(),
          image: typeof image === "string" ? image.trim() : "",
          type: String(type || "TV").trim(),
          slug: cleanSlug || cleanAnimeId,
          status: "watching" as LibraryStatus,
          addedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(lastEp ? { lastEpisodeWatched: String(lastEp) } : {}),
          ...(lastEpAt ? { lastEpisodeWatchedAt: lastEpAt } : {}),
        },
        { merge: true }
      );

      toast({
        title: "Added to Library",
        description: `"${title}" has been added to your library.`,
      });
    } catch (error) {
      console.error("Error adding anime to library:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add",
        description: "An error occurred. Please try again.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: LibraryStatus) => {
    if (!user) return;

    if (!user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email address to update your library.",
      });
      return;
    }

    setActionLoading(true);
    try {
      const docKey = targetDocId || fallbackKey;
      if (!docKey) return;
      const docRef = doc(db, "libraries", docKey);
      await setDoc(
        docRef,
        {
          status: newStatus,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: "Status Updated",
        description: `"${title}" status updated to ${statusLabels[newStatus]}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update anime status.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;

    if (!user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email address to modify your library.",
      });
      return;
    }

    setActionLoading(true);
    try {
      if (targetDocId) {
        await deleteDoc(doc(db, "libraries", targetDocId));
      }
      // Clean up alternate doc IDs if any exist
      if (cleanSlug && `${user.uid}_${cleanSlug}` !== targetDocId) {
        try {
          await deleteDoc(doc(db, "libraries", `${user.uid}_${cleanSlug}`));
        } catch (_) {}
      }
      if (cleanAnimeId && `${user.uid}_${cleanAnimeId}` !== targetDocId) {
        try {
          await deleteDoc(doc(db, "libraries", `${user.uid}_${cleanAnimeId}`));
        } catch (_) {}
      }

      toast({
        title: "Removed from Library",
        description: `"${title}" has been removed from your library.`,
      });
    } catch (error) {
      console.error("Error removing from library:", error);
      toast({
        variant: "destructive",
        title: "Failed to Remove",
        description: "Failed to remove anime from your library.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (libraryLoading && user) {
    return (
      <Button disabled variant="outline" className={cn("gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (currentStatus) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={actionLoading}
            className={cn("gap-2 font-semibold border-2 transition-all shadow-md pr-3", statusColors[currentStatus], className)}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookmarkCheck className="h-4 w-4" />
            )}
            <span>{statusLabels[currentStatus]}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-background/95 border-border/80 backdrop-blur-md" align="start">
          {Object.entries(statusLabels).map(([key, label]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => handleUpdateStatus(key as LibraryStatus)}
              className={cn(
                "cursor-pointer font-medium",
                currentStatus === key && "text-primary bg-primary/10 font-bold"
              )}
            >
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleRemove}
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
          >
            <Trash className="mr-2 h-4 w-4" />
            Remove from Library
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleAdd}
      disabled={actionLoading}
      className={cn("gap-2 font-semibold border-primary/50 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm", className)}
    >
      {actionLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Add to Library
    </Button>
  );
}
