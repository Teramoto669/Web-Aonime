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
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  deleteUser,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  themeColor: string;
  emailVerified: boolean;
  isGoogleUser: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkEmailVerificationStatus: () => Promise<boolean>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteUserAccount: (currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: { displayName?: string | null; photoURL?: string | null; themeColor?: string }) => Promise<void>;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: userData.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          photoURL: userData.photoURL || firebaseUser.photoURL || PRESET_AVATARS[0].url,
          themeColor: userData.themeColor || "violet",
          emailVerified: firebaseUser.emailVerified,
          isGoogleUser: firebaseUser.providerData.some((p) => p.providerId === "google.com"),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const defaultName = email.split("@")[0];
    const defaultAvatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)].url;
    
    // Set Auth Profile
    await updateProfile(cred.user, {
      displayName: defaultName,
      photoURL: defaultAvatar
    });

    // Set Firestore Document
    const userDocRef = doc(db, "users", cred.user.uid);
    await setDoc(userDocRef, {
      uid: cred.user.uid,
      email,
      displayName: defaultName,
      photoURL: defaultAvatar,
      themeColor: "violet",
      createdAt: new Date(),
    });

    // Send verification email
    await sendEmailVerification(cred.user);
  };

  const signInWithGoogle = async () => {
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
        setUser((prev) => prev ? { ...prev, emailVerified: true } : null);
      }
      return verified;
    }
    return false;
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
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (profile: { displayName?: string | null; photoURL?: string | null; themeColor?: string }) => {
    if (!auth.currentUser) throw new Error("No active user session");

    const updates: any = {};
    if (profile.displayName !== undefined) updates.displayName = profile.displayName;
    if (profile.photoURL !== undefined) updates.photoURL = profile.photoURL;

    // 1. Update Firebase Auth user profile
    await updateProfile(auth.currentUser, updates);

    // 2. Update Firestore document
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const firestoreUpdates: any = {};
    if (profile.displayName !== undefined) firestoreUpdates.displayName = profile.displayName;
    if (profile.photoURL !== undefined) firestoreUpdates.photoURL = profile.photoURL;
    if (profile.themeColor !== undefined) firestoreUpdates.themeColor = profile.themeColor;

    await setDoc(userDocRef, firestoreUpdates, { merge: true });

    // 3. Update React context state
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        displayName: profile.displayName !== undefined ? profile.displayName : prev.displayName,
        photoURL: profile.photoURL !== undefined ? profile.photoURL : prev.photoURL,
        themeColor: profile.themeColor !== undefined ? profile.themeColor : prev.themeColor,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        signInWithGoogle,
        resendVerificationEmail,
        checkEmailVerificationStatus,
        changeUserPassword,
        deleteUserAccount,
        logout,
        updateUserProfile,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
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
