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
    currentAzlist?: string;
}

const azlistOptions = [
    { value: 'all', label: 'All' },
    { value: 'other', label: 'Other' },
    { value: '0-9', label: '0-9' },
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
    { value: 'd', label: 'D' },
    { value: 'e', label: 'E' },
    { value: 'f', label: 'F' },
    { value: 'g', label: 'G' },
    { value: 'h', label: 'H' },
    { value: 'i', label: 'I' },
    { value: 'j', label: 'J' },
    { value: 'k', label: 'K' },
    { value: 'l', label: 'L' },
    { value: 'm', label: 'M' },
    { value: 'n', label: 'N' },
    { value: 'o', label: 'O' },
    { value: 'p', label: 'P' },
    { value: 'q', label: 'Q' },
    { value: 'r', label: 'R' },
    { value: 's', label: 'S' },
    { value: 't', label: 'T' },
    { value: 'u', label: 'U' },
    { value: 'v', label: 'V' },
    { value: 'w', label: 'W' },
    { value: 'x', label: 'X' },
    { value: 'y', label: 'Y' },
    { value: 'z', label: 'Z' },
];

export function SortClient({ sortOptions, currentSort, currentAzlist }: SortClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedSort, setSelectedSort] = useState(currentSort);
    const [selectedAzlist, setSelectedAzlist] = useState(currentAzlist || 'all');

    useEffect(() => {
        setSelectedSort(currentSort);
    }, [currentSort]);

    useEffect(() => {
        setSelectedAzlist(currentAzlist || 'all');
    }, [currentAzlist]);

    const handleSortChange = (value: string) => {
        setSelectedSort(value);
        const params = new URLSearchParams(searchParams);
        params.set('sort', value);
        params.set('page', '1');
        if (value !== 'a-z') {
            params.delete('azlist');
        } else {
            if (currentAzlist) {
                params.set('azlist', currentAzlist);
            } else if (!searchParams.has('azlist')) {
                params.set('azlist', 'all');
            } else {
                params.set('azlist', selectedAzlist);
            }
        }
        router.push(`${pathname}?${params.toString()}`);
    }

    const handleAzlistChange = (value: string) => {
        setSelectedAzlist(value);
        const params = new URLSearchParams(searchParams);
        params.set('sort', 'a-z');
        params.set('azlist', value);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="flex gap-2">
            <Select value={selectedSort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px]">
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
            {selectedSort === 'a-z' && (
                <Select value={selectedAzlist} onValueChange={handleAzlistChange}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Letter" />
                    </SelectTrigger>
                    <SelectContent>
                        {azlistOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    )
}
