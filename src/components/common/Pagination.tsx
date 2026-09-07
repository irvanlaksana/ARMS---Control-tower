import React, { useEffect, useState } from 'react';

export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Keep the active page inside valid range when items count changes
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
    setPageSize,
  };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Builds a compact page list with first/last and active window
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
 * Enhanced pagination bar with page size selection, first/prev/next/last controls,
 * and clear data indicators.
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  if (totalItems === 0) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const pages = buildPageWindow(page, totalPages);

  const buttonBase =
    'flex h-8 min-w-8 items-center justify-center rounded border px-2 text-[11px] font-semibold transition select-none disabled:cursor-not-allowed disabled:opacity-40';
  const buttonIdle = 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700';
  const buttonDisabled = 'border-slate-800/80 text-slate-600 bg-slate-900/40';

  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      {/* Summary and Page Size Selector */}
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
        <span className="text-slate-300">
          Menampilkan <span className="font-semibold text-white">{firstItem}</span>–<span className="font-semibold text-white">{lastItem}</span> dari <span className="font-semibold text-indigo-400">{totalItems}</span> data
          {totalPages > 1 && (
            <span className="ml-1.5 text-slate-500 hidden sm:inline">
              (Hal. {page} / {totalPages})
            </span>
          )}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <span className="text-[11px] text-slate-500">Baris:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / hal
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1">
          {/* First page button */}
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange(1)}
            title="Halaman Pertama"
            aria-label="Halaman pertama"
            className={`${buttonBase} ${page === 1 ? buttonDisabled : buttonIdle}`}
          >
            «
          </button>

          {/* Previous page button */}
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            title="Halaman Sebelumnya"
            aria-label="Halaman sebelumnya"
            className={`${buttonBase} ${page === 1 ? buttonDisabled : buttonIdle}`}
          >
            ‹
          </button>

          {pages.map((number, index) =>
            number === null ? (
              <span key={`gap-${index}`} className="px-1 text-slate-600 select-none" aria-hidden="true">
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
                  page === number ? 'border-indigo-500 bg-indigo-600 text-white font-bold shadow-sm' : buttonIdle
                }`}
              >
                {number}
              </button>
            )
          )}

          {/* Next page button */}
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Halaman Berikutnya"
            aria-label="Halaman berikutnya"
            className={`${buttonBase} ${page === totalPages ? buttonDisabled : buttonIdle}`}
          >
            ›
          </button>

          {/* Last page button */}
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Halaman Terakhir"
            aria-label="Halaman terakhir"
            className={`${buttonBase} ${page === totalPages ? buttonDisabled : buttonIdle}`}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

