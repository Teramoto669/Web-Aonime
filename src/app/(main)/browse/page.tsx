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
        { id: "1",   name: "Action",       slug: "action" },
        { id: "2",   name: "Adventure",    slug: "adventure" },
        { id: "538", name: "Cars",         slug: "cars" },
        { id: "8",   name: "Comedy",       slug: "comedy" },
        { id: "453", name: "Dementia",     slug: "dementia" },
        { id: "119", name: "Demons",       slug: "demons" },
        { id: "62",  name: "Drama",        slug: "drama" },
        { id: "214", name: "Ecchi",        slug: "ecchi" },
        { id: "3",   name: "Fantasy",      slug: "fantasy" },
        { id: "180", name: "Game",         slug: "game" },
        { id: "215", name: "Harem",        slug: "harem" },
        { id: "70",  name: "Historical",   slug: "historical" },
        { id: "222", name: "Horror",       slug: "horror" },
        { id: "74",  name: "Isekai",       slug: "isekai" },
        { id: "404", name: "Josei",        slug: "josei" },
        { id: "46",  name: "Kids",         slug: "kids" },
        { id: "203", name: "Magic",        slug: "magic" },
        { id: "114", name: "Martial Arts", slug: "martial-arts" },
        { id: "123", name: "Mecha",        slug: "mecha" },
        { id: "125", name: "Military",     slug: "military" },
        { id: "242", name: "Music",        slug: "music" },
        { id: "57",  name: "Mystery",      slug: "mystery" },
        { id: "162", name: "Parody",       slug: "parody" },
        { id: "136", name: "Police",       slug: "police" },
        { id: "73",  name: "Psychological",slug: "psychological" },
        { id: "28",  name: "Romance",      slug: "romance" },
        { id: "163", name: "Samurai",      slug: "samurai" },
        { id: "14",  name: "School",       slug: "school" },
        { id: "12",  name: "Sci-Fi",       slug: "sci-fi" },
        { id: "50",  name: "Seinen",       slug: "seinen" },
        { id: "252", name: "Shoujo",       slug: "shoujo" },
        { id: "235", name: "Shoujo Ai",    slug: "shoujo-ai" },
        { id: "15",  name: "Shounen",      slug: "shounen" },
        { id: "233", name: "Shounen Ai",   slug: "shounen-ai" },
        { id: "35",  name: "Slice of Life",slug: "slice-of-life" },
        { id: "124", name: "Space",        slug: "space" },
        { id: "29",  name: "Sports",       slug: "sports" },
        { id: "16",  name: "Super Power",  slug: "super-power" },
        { id: "9",   name: "Supernatural", slug: "supernatural" },
        { id: "54",  name: "Thriller",     slug: "thriller" },
        { id: "32",  name: "unknown",      slug: "unknown" },
        { id: "58",  name: "Vampire",      slug: "vampire" },
    ],
    years: [
        "2026","2025","2024","2023","2022","2021","2020","2019","2018","2017",
        "2016","2015","2014","2013","2012","2011","2010","2009","2008","2007",
        "2006","2005","2004","2003","2002","2001","2000","1999","1998","1997",
        "1996","1995","1994","1993","1992","1991","1990","1989","1988","1987",
        "1986","1985","1984","1983","1982","1981","1980",
    ],
    types:    ["Movie", "Music", "ONA", "OVA", "Special", "TV"],
    seasons:  ["spring", "summer", "fall", "winter"],
    statuses: ["currently-airing", "finished-airing", "not-yet-aired"],
    languages:["sub", "dub"],
    ratings:  ["G", "PG", "PG-13", "R", "R+", "Rx"],
};

const SORT_OPTIONS = [
    { value: "default",            label: "Default" },
    { value: "latest-updated",     label: "Recently Updated" },
    { value: "latest-added",       label: "Recently Added" },
    { value: "score",              label: "Score" },
    { value: "name-az",            label: "Name A-Z" },
    { value: "release-date",       label: "Release Date" },
    { value: "most-viewed",        label: "Most Viewed" },
    { value: "number_of_episodes", label: "Episode Count" },
];

async function BrowsePageContent({ page, sort, filters }: { page: number; sort: string; filters: Record<string, string[]> }) {
  try {
    const data = await browseAnime({ page, limit: 24, sort, ...filters });
    const animes = data.results ?? [];
    return (
      <div className="space-y-8">
        <AnimeGrid animes={animes} />
        {(data.maxPage && data.maxPage > 1) || (!data.maxPage && (animes.length >= 24 || page > 1)) ? (
          <Pagination
            currentPage={page}
            totalPages={data.maxPage ?? (data.hasNextPage ? page + 1 : page)}
            hasNextPage={data.hasNextPage ?? false}
            hasPreviousPage={data.hasPreviousPage}
            minPage={data.minPage}
          />
        ) : null}
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

  // Filter keys matching the API URL param names
  // Note: type uses "term_type[]" in the API, genre[] uses numeric id
  const filterKeys = ['genre', 'term_type', 'status', 'season', 'year', 'language', 'rating'];
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
