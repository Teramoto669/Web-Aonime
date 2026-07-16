import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Security check: Block direct access (copy-pasting URL in browser tab or cross-origin requests)
  const refererHeader = req.headers.get('Referer');
  const secFetchDest = req.headers.get('Sec-Fetch-Dest');

  if (secFetchDest === 'document' || secFetchDest === 'iframe') {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  if (!refererHeader) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  try {
    const refUrl = new URL(refererHeader);
    const requestHost = new URL(req.url).host;
    if (refUrl.host !== requestHost) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }
  } catch (_) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  };

  const refererParam = searchParams.get('referer');

  // Determine what this URL is
  const isManifest = /\.m3u8/i.test(target) || /\/(master|playlist|index)/i.test(target);
  const isSubtitle = /\.vtt/i.test(target) || /subtitles\//i.test(target);

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
      const workerUrl = `${CF_PROXY}/?url=${encodeURIComponent(target)}${refererParam ? `&referer=${encodeURIComponent(refererParam)}` : ''}`;
      upstreamRes = await fetch(workerUrl, {
        headers: forwarded,
        cache: 'no-store',
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

    // ── Subtitle (VTT) — proxy as-is ────────────────────────────────────────
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
              
              // Rewrite .buzz hosts to match the target host
              try {
                const parsedUri = new URL(absolute);
                if (parsedUri.hostname.endsWith('.buzz')) {
                  parsedUri.host = new URL(target).host;
                  absolute = parsedUri.toString();
                }
              } catch (_) {}

              let proxied = `/api/proxy?url=${encodeURIComponent(absolute)}`;
              if (refererParam) proxied += `&referer=${encodeURIComponent(refererParam)}`;
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
          
          // Rewrite .buzz hosts to match the target host
          try {
            const parsedUri = new URL(resolved);
            if (parsedUri.hostname.endsWith('.buzz')) {
              parsedUri.host = new URL(target).host;
              resolved = parsedUri.toString();
            }
          } catch (_) {}

          // All segment/sub-manifest URLs → through this proxy (with Referer)
          let proxied = `/api/proxy?url=${encodeURIComponent(resolved)}`;
          if (refererParam) proxied += `&referer=${encodeURIComponent(refererParam)}`;
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
