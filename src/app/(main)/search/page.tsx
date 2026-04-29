import { browseAnime, getFilters } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Pagination } from "@/components/Pagination";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterMenu } from "@/components/FilterMenu";
import { SortClient } from "./SortClient";

const SORT_OPTIONS = [
	{ value: 'most_relevance', label: 'Most Relevance' },
	{ value: 'most_viewed', label: 'Most Viewed' },
	{ value: 'most_followed', label: 'Most Followed' },
	{ value: 'trending', label: 'Trending' },
	{ value: 'updated_date', label: 'Recently Updated' },
	{ value: 'added_date', label: 'Recently Added' },
	{ value: 'avg_score', label: 'Average Score' },
	{ value: 'mal_score', label: 'MAL Score' },
	{ value: 'release_date', label: 'Release Date' },
	{ value: 'title_az', label: 'Alphabetical (A-Z)' },
];

async function SearchResults({ query, page, sort, filters }: { query: string; page: number; sort: string; filters: Record<string, string[]> }) {
	try {
		const data = await browseAnime({ keyword: query, page, limit: 24, sort, ...filters });

		if (!data.data || data.data.length === 0) {
			return (
				<p className="text-center text-muted-foreground">
					No results found for &quot;{query}&quot;.
				</p>
			);
		}

		return (
			<div className="space-y-8">
				<AnimeGrid animes={data.data} />
                {data.data.length >= 24 && (
                    <Pagination
                        currentPage={page}
                        totalPages={page + 1}
                        hasNextPage={true}
                    />
                )}
			</div>
		);
	} catch (error) {
		console.error(error);
		return (
			<p className="text-destructive text-center">
				Could not perform search. The API might be down.
			</p>
		);
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

export default async function SearchPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
	const resolvedSearchParams = await props.searchParams;
	const query =
		typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "";
	const page =
		typeof resolvedSearchParams.page === "string"
			? Number(resolvedSearchParams.page)
			: 1;
	const sort =
		typeof resolvedSearchParams.sort === "string"
			? resolvedSearchParams.sort
			: "most_relevance";

	if (!query) {
		return (
			<div className="text-center">
				<h1 className="text-3xl font-bold">Search Anime</h1>
				<p className="mt-4 text-muted-foreground">
					Please enter a search term in the search bar above.
				</p>
			</div>
		);
	}

    const filterKeys = ['type', 'genre', 'status', 'season', 'year', 'rating', 'country', 'language'];
    const filters: Record<string, string[]> = {};
    
    for (const key of filterKeys) {
        const val = resolvedSearchParams[key];
        if (val) {
            filters[key] = Array.isArray(val) ? val : [val];
        }
    }

    const filterKeyString = Object.entries(filters)
        .map(([k, v]) => `${k}=${v.join(',')}`)
        .join('&');

    const filtersData = await getFilters().catch(() => null);

	return (
		<div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold">
                        Search results for{" "}
                        <span className="text-primary">&quot;{query}&quot;</span>
                    </h1>
                    {filtersData && <FilterMenu filtersData={filtersData} />}
                </div>
                <SortClient sortOptions={SORT_OPTIONS} currentSort={sort} />
            </div>
			<Suspense fallback={<LoadingSkeleton />} key={`${query}-${page}-${sort}-${filterKeyString}`}>
				<SearchResults query={query} page={page} sort={sort} filters={filters} />
			</Suspense>
		</div>
	);
}
