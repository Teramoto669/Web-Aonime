import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase for SSR compatibility
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize App Check (client-side only)
if (typeof window !== "undefined") {
  const isAppCheckEnabled = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_ENABLED === "true";
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  const recaptchaKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY;
  const useEnterprise = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_USE_ENTERPRISE === "true";
  const forceDevAppCheck = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_ENABLE_IN_DEV === "true";

  if (isAppCheckEnabled) {
    try {
      const isDev =
        process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isDev) {
        if (forceDevAppCheck && debugToken) {
          (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
          const siteKey = recaptchaKey || "debug-key";
          const provider = useEnterprise
            ? new ReCaptchaEnterpriseProvider(siteKey)
            : new ReCaptchaV3Provider(siteKey);

          initializeAppCheck(app, {
            provider,
            isTokenAutoRefreshEnabled: true,
          });
        } else {
          console.info("[Firebase App Check] Skipping App Check on localhost in dev mode to prevent auth token invalidation. Set NEXT_PUBLIC_FIREBASE_APPCHECK_ENABLE_IN_DEV=true and configure your registered debug token in Firebase Console if testing App Check locally.");
        }
      } else if (recaptchaKey && recaptchaKey !== "debug-key" && !recaptchaKey.startsWith("YOUR_")) {
        const provider = useEnterprise
          ? new ReCaptchaEnterpriseProvider(recaptchaKey)
          : new ReCaptchaV3Provider(recaptchaKey);

        initializeAppCheck(app, {
          provider,
          isTokenAutoRefreshEnabled: true,
        });
      }
    } catch (err) {
      console.warn("[Firebase App Check] Initialization skipped/failed:", err);
    }
  }
}

