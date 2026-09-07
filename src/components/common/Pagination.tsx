import React, { useEffect, useState } from 'react';

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Keep the active page inside the valid range whenever the data set shrinks
  // (filtering, searching, deleting rows, switching folder/tab, ...).
  useEffect(() => {
    setPage((current) => {
      const clamped = Math.min(Math.max(1, current), totalPages);
      return clamped === current ? current : clamped;
    });
  }, [totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    setPage,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
    totalItems,
    pageSize,
  };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * Builds a compact page list: every page when there are few of them, otherwise
 * first / last plus a window around the current page, with `null` marking a gap.
 * This keeps the control bar narrow enough to fit on a phone screen.
 */
export function buildPageWindow(page: number, totalPages: number, maxVisible = 7): (number | null)[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const visible = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) {
    [2, 3, 4].forEach((n) => visible.add(n));
  }
  if (page >= totalPages - 2) {
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => visible.add(n));
  }

  const sorted = [...visible].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((number, index) => {
    if (index > 0 && number - sorted[index - 1] > 1) result.push(null);
    result.push(number);
  });
  return result;
}

/**
 * Pagination bar. IMPORTANT: render this OUTSIDE of any `overflow-x-auto`
 * table wrapper — inside a horizontally scrollable container the bar stretches
 * to the full (very wide) table width and its controls end up off-screen on
 * mobile.
 */
export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems <= pageSize) return null;

  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const pages = buildPageWindow(page, totalPages);

  const buttonBase =
    'flex h-9 min-w-9 items-center justify-center rounded border px-2 text-[11px] font-semibold transition select-none sm:h-8 sm:min-w-8';
  const buttonIdle = 'border-slate-700 text-slate-300 hover:bg-slate-800 active:bg-slate-700';
  const buttonDisabled = 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50';

  return (
    <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-950/50 px-3 py-2.5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-center sm:text-left">
        Menampilkan {firstItem}–{lastItem} dari {totalItems} data
        <span className="ml-1.5 text-slate-500 sm:hidden">
          (hal. {page}/{totalPages})
        </span>
      </span>

      <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
          className={`${buttonBase} ${page === 1 ? buttonDisabled : buttonIdle}`}
        >
          ‹
        </button>

        {pages.map((number, index) =>
          number === null ? (
            <span key={`gap-${index}`} className="px-1 text-slate-600" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={number}
              onClick={() => onPageChange(number)}
              aria-label={`Halaman ${number}`}
              aria-current={page === number ? 'page' : undefined}
              className={`${buttonBase} ${
                page === number ? 'border-indigo-500 bg-indigo-600 text-white' : buttonIdle
              }`}
            >
              {number}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
          className={`${buttonBase} ${page === totalPages ? buttonDisabled : buttonIdle}`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
