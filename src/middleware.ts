import { NextResponse, type NextRequest } from "next/server";

// Known aggressive bot/scraper and AI crawler user agent keywords
const BLOCKED_UA_REGEX = new RegExp(
  [
    "bytespider",
    "gptbot",
    "chatgpt-user",
    "claudebot",
    "claude-web",
    "ccbot",
    "perplexitybot",
    "diffbot",
    "applebot-extended",
    "google-extended",
    "amazonbot",
    "anthropic-ai",
    "cohere-ai",
    "omgilibot",
    "scrapy",
    "python-requests",
    "aiohttp",
    "httpx",
    "postmanruntime",
    "go-http-client",
    "curl",
    "wget",
    "libwww-perl",
  ].join("|"),
  "i"
);

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") || "";
  const path = request.nextUrl.pathname;

  // 1. Block AI Bots, scrapers, and headless automation tools
  if (BLOCKED_UA_REGEX.test(ua)) {
    return new NextResponse("Access Forbidden: Automated scraping and AI crawling are disabled.", {
      status: 403,
      headers: {
        "Content-Type": "text/plain",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // 2. Extra API Route Protection
  if (path.startsWith("/api/")) {
    // If request attempts to abuse ?refresh=1 without coming from same-origin/first-party
    const searchParams = request.nextUrl.searchParams;
    if (searchParams.get("refresh") === "1") {
      const secFetchSite = request.headers.get("sec-fetch-site");
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");

      const isSameOrigin =
        secFetchSite === "same-origin" ||
        (origin && host && origin.includes(host)) ||
        (referer && host && referer.includes(host));

      // If ?refresh=1 is requested from untrusted external script/postman, sanitize it by stripping refresh=1
      if (!isSameOrigin) {
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete("refresh");
        return NextResponse.rewrite(cleanUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, robots.txt (public metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
  ],
};

