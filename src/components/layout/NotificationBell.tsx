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
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
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
import { getAnimeSlug, type AnimeListItem } from "@/lib/types";

interface NotificationType {
  id: string;
  userId: string;
  type: "reply" | "library_update";
  title: string;
  message: string;
  link: string;
  image?: string;
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

  // Helper to validate internal relative navigation links (prevents open redirect & phishing)
  const getSafeInternalLink = (url?: string): string => {
    if (!url || typeof url !== "string") return "/";
    const trimmed = url.trim();
    if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
      return trimmed;
    }
    return "/";
  };

  // Real-time listener for user's notifications
  useEffect(() => {
    if (!user?.uid) {
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
        const items: NotificationType[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as NotificationType);
        });

        // Sort: unread first, then newer timestamp
        items.sort((a, b) => {
          if (a.isRead !== b.isRead) {
            return a.isRead ? 1 : -1;
          }
          const timeA = a.createdAt
            ? typeof a.createdAt.toDate === "function"
              ? a.createdAt.toDate().getTime()
              : new Date(a.createdAt as any).getTime()
            : 0;
          const timeB = b.createdAt
            ? typeof b.createdAt.toDate === "function"
              ? b.createdAt.toDate().getTime()
              : new Date(b.createdAt as any).getTime()
            : 0;
          return timeB - timeA;
        });

        // Deduplicate notifications by anime title/slug and episode
        const titleRegex = /of\s+"([^"]+)"/i;
        const seenKeys = new Set<string>();
        const deduplicated: NotificationType[] = [];

        for (const notif of items) {
          const extractedTitle = notif.message?.match(titleRegex)?.[1]?.toLowerCase()?.trim() || "";
          const slugKey = (notif.animeId || notif.link?.replace('/watch/', '')?.split('?')[0] || extractedTitle || notif.id).toLowerCase().trim();
          const epKey = notif.episodeNum !== undefined && notif.episodeNum !== null ? String(notif.episodeNum) : "";
          const dedupKey = `${slugKey}_${epKey}`;

          if (!seenKeys.has(dedupKey)) {
            seenKeys.add(dedupKey);
            deduplicated.push(notif);
          }
        }

        setNotifications(deduplicated);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Periodic background check for new episodes of anime in user's watching library
  useEffect(() => {
    if (!user?.uid) return;

    const checkLibraryUpdates = async () => {
      try {
        // 1. Fetch user's watching items from Firestore
        const libQuery = query(
          collection(db, "libraries"),
          where("userId", "==", user.uid),
          where("status", "==", "watching")
        );
        const libSnap = await getDocs(libQuery);
        if (libSnap.empty) return;

        const watchingAnimes = libSnap.docs.map((d) => d.data());

        // 2. Fetch latest updated episodes from /api/updated and /api/home
        let latestEpisodes: AnimeListItem[] = [];
        try {
          const resUpdated = await fetch("/api/updated?refresh=1", { cache: "no-store" });
          if (resUpdated.ok) {
            const data = await resUpdated.json();
            const list = Array.isArray(data.data) ? data.data : data.data?.results || [];
            latestEpisodes = [...latestEpisodes, ...list];
          }
        } catch (_) {}

        try {
          const resHome = await fetch("/api/home?refresh=1", { cache: "no-store" });
          if (resHome.ok) {
            const data = await resHome.json();
            const list = Array.isArray(data.data?.latestEpisodes) ? data.data.latestEpisodes : [];
            latestEpisodes = [...latestEpisodes, ...list];
          }
        } catch (_) {}

        if (latestEpisodes.length === 0) return;

        // Deduplicate cards by slug/id + episode number
        const uniqueCards = new Map<string, AnimeListItem>();
        for (const item of latestEpisodes) {
          const slug = getAnimeSlug(item) || item.id || "";
          const ep = (item.episodes?.sub || (item as any).totalEpisodes || (item as any).episode || 0);
          const key = `${slug}_${ep}`;
          if (slug && !uniqueCards.has(key)) {
            uniqueCards.set(key, item);
          }
        }

        // 3. Match against watching items and create notifications
        for (const apiAnime of Array.from(uniqueCards.values())) {
          const apiSlug = getAnimeSlug(apiAnime).toLowerCase().trim();
          const apiId = (apiAnime.id || "").toLowerCase().trim();
          const apiTitle = (apiAnime.title || "").toLowerCase().trim();
          const latestEpNum = (apiAnime.episodes?.sub || (apiAnime as any).totalEpisodes || (apiAnime as any).episode || 0);

          if (latestEpNum <= 0) continue;

          const matchedLib = watchingAnimes.find((la) => {
            const lSlug = (la.slug || "").toLowerCase().trim();
            const lId = (la.animeId || "").toLowerCase().trim();
            const lTitle = (la.title || "").toLowerCase().trim();

            const matchSlug = apiSlug && lSlug && (lSlug === apiSlug || lSlug.includes(apiSlug) || apiSlug.includes(lSlug));
            const matchId = (apiId && lId && lId === apiId) || (apiId && lSlug && lSlug === apiId);
            const matchTitle = apiTitle && lTitle && (lTitle === apiTitle || lTitle.includes(apiTitle) || apiTitle.includes(lTitle));

            return matchSlug || matchId || matchTitle;
          });

          if (matchedLib) {
            const safeSlug = String(matchedLib.slug || apiSlug || matchedLib.animeId || "anime")
              .replace(/\//g, "_")
              .toLowerCase()
              .trim();
            const notifId = `lib_update_${user.uid}_${safeSlug}_${latestEpNum}`;
            const altId = `lib_update_${user.uid}_${String(matchedLib.animeId || "").replace(/\//g, "_")}_${latestEpNum}`;

            const notifRef = doc(db, "notifications", notifId);
            const altRef = doc(db, "notifications", altId);

            const [notifSnap, altSnap] = await Promise.all([getDoc(notifRef), getDoc(altRef)]);

            if (!notifSnap.exists() && !altSnap.exists()) {
              await setDoc(notifRef, {
                userId: user.uid,
                type: "library_update",
                title: "Library Update",
                message: `Episode ${latestEpNum} of "${matchedLib.title || apiAnime.title || "Anime"}" is now available!`,
                link: `/watch/${matchedLib.slug || safeSlug}?ep=${latestEpNum}`,
                image: matchedLib.image || apiAnime.image || "",
                isRead: false,
                createdAt: serverTimestamp(),
                animeId: safeSlug,
                episodeNum: latestEpNum,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error checking library updates:", err);
      }
    };

    checkLibraryUpdates();
    const interval = setInterval(checkLibraryUpdates, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Mark a single notification as read and route safely
  const handleNotificationClick = async (notif: NotificationType) => {
    setIsOpen(false);
    if (!notif.isRead) {
      try {
        const titleRegex = /of\s+"([^"]+)"/i;
        const extractedTitle = notif.message?.match(titleRegex)?.[1]?.toLowerCase()?.trim() || "";
        const targetSlug = (notif.animeId || notif.link?.replace('/watch/', '')?.split('?')[0] || extractedTitle).toLowerCase().trim();
        const targetEp = notif.episodeNum !== undefined ? String(notif.episodeNum) : "";

        const batch = writeBatch(db);
        batch.set(doc(db, "notifications", notif.id), { isRead: true }, { merge: true });

        // Also mark any duplicate docs in state as read
        notifications.forEach((other) => {
          if (!other.isRead && other.id !== notif.id) {
            const oTitle = other.message?.match(titleRegex)?.[1]?.toLowerCase()?.trim() || "";
            const oSlug = (other.animeId || other.link?.replace('/watch/', '')?.split('?')[0] || oTitle).toLowerCase().trim();
            const oEp = other.episodeNum !== undefined ? String(other.episodeNum) : "";
            if (oSlug === targetSlug && oEp === targetEp) {
              batch.set(doc(db, "notifications", other.id), { isRead: true }, { merge: true });
            }
          }
        });
        await batch.commit();
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }
    router.push(getSafeInternalLink(notif.link));
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
          className="relative h-9 w-9 rounded-full hover:bg-muted/50 overflow-visible focus-visible:ring-1"
        >
          <Bell className="h-5 w-5 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-background z-10 pointer-events-none animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
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

