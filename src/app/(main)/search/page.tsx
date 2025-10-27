import { searchAnime } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Pagination } from "@/components/Pagination";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function SearchResults({ query, page }: { query: string, page: number }) {
  try {
    const data = await searchAnime(query, page);

    if (data.animes.length === 0) {
      return <p className="text-center text-muted-foreground">No results found for "{query}".</p>;
    }

    return (
      <div className="space-y-8">
        <AnimeGrid animes={data.animes} />
        {data.totalPages > 1 && (
          <Pagination
            currentPage={data.currentPage}
            totalPages={data.totalPages}
            hasNextPage={data.hasNextPage}
          />
        )}
      </div>
    );
  } catch(error) {
    console.error(error);
    return <p className="text-destructive text-center">Could not perform search. The API might be down.</p>
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

export default function SearchPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const query = typeof searchParams.q === 'string' ? searchParams.q : '';
  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;

  if (!query) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold">Search Anime</h1>
        <p className="mt-4 text-muted-foreground">Please enter a search term in the search bar above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Search results for <span className="text-primary">"{query}"</span>
      </h1>
      <Suspense fallback={<LoadingSkeleton />} key={`${query}-${page}`}>
        <SearchResults query={query} page={page} />
      </Suspense>
    </div>
  );
}
