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

  // ── Only handle manifest (.m3u8) requests ────────────────────────────────
  // Segments are served DIRECTLY from CDN by the browser — we only proxy manifests
  // to inject the Referer header, which the browser cannot set itself.
  const isManifest = target.includes('.m3u8') || target.includes('master') || target.includes('playlist');

  if (!isManifest) {
    // For non-manifest URLs, redirect browser directly to CDN — no Vercel bandwidth used.
    // The browser will fetch the segment directly. CDN may or may not enforce Referer.
    return Response.redirect(target, 302);
  }

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
      return NextResponse.json({ error: `Upstream error: ${upstreamRes.status}` }, { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const text = await upstreamRes.text();

    // Rewrite manifest: point segments to DIRECT CDN URLs (not proxied)
    // Only proxy sub-manifests (variant playlists) since they also need Referer
    const lines = text.split('\n');
    const rewritten = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      try {
        const resolved = new URL(trimmed, target).toString();
        // If it's another manifest (.m3u8), keep proxying it (tiny text file)
        if (resolved.includes('.m3u8') || /\/playlist|\/master/i.test(resolved)) {
          let proxied = `/api/proxy?url=${encodeURIComponent(resolved)}`;
          if (refererParam) proxied += `&referer=${encodeURIComponent(refererParam)}`;
          return proxied;
        }
        // Segments go DIRECT to CDN — no Vercel bandwidth used
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
