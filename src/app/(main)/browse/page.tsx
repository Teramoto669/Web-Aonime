import { getAnimeList } from "@/lib/api";
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

const SORT_OPTIONS = [
    { value: 'a-z', label: 'A-Z' },
    { value: 'z-a', label: 'Z-A' },
    { value: 'latest-updated', label: 'Latest Updated' },
    { value: 'latest-added', label: 'Latest Added' },
    { value: 'popular', label: 'Popular' },
];

async function BrowsePageContent({ page, sort }: { page: number, sort: string }) {
  try {
    const data = await getAnimeList(sort, page);
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

export default function BrowsePage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'latest-updated';

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
