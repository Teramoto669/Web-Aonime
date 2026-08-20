"use client";

import React, { useEffect, useRef, useCallback } from "react";

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
export const IS_RECAPTCHA_ENABLED = Boolean(
  RECAPTCHA_SITE_KEY &&
    RECAPTCHA_SITE_KEY.trim() !== "" &&
    RECAPTCHA_SITE_KEY !== "your-recaptcha-site-key"
);

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  onExpire?: () => void;
  className?: string;
  action?: string;
}

interface GRecaptchaApi {
  render: (
    container: HTMLElement | string,
    parameters: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "dark" | "light";
      size?: "normal" | "compact";
      action?: string;
    }
  ) => number;
  reset: (widgetId?: number) => void;
  ready: (callback: () => void) => void;
  getResponse: (widgetId?: number) => string;
}

declare global {
  interface Window {
    grecaptcha?: GRecaptchaApi & {
      enterprise?: GRecaptchaApi;
    };
    onRecaptchaLoad?: () => void;
  }
}

export function ReCaptcha({ onVerify, onExpire, className = "", action }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  // Stable callback refs
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const getGrecaptcha = useCallback((): GRecaptchaApi | null => {
    if (typeof window === "undefined" || !window.grecaptcha) return null;
    return window.grecaptcha.enterprise || window.grecaptcha;
  }, []);

  const renderWidget = useCallback(() => {
    const recaptcha = getGrecaptcha();
    if (!containerRef.current || !recaptcha) return;

    if (widgetIdRef.current !== null) {
      try {
        recaptcha.reset(widgetIdRef.current);
      } catch (_) {}
      return;
    }

    try {
      // Clear any existing children in container to avoid double-rendering error
      if (containerRef.current.hasChildNodes()) {
        containerRef.current.innerHTML = "";
      }

      const id = recaptcha.render(containerRef.current, {
        sitekey: RECAPTCHA_SITE_KEY!,
        callback: (token: string) => {
          onVerifyRef.current(token);
        },
        "expired-callback": () => {
          if (onExpireRef.current) onExpireRef.current();
          onVerifyRef.current(null);
          try {
            recaptcha.reset(widgetIdRef.current!);
          } catch (_) {}
        },
        "error-callback": () => {
          onVerifyRef.current(null);
          try {
            recaptcha.reset(widgetIdRef.current!);
          } catch (_) {}
        },
        theme: "dark",
        ...(action ? { action } : {}),
      });
      widgetIdRef.current = id;
    } catch (err: any) {
      const errStr = String(err);
      if (errStr.includes("already been rendered")) {
        // If already rendered in this container, attempt reset instead of crashing
        try {
          recaptcha.reset();
        } catch (_) {}
      } else {
        console.error("reCAPTCHA render error:", err);
      }
    }
  }, [action, getGrecaptcha]);

  useEffect(() => {
    if (!IS_RECAPTCHA_ENABLED || !RECAPTCHA_SITE_KEY) return;

    const recaptcha = getGrecaptcha();
    if (recaptcha && typeof recaptcha.render === "function") {
      recaptcha.ready(renderWidget);
    } else {
      window.onRecaptchaLoad = () => {
        const loadedRecaptcha = getGrecaptcha();
        loadedRecaptcha?.ready(renderWidget);
      };

      if (!document.getElementById("recaptcha-enterprise-script")) {
        const script = document.createElement("script");
        script.id = "recaptcha-enterprise-script";
        script.src = "https://www.google.com/recaptcha/enterprise.js?onload=onRecaptchaLoad&render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      const currentRecaptcha = getGrecaptcha();
      if (widgetIdRef.current !== null && currentRecaptcha) {
        try {
          currentRecaptcha.reset(widgetIdRef.current);
        } catch (_) {}
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      widgetIdRef.current = null;
    };
  }, [renderWidget, getGrecaptcha]);

  if (!IS_RECAPTCHA_ENABLED) return null;

  return (
    <div className={`flex justify-center my-2 ${className}`}>
      <div ref={containerRef} />
    </div>
  );
}

export default ReCaptcha;
