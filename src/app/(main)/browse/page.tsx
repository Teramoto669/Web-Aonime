import { browseAnime } from "@/lib/api";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { Pagination } from "@/components/Pagination";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SortClient } from "./SortClient";
import { FilterMenu } from "@/components/FilterMenu";
import type { FilterOptions } from "@/lib/types";

// Static filter options from /api/filter — no API call needed
const STATIC_FILTERS: FilterOptions = {
    genres: [
        "action", "adventure", "cars", "comedy", "dementia", "demons",
        "drama", "ecchi", "fantasy", "game", "harem", "historical",
        "horror", "isekai", "josei", "kids", "magic", "martial-arts",
        "mecha", "military", "music", "mystery", "parody", "police",
        "psychological", "romance", "samurai", "school", "sci-fi",
        "seinen", "shoujo", "shoujo-ai", "shounen", "shounen-ai",
        "slice-of-life", "space", "sports", "super-power", "supernatural",
        "thriller", "unknown", "vampire",
    ],
    years: [
        "2026","2025","2024","2023","2022","2021","2020","2019","2018",
        "2017","2016","2015","2014","2013","2012","2011","2010","2009",
        "2008","2007","2006","2005","2004","2003","2002","2001","2000","1999",
    ],
    types: ["tv", "movie", "ova", "ona", "special", "music"],
    seasons: ["spring", "summer", "fall", "winter"],
    statuses: ["currently-airing", "finished-airing", "not-yet-aired"],
    languages: ["sub", "dub"],
    ratings: ["G", "PG", "PG-13", "R", "R+", "Rx"],
};

const SORT_OPTIONS = [
    { value: "default",          label: "Default" },
    { value: "recently-added",   label: "Recently Added" },
    { value: "recently-updated", label: "Recently Updated" },
    { value: "score",            label: "Score" },
    { value: "name-a-z",         label: "Name A-Z" },
    { value: "released-date",    label: "Released Date" },
    { value: "most-watched",     label: "Most Watched" },
];

async function BrowsePageContent({ page, sort, filters }: { page: number; sort: string; filters: Record<string, string[]> }) {
  try {
    const data = await browseAnime({ page, limit: 24, sort, ...filters });
    const animes = data.results ?? [];
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
  const sort = typeof params.sort === 'string' ? params.sort : 'default';

  // Filter keys matching the new API
  const filterKeys = ['type', 'genre', 'status', 'season', 'year', 'language', 'rating'];
  const filters: Record<string, string[]> = {};

  for (const key of filterKeys) {
    const val = params[key] ?? params[`${key}[]`];
    if (val) {
      filters[key] = Array.isArray(val) ? val : [val];
    }
  }

  const filterKeyString = Object.entries(filters)
    .map(([k, v]) => `${k}=${v.join(',')}`)
    .join('&');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Browse Anime</h1>
          <FilterMenu filtersData={STATIC_FILTERS} />
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
