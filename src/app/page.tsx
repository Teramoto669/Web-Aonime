import { getHomeData } from '@/lib/api';
import { SpotlightCarousel } from '@/components/anime/SpotlightCarousel';
import { AnimeCarousel } from '@/components/anime/AnimeCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

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

    const {
      spotlightAnimes,
      trendingAnimes,
      latestEpisodeAnimes,
      topUpcomingAnimes,
      topAiringAnimes,
      mostPopularAnimes,
    } = homeData;

    return (
      <div className="space-y-12 md:space-y-16 lg:space-y-20 pb-20">
        {spotlightAnimes && spotlightAnimes.length > 0 && (
          <SpotlightCarousel animes={spotlightAnimes} />
        )}
        
        <div className="container mx-auto px-4 space-y-12 md:space-y-16">
          {trendingAnimes && trendingAnimes.length > 0 && (
            <AnimeCarousel title="Trending Now" animes={trendingAnimes} />
          )}
          
          {latestEpisodeAnimes && latestEpisodeAnimes.length > 0 && (
            <AnimeCarousel title="Latest Episodes" animes={latestEpisodeAnimes} />
          )}

          {topAiringAnimes && topAiringAnimes.length > 0 && (
            <AnimeCarousel title="Top Airing" animes={topAiringAnimes} />
          )}
          
          {topUpcomingAnimes && topUpcomingAnimes.length > 0 && (
            <AnimeCarousel title="Top Upcoming" animes={topUpcomingAnimes} />
          )}

          {mostPopularAnimes && mostPopularAnimes.length > 0 && (
            <AnimeCarousel title="Most Popular" animes={mostPopularAnimes} />
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
  )
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}
