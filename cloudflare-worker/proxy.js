/**
 * Aonime Proxy — Cloudflare Worker
 *
 * Proxies ALL HLS requests (manifests, segments, subtitles) with Referer spoofing.
 * CF Workers free tier: 100K req/day, UNLIMITED bandwidth — safe for video proxying.
 *
 * Fix: Forward Range header to upstream so the browser can do byte-range requests
 * on large segments without getting corrupted/duplicate data (which caused stuck-at-0:00).
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const { searchParams } = new URL(request.url);
    const target  = searchParams.get('url');
    const referer = searchParams.get('referer');

    if (!target) {
      return Response.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Build upstream headers with spoofed Referer
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    };
    if (referer) {
      upstreamHeaders['Referer'] = referer;
      try { upstreamHeaders['Origin'] = new URL(referer).origin; } catch (_) {}
    }

    // Forward Range header for segment/key requests only — NOT for manifests.
    // Manifests are small text files; forwarding Range for them can cause the upstream
    // to return 206 Partial Content, which trips up some HLS.js manifest parsing paths.
    const rangeHeader = request.headers.get('Range');
    const isLikelyManifest = /\.m3u8/i.test(target) || target.includes('index-') || target.includes('master');
    if (rangeHeader && !isLikelyManifest) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    let upstreamRes;
    try {
      upstreamRes = await fetch(target, { headers: upstreamHeaders });
    } catch (err) {
      return Response.json({ error: String(err) }, { status: 502 });
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return Response.json({ error: `Upstream ${upstreamRes.status}` }, { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isManifest  = /\.m3u8/i.test(target) || contentType.includes('mpegurl');
    const isSubtitle  = /\.vtt/i.test(target) || contentType.includes('vtt');

    // ── Subtitle → proxy as-is ───────────────────────────────────────────────
    if (isSubtitle) {
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: { 'Content-Type': 'text/vtt; charset=utf-8', ...CORS_HEADERS },
      });
    }

    // ── Manifest → rewrite ALL URLs to go through this worker ────────────────
    if (isManifest) {
      const workerBase = new URL(request.url).origin;
      const text = await upstreamRes.text();
      const rewritten = text.split('\n').map(line => {
        // Rewrite codecs to prevent bufferAppendError with HE-AAC v2 in Chrome MSE
        if (line.includes('CODECS=')) {
          line = line.replace(/mp4a\.40\.29/g, 'mp4a.40.2').replace(/mp4a\.40\.5/g, 'mp4a.40.2');
        }

        // Rewrite URI attributes in tags (e.g. #EXT-X-KEY:URI="...", #EXT-X-MAP:URI="...")
        if (line.includes('URI=')) {
          line = line.replace(/URI=["']([^"']+)["']/g, (match, uri) => {
            let keyUrl = uri;
            try {
              if (!keyUrl.startsWith('http')) {
                keyUrl = new URL(keyUrl, target).toString();
              }
              
              // Rewrite .buzz hosts to match target host
              try {
                const parsedUri = new URL(keyUrl);
                if (parsedUri.hostname.endsWith('.buzz')) {
                  parsedUri.host = new URL(target).host;
                  keyUrl = parsedUri.toString();
                }
              } catch (_) {}

              let url = `${workerBase}/?url=${encodeURIComponent(keyUrl)}`;
              if (referer) url += `&referer=${encodeURIComponent(referer)}`;
              return `URI="${url}"`;
            } catch {
              return match;
            }
          });
        }

        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        try {
          let resolved = new URL(trimmed, target).toString();
          
          // Rewrite .buzz hosts to match target host
          try {
            const parsedUri = new URL(resolved);
            if (parsedUri.hostname.endsWith('.buzz')) {
              parsedUri.host = new URL(target).host;
              resolved = parsedUri.toString();
            }
          } catch (_) {}

          // ALL segment and sub-manifest URLs → through this worker
          let url = `${workerBase}/?url=${encodeURIComponent(resolved)}`;
          if (referer) url += `&referer=${encodeURIComponent(referer)}`;
          return url;
        } catch {
          return line;
        }
      }).join('\n');

      return new Response(rewritten, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          ...CORS_HEADERS,
        },
      });
    }

    // ── Video segment / key → stream with corrected content-type ─────────────
    // CDNs disguise .ts segments as image/jpg, image/png etc. to prevent hotlinking.
    // Force application/octet-stream so HLS.js decodes them correctly.
    // Also forward Content-Length, Content-Range, Accept-Ranges so the browser
    // media pipeline correctly handles byte-range responses (206 Partial Content).
    const isRealMedia = contentType.includes('video') ||
                        contentType.includes('audio') ||
                        contentType.includes('octet-stream') ||
                        contentType.includes('mp4') ||
                        contentType.includes('mpegurl');

    const responseHeaders = {
      'Content-Type': isRealMedia ? contentType : 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
      ...CORS_HEADERS,
    };

    // Pass through byte-range response metadata
    const contentLength = upstreamRes.headers.get('Content-Length');
    const contentRange  = upstreamRes.headers.get('Content-Range');
    const acceptRanges  = upstreamRes.headers.get('Accept-Ranges');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange)  responseHeaders['Content-Range']  = contentRange;
    if (acceptRanges)  responseHeaders['Accept-Ranges']  = acceptRanges;
    // If upstream supports ranges but didn't advertise it, declare it
    if (!acceptRanges && upstreamRes.status === 206) {
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  },
};
