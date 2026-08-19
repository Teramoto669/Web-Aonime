import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function isSafeUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    
    // 1. Only allow HTTP and HTTPS protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // 2. Reject empty hostname or credentials embedded in URL
    if (!hostname || parsed.username || parsed.password) {
      return false;
    }

    // 3. Block loopback, localhost, and internal domain names
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.lan') ||
      hostname === '0.0.0.0' ||
      hostname === '::' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      return false;
    }

    // 4. Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return false;
    }

    // 5. Block IPv4 private & special ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const o1 = Number(ipMatch[1]);
      const o2 = Number(ipMatch[2]);
      const o3 = Number(ipMatch[3]);
      const o4 = Number(ipMatch[4]);
      if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return false;

      if (o1 === 127) return false; // 127.0.0.0/8 (Loopback)
      if (o1 === 10) return false; // 10.0.0.0/8 (Private)
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return false; // 172.16.0.0/12 (Private)
      if (o1 === 192 && o2 === 168) return false; // 192.168.0.0/16 (Private)
      if (o1 === 169 && o2 === 254) return false; // 169.254.0.0/16 (Link-local)
      if (o1 === 100 && o2 >= 64 && o2 <= 127) return false; // 100.64.0.0/10 (CGNAT)
      if (o1 === 0) return false; // 0.0.0.0/8
    }

    // 6. Block decimal / hex / octal IP representations
    if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // SSRF Protection: Validate target URL against private IPs and cloud metadata
  if (!isSafeUrl(target)) {
    return NextResponse.json({ error: 'Forbidden or invalid target URL' }, { status: 400 });
  }

  const customProxy = searchParams.get('proxy');
  if (customProxy && !isSafeUrl(customProxy)) {
    return NextResponse.json({ error: 'Forbidden or invalid proxy URL' }, { status: 400 });
  }

  // Security check: Block direct document/iframe navigation
  const secFetchDest = req.headers.get('Sec-Fetch-Dest');
  if (secFetchDest === 'document' || secFetchDest === 'iframe') {
    return NextResponse.json({ status: 400, result: 'Bad request' }, { status: 400 });
  }

  const refererHeader = req.headers.get('Referer');
  if (!refererHeader) {
    return NextResponse.json({ status: 400, result: 'Bad request' }, { status: 400 });
  }

  try {
    const refUrl = new URL(refererHeader);
    const requestHost = new URL(req.url).host;
    if (refUrl.host !== requestHost) {
      return NextResponse.json({ status: 400, result: 'Bad request' }, { status: 400 });
    }
  } catch (_) {
    return NextResponse.json({ status: 400, result: 'Bad request' }, { status: 400 });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'X-Accel-Buffering': 'no',
  };

  const refererParam = searchParams.get('referer');

  // Determine what this URL is
  const isManifest = /\.m3u8/i.test(target) || /\/(master|playlist|index)/i.test(target);
  const isSubtitle = /\.(vtt|srt|ass)$/i.test(target) || /subtitles\//i.test(target);

  // Build upstream headers — always inject Referer so CDNs like vidstream
  // don't 403 segment requests (which is what caused the "stuck at 0:00" bug).
  const forwarded: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
  };

  if (refererParam) {
    forwarded['Referer'] = refererParam;
    try { forwarded['Origin'] = new URL(refererParam).origin; } catch (_) {}
  }

  // Forward Range header for segment/key requests only — NOT for manifests.
  const rangeHeader = req.headers.get('Range');
  if (rangeHeader && !isManifest) {
    forwarded['Range'] = rangeHeader;
  }

  let CF_PROXY = process.env.CF_PROXY_URL ? process.env.CF_PROXY_URL.trim() : '';
  if (CF_PROXY) {
    CF_PROXY = (CF_PROXY.startsWith('http') ? CF_PROXY : `https://${CF_PROXY}`).replace(/\/$/, '');
  }

  try {
    let upstreamRes;
    if (CF_PROXY) {
      let workerUrl = `${CF_PROXY}/?url=${encodeURIComponent(target)}`;
      if (refererParam) workerUrl += `&referer=${encodeURIComponent(refererParam)}`;
      if (customProxy)  workerUrl += `&proxy=${encodeURIComponent(customProxy)}`;

      upstreamRes = await fetch(workerUrl, {
        headers: forwarded,
        cache: 'no-store',
      });

      if (!upstreamRes.ok) {
        return NextResponse.json(
          { error: `Upstream ${upstreamRes.status}` },
          { status: upstreamRes.status },
        );
      }

      // Return the Cloudflare Worker's response directly to the browser.
      // The Cloudflare Worker has already performed all necessary manifest rewriting (pointing to the worker's URL)
      // and has set all appropriate CORS and Range headers.
      const responseHeaders = new Headers();
      upstreamRes.headers.forEach((value, key) => {
        responseHeaders.set(key, value);
      });
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('X-Accel-Buffering', 'no');

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    } else {
      upstreamRes = await fetch(target, {
        headers: forwarded,
        cache: 'no-store',
      });
    }

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstreamRes.status}` },
        { status: upstreamRes.status },
      );
    }

    // ── Subtitle (VTT/SRT/ASS) — proxy as-is ─────────────────────────────────
    if (isSubtitle) {
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          'content-type': 'text/vtt; charset=utf-8',
          ...corsHeaders,
        },
      });
    }

    // ── Manifest (m3u8) — rewrite ALL URLs through this proxy ───────────────
    if (isManifest) {
      let text = await upstreamRes.text();

      // If a Cloudflare Worker was used, replace its URL with the local proxy path
      if (CF_PROXY) {
        try {
          const workerOrigin = new URL(CF_PROXY).origin;
          const escapedOrigin = workerOrigin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(escapedOrigin + '/?', 'g');
          text = text.replace(regex, '/api/proxy');
        } catch (_) {}
      }

      const rewritten = text.split('\n').map((line) => {
        // Rewrite codecs to prevent bufferAppendError with HE-AAC v2 in Chrome MSE
        if (line.includes('CODECS=')) {
          line = line.replace(/mp4a\.40\.29/g, 'mp4a.40.2').replace(/mp4a\.40\.5/g, 'mp4a.40.2');
        }

        // Rewrite URI= attributes (#EXT-X-KEY, #EXT-X-MAP, etc.)
        if (line.includes('URI=')) {
          line = line.replace(/URI=["']([^"']+)["']/g, (match, uri) => {
            if (uri.startsWith('/api/proxy')) return match;
            try {
              let absolute = uri.startsWith('http') ? uri : new URL(uri, target).toString();
              
              // Rewrite .buzz and .click hosts to match the target host
              try {
                const parsedUri = new URL(absolute);
                if (parsedUri.hostname.endsWith('.buzz') || parsedUri.hostname.endsWith('.click')) {
                  parsedUri.host = new URL(target).host;
                  absolute = parsedUri.toString();
                }
              } catch (_) {}

              let proxied = `/api/proxy?url=${encodeURIComponent(absolute)}`;
              if (refererParam) proxied += `&referer=${encodeURIComponent(refererParam)}`;
              if (customProxy)  proxied += `&proxy=${encodeURIComponent(customProxy)}`;
              return `URI="${proxied}"`;
            } catch {
              return match;
            }
          });
        }

        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        if (trimmed.startsWith('/api/proxy')) return line;

        try {
          let resolved = new URL(trimmed, target).toString();
          
          // Rewrite .buzz and .click hosts to match the target host
          try {
            const parsedUri = new URL(resolved);
            if (parsedUri.hostname.endsWith('.buzz') || parsedUri.hostname.endsWith('.click')) {
              parsedUri.host = new URL(target).host;
              resolved = parsedUri.toString();
            }
          } catch (_) {}

          // All segment/sub-manifest URLs → through this proxy (with Referer & optional custom proxy)
          let proxied = `/api/proxy?url=${encodeURIComponent(resolved)}`;
          if (refererParam) proxied += `&referer=${encodeURIComponent(refererParam)}`;
          if (customProxy)  proxied += `&proxy=${encodeURIComponent(customProxy)}`;
          return proxied;
        } catch {
          return line;
        }
      }).join('\n');

      return new Response(rewritten, {
        status: upstreamRes.status,
        headers: {
          'content-type': 'application/vnd.apple.mpegurl',
          'cache-control': 'no-store',
          ...corsHeaders,
        },
      });
    }

    // ── Video segment / encryption key — stream with corrected content-type ──
    // CDNs sometimes disguise .ts segments as image/* to prevent hotlinking.
    const ct = upstreamRes.headers.get('content-type') || '';
    const isRealMedia =
      ct.includes('video') ||
      ct.includes('audio') ||
      ct.includes('octet-stream') ||
      ct.includes('mp4') ||
      ct.includes('mpegurl');

    const responseHeaders: Record<string, string> = {
      'content-type': isRealMedia ? ct : 'application/octet-stream',
      'cache-control': 'public, max-age=3600',
      ...corsHeaders,
    };

    const contentLength = upstreamRes.headers.get('Content-Length');
    const contentRange  = upstreamRes.headers.get('Content-Range');
    const acceptRanges  = upstreamRes.headers.get('Accept-Ranges');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange)  responseHeaders['Content-Range']  = contentRange;
    if (acceptRanges)  responseHeaders['Accept-Ranges']  = acceptRanges;
    if (!acceptRanges && upstreamRes.status === 206) {
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
