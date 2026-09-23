import { NextRequest, NextResponse } from 'next/server';
import { getSchedule } from '@/lib/api';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tz = searchParams.get('tz') || '0';
  const refresh = searchParams.get('refresh') === '1';

  try {
    const data = await getSchedule(tz, refresh);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
