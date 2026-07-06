import { NextRequest, NextResponse } from 'next/server';
import { getAnimeTooltip } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get('refresh') === '1';

  if (!id) {
    return NextResponse.json({ ok: false, message: 'Missing ID' }, { status: 400 });
  }

  try {
    const data = await getAnimeTooltip(id, refresh);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
