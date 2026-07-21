import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, message: 'API_BASE_URL environment variable is missing' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name') || 'updated-all';
    const page = searchParams.get('page') || '1';
    const refresh = searchParams.get('refresh');

    const upstreamParams = new URLSearchParams();
    upstreamParams.set('name', name);
    upstreamParams.set('page', page);
    if (refresh !== '0') upstreamParams.set('refresh', '1');

    const res = await fetch(`${baseUrl}/widget?${upstreamParams.toString()}`, {
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`Upstream error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
