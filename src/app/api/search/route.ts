import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const page = searchParams.get('page') || '1';
  const refresh = searchParams.get('refresh');

  if (!keyword) {
    return NextResponse.json({ ok: false, message: 'Keyword is required' }, { status: 400 });
  }

  const backendUrl = new URL(`${process.env.API_BASE_URL}/search`);
  backendUrl.searchParams.set('keyword', keyword);
  backendUrl.searchParams.set('page', page);
  if (refresh) backendUrl.searchParams.set('refresh', '1');

  try {
    const res = await fetch(backendUrl.toString(), {
      next: { revalidate: 3600 },
    });
    
    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: String(err?.message || err) }, { status: 500 });
  }
}
