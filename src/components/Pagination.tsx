"use client";

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type PaginationProps = {
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
}

export function Pagination({ totalPages, currentPage, hasNextPage }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(createPageURL(page));
  }

  const renderPageNumbers = () => {
    const pages = [];
    const pageLimit = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + pageLimit - 1);
    
    if (totalPages > pageLimit) {
        if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - pageLimit + 1);
        }
    }


    if (startPage > 1) {
      pages.push(
        <PaginationItem key="1">
          <PaginationLink href={createPageURL(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        pages.push(<PaginationEllipsis key="start-ellipsis" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink href={createPageURL(i)} isActive={i === currentPage}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<PaginationEllipsis key="end-ellipsis" />);
      }
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href={createPageURL(totalPages)}>{totalPages}</PaginationLink>
        </PaginationItem>
      );
    }


    return pages;
  }

  return (
    <ShadcnPagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            href={currentPage > 1 ? createPageURL(currentPage - 1) : '#'} 
            aria-disabled={currentPage <= 1}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
        
        {renderPageNumbers()}
        
        <PaginationItem>
          <PaginationNext 
            href={hasNextPage ? createPageURL(currentPage + 1) : '#'} 
            aria-disabled={!hasNextPage}
            className={!hasNextPage ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </ShadcnPagination>
  )
}
