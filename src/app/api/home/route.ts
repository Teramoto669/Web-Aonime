import { NextResponse } from 'next/server';
import { getHomeData } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getHomeData();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
