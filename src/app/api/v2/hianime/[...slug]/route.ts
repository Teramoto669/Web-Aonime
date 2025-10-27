import {NextRequest, NextResponse} from 'next/server';

const API_BASE_URL = 'https://aniwatch-api.vercel.app/api/v2/hianime';

// This is a proxy to avoid CORS issues
export async function GET(
  req: NextRequest,
  {params}: {params: {slug: string[]}}
) {
  const slug = params.slug.join('/');
  const {searchParams} = new URL(req.url);

  const targetUrl = `${API_BASE_URL}/${slug}?${searchParams.toString()}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(errorText, {status: response.status});
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error) {
        console.error(`[API PROXY] Failed to fetch ${targetUrl}: ${error.message}`);
    } else {
        console.error(`[API PROXY] An unknown error occurred while fetching ${targetUrl}`);
    }
    return new NextResponse('Internal Server Error', {status: 500});
  }
}
