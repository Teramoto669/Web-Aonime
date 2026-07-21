"use client";

import React, { useEffect, useRef } from "react";

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
    };
    onRecaptchaLoad?: () => void;
  }
}

export function ReCaptcha({ onVerify, onExpire, className = "" }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!IS_RECAPTCHA_ENABLED || !RECAPTCHA_SITE_KEY) return;

    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.grecaptcha) return;

      // Clear previous content if any
      containerRef.current.innerHTML = "";

      try {
        const id = window.grecaptcha.render(containerRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => {
            if (isMounted) onVerify(token);
          },
          "expired-callback": () => {
            if (isMounted) {
              if (onExpire) onExpire();
              onVerify(null);
            }
          },
          "error-callback": () => {
            if (isMounted) onVerify(null);
          },
          theme: "dark",
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.error("reCAPTCHA render error:", err);
      }
    };

    if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
      renderWidget();
    } else {
      // Define global load callback
      window.onRecaptchaLoad = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(renderWidget);
        }
      };

      // Inject script if not already added
      const existingScript = document.getElementById("recaptcha-v2-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "recaptcha-v2-script";
        script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch (_) {}
      }
    };
  }, [onVerify, onExpire]);

  if (!IS_RECAPTCHA_ENABLED) return null;

  return (
    <div className={`flex justify-center my-2 ${className}`}>
      <div ref={containerRef} />
    </div>
  );
}

export default ReCaptcha;
