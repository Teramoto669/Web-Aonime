import { getHomeData } from '@/lib/api';
import { SpotlightCarousel } from '@/components/anime/SpotlightCarousel';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { type AnimeListItem, getAnimeSlug } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function HomePageContent() {
  try {
    const homeData = await getHomeData();

    if (!homeData) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Failed to load data. Please try again later.</p>
        </div>
      );
    }

    const deduped = <T extends AnimeListItem>(animes: T[]): T[] => {
      if (!animes) return [];
      const seen = new Set<string>();
      return animes.filter(a => {
        const slug = getAnimeSlug(a);
        if (!slug) return false;
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      });
    };

    const { spotlight, latestEpisodes, topDay, topWeek, topMonth } = homeData;

    return (
      <div className="space-y-12 md:space-y-16 lg:space-y-20 pb-20">
        {spotlight && spotlight.length > 0 && (
          <SpotlightCarousel animes={deduped(spotlight)} />
        )}

        <div className="container mx-auto px-4 space-y-12 md:space-y-16">
          {latestEpisodes && latestEpisodes.length > 0 && (
            <AnimeCarousel title="Latest Episodes" animes={deduped(latestEpisodes)} />
          )}

          {topDay && topDay.length > 0 && (
            <AnimeCarousel title="Top Today" animes={deduped(topDay)} />
          )}

          {topWeek && topWeek.length > 0 && (
            <AnimeCarousel title="Top This Week" animes={deduped(topWeek)} />
          )}

          {topMonth && topMonth.length > 0 && (
            <AnimeCarousel title="Top This Month" animes={deduped(topMonth)} />
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error(error);
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-destructive">Could not fetch anime data. The API might be down.</p>
      </div>
    );
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-12 md:space-y-16 lg:space-y-20 pb-20">
      <Skeleton className="w-full h-[40vh] md:h-[60vh] lg:h-[80vh]" />
      <div className="container mx-auto px-4 space-y-12 md:space-y-16">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="flex space-x-4">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="w-1/6">
                  <Skeleton className="aspect-[2/3] w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}
