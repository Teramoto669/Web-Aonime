"use client";

import React, { useEffect, useState } from "react";
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
import { Bookmark, BookmarkCheck, Plus, Trash, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryButtonProps {
  animeId: string;
  title: string;
  image: string;
  type: string;
  slug: string;
  className?: string;
}

type LibraryStatus = "watching" | "plan_to_watch" | "completed" | "on_hold" | "dropped";

const statusLabels: Record<LibraryStatus, string> = {
  watching: "Watching",
  plan_to_watch: "Plan to Watch",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

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
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) {
      setStatus(null);
      return;
    }

    const checkLibrary = async () => {
      setFetching(true);
      try {
        const docRef = doc(db, "libraries", `${user.uid}_${animeId}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setStatus(snap.data().status as LibraryStatus);
        } else {
          setStatus(null);
        }
      } catch (error) {
        console.error("Error reading library status:", error);
      } finally {
        setFetching(false);
      }
    };

    checkLibrary();
  }, [user, animeId]);

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

    setLoading(true);
    try {
      const docRef = doc(db, "libraries", `${user.uid}_${animeId}`);
      await setDoc(docRef, {
        userId: user.uid,
        animeId,
        title,
        image: image || "",
        type: type || "TV",
        slug,
        status: "watching" as LibraryStatus,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStatus("watching");
      toast({
        title: "Added to Library",
        description: `"${title}" has been added to your library.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to Add",
        description: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      const docRef = doc(db, "libraries", `${user.uid}_${animeId}`);
      await setDoc(
        docRef,
        {
          status: newStatus,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setStatus(newStatus);
      toast({
        title: "Status Updated",
        description: `"${title}" status updated to ${statusLabels[newStatus]}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update anime status.",
      });
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      const docRef = doc(db, "libraries", `${user.uid}_${animeId}`);
      await deleteDoc(docRef);
      setStatus(null);
      toast({
        title: "Removed from Library",
        description: `"${title}" has been removed from your library.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to Remove",
        description: "Failed to remove anime from your library.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Button disabled variant="outline" className={cn("gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (status) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={loading}
            className={cn("gap-2 font-semibold border-2 transition-all shadow-md pr-3", statusColors[status], className)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookmarkCheck className="h-4 w-4" />
            )}
            <span>{statusLabels[status]}</span>
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
                status === key && "text-primary bg-primary/10 font-bold"
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
      disabled={loading}
      className={cn("gap-2 font-semibold border-primary/50 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm", className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Add to Library
    </Button>
  );
}
