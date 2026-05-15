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

  try {
    const forwarded: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Read referer param from query string and forward as Referer + Origin headers
    const refererParam = searchParams.get('referer');
    if (refererParam) {
      forwarded['Referer'] = refererParam;
      try {
        forwarded['Origin'] = new URL(refererParam).origin;
      } catch (_) {}
    }

    // Optional: extra headers from x-proxy-headers
    const encodedProxyHeaders = req.headers.get('x-proxy-headers');
    if (encodedProxyHeaders) {
      try {
        const extra = JSON.parse(decodeURIComponent(encodedProxyHeaders)) as Record<string, string>;
        Object.entries(extra).forEach(([k, v]) => {
          if (v != null) forwarded[k] = String(v);
        });
      } catch (e) {
        console.warn('[Proxy] Invalid x-proxy-headers payload', e);
      }
    }

    console.log(`[Proxy] Fetching ${target} with referer: ${forwarded['Referer'] ?? 'none'}`);

    const upstreamRes = await fetch(target, {
      headers: forwarded,
      cache: 'no-store',
    });

    const contentType = upstreamRes.headers.get('content-type') || '';
    console.log(`[Proxy] Upstream ${upstreamRes.status} content-type: ${contentType}`);

    // If m3u8 manifest, rewrite segment URLs to go through the proxy too
    if (contentType.includes('mpegurl') || target.includes('.m3u8')) {
      const text = await upstreamRes.text();
      const lines = text.split('\n');
      const rewritten = lines
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          try {
            const resolved = new URL(trimmed, target).toString();
            let proxied = `/api/proxy?url=${encodeURIComponent(resolved)}`;
            if (refererParam) {
              proxied += `&referer=${encodeURIComponent(refererParam)}`;
            }
            return proxied;
          } catch {
            return line;
          }
        })
        .join('\n');

      return new Response(rewritten, {
        status: upstreamRes.status,
        headers: {
          'content-type': 'application/vnd.apple.mpegurl',
          ...corsHeaders,
        },
      });
    }

    // For binary responses (segments, etc.) stream directly — do NOT buffer.
    // CDNs disguise .ts segments as image/png, image/jpeg, etc.
    // Force application/octet-stream so HLS.js decodes them correctly.
    const isRealMediaType =
      contentType.includes('mpegurl') ||
      contentType.includes('mp4') ||
      contentType.includes('webvtt') ||
      contentType.includes('vtt') ||
      contentType === 'application/octet-stream';

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        ...corsHeaders,
        'content-type': isRealMediaType ? contentType : 'application/octet-stream',
      },
    });

  } catch (err: any) {
    console.error('[Proxy] Error:', err);
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
