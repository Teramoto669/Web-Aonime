import { NextRequest, NextResponse } from 'next/server';

// Lightweight proxy for m3u8 and segment requests.
// Usage: /api/proxy?url=<encoded upstream url>
// The proxy forwards most request headers to the upstream target and
// rewrites m3u8 manifests so that segment URLs are proxied as well.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  console.log(`[Proxy] Received request for target: ${target}`);

  try {
    // Build headers to forward upstream.
    // We accept a special header 'x-proxy-headers' containing an encoded JSON map of headers
    // that the client wants the proxy to add when calling upstream (useful to forward Referer etc.).
    const forwarded: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      // Skip host header to avoid confusing upstream
      if (key.toLowerCase() === 'host') return;
      // We'll not forward the x-proxy-headers header itself
      if (key.toLowerCase() === 'x-proxy-headers') return;
      forwarded[key] = value as string;
    });

    // If the client supplied encoded proxy headers, parse and merge them (they overwrite existing keys)
    const encodedProxyHeaders = req.headers.get('x-proxy-headers');
    if (encodedProxyHeaders) {
      try {
        const decoded = decodeURIComponent(encodedProxyHeaders);
        const extra = JSON.parse(decoded) as Record<string, string>;
        Object.entries(extra).forEach(([k, v]) => {
          if (v !== undefined && v !== null) forwarded[k] = String(v);
        });
      } catch (e) {
        // ignore malformed header
        console.warn('Invalid x-proxy-headers payload', e);
      }
    }

    console.log(`[Proxy] Forwarding headers: ${JSON.stringify(forwarded)}`);

    const upstreamRes = await fetch(target, {
      headers: forwarded,
      // do not cache by default
      cache: 'no-store',
    });

    console.log(`[Proxy] Upstream response status: ${upstreamRes.status} ${upstreamRes.statusText}`);

    const contentType = upstreamRes.headers.get('content-type') || '';

    // If manifest, rewrite URLs to go through the proxy so segments are fetched via proxy too
    if (contentType.includes('mpegurl') || target.endsWith('.m3u8')) {
      const text = await upstreamRes.text();
      const lines = text.split('\n');
      const rewritten = lines
        .map((line) => {
          const trimmed = line.trim();
          // Keep comments and empty lines
          if (!trimmed || trimmed.startsWith('#')) return line;
          try {
            const resolved = new URL(trimmed, target).toString();
            return `/api/proxy?url=${encodeURIComponent(resolved)}`;
          } catch (e) {
            return line;
          }
        })
        .join('\n');

      return new Response(rewritten, {
        status: upstreamRes.status,
        headers: {
          'content-type': contentType,
        },
      });
    }

    // For binary responses (segments, etc.) just pipe through
    const buffer = await upstreamRes.arrayBuffer();
    const headers: Record<string, string> = {};
    if (contentType) headers['content-type'] = contentType;
    return new Response(buffer, { status: upstreamRes.status, headers });
  } catch (err: any) {
    console.error('proxy error', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
