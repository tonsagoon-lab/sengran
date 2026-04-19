"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface BrowsePaginationProps {
  page: number;
  totalPages: number;
}

function buildPageURL(searchParams: URLSearchParams, pathname: string, p: number) {
  const next = new URLSearchParams(searchParams.toString());
  if (p <= 1) next.delete("page");
  else next.set("page", String(p));
  const qs = next.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export function BrowsePagination({ page, totalPages }: BrowsePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (p: number) => router.push(buildPageURL(searchParams, pathname, p));

  const pages = pageRange(page, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildPageURL(searchParams, pathname, page - 1)}
            onClick={(e) => { e.preventDefault(); if (page > 1) go(page - 1); }}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {pages.map((p, i) =>
          p === "…" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href={buildPageURL(searchParams, pathname, p)}
                onClick={(e) => { e.preventDefault(); go(p); }}
                isActive={p === page}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href={buildPageURL(searchParams, pathname, page + 1)}
            onClick={(e) => { e.preventDefault(); if (page < totalPages) go(page + 1); }}
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
