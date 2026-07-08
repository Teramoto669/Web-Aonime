"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from '@/hooks/use-router';
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
  hasPreviousPage?: boolean;
  minPage?: number;
}

import { useIsMobile } from "@/hooks/use-mobile";

export function Pagination({ totalPages, currentPage, hasNextPage, hasPreviousPage, minPage = 1 }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useIsMobile();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageChange = (page: number) => {
    if (page < minPage || page > totalPages) return;
    router.push(createPageURL(page));
  }

  const renderPageNumbers = () => {
    const pages = [];
    const pageLimit = isMobile ? 3 : 5;
    const halfLimit = Math.floor(pageLimit / 2);
    let startPage = Math.max(minPage, currentPage - halfLimit);
    let endPage = Math.min(totalPages, startPage + pageLimit - 1);
    
    if (totalPages - minPage + 1 > pageLimit) {
        if (endPage === totalPages) {
            startPage = Math.max(minPage, totalPages - pageLimit + 1);
        }
    }

    if (startPage > minPage && !isMobile) {
      pages.push(
        <PaginationItem key={minPage}>
          <PaginationLink onClick={() => handlePageChange(minPage)}>{minPage}</PaginationLink>
        </PaginationItem>
      );
      if (startPage > minPage + 1) {
        pages.push(<PaginationEllipsis key="start-ellipsis" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => handlePageChange(i)} isActive={i === currentPage}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    if (endPage < totalPages && !isMobile) {
      if (endPage < totalPages - 1) {
        pages.push(<PaginationEllipsis key="end-ellipsis" />);
      }
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
        </PaginationItem>
      );
    }

    return pages;
  }

  const disablePrev = hasPreviousPage !== undefined ? !hasPreviousPage : currentPage <= minPage;

  return (
    <ShadcnPagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => handlePageChange(currentPage - 1)}
            aria-disabled={disablePrev}
            className={disablePrev ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
        
        {renderPageNumbers()}
        
        <PaginationItem>
          <PaginationNext
            onClick={() => handlePageChange(currentPage + 1)}
            aria-disabled={!hasNextPage}
            className={!hasNextPage ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </ShadcnPagination>
  )
}
