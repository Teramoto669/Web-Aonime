"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth, PRESET_AVATARS, PRESET_THEMES } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { uploadAvatarToSupabase, compressImage, deleteAvatarFromSupabase } from "@/lib/supabase";
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
  Sparkles,
  FolderHeart,
  ShieldAlert,
  Check,
  Upload,
  KeyRound,
  UserX,
  Play,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import type { AnimeListItem } from "@/lib/types";

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
    loading: authLoading,
    openAuthModal,
    updateUserProfile,
    changeUserPassword,
    deleteUserAccount
  } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const targetUserId = searchParams.get("user");
  const isOwnLibrary = !targetUserId || (user && targetUserId === user.uid);
  const defaultTab = searchParams.get("tab") === "profile" ? "profile" : "library";

  // State
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
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
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Password update state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Delete account state
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Sync profile state when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setSelectedAvatar(user.photoURL || "");
      setSelectedTheme(user.themeColor || "violet");
    }
  }, [user]);

  // Load viewed user details
  useEffect(() => {
    if (isOwnLibrary) {
      setViewedUser(user);
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
  }, [user, targetUserId, isOwnLibrary]);

  // Real-time Firestore sync
  useEffect(() => {
    const fetchId = isOwnLibrary ? user?.uid : targetUserId;
    if (!fetchId) {
      setLibraryItems([]);
      setLoadingItems(false);
      return;
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
  }, [user?.uid, targetUserId, isOwnLibrary]);

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
  }, [user?.uid, isOwnLibrary]);

  const handleRemoveHistoryItem = async (itemId: string, animeTitle: string) => {
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
    if (user && !user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email address to modify library items.",
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
    if (user && !user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email address to modify library items.",
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

  // Avatar Upload via Supabase REST API
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email to upload custom avatars.",
      });
      return;
    }

    setUploadingFile(true);
    try {
      // Compress the image client-side to maximum 256x256 at 85% quality
      const compressedBlob = await compressImage(file, 256, 256, 0.85);

      // Clean up previous avatar if it belongs to our Supabase storage
      if (selectedAvatar) {
        await deleteAvatarFromSupabase(selectedAvatar);
      }

      // Upload compressed blob
      const publicUrl = await uploadAvatarToSupabase(compressedBlob, user.uid);
      setSelectedAvatar(publicUrl);
      toast({
        title: "Avatar Uploaded",
        description: "Preview updated. Click 'Save Profile Changes' to apply permanently.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar to Supabase.",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (user && !user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email address to update your profile.",
      });
      return;
    }

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

  // Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!user.emailVerified) {
      toast({
        variant: "destructive",
        title: "Email Verification Required",
        description: "Please verify your email address to update your password.",
      });
      return;
    }

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
      await changeUserPassword(currentPassword, newPassword);
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error(error);
      let desc = "Failed to update password. Please check your credentials.";
      if (error.code === "auth/wrong-password") {
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

  // Destructive Account Deletion
  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // 1. Delete custom avatar file in Supabase if exists to free storage
      if (user.photoURL) {
        await deleteAvatarFromSupabase(user.photoURL);
      }

      // 2. Perform Firebase Auth and Firestore deletions
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

  const getThemeAccentClass = () => {
    switch (viewedUser?.themeColor) {
      case "rose": return "text-rose-500 border-rose-500 hover:text-rose-400";
      case "amber": return "text-amber-500 border-amber-500 hover:text-amber-400";
      case "emerald": return "text-emerald-500 border-emerald-500 hover:text-emerald-400";
      case "indigo": return "text-indigo-500 border-indigo-500 hover:text-indigo-400";
      default: return "text-violet-500 border-violet-500 hover:text-violet-400";
    }
  };

  const getThemeBgClass = () => {
    switch (viewedUser?.themeColor) {
      case "rose": return "bg-rose-600 hover:bg-rose-700 text-white";
      case "amber": return "bg-amber-500 hover:bg-amber-600 text-black font-bold";
      case "emerald": return "bg-emerald-600 hover:bg-emerald-700 text-white";
      case "indigo": return "bg-indigo-600 hover:bg-indigo-700 text-white";
      default: return "bg-violet-600 hover:bg-violet-700 text-white";
    }
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
          Sign in to your Aonime account to save, track episode progress, and organize your favorite anime.
        </p>
        <div className="space-y-3">
          <Button onClick={() => openAuthModal("login")} className="w-full font-bold h-11">
            Sign In Now
          </Button>
          <Button onClick={() => openAuthModal("register")} variant="outline" className="w-full font-bold h-11 border-border/80">
            Create New Account
          </Button>
        </div>
      </div>
    );
  }

  const libraryListContent = (
    <div className="space-y-6">
      {/* Controls: Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/25 p-4 rounded-xl border border-border/30">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-border/60 focus-visible:ring-primary"
          />
        </div>
        {/* Status pills filters */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedStatus("all")}
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
              onClick={() => setSelectedStatus(key)}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredItems.map((item) => {
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
                    className="mt-2 flex items-center justify-center gap-1.5 w-full h-8 text-[11px] font-black uppercase tracking-wider bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary rounded-md transition-all duration-300 shadow-sm"
                  >
                    <Play className="h-3 w-3 fill-current" />
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
                      <SelectContent className="bg-background/95 border-border/60 backdrop-blur-md z-[60] shadow-xl">
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
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Profile Header Banner */}
      <div className={cn(
        "relative rounded-2xl p-6 md:p-8 overflow-hidden border border-border/40 shadow-xl flex flex-col md:flex-row items-center gap-6",
        "bg-gradient-to-r from-background via-card/30 to-background"
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
              viewedUser?.themeColor === "indigo" && "border-indigo-500"
            )}
          />
          <div className={cn(
            "absolute -bottom-1 -right-1 p-1.5 rounded-full text-white shadow-md",
            getThemeBgClass()
          )}>
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="text-center md:text-left space-y-1">
          <h1 className="text-3xl font-black tracking-tight">{viewedUser?.displayName}</h1>
          {isOwnLibrary && <p className="text-muted-foreground text-sm font-medium">{viewedUser?.email}</p>}
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/15 text-primary rounded-full border border-primary/20">
              {libraryItems.length} Anime {isOwnLibrary ? "saved" : "tracked"}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-muted/60 text-muted-foreground rounded-full border border-border/40 capitalize">
              Theme {viewedUser?.themeColor}
            </span>
          </div>
        </div>
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
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="flex w-max bg-muted/60 border border-border/40 p-1 rounded-xl mb-6">
            <TabsTrigger value="library" className="rounded-lg font-bold text-sm px-6 py-2.5 flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg font-bold text-sm px-6 py-2.5 flex items-center gap-2">
              <History className="h-4 w-4" />
              Watch History
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg font-bold text-sm px-6 py-2.5 flex items-center gap-2">
              <User className="h-4 w-4" />
              Edit Profile
            </TabsTrigger>
          </TabsList>

          {/* --- LIBRARY TAB --- */}
          <TabsContent value="library" className="space-y-6 focus-visible:outline-none">
            {libraryListContent}
          </TabsContent>

          {/* --- WATCH HISTORY TAB --- */}
          <TabsContent value="history" className="space-y-6 focus-visible:outline-none">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {historyItems.map((item) => {
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
            )}
          </TabsContent>

        {/* --- PROFILE TAB --- */}
        <TabsContent value="profile" className="max-w-2xl bg-card/20 border border-border/30 rounded-2xl p-6 md:p-8 focus-visible:outline-none space-y-8 animate-in fade-in duration-300">
          
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
                            ? user?.themeColor === "rose" && "border-rose-500 scale-105" ||
                              user?.themeColor === "amber" && "border-amber-500 scale-105" ||
                              user?.themeColor === "emerald" && "border-emerald-500 scale-105" ||
                              user?.themeColor === "indigo" && "border-indigo-500 scale-105" ||
                              "border-violet-500 scale-105"
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
              <div className="flex flex-wrap gap-3">
                {PRESET_THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-[1.02]",
                        isSelected
                          ? "bg-primary text-primary-foreground border-transparent shadow-md"
                          : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted"
                      )}
                      style={isSelected ? { backgroundColor: theme.color } : {}}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: theme.color }} />
                      {theme.name}
                    </button>
                  );
                })}
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

          {/* Form 2: Password Modification (Only visible if registered via email/password) */}
          {!user?.isGoogleUser && (
            <form onSubmit={handleUpdatePassword} className="space-y-6 pt-6 border-t border-border/30">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Change Password</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
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
          )}

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
