"use client";

import React, { useEffect, useRef, useCallback } from "react";

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
export const IS_RECAPTCHA_ENABLED = Boolean(RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.trim() !== "" && RECAPTCHA_SITE_KEY !== "your-recaptcha-site-key");

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "dark" | "light";
          size?: "normal" | "compact";
        }
      ) => number;
      reset: (widgetId?: number) => void;
      ready: (callback: () => void) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaLoad?: () => void;
  }
}

export function ReCaptcha({ onVerify, onExpire, className = "" }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  // Stable callback refs to avoid re-running the effect when parent re-renders
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onVerifyRef.current = onVerify; }, [onVerify]);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.grecaptcha) return;
    // Only render once — if widgetId is already set, just reset the widget
    if (widgetIdRef.current !== null) {
      try {
        window.grecaptcha.reset(widgetIdRef.current);
      } catch (_) {}
      return;
    }
    try {
      const id = window.grecaptcha.render(containerRef.current, {
        sitekey: RECAPTCHA_SITE_KEY!,
        callback: (token: string) => { onVerifyRef.current(token); },
        "expired-callback": () => {
          if (onExpireRef.current) onExpireRef.current();
          onVerifyRef.current(null);
        },
        "error-callback": () => { onVerifyRef.current(null); },
        theme: "dark",
      });
      widgetIdRef.current = id;
    } catch (err) {
      console.error("reCAPTCHA render error:", err);
    }
  }, []);

  useEffect(() => {
    if (!IS_RECAPTCHA_ENABLED || !RECAPTCHA_SITE_KEY) return;

    if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
      window.grecaptcha.ready(renderWidget);
    } else {
      // Script not loaded yet — set up the global load callback
      window.onRecaptchaLoad = () => {
        window.grecaptcha?.ready(renderWidget);
      };

      // Inject script only once
      if (!document.getElementById("recaptcha-v2-script")) {
        const script = document.createElement("script");
        script.id = "recaptcha-v2-script";
        script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      // On unmount: reset (not destroy) so the widget can be re-rendered next open
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch (_) {}
      }
      widgetIdRef.current = null;
    };
  }, [renderWidget]);

  if (!IS_RECAPTCHA_ENABLED) return null;

  return (
    <div className={`flex justify-center my-2 ${className}`}>
      <div ref={containerRef} />
    </div>
  );
}

export default ReCaptcha;
