"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useRouter } from "@/hooks/use-router";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FilterOptions } from "@/lib/types";

type FilterMenuProps = {
  filtersData: FilterOptions;
};

// All URL param keys used (with [] variants for clearing)
const ALL_FILTER_KEYS = [
  'genre', 'genre[]',
  'term_type', 'term_type[]',
  'status', 'status[]',
  'season', 'season[]',
  'year', 'year[]',
  'language', 'language[]',
  'rating', 'rating[]',
];

export function FilterMenu({ filtersData }: FilterMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Sync from URL on open
  useEffect(() => {
    const current: Record<string, string[]> = {};
    ['genre', 'term_type', 'status', 'season', 'year', 'language', 'rating'].forEach(key => {
      const vals = [...searchParams.getAll(`${key}[]`), ...searchParams.getAll(key)];
      if (vals.length > 0) current[key] = Array.from(new Set(vals));
    });
    setSelectedFilters(current);
  }, [searchParams, isOpen]);

  const handleToggle = (category: string, value: string) => {
    setSelectedFilters(prev => {
      const list = prev[category] || [];
      return {
        ...prev,
        [category]: list.includes(value) ? list.filter(v => v !== value) : [...list, value],
      };
    });
  };

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    ALL_FILTER_KEYS.forEach(k => params.delete(k));
    Object.entries(selectedFilters).forEach(([key, values]) => {
      values.forEach(v => params.append(`${key}[]`, v));
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  const handleClear = () => setSelectedFilters({});

  // Render simple string[] category (types, statuses, seasons, years, languages, ratings)
  const renderCategory = (title: string, categoryKey: string, options?: string[]) => {
    if (!options || options.length === 0) return null;
    const selected = selectedFilters[categoryKey] || [];
    return (
      <AccordionItem value={categoryKey} key={categoryKey}>
        <AccordionTrigger className="text-sm font-medium">{title}</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            {options.map(opt => (
              <Button
                key={opt}
                variant={selected.includes(opt) ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggle(categoryKey, opt)}
                className="h-8 rounded-full px-3 text-xs"
              >
                {opt}
              </Button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  // Genre uses id as value, name as label
  const renderGenres = () => {
    const options = filtersData.genres;
    if (!options || options.length === 0) return null;
    const selected = selectedFilters['genre'] || [];
    return (
      <AccordionItem value="genre">
        <AccordionTrigger className="text-sm font-medium">Genre</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            {options.map(g => (
              <Button
                key={g.id}
                variant={selected.includes(g.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggle('genre', g.id)}
                className="h-8 rounded-full px-3 text-xs"
              >
                {g.name}
              </Button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  const activeCount = Object.values(selectedFilters).reduce((acc, v) => acc + v.length, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4" />
          Filter
          {activeCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0">
        <SheetHeader className="p-6 pb-2 border-b">
          <SheetTitle>Filter Anime</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-grow p-6 pt-0">
          <Accordion type="multiple" className="w-full">
            {renderCategory("Type", "term_type", filtersData.types)}
            {renderGenres()}
            {renderCategory("Status", "status", filtersData.statuses)}
            {renderCategory("Season", "season", filtersData.seasons)}
            {renderCategory("Year", "year", filtersData.years)}
            {renderCategory("Language", "language", filtersData.languages)}
            {renderCategory("Rating", "rating", filtersData.ratings)}
          </Accordion>
        </ScrollArea>

        <div className="p-6 border-t bg-background flex gap-4">
          <Button variant="outline" className="flex-1" onClick={handleClear}>
            Clear
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
