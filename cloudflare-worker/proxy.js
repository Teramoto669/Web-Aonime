/**
 * Aonime Proxy — Cloudflare Worker
 *
 * Proxies HLS manifests and subtitle VTT files with Referer spoofing.
 * Video segments are returned directly from CDN (redirect) to save bandwidth.
 *
 * Free limits: 100K requests/day, unlimited bandwidth on Cloudflare Workers free tier.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
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

    const isManifest = /\.m3u8/i.test(target) || /\/(master|playlist|index)/i.test(target);
    const isSubtitle  = /\.vtt/i.test(target) || /subtitles\//i.test(target);

    // ── Video segments → redirect to CDN directly (no bandwidth used here) ──
    if (!isManifest && !isSubtitle) {
      return new Response(null, {
        status: 302,
        headers: { Location: target, ...CORS_HEADERS },
      });
    }

    // ── Fetch manifests / subtitles with spoofed headers ────────────────────
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    };
    if (referer) {
      upstreamHeaders['Referer'] = referer;
      try { upstreamHeaders['Origin'] = new URL(referer).origin; } catch (_) {}
    }

    let upstreamRes;
    try {
      upstreamRes = await fetch(target, { headers: upstreamHeaders });
    } catch (err) {
      return Response.json({ error: String(err) }, { status: 502 });
    }

    if (!upstreamRes.ok) {
      return Response.json({ error: `Upstream ${upstreamRes.status}` }, { status: upstreamRes.status });
    }

    // ── Subtitle → proxy as-is ───────────────────────────────────────────────
    if (isSubtitle) {
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: { 'Content-Type': 'text/vtt; charset=utf-8', ...CORS_HEADERS },
      });
    }

    // ── Manifest → rewrite segment/sub-manifest URLs ─────────────────────────
    const workerBase = new URL(request.url).origin; // e.g. https://proxy.yourname.workers.dev
    const text = await upstreamRes.text();
    const rewritten = text.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      try {
        const resolved = new URL(trimmed, target).toString();
        // Sub-manifests still need proxy
        if (/\.m3u8/i.test(resolved) || /\/(master|playlist|index)/i.test(resolved)) {
          let url = `${workerBase}/?url=${encodeURIComponent(resolved)}`;
          if (referer) url += `&referer=${encodeURIComponent(referer)}`;
          return url;
        }
        // Segments → direct CDN URL (CF redirects for free)
        return resolved;
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
  },
};
