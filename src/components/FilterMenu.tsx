"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FilterOptions } from "@/lib/types";

type FilterMenuProps = {
  filtersData: FilterOptions;
};

export function FilterMenu({ filtersData }: FilterMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Initialize selected filters from URL
  useEffect(() => {
    const currentFilters: Record<string, string[]> = {};
    const arrayKeys = ['type', 'genre', 'status', 'season', 'year', 'language', 'rating'];
    
    arrayKeys.forEach(key => {
      const values = searchParams.getAll(`${key}[]`); // The new API expects genre[], year[], etc. Wait, no, searchParams in Next.js might be genre or genre[].
      const valuesNoBrackets = searchParams.getAll(key);
      const allValues = [...values, ...valuesNoBrackets];
      if (allValues.length > 0) {
        currentFilters[key] = Array.from(new Set(allValues));
      }
    });
    
    setSelectedFilters(currentFilters);
  }, [searchParams, isOpen]); // re-sync when opening sheet

  const handleToggle = (category: string, value: string) => {
    setSelectedFilters(prev => {
      const categoryValues = prev[category] || [];
      if (categoryValues.includes(value)) {
        return {
          ...prev,
          [category]: categoryValues.filter(v => v !== value)
        };
      } else {
        return {
          ...prev,
          [category]: [...categoryValues, value]
        };
      }
    });
  };

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Clear old filter array params
    const arrayKeys = ['type', 'genre', 'status', 'season', 'year', 'language', 'rating',
                        'type[]', 'genre[]', 'status[]', 'season[]', 'year[]', 'language[]', 'rating[]'];
    arrayKeys.forEach(key => params.delete(key));

    // Apply new filters
    Object.entries(selectedFilters).forEach(([key, values]) => {
      values.forEach(value => {
        params.append(`${key}[]`, value);
      });
    });

    // Reset page to 1 when applying new filters
    params.set('page', '1');

    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedFilters({});
  };

  const handleGenreToggle = (value: string) => {
    setSelectedFilters(prev => {
      const genres = prev['genre'] || [];
      const includeVal = value;
      const excludeVal = `-${value}`;
      
      let newGenres = [...genres];
      
      if (genres.includes(includeVal)) {
        // Switch from Include to Exclude
        newGenres = newGenres.filter(v => v !== includeVal);
        newGenres.push(excludeVal);
      } else if (genres.includes(excludeVal)) {
        // Switch from Exclude to Neutral
        newGenres = newGenres.filter(v => v !== excludeVal);
      } else {
        // Switch from Neutral to Include
        newGenres.push(includeVal);
      }
      
      return { ...prev, genre: newGenres };
    });
  };

  const renderFilterCategory = (title: string, categoryKey: string, optionsKey: keyof FilterOptions) => {
    const options = filtersData[optionsKey] as string[] | undefined;
    if (!options || options.length === 0) return null;

    const selectedList = selectedFilters[categoryKey] || [];

    return (
      <AccordionItem value={categoryKey} key={categoryKey}>
        <AccordionTrigger className="text-sm font-medium capitalize">{title}</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            {options.map((option) => {
              const isIncluded = selectedList.includes(option);
              
              return (
                <Button
                  key={option}
                  variant={isIncluded ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggle(categoryKey, option)}
                  className="h-8 rounded-full px-3 text-xs capitalize"
                >
                  {option.replace(/-/g, ' ')}
                </Button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  const renderGenreCategory = () => {
    const options = filtersData.genres as string[] | undefined;
    if (!options || options.length === 0) return null;

    const genres = selectedFilters['genre'] || [];

    return (
      <AccordionItem value="genre" key="genre">
        <AccordionTrigger className="text-sm font-medium capitalize">Genre</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            {options.map((option) => {
              const isIncluded = genres.includes(option);
              const isExcluded = genres.includes(`-${option}`);
              
              let variant: "default" | "outline" | "destructive" = "outline";
              if (isIncluded) variant = "default";
              else if (isExcluded) variant = "destructive";

              return (
                <Button
                  key={option}
                  variant={variant}
                  size="sm"
                  onClick={() => handleGenreToggle(option)}
                  className="h-8 rounded-full px-3 text-xs capitalize"
                >
                  {isExcluded ? '− ' : (isIncluded ? '+ ' : '')}{option.replace(/-/g, ' ')}
                </Button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4" />
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0">
        <SheetHeader className="p-6 pb-2 border-b">
          <SheetTitle>Filter Anime</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-grow p-6 pt-0">
          <Accordion type="multiple" className="w-full">
            {renderFilterCategory("Type", "type", "types")}
            {renderGenreCategory()}
            {renderFilterCategory("Status", "status", "statuses")}
            {renderFilterCategory("Season", "season", "seasons")}
            {renderFilterCategory("Year", "year", "years")}
            {renderFilterCategory("Language", "language", "languages")}
            {renderFilterCategory("Rating", "rating", "ratings")}
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
