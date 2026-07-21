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
    const type = searchParams.get('type') || 'Latest Updated';
    const sort = searchParams.get('sort') || 'latest-updated';
    const page = searchParams.get('page');
    const refresh = searchParams.get('refresh');

    const upstreamParams = new URLSearchParams();
    upstreamParams.set('type', type);
    upstreamParams.set('sort', sort);
    if (page) upstreamParams.set('page', page);
    if (refresh) upstreamParams.set('refresh', '1');

    const res = await fetch(`${baseUrl}/latest?${upstreamParams.toString()}`, {
      next: { revalidate: 60 },
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
