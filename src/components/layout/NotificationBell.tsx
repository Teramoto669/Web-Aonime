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
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getAnimeSlug } from "@/lib/types";
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
      where("userId", "==", user.uid)
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

        // Cap at 5: Delete excess oldest notifications in the background
        if (items.length > 5) {
          const excessItems = items.slice(5);
          excessItems.forEach(async (item) => {
            try {
              await deleteDoc(doc(db, "notifications", item.id));
            } catch (err) {
              console.error("Error deleting excess notification:", err);
            }
          });
        }

        setNotifications(items.slice(0, 5));
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
        const watchingAnimes = libSnap.docs.map((doc) => doc.data());
        if (watchingAnimes.length === 0) return;

        // Fetch latest home page releases
        const homeRes = await fetch("/api/home");
        if (!homeRes.ok) throw new Error("Failed to fetch home data");
        const homeJson = await homeRes.json();
        if (!homeJson.ok || !homeJson.data?.latestEpisodes) return;

        const latestEpisodes = homeJson.data.latestEpisodes;

        // Compare and write notifications for new episodes
        for (const homeAnime of latestEpisodes) {
          const slug = getAnimeSlug(homeAnime);
          const matchedLib = watchingAnimes.find(
            (la) => la.animeId === homeAnime.id || la.slug === slug
          );

          if (matchedLib) {
            const sub = homeAnime.episodes?.sub || 0;
            const dub = homeAnime.episodes?.dub || 0;
            const total = homeAnime.episodes?.total || 0;
            const latestEpNum = Math.max(sub, dub, total);

            if (latestEpNum > 0) {
              // Deterministic notification ID prevents duplicates
              const notifId = `lib_update_${user.uid}_${matchedLib.animeId}_${latestEpNum}`;
              const notifRef = doc(db, "notifications", notifId);

              await setDoc(
                notifRef,
                {
                  userId: user.uid,
                  type: "library_update",
                  title: "Library Update",
                  message: `Episode ${latestEpNum} of "${matchedLib.title}" is now available!`,
                  link: `/watch/${matchedLib.slug}?ep=${latestEpNum}`,
                  isRead: false,
                  createdAt: serverTimestamp(),
                  animeId: matchedLib.animeId,
                  episodeNum: latestEpNum,
                },
                { merge: true }
              );
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

        <div className="max-h-[350px] overflow-y-auto divide-y divide-border/30">
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
            notifications.map((notif) => {
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
