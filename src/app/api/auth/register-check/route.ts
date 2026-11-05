import { NextRequest, NextResponse } from "next/server";

// ponytail: in-memory per-IP signup tracker; upgrade to Redis/Firestore if running multi-region serverless at scale
const ipSignupMap = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ allowed: false, error: "Unauthorized origin" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ allowed: false, error: "Invalid origin" }, { status: 400 });
      }
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const body = await request.json().catch(() => ({}));
    const action = body.action === "record" ? "record" : "check";
    const maxAccounts = Math.max(1, Math.min(20, Number(body.maxAccounts) || 2));
    const windowMs = Math.max(1, Math.min(1440, Number(body.windowMinutes) || 60)) * 60 * 1000;

    const now = Date.now();
    const history = (ipSignupMap.get(clientIp) || []).filter((ts) => now - ts < windowMs);

    if (action === "check") {
      ipSignupMap.set(clientIp, history);
      if (history.length >= maxAccounts) {
        const oldestInWindow = history[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
        return NextResponse.json(
          {
            allowed: false,
            retryAfterSeconds,
            error: `Too many accounts created recently. Please wait ${Math.ceil(retryAfterSeconds / 60)} minute(s) before creating another account.`,
          },
          { status: 429 }
        );
      }
      return NextResponse.json({ allowed: true });
    }

    // action === "record"
    history.push(now);
    ipSignupMap.set(clientIp, history);
    return NextResponse.json({ allowed: true, recorded: true });
  } catch (err) {
    return NextResponse.json({ allowed: true });
  }
}

