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

export function normalizeLibraryKey(key?: string | null): string {
  if (!key) return "";
  return String(key).toLowerCase().trim().replace(/\//g, "_");
}

interface LibraryContextType {
  libraryMap: Record<string, LibraryStatus>;
  docIdMap: Record<string, string>;
  getLibraryStatus: (idOrSlug?: string | null) => LibraryStatus | null;
  getLibraryDocId: (idOrSlug?: string | null) => string | null;
  isInLibrary: (idOrSlug?: string | null) => boolean;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextType>({
  libraryMap: {},
  docIdMap: {},
  getLibraryStatus: () => null,
  getLibraryDocId: () => null,
  isInLibrary: () => false,
  loading: false,
});

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [libraryMap, setLibraryMap] = useState<Record<string, LibraryStatus>>({});
  const [docIdMap, setDocIdMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setLibraryMap({});
      setDocIdMap({});
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
        const sMap: Record<string, LibraryStatus> = {};
        const dMap: Record<string, string> = {};

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const status = data.status as LibraryStatus;
          if (status) {
            const uniqueKeys: string[] = [];
            if (data.animeId) uniqueKeys.push(normalizeLibraryKey(data.animeId));
            if (data.slug) uniqueKeys.push(normalizeLibraryKey(data.slug));
            const idAfterUid = normalizeLibraryKey(docSnap.id.replace(`${user.uid}_`, ""));
            if (idAfterUid) uniqueKeys.push(idAfterUid);

            uniqueKeys.forEach((k) => {
              if (k) {
                sMap[k] = status;
                dMap[k] = docSnap.id;
              }
            });
          }
        });

        setLibraryMap(sMap);
        setDocIdMap(dMap);
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
      const key = normalizeLibraryKey(idOrSlug);
      if (!key) return null;
      return libraryMap[key] || null;
    };
  }, [libraryMap]);

  const getLibraryDocId = useMemo(() => {
    return (idOrSlug?: string | null): string | null => {
      const key = normalizeLibraryKey(idOrSlug);
      if (!key) return null;
      return docIdMap[key] || null;
    };
  }, [docIdMap]);

  const isInLibrary = useMemo(() => {
    return (idOrSlug?: string | null): boolean => {
      return getLibraryStatus(idOrSlug) !== null;
    };
  }, [getLibraryStatus]);

  return (
    <LibraryContext.Provider
      value={{
        libraryMap,
        docIdMap,
        getLibraryStatus,
        getLibraryDocId,
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
