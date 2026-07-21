import { NextRequest, NextResponse } from 'next/server';
import { filterAnime } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('keyword') || undefined;
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : undefined;
    const sort = searchParams.get('sort') || undefined;
    const refresh = searchParams.get('refresh') === '1';

    const getArrayParam = (paramName: string) => {
      const arr = searchParams.getAll(`${paramName}[]`);
      if (arr.length) return arr;
      const single = searchParams.getAll(paramName);
      return single.length ? single : undefined;
    };

    const genre = getArrayParam('genre');
    const term_type = getArrayParam('term_type');
    const season = getArrayParam('season');
    const year = getArrayParam('year');
    const status = getArrayParam('status');
    const language = getArrayParam('language');
    const rating = getArrayParam('rating');

    const data = await filterAnime({
      keyword,
      page,
      sort,
      refresh,
      genre,
      term_type,
      season,
      year,
      status,
      language,
      rating,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
