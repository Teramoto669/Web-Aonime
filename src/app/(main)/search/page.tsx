import { searchAnime } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Pagination } from "@/components/Pagination";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SortClient } from "@/app/(main)/browse/SortClient";

const sortOptions = [
	{ value: "-relevance", label: "Default" },
	{ value: "recently-added", label: "Recently Added" },
	{ value: "recently-updated", label: "Recently Updated" },
	{ value: "score", label: "Score" },
	{ value: "name-az", label: "Name (A-Z)" },
	{ value: "released-date", label: "Released Date" },
	{ value: "most-watched", label: "Most Watched" },
];

async function SearchResults({
	query,
	page,
	sort,
}: {
	query: string;
	page: number;
	sort: string;
}) {
	try {
		let data = await searchAnime(query, page, sort);

		if (data.animes.length === 0) {
			return (
				<p className="text-center text-muted-foreground">
					No results found for "{query}".
				</p>
			);
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

export default async function SearchPage({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const resolvedSearchParams = await searchParams;
	const query =
		typeof resolvedSearchParams.q === "string"
			? resolvedSearchParams.q
			: "";
	const page =
		typeof resolvedSearchParams.page === "string"
			? Number(resolvedSearchParams.page)
			: 1;
	const sort =
		typeof resolvedSearchParams.sort === "string"
			? resolvedSearchParams.sort
			: "_relevance";

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

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold">
					Search results for{" "}
					<span className="text-primary">"{query}"</span>
				</h1>
				<SortClient sortOptions={sortOptions} currentSort={sort} />
			</div>
			<Suspense
				fallback={<LoadingSkeleton />}
				key={`${query}-${page}-${sort}`}
			>
				<SearchResults query={query} page={page} sort={sort} />
			</Suspense>
		</div>
	);
}
