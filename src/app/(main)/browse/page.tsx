import { getAnimeList, getCategoryList } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Pagination } from "@/components/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { SortClient } from "./SortClient";

// Valid category and azlist options based on API documentation
const SORT_OPTIONS = [
    // Category endpoints
    { value: 'recently-updated', label: 'Recently Updated' },
    { value: 'recently-added', label: 'Recently Added' },
    { value: 'most-popular', label: 'Most Popular' },
    { value: 'top-airing', label: 'Top Airing' },
    { value: 'most-favorite', label: 'Most Favorite' },
    // Special handling for A-Z list
    { value: 'a-z', label: 'Alphabetical (A-Z)' },
];

async function BrowsePageContent({ page, sort }: { page: number, sort: string }) {
  try {
    // Convert a-z to just 'a' for azlist endpoint
    let data;
    if (sort === 'a-z') {
      data = await getAnimeList('a', page);
    } else {
      data = await getCategoryList(sort, page);
    }
    return (
      <div className="space-y-8">
        <AnimeGrid animes={data.animes} />
        <Pagination 
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          hasNextPage={data.hasNextPage}
        />
      </div>
    );
  } catch(error) {
    console.error(error);
    return <p className="text-destructive text-center">Could not fetch anime list. The API might be down.</p>
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

export default async function BrowsePage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  // Await searchParams to fix Next.js warning
  const params = await Promise.resolve(searchParams);
  const page = typeof params.page === 'string' ? Number(params.page) : 1;
  const sort = typeof params.sort === 'string' ? params.sort : 'recently-updated';  // Changed from latest-updated to recently-updated

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Browse Anime</h1>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <SortClient sortOptions={SORT_OPTIONS} currentSort={sort} />
        </div>
      </div>
      <Suspense fallback={<LoadingSkeleton />} key={`${page}-${sort}`}>
        <BrowsePageContent page={page} sort={sort} />
      </Suspense>
    </div>
  );
}
