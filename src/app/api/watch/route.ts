import { NextResponse } from 'next/server';
import { getWatchData } from '@/lib/api';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const ep = searchParams.get('ep');

    if (!slug || !ep) {
        return NextResponse.json({ error: 'Missing slug or ep parameter' }, { status: 400 });
    }

    try {
        const data = await getWatchData(slug, ep);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to fetch watch data' }, { status: 500 });
    }
}
