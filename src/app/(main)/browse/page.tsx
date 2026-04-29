import { browseAnime, getFilters } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Pagination } from "@/components/Pagination";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SortClient } from "./SortClient";
import { FilterMenu } from "@/components/FilterMenu";

const SORT_OPTIONS = [
    { value: 'updated_date',  label: 'Recently Updated' },
    { value: 'added_date',    label: 'Recently Added' },
    { value: 'trending',      label: 'Trending' },
    { value: 'most_viewed',   label: 'Most Viewed' },
    { value: 'most_followed', label: 'Most Followed' },
    { value: 'title_az',      label: 'Alphabetical (A-Z)' },
    { value: 'avg_score',     label: 'Average Score' },
    { value: 'mal_score',     label: 'MAL Score' },
    { value: 'release_date',  label: 'Release Date' },
];

async function BrowsePageContent({ page, sort, filters }: { page: number; sort: string; filters: Record<string, string[]> }) {
  try {
    const data = await browseAnime({ page, limit: 24, sort, ...filters });
    const animes = data.data ?? [];
    return (
      <div className="space-y-8">
        <AnimeGrid animes={animes} />
        {animes.length >= 24 && (
          <Pagination
            currentPage={page}
            totalPages={page + 1}
            hasNextPage={true}
          />
        )}
        {animes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No anime found matching your filters.
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return <p className="text-destructive text-center">Could not fetch anime list. The API might be down.</p>;
  }
}

function LoadingSkeleton() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {[...Array(18)].map((_, i) => (
                    <div key={i}>
                        <Skeleton className="aspect-[2/3] w-full mb-2 rounded-md" />
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default async function BrowsePage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await props.searchParams;
  const page = typeof params.page === 'string' ? Number(params.page) : 1;
  const sort = typeof params.sort === 'string' ? params.sort : 'updated_date';

  const filterKeys = ['type', 'genre', 'status', 'season', 'year', 'rating', 'country', 'language'];
  const filters: Record<string, string[]> = {};
  
  for (const key of filterKeys) {
    const val = params[key];
    if (val) {
      filters[key] = Array.isArray(val) ? val : [val];
    }
  }

  // Generate a key for suspense so it reloads correctly
  const filterKeyString = Object.entries(filters)
    .map(([k, v]) => `${k}=${v.join(',')}`)
    .join('&');

  const filtersData = await getFilters().catch(() => null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Browse Anime</h1>
          {filtersData && <FilterMenu filtersData={filtersData} />}
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <SortClient sortOptions={SORT_OPTIONS} currentSort={sort} />
        </div>
      </div>
      <Suspense fallback={<LoadingSkeleton />} key={`${page}-${sort}-${filterKeyString}`}>
        <BrowsePageContent page={page} sort={sort} filters={filters} />
      </Suspense>
    </div>
  );
}
