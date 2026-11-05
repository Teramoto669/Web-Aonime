"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateEmail,
  verifyBeforeUpdateEmail,
  deleteUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import { InitialAppLoader } from "@/components/layout/InitialAppLoader";
import {
  getLocalLibraryItems,
  getLocalHistoryItems,
  normalizeLibraryKey,
  LOCAL_LIBRARY_KEY,
  LOCAL_HISTORY_KEY,
  LOCAL_DATA_EVENT,
} from "./library-context";

export const LOCAL_ACCOUNT_KEY = "aonime_local_account";
export const NO_EMAIL_DOMAIN = "@noemail.aonime.local";
const SIGNUP_TIMESTAMPS_KEY = "aonime_signup_timestamps";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  themeColor: string;
  emailVerified: boolean;
  isGoogleUser: boolean;
  isLocal?: boolean;
  isNoEmailAccount?: boolean;
  lastCommentedAt?: Date | null;
  role?: "admin" | "user";
  isAdmin?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (identifier: string, password: string, options?: { withoutEmail?: boolean }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginAsLocal: () => void;
  resendVerificationEmail: () => Promise<void>;
  checkEmailVerificationStatus: () => Promise<boolean>;
  addEmailToAccount: (newEmail: string, currentPassword: string) => Promise<{ mode: "updated" | "verify_before_update" }>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteUserAccount: (currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (profile: { displayName?: string | null; photoURL?: string | null; themeColor?: string }) => Promise<void>;
  updateLastCommentedAt: (date: Date | null) => void;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'forgot-password';
  openAuthModal: (tab?: 'login' | 'register' | 'forgot-password') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Premium Preset Avatars (Anime style using Dicebear Adventurer)
export const PRESET_AVATARS = [
  { id: "luffy", name: "Pirate Captain", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=luffy" },
  { id: "zoro", name: "Swordsman", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=zoro" },
  { id: "naruto", name: "Ninja Hero", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=naruto" },
  { id: "sasuke", name: "Shadow Ninja", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=sasuke" },
  { id: "goku", name: "Super Saiyan", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=goku" },
  { id: "saitama", name: "One Punch", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=saitama" },
  { id: "tanjiro", name: "Sun Slayer", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=tanjiro" },
  { id: "nezuko", name: "Demon Sister", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=nezuko" },
];

// Accent theme colors
export const PRESET_THEMES = [
  { id: "violet", name: "Violet", class: "bg-violet-600 hover:bg-violet-700", textClass: "text-violet-500", borderClass: "border-violet-600", color: "#8b5cf6" },
  { id: "rose", name: "Rose", class: "bg-rose-600 hover:bg-rose-700", textClass: "text-rose-500", borderClass: "border-rose-600", color: "#f43f5e" },
  { id: "amber", name: "Amber", class: "bg-amber-500 hover:bg-amber-600", textClass: "text-amber-500", borderClass: "border-amber-500", color: "#f59e0b" },
  { id: "emerald", name: "Emerald", class: "bg-emerald-600 hover:bg-emerald-700", textClass: "text-emerald-500", borderClass: "border-emerald-600", color: "#10b981" },
  { id: "indigo", name: "Indigo", class: "bg-indigo-600 hover:bg-indigo-700", textClass: "text-indigo-500", borderClass: "border-indigo-600", color: "#6366f1" },
];

export function hexToHsl(hex: string): { primary: string; ring: string; accent: string; accentForeground: string } | null {
  if (!hex) return null;
  const cleanHex = hex.replace(/^custom:/, "").replace("#", "").trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex) && !/^[0-9A-Fa-f]{3}$/.test(cleanHex)) return null;

  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return {
    primary: `${hDeg} ${sPct}% ${lPct}%`,
    ring: `${hDeg} ${sPct}% ${lPct}%`,
    accent: `${hDeg} ${sPct}% 15%`,
    accentForeground: `${hDeg} ${sPct}% 85%`,
  };
}

export function applyThemeColor(theme: string) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;

  const themes: Record<string, { primary: string; ring: string; accent: string; accentForeground: string }> = {
    violet: {
      primary: "275 100% 60%",
      ring: "275 100% 60%",
      accent: "275 95% 15%",
      accentForeground: "275 100% 85%",
    },
    rose: {
      primary: "350 89% 60%",
      ring: "350 89% 60%",
      accent: "350 89% 15%",
      accentForeground: "350 89% 85%",
    },
    amber: {
      primary: "38 92% 50%",
      ring: "38 92% 50%",
      accent: "38 92% 15%",
      accentForeground: "38 92% 85%",
    },
    emerald: {
      primary: "142 71% 45%",
      ring: "142 71% 45%",
      accent: "142 71% 12%",
      accentForeground: "142 71% 85%",
    },
    indigo: {
      primary: "239 84% 59%",
      ring: "239 84% 59%",
      accent: "239 84% 15%",
      accentForeground: "239 84% 85%",
    },
  };

  const currentTheme = themes[theme] || hexToHsl(theme) || themes.violet;
  root.style.setProperty("--primary", currentTheme.primary);
  root.style.setProperty("--ring", currentTheme.ring);
  root.style.setProperty("--accent", currentTheme.accent);
  root.style.setProperty("--accent-foreground", currentTheme.accentForeground);
}

// Synchronously apply theme before first DOM render if user cache exists
if (typeof window !== "undefined") {
  try {
    const cached = localStorage.getItem("aonime_user_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.themeColor) {
        applyThemeColor(parsed.themeColor);
      }
    }
  } catch (e) {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot-password'>('login');

  const openAuthModal = (tab: 'login' | 'register' | 'forgot-password' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const buildLocalUserProfile = (): UserProfile => ({
    uid: "local_user",
    email: null,
    displayName: "Local Account",
    photoURL: PRESET_AVATARS[0].url,
    themeColor: "violet",
    emailVerified: false,
    isGoogleUser: false,
    isLocal: true,
    role: "user",
    isAdmin: false,
  });

  const transferLocalDataToFirestore = async (uid: string) => {
    if (typeof window === "undefined" || !uid || uid === "local_user") return;
    const localLib = getLocalLibraryItems();
    const localHist = getLocalHistoryItems();
    if (localLib.length === 0 && localHist.length === 0) {
      try {
        localStorage.removeItem(LOCAL_ACCOUNT_KEY);
      } catch {}
      return;
    }

    // Clear local storage immediately to prevent duplicate transfers
    try {
      localStorage.removeItem(LOCAL_LIBRARY_KEY);
      localStorage.removeItem(LOCAL_HISTORY_KEY);
      localStorage.removeItem(LOCAL_ACCOUNT_KEY);
      window.dispatchEvent(new Event(LOCAL_DATA_EVENT));
    } catch {}

    try {
      const batch = writeBatch(db);
      for (const item of localLib) {
        const cleanSlug = normalizeLibraryKey(item.slug || item.animeId);
        if (!cleanSlug) continue;
        const docRef = doc(db, "libraries", `${uid}_${cleanSlug}`);
        batch.set(
          docRef,
          {
            userId: uid,
            animeId: normalizeLibraryKey(item.animeId) || cleanSlug,
            title: item.title || cleanSlug,
            image: item.image || "",
            type: item.type || "TV",
            slug: cleanSlug,
            status: item.status || "watching",
            addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
            ...(item.lastEpisodeWatched ? { lastEpisodeWatched: String(item.lastEpisodeWatched) } : {}),
            ...(item.lastEpisodeWatchedAt ? { lastEpisodeWatchedAt: new Date(item.lastEpisodeWatchedAt) } : {}),
          },
          { merge: true }
        );
      }

      for (const h of localHist) {
        const cleanSlug = normalizeLibraryKey(h.slug || h.animeId);
        if (!cleanSlug) continue;
        const docRef = doc(db, "watch_history", `${uid}_${cleanSlug}`);
        batch.set(
          docRef,
          {
            userId: uid,
            animeId: cleanSlug,
            title: h.title || cleanSlug,
            image: h.image || "",
            type: h.type || "TV",
            slug: cleanSlug,
            episodeNum: String(h.episodeNum || "1"),
            watchedAt: h.watchedAt ? new Date(h.watchedAt) : new Date(),
          },
          { merge: true }
        );
      }

      await batch.commit();
    } catch (e) {
      console.error("Failed to transfer local data to Firestore:", e);
    }
  };

  useEffect(() => {
    // Hydrate cached user profile on client mount to ensure instant account info resolution
    try {
      const cached = localStorage.getItem("aonime_user_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.lastCommentedAt) {
          parsed.lastCommentedAt = new Date(parsed.lastCommentedAt);
        }
        setUser(parsed);
        if (parsed?.themeColor) {
          applyThemeColor(parsed.themeColor);
        }
        setLoading(false);
      } else if (localStorage.getItem(LOCAL_ACCOUNT_KEY) === "true") {
        const localProf = buildLocalUserProfile();
        setUser(localProf);
        localStorage.setItem("aonime_user_cache", JSON.stringify(localProf));
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to parse cached user profile:", e);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await transferLocalDataToFirestore(firebaseUser.uid);

        // Fetch or create user details in Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        let userData: any = {};
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            userData = docSnap.data();
          } else {
            const defaultName = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Aonime User";
            const defaultAvatar = firebaseUser.photoURL || PRESET_AVATARS[0].url;
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: defaultName,
              photoURL: defaultAvatar,
              themeColor: "violet",
              createdAt: new Date(),
            };
            await setDoc(userDocRef, userData);
          }
        } catch (e) {
          console.error("Firestore user retrieval error:", e);
        }

        const isUserAdmin = userData.role === "admin" || userData.isAdmin === true;
        const hasSyntheticAuthEmail = Boolean(firebaseUser.email?.endsWith(NO_EMAIL_DOMAIN));
        let localLinkedEmail: string | null = null;
        try {
          localLinkedEmail = localStorage.getItem(`aonime_linked_email_${firebaseUser.uid}`);
        } catch {}
        const storedDocEmail =
          typeof userData.email === "string" && !userData.email.endsWith(NO_EMAIL_DOMAIN)
            ? userData.email
            : null;
        const visibleEmail = (!hasSyntheticAuthEmail ? firebaseUser.email : null) || localLinkedEmail || storedDocEmail || null;
        const isNoEmail = !visibleEmail;

        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: visibleEmail,
          displayName: userData.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          photoURL: userData.photoURL || firebaseUser.photoURL || PRESET_AVATARS[0].url,
          themeColor: userData.themeColor || "violet",
          emailVerified: isNoEmail ? false : firebaseUser.emailVerified,
          isGoogleUser: firebaseUser.providerData.some((p) => p.providerId === "google.com"),
          isLocal: false,
          isNoEmailAccount: isNoEmail,
          lastCommentedAt: userData.lastCommentedAt
            ? (typeof userData.lastCommentedAt.toDate === "function"
              ? userData.lastCommentedAt.toDate()
              : new Date(userData.lastCommentedAt))
            : null,
          role: userData.role || (isUserAdmin ? "admin" : "user"),
          isAdmin: isUserAdmin,
        };

        setUser(profile);
        try {
          localStorage.setItem("aonime_user_cache", JSON.stringify(profile));
        } catch (e) {}
      } else {
        try {
          if (localStorage.getItem(LOCAL_ACCOUNT_KEY) === "true") {
            const localProf = buildLocalUserProfile();
            setUser(localProf);
            localStorage.setItem("aonime_user_cache", JSON.stringify(localProf));
            setLoading(false);
            return;
          }
        } catch {}
        setUser(null);
        try {
          localStorage.removeItem("aonime_user_cache");
        } catch (e) {}
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Dynamically update CSS primary/ring variables when user changes theme color
  useEffect(() => {
    if (user?.themeColor) {
      applyThemeColor(user.themeColor);
    }
  }, [user?.themeColor]);

  const loginAsLocal = () => {
    const localProf = buildLocalUserProfile();
    try {
      localStorage.setItem(LOCAL_ACCOUNT_KEY, "true");
      localStorage.setItem("aonime_user_cache", JSON.stringify(localProf));
    } catch {}
    setUser(localProf);
  };

  const login = async (identifier: string, password: string, rememberMe: boolean = true) => {
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
    } catch (e) {
      console.warn("Failed to set persistence:", e);
    }
    const trimmed = identifier.trim();
    if (!trimmed.includes("@")) {
      const cleanUsername = trimmed.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
      const syntheticEmail = `${cleanUsername}${NO_EMAIL_DOMAIN}`;
      try {
        const cred = await signInWithEmailAndPassword(auth, syntheticEmail, password);
        await transferLocalDataToFirestore(cred.user.uid);
        return;
      } catch (firstErr) {
        try {
          const mappedEmail = localStorage.getItem(`aonime_user_to_email_${cleanUsername}`);
          if (mappedEmail) {
            const cred = await signInWithEmailAndPassword(auth, mappedEmail, password);
            await transferLocalDataToFirestore(cred.user.uid);
            return;
          }
        } catch {}
        throw firstErr;
      }
    } else {
      try {
        const cred = await signInWithEmailAndPassword(auth, trimmed, password);
        await transferLocalDataToFirestore(cred.user.uid);
        return;
      } catch (firstErr) {
        try {
          const mappedSynthetic = localStorage.getItem(`aonime_email_to_user_${trimmed.toLowerCase()}`);
          if (mappedSynthetic) {
            const cred = await signInWithEmailAndPassword(auth, mappedSynthetic, password);
            await transferLocalDataToFirestore(cred.user.uid);
            return;
          }
        } catch {}
        throw firstErr;
      }
    }
  };

  const register = async (identifier: string, password: string, options?: { withoutEmail?: boolean }) => {
    const isWithoutEmail = Boolean(options?.withoutEmail || !identifier.includes("@"));
    const trimmed = identifier.trim();
    const cleanUsername = trimmed.toLowerCase().replace(/[^a-z0-9_.-]/g, "");

    if (isWithoutEmail && cleanUsername.length < 3) {
      const err: any = new Error("Username must contain at least 3 valid characters (letters, numbers, _, ., -).");
      err.code = "auth/invalid-username";
      throw err;
    }

    // 1. Fetch active rate limit config from Firestore system_settings/comments (with fallback defaults)
    let maxAccounts = 2;
    let windowMinutes = 60;
    try {
      const settingsSnap = await getDoc(doc(db, "system_settings", "comments"));
      if (settingsSnap.exists()) {
        const d = settingsSnap.data();
        if (typeof d.registerRateLimitMax === "number") maxAccounts = Math.max(1, d.registerRateLimitMax);
        if (typeof d.registerRateLimitWindowMinutes === "number") windowMinutes = Math.max(1, d.registerRateLimitWindowMinutes);
      }
    } catch {}

    const windowMs = windowMinutes * 60 * 1000;
    const now = Date.now();

    // 2. Client-side device rate-limit check
    if (typeof window !== "undefined") {
      try {
        const rawTs = localStorage.getItem(SIGNUP_TIMESTAMPS_KEY);
        const tsList: number[] = rawTs ? JSON.parse(rawTs) : [];
        const recent = tsList.filter((t) => now - t < windowMs);
        localStorage.setItem(SIGNUP_TIMESTAMPS_KEY, JSON.stringify(recent));
        if (recent.length >= maxAccounts) {
          const waitMins = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 60000));
          const err: any = new Error(`Too many accounts created on this device. Please wait ${waitMins} minute(s).`);
          err.code = "auth/signup-rate-limited";
          throw err;
        }
      } catch (e: any) {
        if (e?.code === "auth/signup-rate-limited") throw e;
      }
    }

    // 3. Server-side IP rate-limit check
    try {
      const rlRes = await fetch("/api/auth/register-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", maxAccounts, windowMinutes }),
      });
      if (rlRes.status === 429) {
        const rlData = await rlRes.json().catch(() => ({}));
        const err: any = new Error(rlData.error || "Too many account registrations. Please wait before trying again.");
        err.code = "auth/signup-rate-limited";
        throw err;
      }
    } catch (e: any) {
      if (e?.code === "auth/signup-rate-limited") throw e;
    }

    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {}

    const authEmail = isWithoutEmail ? `${cleanUsername}${NO_EMAIL_DOMAIN}` : trimmed;
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, authEmail, password);
    } catch (e: any) {
      if (isWithoutEmail && e?.code === "auth/email-already-in-use") {
        const uErr: any = new Error("Username is already taken. Please choose another username.");
        uErr.code = "auth/username-already-in-use";
        throw uErr;
      }
      throw e;
    }

    // Record successful registration on client & server
    try {
      const rawTs = localStorage.getItem(SIGNUP_TIMESTAMPS_KEY);
      const tsList: number[] = rawTs ? JSON.parse(rawTs) : [];
      tsList.push(Date.now());
      localStorage.setItem(SIGNUP_TIMESTAMPS_KEY, JSON.stringify(tsList));
    } catch {}
    fetch("/api/auth/register-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "record", maxAccounts, windowMinutes }),
    }).catch(() => {});

    const defaultName = isWithoutEmail ? trimmed : trimmed.split("@")[0];
    const defaultAvatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)].url;

    // Set Auth Profile
    await updateProfile(cred.user, {
      displayName: defaultName,
      photoURL: defaultAvatar
    });

    // Set Firestore Document
    const userDocRef = doc(db, "users", cred.user.uid);
    try {
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        email: authEmail,
        displayName: defaultName,
        photoURL: defaultAvatar,
        themeColor: "violet",
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn("Could not initialize Firestore user doc:", e);
    }

    // Transfer any local library & watch history to the newly created account
    await transferLocalDataToFirestore(cred.user.uid);

    // Send verification email only if the user registered with a real email
    if (!isWithoutEmail) {
      sendEmailVerification(cred.user).catch(() => {});
    }
  };

  const signInWithGoogle = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {}
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    // Sync to Firestore if first time
    const userDocRef = doc(db, "users", cred.user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      const defaultName = cred.user.displayName || cred.user.email?.split("@")[0] || "Aonime User";
      const defaultAvatar = cred.user.photoURL || PRESET_AVATARS[0].url;
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: defaultName,
        photoURL: defaultAvatar,
        themeColor: "violet",
        createdAt: new Date(),
      });
    }

    await transferLocalDataToFirestore(cred.user.uid);
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const checkEmailVerificationStatus = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const verified = auth.currentUser.emailVerified;
      if (verified) {
        setUser((prev) => {
          if (!prev) return null;
          const updated = { ...prev, emailVerified: true };
          try {
            localStorage.setItem("aonime_user_cache", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      return verified;
    }
    return false;
  };

  const addEmailToAccount = async (newEmail: string, currentPassword: string): Promise<{ mode: "updated" | "verify_before_update" }> => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) throw new Error("No active authenticated user session.");
    const trimmedEmail = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      const err: any = new Error("Please enter a valid email address.");
      err.code = "auth/invalid-email";
      throw err;
    }

    const oldAuthEmail = currentUser.email;
    // Re-authenticate with current password
    const credential = EmailAuthProvider.credential(oldAuthEmail, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    let mode: "updated" | "verify_before_update" = "updated";
    try {
      await updateEmail(currentUser, trimmedEmail);
      await currentUser.getIdToken(true).catch(() => {});
      sendEmailVerification(currentUser).catch(() => {});
    } catch (e: any) {
      if (e?.code === "auth/operation-not-allowed") {
        // Fallback when Firebase Email Enumeration Protection requires verification before updating email
        await verifyBeforeUpdateEmail(currentUser, trimmedEmail);
        mode = "verify_before_update";
      } else {
        throw e;
      }
    }

    try {
      localStorage.setItem(`aonime_linked_email_${currentUser.uid}`, trimmedEmail);
      if (oldAuthEmail.endsWith(NO_EMAIL_DOMAIN)) {
        const cleanU = oldAuthEmail.slice(0, -NO_EMAIL_DOMAIN.length);
        localStorage.setItem(`aonime_user_to_email_${cleanU}`, trimmedEmail);
        localStorage.setItem(`aonime_email_to_user_${trimmedEmail.toLowerCase()}`, oldAuthEmail);
      }
    } catch {}

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        { email: trimmedEmail },
        { merge: true }
      );
    } catch {}

    setUser((prev) => {
      if (!prev) return null;
      const updated: UserProfile = {
        ...prev,
        email: trimmedEmail,
        isNoEmailAccount: false,
        emailVerified: false,
      };
      try {
        localStorage.setItem("aonime_user_cache", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    return { mode };
  };

  const changeUserPassword = async (currentPassword: string, newPassword: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) throw new Error("No active authenticated user session.");

    // Re-authenticate
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // Update Password
    await updatePassword(currentUser, newPassword);
  };

  const deleteUserAccount = async (currentPassword?: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No active authenticated user session.");

    // 1. Re-authenticate
    if (currentUser.providerData.some((p) => p.providerId === "google.com")) {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(currentUser, provider);
    } else {
      if (!currentPassword) throw new Error("Password is required to delete account.");
      if (!currentUser.email) throw new Error("User has no associated email.");
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
    }

    const uid = currentUser.uid;

    // 2. Delete user libraries in Firestore
    const libQuery = query(collection(db, "libraries"), where("userId", "==", uid));
    const querySnapshot = await getDocs(libQuery);

    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Delete user profile document
    const userDocRef = doc(db, "users", uid);
    batch.delete(userDocRef);

    // Commit batch deletes
    await batch.commit();

    // 4. Delete Firebase Auth User account
    await deleteUser(currentUser);

    // Local state reset
    setUser(null);
    try {
      localStorage.removeItem("aonime_user_cache");
    } catch (e) {}
  };

  const logout = async () => {
    try {
      localStorage.removeItem(LOCAL_ACCOUNT_KEY);
      localStorage.removeItem("aonime_user_cache");
    } catch (e) {}
    if (auth.currentUser) {
      await signOut(auth);
    }
    setUser(null);
  };

  const updateUserProfile = async (profile: { displayName?: string | null; photoURL?: string | null; themeColor?: string }) => {
    if (!auth.currentUser) throw new Error("No active user session");

    const updates: any = {};
    if (profile.displayName !== undefined) updates.displayName = profile.displayName;
    
    // Firebase Auth updateProfile strictly enforces max 2,048 chars for photoURL.
    // If photoURL is a long Base64 string, skip setting photoURL in Auth profile to prevent 400 error.
    if (profile.photoURL !== undefined && (profile.photoURL === null || profile.photoURL.length <= 2000)) {
      updates.photoURL = profile.photoURL;
    }

    // 1. Update Firebase Auth user profile (only displayName and short URLs)
    if (Object.keys(updates).length > 0) {
      await updateProfile(auth.currentUser, updates);
    }

    // 2. Update Firestore document (Firestore supports up to 1MB, storing Base64 Data URIs safely)
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const firestoreUpdates: any = {};
    if (profile.displayName !== undefined) firestoreUpdates.displayName = profile.displayName;
    if (profile.photoURL !== undefined) firestoreUpdates.photoURL = profile.photoURL;
    if (profile.themeColor !== undefined) firestoreUpdates.themeColor = profile.themeColor;

    await setDoc(userDocRef, firestoreUpdates, { merge: true });

    // 3. Update React context state
    setUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        displayName: profile.displayName !== undefined ? profile.displayName : prev.displayName,
        photoURL: profile.photoURL !== undefined ? profile.photoURL : prev.photoURL,
        themeColor: profile.themeColor !== undefined ? profile.themeColor : prev.themeColor,
      };
      try {
        localStorage.setItem("aonime_user_cache", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const updateLastCommentedAt = (date: Date | null) => {
    setUser((prev) => (prev ? { ...prev, lastCommentedAt: date } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: Boolean(user?.isAdmin || user?.role === "admin"),
        loading,
        login,
        register,
        signInWithGoogle,
        loginAsLocal,
        resendVerificationEmail,
        checkEmailVerificationStatus,
        addEmailToAccount,
        changeUserPassword,
        deleteUserAccount,
        logout,
        resetPassword,
        updateUserProfile,
        updateLastCommentedAt,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {loading && <InitialAppLoader />}
      <div className={loading ? "opacity-0 invisible" : "opacity-100 transition-opacity duration-300"}>
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
