import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, message: 'API_BASE_URL environment variable is missing' },
        { status: 500 }
      );
    }
    const res = await fetch(
      `${baseUrl}/filter?sort=latest-updated`,
      { next: { revalidate: 60 } } // cache 60s on the server
    );
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
