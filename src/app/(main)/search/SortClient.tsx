"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortClientProps = {
    sortOptions: { value: string, label: string }[];
    currentSort: string;
}

export function SortClient({ sortOptions, currentSort }: SortClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedSort, setSelectedSort] = useState(currentSort);

    useEffect(() => {
        setSelectedSort(currentSort);
    }, [currentSort]);

    const handleSortChange = (value: string) => {
        setSelectedSort(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', value);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <Select value={selectedSort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
