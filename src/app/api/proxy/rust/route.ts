import { NextRequest, NextResponse } from 'next/server';

// Server-side forwarder to the external Rust m3u8 proxy.
// This endpoint hides the rust-proxy URL from the client and allows
// server-side logging, caching, or header normalization.
// Usage from client: /api/proxy/rust?url=<upstream>&headers=<url-encoded-json>&origin=<origin>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('url');
    const headersParam = searchParams.get('headers') || '';
    const originParam = searchParams.get('origin') || '';

    if (!target) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Basic validation: only allow http/https upstreams
    if (!/^https?:\/\//i.test(target)) {
      return NextResponse.json({ error: 'Invalid `url` parameter' }, { status: 400 });
    }

    // Determine rust proxy base from server env. Prefer RUST_PROXY, then NEXT_PUBLIC_RUST_PROXY.
    const RUST_PROXY = process.env.RUST_PROXY || process.env.NEXT_PUBLIC_RUST_PROXY || 'http://127.0.0.1:8080';

    // Build rust-proxy URL and forward the query params
    const qp: string[] = [];
    qp.push(`url=${encodeURIComponent(target)}`);
    if (headersParam) qp.push(`headers=${encodeURIComponent(headersParam)}`);
    if (originParam) qp.push(`origin=${encodeURIComponent(originParam)}`);

    const rustUrl = `${RUST_PROXY}/?${qp.join('&')}`;

    // Perform server-side fetch to rust-proxy
    console.info(`[rust-forwarder] forwarding request to rust proxy: ${rustUrl}`);
    const upstream = await fetch(rustUrl, { cache: 'no-store' });

    // Mirror status and content-type
    const contentType = upstream.headers.get('content-type') || '';

    // Diagnostic: if upstream returns an error status (4xx/5xx) or a manifest, log headers and a small
    // snippet of the body to help troubleshoot 403s. Avoid logging large binary content.
    const respHeaders: Record<string, string> = {};
    if (contentType) respHeaders['content-type'] = contentType;
    respHeaders['x-proxied-by'] = 'nextjs-rust-forwarder';
    respHeaders['x-upstream-status'] = String(upstream.status);

    const shouldLogBody = upstream.status >= 400 || contentType.includes('mpegurl') || contentType.includes('text');
    if (shouldLogBody) {
      try {
        const text = await upstream.text();
        // Log a snippet only (first 2000 chars)
        const snippet = typeof text === 'string' ? text.slice(0, 2000) : '';
        console.warn('[rust-forwarder] upstream response', {
          target,
          rustUrl,
          status: upstream.status,
          contentType,
          bodySnippet: snippet,
        });
        // Return the text body to the client
        return new NextResponse(text, { status: upstream.status, headers: respHeaders });
      } catch (e) {
        console.error('[rust-forwarder] failed to read upstream text body', e);
        // fallthrough to stream body if reading failed
      }
    }

    // For binary or non-logged responses, stream the upstream body
    return new NextResponse(upstream.body, { status: upstream.status, headers: respHeaders });
  } catch (err: any) {
    console.error('rust proxy forwarder error', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
