"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/auth-context";

export interface CommentSettings {
  cooldownSeconds: number;
  enabled: boolean;
  updatedAt?: any;
  updatedBy?: string | null;
  updatedByEmail?: string | null;
}

export const DEFAULT_COMMENT_SETTINGS: CommentSettings = {
  cooldownSeconds: 300, // 5 minutes
  enabled: true,
};

export const PRESET_COOLDOWNS = [
  { label: "Off (0s)", seconds: 0, description: "No delay" },
  { label: "15s", seconds: 15, description: "15 seconds" },
  { label: "30s", seconds: 30, description: "30 seconds" },
  { label: "1m", seconds: 60, description: "1 minute" },
  { label: "2m", seconds: 120, description: "2 minutes" },
  { label: "5m", seconds: 300, description: "5 minutes (Default)" },
  { label: "10m", seconds: 600, description: "10 minutes" },
  { label: "15m", seconds: 900, description: "15 minutes" },
  { label: "30m", seconds: 1800, description: "30 minutes" },
  { label: "1h", seconds: 3600, description: "1 hour" },
];

export function formatCooldown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSecs = Math.ceil(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export function formatDurationLabel(seconds: number): string {
  if (seconds <= 0) return "Disabled / Instant (0s)";
  if (seconds < 60) return `${seconds} seconds`;
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  if (mins < 60) {
    return remSecs > 0 ? `${mins} min ${remSecs} sec` : `${mins} min`;
  }
  const hours = Math.floor(seconds / 60);
  const leftoverMins = Math.floor((seconds % 3600) / 60);
  return leftoverMins > 0 ? `${hours} hr ${leftoverMins} min` : `${hours} hr`;
}

export async function saveCommentSettings(
  newSettings: Partial<CommentSettings>,
  adminUser?: UserProfile | null
): Promise<void> {
  const settingsRef = doc(db, "system_settings", "comments");
  await setDoc(
    settingsRef,
    {
      ...newSettings,
      updatedAt: serverTimestamp(),
      updatedBy: adminUser?.displayName || adminUser?.uid || "Admin",
      updatedByEmail: adminUser?.email || null,
    },
    { merge: true }
  );
}

export function useCommentSettings() {
  const [settings, setSettings] = useState<CommentSettings>(DEFAULT_COMMENT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsRef = doc(db, "system_settings", "comments");

    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            cooldownSeconds: typeof data.cooldownSeconds === "number" ? data.cooldownSeconds : DEFAULT_COMMENT_SETTINGS.cooldownSeconds,
            enabled: data.enabled !== undefined ? Boolean(data.enabled) : DEFAULT_COMMENT_SETTINGS.enabled,
            updatedAt: data.updatedAt || null,
            updatedBy: data.updatedBy || null,
            updatedByEmail: data.updatedByEmail || null,
          });
        } else {
          setSettings(DEFAULT_COMMENT_SETTINGS);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to comment settings:", error);
        setSettings(DEFAULT_COMMENT_SETTINGS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    settings,
    loading,
    effectiveCooldownMs: settings.enabled && settings.cooldownSeconds > 0 ? settings.cooldownSeconds * 1000 : 0,
  };
}
