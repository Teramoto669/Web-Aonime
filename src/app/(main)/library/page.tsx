"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth, PRESET_AVATARS, PRESET_THEMES, applyThemeColor } from "@/lib/auth-context";
import { db, auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, verifyBeforeUpdateEmail, sendEmailVerification, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { compressImage } from "@/lib/image-utils";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Bookmark,
  User,
  Search,
  Trash2,
  Loader2,
  FolderHeart,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Check,
  Upload,
  KeyRound,
  UserX,
  Play,
  History,
  Clock,
  Sliders,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Info,
  Palette,
  HardDrive,
  UserPlus,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import type { AnimeListItem } from "@/lib/types";
import { Pagination } from "@/components/Pagination";
import { useBlockedFilters } from "@/lib/blocked-filters-context";
import {
  useCommentSettings,
  saveCommentSettings,
  PRESET_COOLDOWNS,
  formatDurationLabel,
  DEFAULT_COMMENT_SETTINGS,
} from "@/lib/system-settings";
import {
  getLocalLibraryItems,
  getLocalHistoryItems,
  upsertLocalLibraryItem,
  removeLocalLibraryItem,
  removeLocalHistoryItem,
  clearLocalHistory,
  LOCAL_DATA_EVENT,
  type LibraryStatus,
} from "@/lib/library-context";

const ITEMS_PER_PAGE = 24;

interface LibraryItem {
  id: string;
  userId: string;
  animeId: string;
  title: string;
  image: string;
  type: string;
  slug: string;
  status: "watching" | "plan_to_watch" | "completed" | "on_hold" | "dropped";
  addedAt: any;
  updatedAt: any;
  lastEpisodeWatched?: string;
  lastEpisodeWatchedAt?: any;
}

interface WatchHistoryItem {
  id: string;
  userId: string;
  animeId: string;
  title: string;
  image: string;
  type: string;
  slug: string;
  episodeNum: string;
  watchedAt: any;
}

function formatRelativeTime(timestamp: any): string {
  if (!timestamp) return "Recently";
  // Check if timestamp has a toDate method (Firestore Timestamp)
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
}

const statusLabels: Record<string, string> = {
  watching: "Watching",
  plan_to_watch: "Plan to Watch",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

function LibraryPageContent() {
  const {
    user,
    isAdmin,
    loading: authLoading,
    openAuthModal,
    loginAsLocal,
    updateUserProfile,
    addEmailToAccount,
    changeUserPassword,
    resetPassword,
    deleteUserAccount
  } = useAuth();
  const { isAnimeBlocked, blockedFilters } = useBlockedFilters();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const targetUserId = searchParams.get("user");
  const isOwnLibrary = !targetUserId || (user && targetUserId === user.uid);
  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam === "history"
      ? "history"
      : tabParam === "profile" && !user?.isLocal
      ? "profile"
      : tabParam === "admin" && !user?.isLocal
      ? "admin"
      : "library";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // State
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [libraryPage, setLibraryPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  
  // Viewed user state (for loading other users' libraries)
  const [viewedUser, setViewedUser] = useState<{
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    themeColor: string;
    email?: string | null;
  } | null>(null);
  const [loadingViewedUser, setLoadingViewedUser] = useState(true);

  // Profile settings state
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");
  const [customThemeHex, setCustomThemeHex] = useState("#ec4899");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Add Email state (for users who signed up without email)
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [addEmailPassword, setAddEmailPassword] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);

  // Admin settings state
  const { settings: currentCommentSettings, loading: loadingCommentSettings } = useCommentSettings();
  const [adminCooldownSeconds, setAdminCooldownSeconds] = useState<number>(300);
  const [adminUnverifiedCooldownSeconds, setAdminUnverifiedCooldownSeconds] = useState<number>(900);
  const [adminRegisterMax, setAdminRegisterMax] = useState<number>(2);
  const [adminRegisterWindowMinutes, setAdminRegisterWindowMinutes] = useState<number>(60);
  const [adminCooldownEnabled, setAdminCooldownEnabled] = useState<boolean>(true);
  const [customMinutes, setCustomMinutes] = useState<string>("5");
  const [customSeconds, setCustomSeconds] = useState<string>("0");
  const [customUnverifiedMinutes, setCustomUnverifiedMinutes] = useState<string>("15");
  const [customUnverifiedSeconds, setCustomUnverifiedSeconds] = useState<string>("0");
  const [savingAdminSettings, setSavingAdminSettings] = useState(false);

  // Sync comment settings when loaded
  useEffect(() => {
    if (currentCommentSettings) {
      setAdminCooldownSeconds(currentCommentSettings.cooldownSeconds);
      const unv = currentCommentSettings.unverifiedCooldownSeconds ?? 900;
      setAdminUnverifiedCooldownSeconds(unv);
      setAdminRegisterMax(currentCommentSettings.registerRateLimitMax ?? 2);
      setAdminRegisterWindowMinutes(currentCommentSettings.registerRateLimitWindowMinutes ?? 60);
      setAdminCooldownEnabled(currentCommentSettings.enabled);
      setCustomMinutes(Math.floor(currentCommentSettings.cooldownSeconds / 60).toString());
      setCustomSeconds((currentCommentSettings.cooldownSeconds % 60).toString());
      setCustomUnverifiedMinutes(Math.floor(unv / 60).toString());
      setCustomUnverifiedSeconds((unv % 60).toString());
    }
  }, [currentCommentSettings]);

  const handleCustomDurationChange = (minutesStr: string, secondsStr: string) => {
    setCustomMinutes(minutesStr);
    setCustomSeconds(secondsStr);
    const mins = Math.max(0, parseInt(minutesStr) || 0);
    const secs = Math.max(0, parseInt(secondsStr) || 0);
    setAdminCooldownSeconds(mins * 60 + secs);
  };

  const handleSelectPreset = (seconds: number) => {
    setAdminCooldownSeconds(seconds);
    setCustomMinutes(Math.floor(seconds / 60).toString());
    setCustomSeconds((seconds % 60).toString());
  };

  const handleCustomUnverifiedDurationChange = (minutesStr: string, secondsStr: string) => {
    setCustomUnverifiedMinutes(minutesStr);
    setCustomUnverifiedSeconds(secondsStr);
    const mins = Math.max(0, parseInt(minutesStr) || 0);
    const secs = Math.max(0, parseInt(secondsStr) || 0);
    setAdminUnverifiedCooldownSeconds(mins * 60 + secs);
  };

  const handleSelectUnverifiedPreset = (seconds: number) => {
    setAdminUnverifiedCooldownSeconds(seconds);
    setCustomUnverifiedMinutes(Math.floor(seconds / 60).toString());
    setCustomUnverifiedSeconds((seconds % 60).toString());
  };

  const handleSaveAdminCommentSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Unauthorized Access",
        description: "You do not have administrator permissions to modify system settings.",
      });
      return;
    }

    setSavingAdminSettings(true);
    try {
      await saveCommentSettings(
        {
          cooldownSeconds: Math.max(0, adminCooldownSeconds),
          unverifiedCooldownSeconds: Math.max(0, adminUnverifiedCooldownSeconds),
          registerRateLimitMax: Math.max(1, adminRegisterMax),
          registerRateLimitWindowMinutes: Math.max(1, adminRegisterWindowMinutes),
          enabled: adminCooldownEnabled,
        },
        user
      );
      toast({
        title: "Settings Saved Successfully!",
        description: `Verified: ${formatDurationLabel(adminCooldownSeconds)}, Unverified: ${formatDurationLabel(adminUnverifiedCooldownSeconds)} (${adminCooldownEnabled ? "Enabled" : "Disabled"}).`,
      });
    } catch (err: any) {
      console.error("Error saving comment settings:", err);
      toast({
        variant: "destructive",
        title: "Failed to Save Settings",
        description: err.message || "An unexpected error occurred while saving system settings.",
      });
    } finally {
      setSavingAdminSettings(false);
    }
  };

  const handleResetCommentSettings = () => {
    setAdminCooldownSeconds(DEFAULT_COMMENT_SETTINGS.cooldownSeconds);
    setAdminUnverifiedCooldownSeconds(DEFAULT_COMMENT_SETTINGS.unverifiedCooldownSeconds);
    setAdminRegisterMax(DEFAULT_COMMENT_SETTINGS.registerRateLimitMax);
    setAdminRegisterWindowMinutes(DEFAULT_COMMENT_SETTINGS.registerRateLimitWindowMinutes);
    setAdminCooldownEnabled(DEFAULT_COMMENT_SETTINGS.enabled);
    setCustomMinutes(Math.floor(DEFAULT_COMMENT_SETTINGS.cooldownSeconds / 60).toString());
    setCustomSeconds((DEFAULT_COMMENT_SETTINGS.cooldownSeconds % 60).toString());
    setCustomUnverifiedMinutes(Math.floor(DEFAULT_COMMENT_SETTINGS.unverifiedCooldownSeconds / 60).toString());
    setCustomUnverifiedSeconds((DEFAULT_COMMENT_SETTINGS.unverifiedCooldownSeconds % 60).toString());
  };

  // Password update state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Delete account state
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Sync profile state when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setSelectedAvatar(user.photoURL || "");
      const userTheme = user.themeColor || "violet";
      setSelectedTheme(userTheme);
      if (userTheme.startsWith("#")) {
        setCustomThemeHex(userTheme);
      }
    }
  }, [user?.photoURL, user?.themeColor]);

  // Load viewed user details
  useEffect(() => {
    if (isOwnLibrary) {
      let linked: string | null = null;
      try {
        if (user?.uid) linked = localStorage.getItem(`aonime_linked_email_${user.uid}`);
      } catch {}
      const cleanEmail =
        linked ||
        (user?.email && !user.email.endsWith("@noemail.aonime.local") ? user.email : null);
      setViewedUser(user ? { ...user, email: cleanEmail } : null);
      setLoadingViewedUser(false);
      return;
    }

    if (!targetUserId) {
      setViewedUser(null);
      setLoadingViewedUser(false);
      return;
    }

    setLoadingViewedUser(true);
    const userDocRef = doc(db, "users", targetUserId);
    getDoc(userDocRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setViewedUser({
            uid: targetUserId,
            displayName: data.displayName || "Aonime User",
            photoURL: data.photoURL || null,
            themeColor: data.themeColor || "violet",
            email: null, // Protect private details
          });
        } else {
          setViewedUser(null);
        }
        setLoadingViewedUser(false);
      })
      .catch((err) => {
        console.error("Error fetching viewed user profile:", err);
        setViewedUser(null);
        setLoadingViewedUser(false);
      });
  }, [user?.uid, user?.displayName, user?.photoURL, user?.themeColor, targetUserId, isOwnLibrary]);

  // Real-time Firestore or Local sync
  useEffect(() => {
    const fetchId = isOwnLibrary ? user?.uid : targetUserId;
    if (!fetchId) {
      setLibraryItems([]);
      setLoadingItems(false);
      return;
    }

    if (isOwnLibrary && user?.isLocal) {
      const syncLocalLib = () => {
        const local = getLocalLibraryItems().map((item) => ({
          ...item,
          addedAt: { seconds: Math.floor((item.addedAt || Date.now()) / 1000) },
          updatedAt: { seconds: Math.floor((item.updatedAt || Date.now()) / 1000) },
        })) as LibraryItem[];
        local.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        setLibraryItems(local);
        setLoadingItems(false);
      };
      syncLocalLib();
      window.addEventListener(LOCAL_DATA_EVENT, syncLocalLib);
      window.addEventListener("storage", syncLocalLib);
      return () => {
        window.removeEventListener(LOCAL_DATA_EVENT, syncLocalLib);
        window.removeEventListener("storage", syncLocalLib);
      };
    }

    setLoadingItems(true);
    const q = query(
      collection(db, "libraries"),
      where("userId", "==", fetchId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LibraryItem[];
        
        // Sort items in JavaScript by updatedAt to avoid index creation requirements
        items.sort((a, b) => {
          const timeA = a.updatedAt?.seconds || 0;
          const timeB = b.updatedAt?.seconds || 0;
          return timeB - timeA;
        });

        setLibraryItems(items);
        setLoadingItems(false);
      },
      (error) => {
        console.error("Firestore sync error:", error);
        setLoadingItems(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.isLocal, targetUserId, isOwnLibrary]);

  // Watch History states
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Sync Watch History (only for owned library)
  useEffect(() => {
    if (!isOwnLibrary || !user?.uid) {
      setHistoryItems([]);
      setLoadingHistory(false);
      return;
    }

    if (user.isLocal) {
      const syncLocalHist = () => {
        const local = getLocalHistoryItems().map((item) => ({
          ...item,
          watchedAt: new Date(item.watchedAt || Date.now()),
        })) as WatchHistoryItem[];
        local.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
        setHistoryItems(local);
        setLoadingHistory(false);
      };
      syncLocalHist();
      window.addEventListener(LOCAL_DATA_EVENT, syncLocalHist);
      window.addEventListener("storage", syncLocalHist);
      return () => {
        window.removeEventListener(LOCAL_DATA_EVENT, syncLocalHist);
        window.removeEventListener("storage", syncLocalHist);
      };
    }

    setLoadingHistory(true);
    const q = query(
      collection(db, "watch_history"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WatchHistoryItem[];

        items.sort((a, b) => {
          const timeA = a.watchedAt?.seconds || 0;
          const timeB = b.watchedAt?.seconds || 0;
          return timeB - timeA;
        });

        setHistoryItems(items);
        setLoadingHistory(false);
      },
      (error) => {
        console.error("Watch history sync error:", error);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.isLocal, isOwnLibrary]);

  const handleRemoveHistoryItem = async (itemId: string, animeTitle: string) => {
    if (user?.isLocal) {
      removeLocalHistoryItem(itemId);
      toast({
        title: "Removed from History",
        description: `"${animeTitle}" has been removed from your local watch history.`,
      });
      return;
    }
    try {
      const docRef = doc(db, "watch_history", itemId);
      await deleteDoc(docRef);
      toast({
        title: "Removed from History",
        description: `"${animeTitle}" has been removed from your watch history.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Remove Failed",
        description: "Failed to remove item from history.",
      });
    }
  };

  const handleClearHistory = async () => {
    if (historyItems.length === 0) return;
    if (user?.isLocal) {
      clearLocalHistory();
      toast({
        title: "History Cleared",
        description: "Your local watch history has been cleared.",
      });
      return;
    }
    try {
      const deletePromises = historyItems.map((item) =>
        deleteDoc(doc(db, "watch_history", item.id))
      );
      await Promise.all(deletePromises);
      toast({
        title: "History Cleared",
        description: "Your watch history has been cleared.",
      });
    } catch (error) {
      console.error("Error clearing history:", error);
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: "Failed to clear watch history.",
      });
    }
  };

  const handleUpdateStatus = async (itemId: string, newStatus: string, animeTitle: string) => {
    if (user?.isLocal) {
      const existing = libraryItems.find((i) => i.id === itemId);
      if (existing) {
        upsertLocalLibraryItem({
          id: existing.id,
          animeId: existing.animeId,
          title: existing.title,
          image: existing.image,
          type: existing.type,
          slug: existing.slug,
          status: newStatus as LibraryStatus,
        });
      }
      toast({
        title: "Status Updated",
        description: `"${animeTitle}" changed to ${statusLabels[newStatus]}.`,
      });
      return;
    }
    try {
      const docRef = doc(db, "libraries", itemId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Status Updated",
        description: `"${animeTitle}" changed to ${statusLabels[newStatus]}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "An error occurred while updating status.",
      });
    }
  };

  const handleRemoveItem = async (itemId: string, animeTitle: string) => {
    if (user?.isLocal) {
      removeLocalLibraryItem(itemId);
      toast({
        title: "Removed from Library",
        description: `"${animeTitle}" has been removed.`,
      });
      return;
    }
    try {
      const docRef = doc(db, "libraries", itemId);
      await deleteDoc(docRef);
      toast({
        title: "Removed from Library",
        description: `"${animeTitle}" has been removed.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Remove Failed",
        description: "Failed to remove item from library.",
      });
    }
  };

  // Avatar Upload via Base64 Data URI (No third-party cloud storage required)
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || user.isLocal) return;

    setUploadingFile(true);
    try {
      // Compress the image client-side to maximum 256x256 at 85% quality JPEG Base64 (~15-25KB)
      const base64AvatarUrl = await compressImage(file, 256, 256, 0.85);

      setSelectedAvatar(base64AvatarUrl);
      toast({
        title: "Avatar Processed",
        description: "Preview updated. Click 'Save Profile Changes' to apply permanently.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to process avatar image.",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isLocal) return;

    if (!displayName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Display name cannot be empty.",
      });
      return;
    }

    setUpdatingProfile(true);
    try {
      await updateUserProfile({
        displayName,
        photoURL: selectedAvatar,
        themeColor: selectedTheme,
      });
      toast({
        title: "Profile Updated",
        description: "Your profile changes have been saved successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setUpdatingProfile(true);
      setTimeout(() => setUpdatingProfile(false), 300);
    }
  };

  // Add Email to No-Email Account
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isLocal) return;

    const trimmedEmail = newAccountEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }
    if (!addEmailPassword) {
      toast({
        variant: "destructive",
        title: "Password Required",
        description: "Please enter your current password to confirm adding an email.",
      });
      return;
    }

    setAddingEmail(true);
    try {
      let res: { mode: "updated" | "verify_before_update" };
      if (typeof addEmailToAccount === "function") {
        res = await addEmailToAccount(trimmedEmail, addEmailPassword);
      } else {
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) throw new Error("No active authenticated user session.");
        const oldAuthEmail = currentUser.email;
        const credential = EmailAuthProvider.credential(oldAuthEmail, addEmailPassword);
        await reauthenticateWithCredential(currentUser, credential);
        let mode: "updated" | "verify_before_update" = "updated";
        try {
          await updateEmail(currentUser, trimmedEmail);
          await currentUser.getIdToken(true).catch(() => {});
          sendEmailVerification(currentUser).catch(() => {});
        } catch (e: any) {
          if (e?.code === "auth/operation-not-allowed") {
            await verifyBeforeUpdateEmail(currentUser, trimmedEmail);
            mode = "verify_before_update";
          } else {
            throw e;
          }
        }
        try {
          localStorage.setItem(`aonime_linked_email_${currentUser.uid}`, trimmedEmail);
          localStorage.setItem(`aonime_email_to_user_${trimmedEmail.toLowerCase()}`, oldAuthEmail);
          const rawCache = localStorage.getItem("aonime_user_cache");
          if (rawCache) {
            const parsed = JSON.parse(rawCache);
            parsed.email = trimmedEmail;
            parsed.isNoEmailAccount = false;
            localStorage.setItem("aonime_user_cache", JSON.stringify(parsed));
          }
        } catch {}
        try {
          await setDoc(doc(db, "users", currentUser.uid), { email: trimmedEmail }, { merge: true });
        } catch {}
        res = { mode };
      }
      setViewedUser((prev) => (prev ? { ...prev, email: trimmedEmail } : prev));
      setNewAccountEmail("");
      setAddEmailPassword("");
      if (res.mode === "verify_before_update") {
        toast({
          title: "Verification Link Sent",
          description: `We sent a verification link to ${trimmedEmail}. Click the link in your inbox to activate your email.`,
        });
      } else {
        toast({
          title: "Email Added Successfully",
          description: `Your email (${trimmedEmail}) has been linked! Check your inbox to verify it for faster comment cooldowns.`,
        });
      }
    } catch (error: any) {
      let desc = "Failed to add email. Please try again.";
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        desc = "Incorrect current password.";
      } else if (error.code === "auth/email-already-in-use") {
        desc = "This email address is already linked to another account.";
      } else if (error.code === "auth/invalid-email") {
        desc = "Invalid email address format.";
      }
      toast({
        variant: "destructive",
        title: "Failed to Add Email",
        description: desc,
      });
    } finally {
      setAddingEmail(false);
    }
  };

  // Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isLocal) return;

    if (!currentPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Current password is required.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "New password must be at least 6 characters.",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "New passwords do not match.",
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      if (typeof changeUserPassword === "function") {
        await changeUserPassword(currentPassword, newPassword);
      } else {
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) throw new Error("No active authenticated user session.");
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);
      }
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      let desc = "Failed to update password. Please check your credentials.";
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        desc = "Incorrect current password.";
      } else if (error.code === "auth/weak-password") {
        desc = "New password is too weak.";
      }
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: desc,
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Forgot / Reset Password from Edit Profile
  const handleResetPasswordFromProfile = async () => {
    if (!user || user.isLocal) return;
    const rawEmail = viewedUser?.email || (user.email && !user.email.endsWith("@noemail.aonime.local") ? user.email : null);
    if (!rawEmail) {
      toast({
        variant: "destructive",
        title: "Email Required for Password Reset",
        description: "Your account does not have an email address linked yet. Please add an email address first to use password reset.",
      });
      const emailInput = document.getElementById("add-account-email");
      if (emailInput) emailInput.focus();
      return;
    }

    setSendingResetEmail(true);
    try {
      if (typeof resetPassword === "function") {
        await resetPassword(rawEmail);
      } else {
        await sendPasswordResetEmail(auth, rawEmail);
      }
      toast({
        title: "Password Reset Email Sent",
        description: `We have sent a password reset link to ${rawEmail}. Check your inbox and spam folder.`,
      });
    } catch (error: any) {
      let desc = "Failed to send password reset email. Please try again.";
      if (error.code === "auth/too-many-requests") {
        desc = "Too many requests. Please wait a few minutes before trying again.";
      } else if (error.code === "auth/user-not-found") {
        desc = "Please verify the newly added email address in your inbox first before requesting a password reset.";
      }
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: desc,
      });
    } finally {
      setSendingResetEmail(false);
    }
  };

  // Destructive Account Deletion
  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // Perform Firebase Auth and Firestore deletions
      await deleteUserAccount(user.isGoogleUser ? undefined : deleteConfirmPassword);
      toast({
        title: "Account Deleted",
        description: "Your account and library records have been deleted permanently.",
      });
      setDeleteDialogOpen(false);
      window.location.href = "/";
    } catch (error: any) {
      console.error(error);
      let desc = "Failed to delete account. Please try again.";
      if (error.code === "auth/wrong-password") {
        desc = "Incorrect current password.";
      }
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: desc,
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Filter & search calculations
  const filteredItems = libraryItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalLibraryPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const currentLibraryPage = Math.min(Math.max(1, libraryPage), Math.max(1, totalLibraryPages));
  const paginatedLibraryItems = filteredItems.slice(
    (currentLibraryPage - 1) * ITEMS_PER_PAGE,
    currentLibraryPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (libraryPage > totalLibraryPages && totalLibraryPages > 0) {
      setLibraryPage(totalLibraryPages);
    }
  }, [filteredItems.length, totalLibraryPages, libraryPage]);

  const handleLibraryPageChange = (newPage: number) => {
    setLibraryPage(newPage);
    const element = document.getElementById("library-content-top");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const filteredHistoryItems = historyItems;

  const totalHistoryPages = Math.ceil(filteredHistoryItems.length / ITEMS_PER_PAGE);
  const currentHistoryPage = Math.min(Math.max(1, historyPage), Math.max(1, totalHistoryPages));
  const paginatedHistoryItems = filteredHistoryItems.slice(
    (currentHistoryPage - 1) * ITEMS_PER_PAGE,
    currentHistoryPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (historyPage > totalHistoryPages && totalHistoryPages > 0) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyItems.length, totalHistoryPages, historyPage]);

  const handleHistoryPageChange = (newPage: number) => {
    setHistoryPage(newPage);
    const element = document.getElementById("history-content-top");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getThemeAccentClass = () => {
    return "text-primary border-primary hover:opacity-80";
  };

  const getThemeBgClass = () => {
    return "bg-primary text-primary-foreground hover:opacity-90";
  };

  if (authLoading || (targetUserId && loadingViewedUser)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!isOwnLibrary && !viewedUser) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-card/40 border border-border/60 rounded-2xl shadow-xl backdrop-blur-md">
        <UserX className="h-16 w-16 mx-auto text-destructive mb-6" />
        <h1 className="text-3xl font-black mb-3">User Not Found</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          The user you are looking for does not exist or has deleted their library profile.
        </p>
        <Button asChild className="w-full font-bold h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  if (isOwnLibrary && !user) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-card/40 border border-border/60 rounded-2xl shadow-xl backdrop-blur-md">
        <FolderHeart className="h-16 w-16 mx-auto text-muted-foreground/60 mb-6" />
        <h1 className="text-3xl font-black mb-3">My Library</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          Sign in to your Aonime account or use a Local Account to save, track episode progress, and organize your favorite anime.
        </p>
        <div className="space-y-3">
          <Button onClick={() => openAuthModal("login")} className="w-full font-bold h-11">
            Sign In Now
          </Button>
          <Button onClick={() => openAuthModal("register")} variant="outline" className="w-full font-bold h-11 border-border/80">
            Create New Account
          </Button>
          <Button onClick={() => loginAsLocal()} variant="secondary" className="w-full font-bold h-11">
            Use Local Account (Library & History Only)
          </Button>
        </div>
      </div>
    );
  }

  const libraryListContent = (
    <div id="library-content-top" className="space-y-6">
      {/* Controls: Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/25 p-4 rounded-xl border border-border/30">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setLibraryPage(1);
            }}
            className="pl-9 bg-background/50 border-border/60 focus-visible:ring-primary"
          />
        </div>
        {/* Status pills filters */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => {
              setSelectedStatus("all");
              setLibraryPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
              selectedStatus === "all"
                ? getThemeBgClass() + " border-transparent"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border-border/60"
            )}
          >
            All
          </button>
          {Object.entries(statusLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedStatus(key);
                setLibraryPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap",
                selectedStatus === key
                  ? getThemeBgClass() + " border-transparent"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border-border/60"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of anime items */}
      {loadingItems ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-card/10 rounded-2xl border border-dashed border-border/40">
          <FolderHeart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-lg">No anime found</p>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            {searchQuery
              ? "Try searching with a different keyword or check your status filter."
              : "No anime tracked in this category yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-14 gap-6">
            {paginatedLibraryItems.map((item) => {
              const mockListItem: AnimeListItem = {
                id: item.animeId,
                slug: item.slug,
                title: item.title,
                image: item.image,
                type: item.type,
                episodes: {},
              };

              return (
                <div key={item.id} className="group relative flex flex-col bg-card/25 border border-border/30 rounded-lg p-2.5 transition-all hover:shadow-lg hover:border-primary/20">
                  <div className="flex-1">
                    <AnimeCard anime={mockListItem} />
                  </div>
                  
                  {isOwnLibrary && item.lastEpisodeWatched && (
                    <Link
                      href={`/watch/${item.slug}?ep=${item.lastEpisodeWatched}`}
                      prefetch={false}
                      className="mt-2 flex items-center justify-center gap-1 w-full h-7 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all duration-200 text-center shadow-xs"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                      <span>Resume Ep {item.lastEpisodeWatched}</span>
                    </Link>
                  )}

                  {isOwnLibrary ? (
                    <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between gap-1">
                      <Select
                        value={item.status}
                        onValueChange={(val) => handleUpdateStatus(item.id, val, item.title)}
                      >
                        <SelectTrigger className="h-7 w-[72%] text-[11px] font-bold bg-muted/60 border-border/40 hover:border-border/80 focus:ring-0 focus:ring-offset-0 px-2 py-1 gap-1 text-foreground transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 border-border/60 backdrop-blur-md z-60 shadow-xl">
                          {Object.entries(statusLabels).map(([k, lbl]) => (
                            <SelectItem key={k} value={k} className="text-xs font-semibold cursor-pointer">
                              {lbl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id, item.title)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                        title="Remove from library"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 pt-2.5 border-t border-border/30 flex flex-col items-center gap-1.5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                        item.status === "watching" && "bg-violet-500/10 text-violet-400 border border-violet-500/20",
                        item.status === "plan_to_watch" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        item.status === "completed" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                        item.status === "on_hold" && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                        item.status === "dropped" && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}>
                        {statusLabels[item.status]}
                      </span>
                      {item.lastEpisodeWatched && (
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Ep {item.lastEpisodeWatched} watched
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalLibraryPages > 1 && (
            <div className="pt-6">
              <Pagination
                currentPage={currentLibraryPage}
                totalPages={totalLibraryPages}
                hasNextPage={currentLibraryPage < totalLibraryPages}
                hasPreviousPage={currentLibraryPage > 1}
                onPageChange={handleLibraryPageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Profile Header Banner */}
      <div className={cn(
        "relative rounded-2xl p-6 md:p-8 overflow-hidden border border-border/40 shadow-xl flex flex-col md:flex-row items-center gap-6",
        "bg-linear-to-r from-background via-card/30 to-background"
      )}>
        {/* Visual glassmorphic decor */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative">
          <img
            src={(isOwnLibrary ? selectedAvatar : viewedUser?.photoURL) || PRESET_AVATARS[0].url}
            alt={viewedUser?.displayName || "Avatar"}
            className={cn(
              "h-24 w-24 rounded-full border-4 shadow-lg object-cover bg-muted/20",
              viewedUser?.themeColor === "violet" && "border-violet-500",
              viewedUser?.themeColor === "rose" && "border-rose-500",
              viewedUser?.themeColor === "amber" && "border-amber-500",
              viewedUser?.themeColor === "emerald" && "border-emerald-500",
              viewedUser?.themeColor === "indigo" && "border-indigo-500",
              (!viewedUser?.themeColor || viewedUser?.themeColor.startsWith("#")) && "border-primary"
            )}
          />

        </div>

        <div className="text-center md:text-left space-y-1 flex-1">
          <h1 className="text-3xl font-black tracking-tight">{viewedUser?.displayName}</h1>
          {isOwnLibrary && (user?.isLocal || viewedUser?.email) && (
            <p className="text-muted-foreground text-sm font-medium">
              {user?.isLocal ? "Local Account (Stored on this device only)" : viewedUser?.email}
            </p>
          )}
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/15 text-primary rounded-full border border-primary/20">
              {libraryItems.length} Anime {isOwnLibrary ? "saved" : "tracked"}
            </span>
            {(!user?.isLocal || !isOwnLibrary) && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-muted/60 text-muted-foreground rounded-full border border-border/40 capitalize">
                Theme {viewedUser?.themeColor}
              </span>
            )}
          </div>
        </div>

        {isOwnLibrary && user?.isLocal && (
          <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-primary/10 border border-primary/25 rounded-xl p-3.5 max-w-sm">
            <div className="text-xs text-muted-foreground text-center sm:text-left">
              <p className="font-bold text-foreground mb-0.5">Sync & Unlock Comments</p>
              <p className="text-[11px] leading-relaxed">
                Create an account to transfer your {libraryItems.length} library items & {historyItems.length} watch history entries to the cloud.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => openAuthModal("register")}
              className="font-bold text-xs shrink-0 whitespace-nowrap"
            >
              Create Account
            </Button>
          </div>
        )}
      </div>

      {/* Main Tabs / Content */}
      {!isOwnLibrary ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-xl font-bold">Anime Tracker</h2>
          </div>
          {libraryListContent}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Tab Dropdown */}
          <div className="md:hidden w-full mb-6">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-11 bg-muted/60 border border-border/40 rounded-xl px-4 text-sm font-bold flex items-center justify-between text-foreground focus:ring-0 focus:ring-offset-0">
                <div className="flex items-center gap-2">
                  {activeTab === "library" && <Bookmark className="h-4 w-4 text-primary" />}
                  {activeTab === "history" && <History className="h-4 w-4 text-primary" />}
                  {activeTab === "profile" && <User className="h-4 w-4 text-primary" />}
                  {activeTab === "admin" && <ShieldCheck className="h-4 w-4 text-amber-400" />}
                  <span>
                    {activeTab === "library" && "My Library"}
                    {activeTab === "history" && "Watch History"}
                    {activeTab === "profile" && "Edit Profile"}
                    {activeTab === "admin" && "Admin Settings"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-background/95 border border-border/60 backdrop-blur-md z-50 rounded-xl shadow-xl">
                <SelectItem value="library" className="font-bold text-sm py-3 px-4 cursor-pointer pl-4 [&>span.absolute]:hidden data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary focus:bg-primary/10 focus:text-primary">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-primary" />
                    <span>My Library</span>
                  </div>
                </SelectItem>
                <SelectItem value="history" className="font-bold text-sm py-3 px-4 cursor-pointer pl-4 [&>span.absolute]:hidden data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary focus:bg-primary/10 focus:text-primary">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <span>Watch History</span>
                  </div>
                </SelectItem>
                {!user?.isLocal && (
                  <SelectItem value="profile" className="font-bold text-sm py-3 px-4 cursor-pointer pl-4 [&>span.absolute]:hidden data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary focus:bg-primary/10 focus:text-primary">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span>Edit Profile</span>
                    </div>
                  </SelectItem>
                )}
                {isAdmin && !user?.isLocal && (
                  <SelectItem value="admin" className="font-bold text-sm py-3 px-4 cursor-pointer pl-4 [&>span.absolute]:hidden data-[state=checked]:bg-primary/15 data-[state=checked]:text-primary focus:bg-primary/10 focus:text-primary">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>Admin Settings</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tab List */}
          <TabsList className="hidden md:flex w-max bg-muted/60 border border-border/40 p-1 rounded-xl mb-6">
            <TabsTrigger value="library" className="rounded-lg font-bold text-sm px-6 py-2.5 flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg font-bold text-sm px-6 py-2.5 flex items-center gap-2">
              <History className="h-4 w-4" />
              Watch History
            </TabsTrigger>
            {!user?.isLocal && (
              <TabsTrigger value="profile" className="rounded-lg font-bold text-sm px-6 py-2.5 flex items-center gap-2">
                <User className="h-4 w-4" />
                Edit Profile
              </TabsTrigger>
            )}
            {isAdmin && !user?.isLocal && (
              <TabsTrigger value="admin" className="rounded-lg font-bold text-sm px-6 py-2.5 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Admin Settings
              </TabsTrigger>
            )}
          </TabsList>

          {/* --- LIBRARY TAB --- */}
          <TabsContent value="library" className="space-y-6 focus-visible:outline-hidden">
            {libraryListContent}
          </TabsContent>

          {/* --- WATCH HISTORY TAB --- */}
          <TabsContent value="history" id="history-content-top" className="space-y-6 focus-visible:outline-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/25 p-4 rounded-xl border border-border/30">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-sm">Recently Watched Anime</h3>
              </div>
              {historyItems.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleClearHistory}
                  className="h-9 px-4 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear History
                </Button>
              )}
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-20 bg-card/10 rounded-2xl border border-dashed border-border/40">
                <History className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-lg">No watch history</p>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                  Anime you watch will show up here. Go start watching some shows!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 4xl:grid-cols-10 5xl:grid-cols-14 gap-6">
                  {paginatedHistoryItems.map((item) => {
                    const mockListItem: AnimeListItem = {
                      id: item.animeId,
                      slug: item.slug,
                      title: item.title,
                      image: item.image,
                      type: item.type,
                      episodes: {},
                    };

                    return (
                      <div key={item.id} className="group relative flex flex-col bg-card/25 border border-border/30 rounded-lg p-2.5 transition-all hover:shadow-lg hover:border-primary/20">
                        <div className="flex-1">
                          <AnimeCard anime={mockListItem} />
                        </div>
                        
                        <div className="mt-2 text-[10px] font-semibold text-muted-foreground flex flex-col items-center justify-center text-center bg-muted/20 py-1 rounded">
                          <span className="font-bold text-foreground">Ep {item.episodeNum} watched</span>
                          <span className="text-[9px] opacity-75">{formatRelativeTime(item.watchedAt)}</span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between gap-1">
                          <Link
                            href={`/watch/${item.slug}?ep=${item.episodeNum}`}
                            prefetch={false}
                            className="flex items-center justify-center gap-1 h-7 w-[72%] text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all uppercase tracking-wider text-center"
                          >
                            <Play className="h-2.5 w-2.5 fill-current" />
                            Resume
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveHistoryItem(item.id, item.title)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                            title="Remove from history"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalHistoryPages > 1 && (
                  <div className="pt-6">
                    <Pagination
                      currentPage={currentHistoryPage}
                      totalPages={totalHistoryPages}
                      hasNextPage={currentHistoryPage < totalHistoryPages}
                      hasPreviousPage={currentHistoryPage > 1}
                      onPageChange={handleHistoryPageChange}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

        {/* --- PROFILE TAB --- */}
        <TabsContent value="profile" className="max-w-2xl bg-card/20 border border-border/30 rounded-2xl p-6 md:p-8 focus-visible:outline-hidden space-y-8 animate-in fade-in duration-300">
          
          {/* Form 1: General Info */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight mb-2 border-b border-border/30 pb-2">Profile Settings</h2>
            
            {/* Display Name Input */}
            <div className="space-y-2">
              <Label htmlFor="display-name">Username / Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11"
              />
            </div>

            {/* Avatar Select & Upload */}
            <div className="space-y-4">
              <Label>Profile Picture</Label>
              
              {/* Preset selection grid */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Select Preset Character:</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {PRESET_AVATARS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.url;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.url)}
                        className={cn(
                          "relative rounded-full aspect-square overflow-hidden border-2 bg-muted/20 transition-all hover:scale-105",
                          isSelected 
                            ? "border-primary scale-105"
                            : "border-border/50 hover:border-border"
                        )}
                        title={avatar.name}
                      >
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Supabase Local Image Upload */}
              <div className="space-y-2 pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Upload className="h-3 w-3" />
                  Or Upload Custom Avatar (stored in Supabase Storage):
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    disabled={uploadingFile}
                    className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 text-sm py-2 cursor-pointer"
                  />
                  {uploadingFile && (
                    <div className="flex items-center gap-2 text-xs text-amber-500 font-semibold pl-1 whitespace-nowrap">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading to Supabase...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Accent Theme Color Selection */}
            <div className="space-y-3">
              <Label>Theme Accent Color</Label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {PRESET_THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setSelectedTheme(theme.id);
                        applyThemeColor(theme.id);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-[1.02]",
                        isSelected
                          ? "bg-primary text-primary-foreground border-transparent shadow-md"
                          : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted"
                      )}
                      style={isSelected ? { backgroundColor: theme.color, color: "#ffffff" } : {}}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: theme.color }} />
                      {theme.name}
                    </button>
                  );
                })}

                {/* Custom Color Picker Option */}
                {(() => {
                  const isPreset = PRESET_THEMES.some((t) => t.id === selectedTheme);
                  const isCustom = !isPreset && (selectedTheme.startsWith("#") || selectedTheme.startsWith("custom:"));
                  const currentCustomColor = isCustom ? (selectedTheme.startsWith("#") ? selectedTheme : selectedTheme.replace("custom:", "")) : (customThemeHex || "#ec4899");

                  return (
                    <React.Fragment key="custom-theme-option">
                      <label
                        className={cn(
                          "relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-[1.02] cursor-pointer select-none",
                          isCustom
                            ? "bg-primary text-primary-foreground border-transparent shadow-md"
                            : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted"
                        )}
                        style={isCustom ? { backgroundColor: currentCustomColor, color: "#ffffff" } : {}}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs shrink-0"
                          style={{ backgroundColor: currentCustomColor }}
                        />
                        <span>Custom</span>
                        <input
                          type="color"
                          value={currentCustomColor.startsWith("#") ? currentCustomColor : "#ec4899"}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            setCustomThemeHex(newColor);
                            setSelectedTheme(newColor);
                            applyThemeColor(newColor);
                          }}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          title="Click to pick a custom theme accent color"
                        />
                      </label>

                      {isCustom && (
                        <div className="flex items-center gap-1.5 bg-muted/40 border border-border/60 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-inner">
                          <Palette className="w-3.5 h-3.5 text-primary" />
                          <input
                            type="text"
                            value={selectedTheme}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedTheme(val);
                              if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                setCustomThemeHex(val);
                                applyThemeColor(val);
                              }
                            }}
                            className="w-16 bg-transparent text-xs font-mono font-bold text-foreground focus:outline-hidden uppercase"
                            placeholder="#HEX"
                            maxLength={7}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })()}
              </div>
            </div>

            {/* Custom Input for Avatar URL */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label htmlFor="custom-avatar">Or paste custom image URL</Label>
              <Input
                id="custom-avatar"
                value={selectedAvatar}
                onChange={(e) => setSelectedAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={updatingProfile || uploadingFile}
                className={cn("font-bold h-11 px-8 shadow-md", getThemeBgClass())}
              >
                {updatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Profile Changes"
                )}
              </Button>
            </div>
          </form>

          {/* Form 1.5: Add Email to Account (Only visible if user signed up without email) */}
          {(!viewedUser?.email && (user?.isNoEmailAccount || (!user?.email && !user?.isLocal && !user?.isGoogleUser) || user?.email?.endsWith("@noemail.aonime.local"))) && (
            <form onSubmit={handleAddEmail} className="space-y-6 pt-6 border-t border-border/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">Add Email Address</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Link an email address to your account to enable password recovery and unlock faster verified comment cooldowns.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-account-email">Email Address</Label>
                  <Input
                    id="add-account-email"
                    type="email"
                    value={newAccountEmail}
                    onChange={(e) => setNewAccountEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-email-password">Current Password</Label>
                  <Input
                    id="add-email-password"
                    type="password"
                    value={addEmailPassword}
                    onChange={(e) => setAddEmailPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={addingEmail}
                  className="font-bold h-11 px-8 border border-border/60 hover:bg-muted bg-transparent text-foreground"
                >
                  {addingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Email...
                    </>
                  ) : (
                    "Add Email"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Form 2: Password Modification & Reset Password */}
          <div className="space-y-6 pt-6 border-t border-border/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Change &amp; Reset Password</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendingResetEmail}
                onClick={handleResetPasswordFromProfile}
                className="h-9 text-xs font-bold border-border/60 hover:bg-muted"
              >
                {sendingResetEmail ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </div>

            {!user?.isGoogleUser ? (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="current-password">Current Password</Label>
                      <button
                        type="button"
                        onClick={handleResetPasswordFromProfile}
                        disabled={sendingResetEmail}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm Password</Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Retype password"
                      className="bg-muted/20 border-border/60 focus-visible:ring-primary h-11"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updatingPassword}
                    className="font-bold h-11 px-8 border border-border/60 hover:bg-muted bg-transparent text-foreground"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">
                You are signed in with Google ({user.email}). If you want to set or reset a direct password for your account, click <strong>Send Reset Link</strong> above.
              </p>
            )}
          </div>

          {/* Form 3: Danger Zone - Account Deletion */}
          <div className="space-y-6 pt-6 border-t border-border/30">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-bold tracking-tight text-destructive">Danger Zone</h2>
            </div>
            
            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-red-200">Delete Account Permanently</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Once deleted, your account credentials, library bookmarks, and profile preferences will be deleted forever.
                </p>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="font-bold shadow-md">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border-border/80 max-w-[400px] p-6 rounded-xl shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-black text-destructive flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 animate-bounce" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-2">
                      This action is irreversible. All your library list and profile details will be permanently wiped.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {!user?.isGoogleUser ? (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="delete-pwd" className="text-xs font-semibold">Enter Password to Confirm</Label>
                      <Input
                        id="delete-pwd"
                        type="password"
                        value={deleteConfirmPassword}
                        onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                        placeholder="Type password"
                        disabled={isDeletingAccount}
                        className="bg-muted/20 border-border/80 focus-visible:ring-destructive h-10 text-sm"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-4 italic">
                      You will be prompted to re-authenticate with Google first.
                    </p>
                  )}

                  <AlertDialogFooter className="mt-6 flex gap-2">
                    <AlertDialogCancel disabled={isDeletingAccount} className="border-border/85 h-10 text-xs font-semibold">
                      Cancel
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      disabled={isDeletingAccount || (!user?.isGoogleUser && !deleteConfirmPassword)}
                      onClick={handleDeleteAccount}
                      className="h-10 text-xs font-bold"
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          Deleting...
                        </>
                      ) : (
                        "Permanently Delete"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

        </TabsContent>

        {/* --- ADMIN SETTINGS TAB --- */}
        <TabsContent value="admin" className="max-w-2xl bg-card/20 border border-border/30 rounded-2xl p-6 md:p-8 focus-visible:outline-hidden space-y-8 animate-in fade-in duration-300">
          {!isAdmin ? (
            <div className="text-center py-16 bg-card/10 border border-dashed border-destructive/40 rounded-2xl p-8 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
                <ShieldX className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-destructive">Access Restricted</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You do not have administrator permissions to access this control panel.
                </p>
              </div>
              <Button onClick={() => setActiveTab("library")} variant="outline" className="font-bold border-border/60 text-xs">
                Return to My Library
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSaveAdminCommentSettings} className="space-y-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30 pb-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
                  <p className="text-xs text-muted-foreground">
                    Configure global parameters, rate limits, and spam protection timers across the platform.
                  </p>
                </div>
              </div>

              {/* Comment Cooldown Section (Verified Accounts) */}
              <div className="space-y-5 p-5 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Comment Cooldown Timer (Verified Accounts)</h3>
                    <p className="text-xs text-muted-foreground">
                      Sets the waiting period between consecutive comments or replies for email-verified and Google users.
                    </p>
                  </div>

                  {/* Toggle Enabled / Disabled */}
                  <Button
                    type="button"
                    variant={adminCooldownEnabled ? "default" : "outline"}
                    onClick={() => setAdminCooldownEnabled(!adminCooldownEnabled)}
                    className={cn(
                      "h-8 px-3 text-xs font-bold transition-all shadow-xs",
                      adminCooldownEnabled
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                        : "border-border/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {adminCooldownEnabled ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Cooldown Active
                      </>
                    ) : (
                      "Cooldown Disabled"
                    )}
                  </Button>
                </div>

                {/* Preset Quick Buttons */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    Quick Preset Durations:
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PRESET_COOLDOWNS.map((preset) => {
                      const isSelected = adminCooldownSeconds === preset.seconds;
                      return (
                        <button
                          key={preset.seconds}
                          type="button"
                          onClick={() => handleSelectPreset(preset.seconds)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all",
                            isSelected
                              ? "bg-primary/15 text-primary border-primary/50 shadow-xs"
                              : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground"
                          )}
                        >
                          <span className="font-extrabold text-sm">{preset.label}</span>
                          <span className="text-[10px] opacity-75 font-normal">{preset.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Duration Input */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <Label className="text-xs text-muted-foreground">Or Set Custom Duration:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Minutes</span>
                      <Input
                        type="number"
                        min="0"
                        max="1440"
                        value={customMinutes}
                        onChange={(e) => handleCustomDurationChange(e.target.value, customSeconds)}
                        placeholder="0"
                        className="bg-background/60 border-border/60 h-10 text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Seconds</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={customSeconds}
                        onChange={(e) => handleCustomDurationChange(customMinutes, e.target.value)}
                        placeholder="0"
                        className="bg-background/60 border-border/60 h-10 text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-3 bg-card/40 border border-border/40 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Verified Account Wait Time:</span>
                    <strong className="text-foreground font-mono font-bold">
                      {adminCooldownEnabled && adminCooldownSeconds > 0
                        ? formatDurationLabel(adminCooldownSeconds)
                        : "Disabled (0s delay)"}
                    </strong>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-muted/60 rounded border border-border/40 text-muted-foreground">
                    {adminCooldownSeconds}s total
                  </span>
                </div>
              </div>

              {/* Unverified / No-Email Account Comment Cooldown Section */}
              <div className="space-y-5 p-5 rounded-xl bg-amber-500/5 border border-amber-500/25">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Comment Cooldown Timer (No-Email / Unverified Accounts)</h3>
                  <p className="text-xs text-muted-foreground">
                    Sets a separate (usually longer) waiting period between comments for accounts created without an email or without email verification.
                  </p>
                </div>

                {/* Preset Quick Buttons */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-amber-400" />
                    Quick Preset Durations (Unverified):
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: "5 Min", seconds: 300, description: "Same" },
                      { label: "10 Min", seconds: 600, description: "Moderate" },
                      { label: "15 Min", seconds: 900, description: "Default" },
                      { label: "30 Min", seconds: 1800, description: "Strict" },
                      { label: "60 Min", seconds: 3600, description: "Max Anti-Spam" },
                    ].map((preset) => {
                      const isSelected = adminUnverifiedCooldownSeconds === preset.seconds;
                      return (
                        <button
                          key={preset.seconds}
                          type="button"
                          onClick={() => handleSelectUnverifiedPreset(preset.seconds)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all",
                            isSelected
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/50 shadow-xs"
                              : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70 hover:text-foreground"
                          )}
                        >
                          <span className="font-extrabold text-sm">{preset.label}</span>
                          <span className="text-[10px] opacity-75 font-normal">{preset.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Duration Input */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <Label className="text-xs text-muted-foreground">Or Set Custom Unverified Cooldown:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Minutes</span>
                      <Input
                        type="number"
                        min="0"
                        max="1440"
                        value={customUnverifiedMinutes}
                        onChange={(e) => handleCustomUnverifiedDurationChange(e.target.value, customUnverifiedSeconds)}
                        placeholder="15"
                        className="bg-background/60 border-border/60 h-10 text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Seconds</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={customUnverifiedSeconds}
                        onChange={(e) => handleCustomUnverifiedDurationChange(customUnverifiedMinutes, e.target.value)}
                        placeholder="0"
                        className="bg-background/60 border-border/60 h-10 text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-card/40 border border-border/40 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Unverified Account Wait Time:</span>
                    <strong className="text-amber-400 font-mono font-bold">
                      {adminCooldownEnabled && adminUnverifiedCooldownSeconds > 0
                        ? formatDurationLabel(adminUnverifiedCooldownSeconds)
                        : "Disabled (0s delay)"}
                    </strong>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-muted/60 rounded border border-border/40 text-muted-foreground">
                    {adminUnverifiedCooldownSeconds}s total
                  </span>
                </div>
              </div>

              {/* Account Creation Anti-Spam Rate Limit Section */}
              <div className="space-y-5 p-5 rounded-xl bg-muted/20 border border-border/40">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Account Registration Anti-Spam Rate Limit</h3>
                  <p className="text-xs text-muted-foreground">
                    Prevents automated account spam by limiting how many accounts can be created per IP address & device within a rolling time window.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Max New Accounts Allowed
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={adminRegisterMax}
                      onChange={(e) => setAdminRegisterMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="2"
                      className="bg-background/60 border-border/60 h-10 text-sm font-semibold"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Maximum accounts per IP/device per window (Default: 2).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Cooldown Window (Minutes)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="10080"
                      value={adminRegisterWindowMinutes}
                      onChange={(e) => setAdminRegisterWindowMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="60"
                      className="bg-background/60 border-border/60 h-10 text-sm font-semibold"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Time window in minutes before new registrations are allowed again (Default: 60 min).
                    </p>
                  </div>
                </div>

                {/* Real-time Status Card */}
                {currentCommentSettings && (
                  <div className="p-3 bg-muted/10 border border-border/30 rounded-lg space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Verified / Unverified Cooldown:</span>
                      <strong className="text-foreground font-mono">
                        {currentCommentSettings.enabled
                          ? `${formatDurationLabel(currentCommentSettings.cooldownSeconds)} / ${formatDurationLabel(currentCommentSettings.unverifiedCooldownSeconds)}`
                          : "Disabled"}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Registration Rate Limit:</span>
                      <strong className="text-foreground font-mono">
                        Max {currentCommentSettings.registerRateLimitMax} accounts per {currentCommentSettings.registerRateLimitWindowMinutes}m
                      </strong>
                    </div>
                    {currentCommentSettings.updatedBy && (
                      <div className="flex items-center justify-between">
                        <span>Last modified by:</span>
                        <span className="text-foreground font-medium">{currentCommentSettings.updatedBy}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetCommentSettings}
                  disabled={savingAdminSettings}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 h-10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset All to Defaults
                </Button>

                <Button
                  type="submit"
                  disabled={savingAdminSettings || loadingCommentSettings}
                  className="font-bold h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all"
                >
                  {savingAdminSettings ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Settings...
                    </>
                  ) : (
                    "Save Admin Settings"
                  )}
                </Button>
              </div>
            </form>
          )}
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-medium">Loading your profile...</p>
      </div>
    }>
      <LibraryPageContent />
    </Suspense>
  );
}
