import {NextRequest, NextResponse} from 'next/server';

const API_BASE_URL = 'https://test-123-beta.vercel.app/api/v2/hianime';

// This is a proxy to avoid CORS issues
export async function GET(
  req: NextRequest,
  context: { params: { slug: string[] } }
) {
  // Make sure params is properly awaited
  const params = await Promise.resolve(context.params);
  const slug = params.slug.join('/');
  const {searchParams} = new URL(req.url);

  // Special handling for episode endpoints
  if (slug === 'episode/sources' || slug === 'episode/servers') {
    // Both endpoints use animeEpisodeId
    const animeEpisodeId = searchParams.get('animeEpisodeId');
    
    if (animeEpisodeId) {
      let newAnimeEpisodeId = animeEpisodeId;

      // Handle server and category for sources endpoint
      if (slug === 'episode/sources') {
        const server = searchParams.get('server') || 'hd-3';
        const category = searchParams.get('category') || 'sub';
        searchParams.set('server', server);
        searchParams.set('category', category);
      }

      // Format correction for animeEpisodeId
      if (!animeEpisodeId.includes('?ep=')) {
        // Try to extract episode number and anime id
        // Example format: "one-piece-1000" -> "one-piece?ep=1000"
        const parts = animeEpisodeId.split('-');
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1];
          // Check if last part is a number
          if (/^\d+$/.test(lastPart)) {
            const animeId = parts.slice(0, -1).join('-');
            newAnimeEpisodeId = `${animeId}?ep=${lastPart}`;
          }
        }
      }

      // Update the parameter with new format
      searchParams.set('animeEpisodeId', newAnimeEpisodeId);
      console.log(`[DEBUG] ${slug} - Original ID: ${animeEpisodeId}, New ID: ${newAnimeEpisodeId}`);
    }
  }

  // If this is a server list request, return only megaplay server
  if (slug === 'episode/servers') {
    const epId = searchParams.get('animeEpisodeId');
    if (!epId) {
      return new NextResponse('Missing episode ID', {status: 400});
    }
    
    // Extract numeric episode ID
    const numericId = epId.match(/[?&]ep=(\d+)/)?.[1] || epId.match(/-(\d+)$/)?.[1] || epId;
    
    // Return a simplified server list with just megaplay
    return NextResponse.json({
      success: true,
      data: {
        sub: [{
          serverId: 1,
          serverName: "megacloud"
        }],
        dub: [{
          serverId: 2,
          serverName: "megacloud"
        }],
        raw: [],
        episodeId: epId,
        episodeNo: parseInt(numericId)
      }
    });
  }
  
  // If this is a sources request, return megaplay iframe info
  if (slug === 'episode/sources') {
    const epId = searchParams.get('animeEpisodeId');
    const category = searchParams.get('category') || 'sub';
    
    if (!epId) {
      return new NextResponse('Missing episode ID', {status: 400});
    }

    // Extract numeric episode ID
    const numericId = epId.match(/[?&]ep=(\d+)/)?.[1] || epId.match(/-(\d+)$/)?.[1] || epId;

    // Return megaplay embed configuration
    return NextResponse.json({
      success: true,
      data: {
        sources: [{
          url: `https://megaplay.buzz/stream/s-2/${numericId}/${category}`,
          isM3U8: false,
          quality: 'auto'
        }],
        headers: {
          'Referer': 'https://megacloud.blog/',
          'User-Agent': 'Mozilla/5.0'
        },
        subtitles: []
      }
    });
  }

  // For all other requests, proxy as normal
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
