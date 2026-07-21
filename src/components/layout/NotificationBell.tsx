"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "@/hooks/use-router";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  type Timestamp,
} from "firebase/firestore";
import { getAnimeSlug, type AnimeListItem } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  MessageSquare,
  Tv,
  CheckCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationType {
  id: string;
  userId: string;
  type: "reply" | "library_update";
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Timestamp | null;
  animeId?: string;
  episodeNum?: number;
  senderId?: string;
  senderName?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Real-time notifications listener with max-5 cap
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NotificationType[];

        // Sort items by createdAt descending (newest first)
        items.sort((a, b) => {
          const timeA = a.createdAt
            ? (typeof a.createdAt.toDate === "function"
              ? a.createdAt.toDate().getTime()
              : new Date(a.createdAt as any).getTime())
            : 0;
          const timeB = b.createdAt
            ? (typeof b.createdAt.toDate === "function"
              ? b.createdAt.toDate().getTime()
              : new Date(b.createdAt as any).getTime())
            : 0;
          return timeB - timeA;
        });

        setNotifications(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error syncing notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Background library update checker
  useEffect(() => {
    if (!user) return;

    const checkLibraryUpdates = async () => {
      try {
        // Fetch library items marked as "watching"
        const libQuery = query(
          collection(db, "libraries"),
          where("userId", "==", user.uid),
          where("status", "==", "watching")
        );
        const libSnap = await getDocs(libQuery);
        const watchingAnimes = libSnap.docs.map((d) => d.data());
        if (watchingAnimes.length === 0) return;

        // Fetch latest updated episodes via internal proxy (avoids CORS)
        const latestRes = await fetch("/api/latest?type=Latest+Updated&sort=latest-updated");
        if (!latestRes.ok) throw new Error("Failed to fetch latest episodes");
        const latestJson = await latestRes.json();
        if (!latestJson.ok || !latestJson.data?.results) return;

        const latestEpisodes: AnimeListItem[] = latestJson.data.results;

        // Compare and write notifications for new episodes
        for (const apiAnime of latestEpisodes) {
          const apiSlug = getAnimeSlug(apiAnime);
          const matchedLib = watchingAnimes.find(
            (la) =>
              la.animeId === apiAnime.id ||
              (apiSlug && la.slug === apiSlug)
          );

          if (matchedLib) {
            const latestEpNum = apiAnime.episodes?.sub || 0;

            if (latestEpNum > 0) {
              // Use deterministic notifId — getDoc is faster & more reliable than a query
              const notifId = `lib_update_${user.uid}_${matchedLib.animeId}_${latestEpNum}`;
              const notifRef = doc(db, "notifications", notifId);
              const notifSnap = await getDoc(notifRef);

              if (!notifSnap.exists()) {
                await setDoc(notifRef, {
                  userId: user.uid,
                  type: "library_update",
                  title: "Library Update",
                  message: `Episode ${latestEpNum} of "${matchedLib.title}" is now available!`,
                  link: `/watch/${matchedLib.slug}?ep=${latestEpNum}`,
                  isRead: false,
                  createdAt: serverTimestamp(),
                  animeId: matchedLib.animeId,
                  episodeNum: latestEpNum,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in library update checker:", error);
      }
    };

    checkLibraryUpdates();
    // Check every 5 minutes
    const interval = setInterval(checkLibraryUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Mark a single notification as read and route
  const handleNotificationClick = async (notif: NotificationType) => {
    setIsOpen(false);
    if (!notif.isRead) {
      try {
        await setDoc(
          doc(db, "notifications", notif.id),
          { isRead: true },
          { merge: true }
        );
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }
    router.push(notif.link);
  };

  // Mark all notifications as read using a Firestore batch
  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        if (!notif.isRead) {
          batch.update(doc(db, "notifications", notif.id), { isRead: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-muted/50"
        >
          <Bell className="h-5 w-5 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-rose-50 animate-in zoom-in-50 duration-200">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[320px] bg-background/95 border-border/85 backdrop-blur-md z-[60] shadow-xl p-0 overflow-hidden"
        align="end"
        forceMount
      >
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <DropdownMenuLabel className="p-0 font-bold text-sm">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 text-xs text-primary font-bold hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </Button>
          )}
        </div>

        <DropdownMenuSeparator className="m-0 bg-border/40" />

        <div className="max-h-[350px] overflow-y-auto custom-scrollbar divide-y divide-border/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading alerts...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/60">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground/80">
                  All caught up!
                </p>
                <p className="text-[11px] text-muted-foreground">
                  You have no notifications.
                </p>
              </div>
            </div>
          ) : (
            notifications.slice(0, 5).map((notif) => {
              const formattedTime = notif.createdAt
                ? formatDistanceToNow(
                    typeof notif.createdAt.toDate === "function"
                      ? notif.createdAt.toDate()
                      : new Date(notif.createdAt as any),
                    { addSuffix: true }
                  )
                : "Just now";

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex gap-3 p-3.5 hover:bg-muted/40 transition-colors cursor-pointer relative",
                    !notif.isRead && "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border",
                        notif.type === "reply"
                          ? "bg-violet-500/10 border-violet-500/30 text-violet-500"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      )}
                    >
                      {notif.type === "reply" ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Tv className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">
                        {notif.title}
                      </p>
                      <span className="text-[9px] text-muted-foreground font-medium">
                        {formattedTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/90 font-medium leading-relaxed line-clamp-2 break-words">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <span className="absolute top-1/2 -translate-y-1/2 right-3 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
