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
import type { FiltersResponse, FilterOption } from "@/lib/types";

type FilterMenuProps = {
  filtersData: FiltersResponse;
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
    const arrayKeys = ['type', 'genre', 'status', 'season', 'year', 'rating', 'country', 'language'];
    
    arrayKeys.forEach(key => {
      const values = searchParams.getAll(key);
      if (values.length > 0) {
        currentFilters[key] = values;
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
    const arrayKeys = ['type', 'genre', 'status', 'season', 'year', 'rating', 'country', 'language'];
    arrayKeys.forEach(key => params.delete(key));

    // Apply new filters
    Object.entries(selectedFilters).forEach(([key, values]) => {
      values.forEach(value => {
        params.append(key, value);
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

  const renderFilterCategory = (title: string, categoryKey: keyof FiltersResponse) => {
    const options = filtersData[categoryKey] as FilterOption[] | undefined;
    if (!options || options.length === 0) return null;

    const selectedList = selectedFilters[categoryKey] || [];

    return (
      <AccordionItem value={categoryKey} key={categoryKey}>
        <AccordionTrigger className="text-sm font-medium capitalize">{title}</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            {options.map((option) => {
              const isIncluded = selectedList.includes(option.value);
              
              return (
                <Button
                  key={option.value}
                  variant={isIncluded ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggle(categoryKey, option.value)}
                  className="h-8 rounded-full px-3 text-xs"
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  const renderGenreCategory = () => {
    const options = filtersData.genre as FilterOption[] | undefined;
    if (!options || options.length === 0) return null;

    const genres = selectedFilters['genre'] || [];

    return (
      <AccordionItem value="genre" key="genre">
        <AccordionTrigger className="text-sm font-medium capitalize">Genre</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            {options.map((option) => {
              const isIncluded = genres.includes(option.value);
              const isExcluded = genres.includes(`-${option.value}`);
              
              let variant: "default" | "outline" | "destructive" = "outline";
              if (isIncluded) variant = "default";
              else if (isExcluded) variant = "destructive";

              return (
                <Button
                  key={option.value}
                  variant={variant}
                  size="sm"
                  onClick={() => handleGenreToggle(option.value)}
                  className="h-8 rounded-full px-3 text-xs"
                >
                  {isExcluded ? '− ' : (isIncluded ? '+ ' : '')}{option.label}
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
            {renderFilterCategory("Type", "type")}
            {renderGenreCategory()}
            {renderFilterCategory("Status", "status")}
            {renderFilterCategory("Season", "season")}
            {renderFilterCategory("Year", "year")}
            {renderFilterCategory("Rating", "rating")}
            {renderFilterCategory("Language", "language")}
            {renderFilterCategory("Country", "country")}
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
