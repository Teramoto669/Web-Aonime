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
  const isSubtitle  = /\.vtt/i.test(target) || /subtitles\//i.test(target);

  // Video segments: redirect directly to CDN — zero Vercel bandwidth
  // (anything that isn't a manifest or subtitle)
  if (!isManifest && !isSubtitle) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': target,
        ...corsHeaders,
      },
    });
  }

  // Manifests and subtitles: proxy through Vercel (tiny files, need Referer/CORS)
  try {
    const forwarded: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    };

    if (refererParam) {
      forwarded['Referer'] = refererParam;
      try { forwarded['Origin'] = new URL(refererParam).origin; } catch (_) {}
    }

    const upstreamRes = await fetch(target, {
      headers: forwarded,
      cache: 'no-store',
    });

    if (!upstreamRes.ok) {
      return NextResponse.json({ error: `Upstream ${upstreamRes.status}` }, { status: upstreamRes.status });
    }

    // ── Subtitle (VTT) — proxy as-is ──────────────────────────────────────
    if (isSubtitle) {
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          'content-type': 'text/vtt; charset=utf-8',
          ...corsHeaders,
        },
      });
    }

    // ── Manifest (m3u8) — rewrite URLs ────────────────────────────────────
    const text = await upstreamRes.text();
    const lines = text.split('\n');
    const rewritten = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      try {
        const resolved = new URL(trimmed, target).toString();
        // Sub-manifests (variant playlists) still need proxy
        if (/\.m3u8/i.test(resolved) || /\/(master|playlist|index)/i.test(resolved)) {
          let proxied = `/api/proxy?url=${encodeURIComponent(resolved)}`;
          if (refererParam) proxied += `&referer=${encodeURIComponent(refererParam)}`;
          return proxied;
        }
        // Segments → direct CDN URL (no proxy, no Vercel bandwidth)
        return resolved;
      } catch {
        return line;
      }
    }).join('\n');

    return new Response(rewritten, {
      status: upstreamRes.status,
      headers: {
        'content-type': 'application/vnd.apple.mpegurl',
        ...corsHeaders,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
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
