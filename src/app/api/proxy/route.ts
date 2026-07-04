import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
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

  try {
    const upstreamRes = await fetch(target, {
      headers: forwarded,
      cache: 'no-store',
    });

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
      const text = await upstreamRes.text();
      const rewritten = text.split('\n').map((line) => {
        // Rewrite codecs to prevent bufferAppendError with HE-AAC v2 in Chrome MSE
        if (line.includes('CODECS=')) {
          line = line.replace(/mp4a\.40\.29/g, 'mp4a.40.2').replace(/mp4a\.40\.5/g, 'mp4a.40.2');
        }

        // Rewrite URI= attributes (#EXT-X-KEY, #EXT-X-MAP, etc.)
        if (line.includes('URI=')) {
          line = line.replace(/URI=["']([^"']+)["']/g, (match, uri) => {
            try {
              const absolute = uri.startsWith('http') ? uri : new URL(uri, target).toString();
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

        try {
          const resolved = new URL(trimmed, target).toString();
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

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'content-type': isRealMedia ? ct : 'application/octet-stream',
        'cache-control': 'public, max-age=3600',
        ...corsHeaders,
      },
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
