import { NextRequest, NextResponse } from "next/server";

// Minimum acceptable risk score for score-based reCAPTCHA (v3 / Enterprise)
const MIN_RECAPTCHA_SCORE = 0.5;

// Lightweight in-memory rate limiter per IP (max 20 requests per minute)
const ipRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 20;

  const record = ipRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    ipRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false; // Not rate limited
  }

  record.count += 1;
  return record.count > maxRequests;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Cross-Origin (CSRF) Origin Check
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          console.warn(`[Security] Cross-origin reCAPTCHA verification blocked from origin: ${origin} (host: ${host})`);
          return NextResponse.json(
            { success: false, error: "Unauthorized request domain" },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid request origin header" },
          { status: 400 }
        );
      }
    }

    // 2. Extract Client IP & Enforce Rate Limiting
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (checkRateLimit(clientIp)) {
      console.warn(`[Security] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { success: false, error: "Too many verification requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    // 3. Strict Input Validation
    const body = await request.json();
    const { token, action } = body;

    // reCAPTCHA Enterprise tokens can be up to 8192 characters in length
    if (!token || typeof token !== "string" || token.trim() === "" || token.length > 8192) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing CAPTCHA token" },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const apiKey = process.env.RECAPTCHA_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aonime-f9084";
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    // 4. Primary: Try reCAPTCHA Enterprise Assessments API (Unlocks Account & Fraud Defense)
    if (apiKey && apiKey !== "your-api-key" && projectId && siteKey) {
      try {
        const enterpriseUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;
        const enterpriseRes = await fetch(enterpriseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: {
              token: token,
              siteKey: siteKey,
              ...(action ? { expectedAction: action } : {}),
              ...(clientIp ? { userIpAddress: clientIp } : {}),
            },
          }),
        });

        const enterpriseData = await enterpriseRes.json();

        if (enterpriseRes.ok) {
          const valid = enterpriseData.tokenProperties?.valid === true;
          const invalidReason = enterpriseData.tokenProperties?.invalidReason;
          const score = enterpriseData.riskAnalysis?.score;
          const returnedAction = enterpriseData.tokenProperties?.action;

          // Check if expected action matches returned action
          if (valid && action && returnedAction && returnedAction.toLowerCase() !== action.toLowerCase()) {
            console.warn(`[Security] Action mismatch: expected '${action}', got '${returnedAction}'`);
            return NextResponse.json(
              { success: false, error: "CAPTCHA action verification mismatch" },
              { status: 400 }
            );
          }

          if (valid) {
            if (typeof score === "number" && score < MIN_RECAPTCHA_SCORE) {
              console.warn(`[Security] Low reCAPTCHA Enterprise score: ${score}`);
              return NextResponse.json(
                { success: false, error: "Verification failed. Suspicious traffic detected." },
                { status: 400 }
              );
            }

            return NextResponse.json({
              success: true,
              score: score,
              reasons: enterpriseData.riskAnalysis?.reasons,
              action: returnedAction,
            });
          } else {
            console.warn(`[Security] reCAPTCHA Enterprise token invalid (${invalidReason}), falling back to siteverify...`);
          }
        } else {
          console.warn("[Security] reCAPTCHA Enterprise API response not OK, falling back to siteverify:", enterpriseRes.status, enterpriseData);
        }
      } catch (enterpriseErr) {
        console.warn("[Security] reCAPTCHA Enterprise request exception, falling back to siteverify:", enterpriseErr);
      }
    }

    // 5. Secondary: Standard reCAPTCHA siteverify API (For legacy v2/v3 non-Enterprise keys)
    if (secretKey && secretKey.trim() !== "" && secretKey !== "your-recaptcha-secret-key") {
      const params = new URLSearchParams({
        secret: secretKey,
        response: token,
        ...(clientIp ? { remoteip: clientIp } : {}),
      });

      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (data.success) {
        if (typeof data.score === "number" && data.score < MIN_RECAPTCHA_SCORE) {
          console.warn(`[Security] Low reCAPTCHA score detected: ${data.score}`);
          return NextResponse.json(
            { success: false, error: "Verification failed. Suspicious traffic detected." },
            { status: 400 }
          );
        }

        return NextResponse.json({ success: true });
      } else {
        const errorCodes = data["error-codes"] || [];
        console.error("[Security] reCAPTCHA siteverify error codes:", errorCodes);
        
        const isDev = process.env.NODE_ENV === "development";
        return NextResponse.json(
          {
            success: false,
            error: isDev
              ? `CAPTCHA verification failed: ${errorCodes.join(", ") || "invalid-token"}`
              : "CAPTCHA verification failed. Please try again.",
            ...(isDev ? { errorCodes: errorCodes } : {}),
          },
          { status: 400 }
        );
      }
    }

    // Default error response if neither API validated the token
    return NextResponse.json(
      {
        success: false,
        error: "CAPTCHA verification is unavailable. Missing server configuration.",
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("[Security] Exception during reCAPTCHA verification:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "An error occurred during verification" },
      { status: 500 }
    );
  }
}
