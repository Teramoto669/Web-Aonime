import { NextRequest, NextResponse } from "next/server";

// Minimum acceptable risk score for score-based reCAPTCHA (v3 / Enterprise)
const MIN_RECAPTCHA_SCORE = 0.5;

export async function POST(request: NextRequest) {
  try {
    // 1. Cross-Origin (CSRF) Origin Check
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        // Verify request comes from the exact same host (e.g. your domain)
        if (originHost !== host) {
          console.warn(`[Security] Cross-origin reCAPTCHA verification blocked from origin: ${origin}`);
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

    // 2. Strict Input Validation
    const body = await request.json();
    const { token, action } = body;

    if (!token || typeof token !== "string" || token.length > 2048) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing CAPTCHA token" },
        { status: 400 }
      );
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const apiKey = process.env.RECAPTCHA_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    // 3. Try reCAPTCHA Enterprise Assessments API
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
            },
          }),
        });

        if (enterpriseRes.ok) {
          const enterpriseData = await enterpriseRes.json();
          const isValid = enterpriseData.tokenProperties?.valid === true;
          const score = enterpriseData.riskAnalysis?.score;

          // Enforce minimum score if score is returned
          if (isValid && (score === undefined || score >= MIN_RECAPTCHA_SCORE)) {
            return NextResponse.json({
              success: true,
            });
          } else {
            console.warn(
              `[Security] reCAPTCHA Enterprise verification failed. Valid: ${isValid}, Score: ${score}, Reason: ${enterpriseData.tokenProperties?.invalidReason}`
            );
            return NextResponse.json(
              { success: false, error: "Verification failed. Suspicious traffic detected." },
              { status: 400 }
            );
          }
        } else {
          const errText = await enterpriseRes.text();
          console.error("[Security] reCAPTCHA Enterprise API HTTP error:", enterpriseRes.status, errText);
        }
      } catch (enterpriseErr) {
        console.error("[Security] reCAPTCHA Enterprise request error:", enterpriseErr);
      }
    }

    // 4. Fallback to standard reCAPTCHA siteverify API
    if (!secretKey || secretKey.trim() === "" || secretKey === "your-recaptcha-secret-key") {
      console.error(
        "[Security Warning] Neither RECAPTCHA_SECRET_KEY nor valid RECAPTCHA_API_KEY is configured on the server."
      );
      return NextResponse.json(
        { success: false, error: "CAPTCHA verification is unavailable" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
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
      // Check score threshold for v3 siteverify if present
      if (typeof data.score === "number" && data.score < MIN_RECAPTCHA_SCORE) {
        console.warn(`[Security] Low reCAPTCHA score detected: ${data.score}`);
        return NextResponse.json(
          { success: false, error: "Verification failed. Suspicious traffic detected." },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      console.error("[Security] reCAPTCHA siteverify failed. Internal codes:", data["error-codes"]);
      return NextResponse.json(
        { success: false, error: "CAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[Security] Exception during reCAPTCHA verification:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "An error occurred during verification" },
      { status: 500 }
    );
  }
}
