'use client';

import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface UseTablePaginationOptions {
  storageKey?: string;
  defaultPageSize?: number;
}

export function useTablePagination(options: UseTablePaginationOptions = {}) {
  const { storageKey, defaultPageSize = 25 } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read page from URL or default to 1
  const page = useMemo(() => {
    const raw = searchParams?.get('page');
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 1;
  }, [searchParams]);

  // Read pageSize from URL or localStorage or default
  const pageSize = useMemo(() => {
    const raw = searchParams?.get('pageSize');
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`dt_page_size_${storageKey}`);
        if (saved && !isNaN(Number(saved))) return Number(saved);
      } catch {}
    }
    return defaultPageSize;
  }, [searchParams, storageKey, defaultPageSize]);

  const updateUrl = useCallback(
    (newPage: number, newPageSize: number) => {
      const current = new URLSearchParams(searchParams?.toString() || '');
      if (newPage > 1) {
        current.set('page', String(newPage));
      } else {
        current.delete('page');
      }
      if (newPageSize !== defaultPageSize) {
        current.set('pageSize', String(newPageSize));
      } else {
        current.delete('pageSize');
      }
      const queryStr = current.toString();
      const newUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [router, pathname, searchParams, defaultPageSize]
  );

  const setPage = useCallback(
    (newPage: number) => {
      updateUrl(newPage, pageSize);
    },
    [updateUrl, pageSize]
  );

  const setPageSize = useCallback(
    (newPageSize: number) => {
      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`dt_page_size_${storageKey}`, String(newPageSize));
        } catch {}
      }
      updateUrl(1, newPageSize);
    },
    [storageKey, updateUrl]
  );

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
  };
}
