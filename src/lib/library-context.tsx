"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export type LibraryStatus = "watching" | "plan_to_watch" | "completed" | "on_hold" | "dropped";

export const statusLabels: Record<LibraryStatus, string> = {
  watching: "Watching",
  plan_to_watch: "Plan to Watch",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

export const statusBadgeStyles: Record<LibraryStatus, string> = {
  watching: "bg-emerald-600 text-white border-0 shadow-sm",
  plan_to_watch: "bg-blue-600 text-white border-0 shadow-sm",
  completed: "bg-violet-600 text-white border-0 shadow-sm",
  on_hold: "bg-amber-500 text-white border-0 shadow-sm",
  dropped: "bg-rose-600 text-white border-0 shadow-sm",
};

interface LibraryContextType {
  libraryMap: Record<string, LibraryStatus>;
  getLibraryStatus: (idOrSlug?: string | null) => LibraryStatus | null;
  isInLibrary: (idOrSlug?: string | null) => boolean;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextType>({
  libraryMap: {},
  getLibraryStatus: () => null,
  isInLibrary: () => false,
  loading: false,
});

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [libraryMap, setLibraryMap] = useState<Record<string, LibraryStatus>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setLibraryMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "libraries"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, LibraryStatus> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const status = data.status as LibraryStatus;
          if (status) {
            if (data.animeId) {
              map[String(data.animeId).toLowerCase()] = status;
            }
            if (data.slug) {
              map[String(data.slug).toLowerCase()] = status;
            }
          }
        });
        setLibraryMap(map);
        setLoading(false);
      },
      (error) => {
        console.error("LibraryContext Firestore sync error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const getLibraryStatus = useMemo(() => {
    return (idOrSlug?: string | null): LibraryStatus | null => {
      if (!idOrSlug) return null;
      const key = String(idOrSlug).toLowerCase();
      return libraryMap[key] || null;
    };
  }, [libraryMap]);

  const isInLibrary = useMemo(() => {
    return (idOrSlug?: string | null): boolean => {
      return getLibraryStatus(idOrSlug) !== null;
    };
  }, [getLibraryStatus]);

  return (
    <LibraryContext.Provider
      value={{
        libraryMap,
        getLibraryStatus,
        isInLibrary,
        loading,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useUserLibrary() {
  return useContext(LibraryContext);
}
