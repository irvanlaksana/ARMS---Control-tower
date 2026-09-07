import React, { useEffect, useState } from 'react';

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  return {
    page,
    setPage,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
    totalItems: items.length,
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

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems <= pageSize) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/50 px-3 py-2.5 text-[11px] text-slate-400">
      <span>Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} dari {totalItems} data</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="rounded border border-slate-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-800">‹</button>
        {pages.map((number) => (
          <button type="button" key={number} onClick={() => onPageChange(number)} className={`min-w-7 rounded border px-2 py-1 ${page === number ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-700 hover:bg-slate-800'}`}>{number}</button>
        ))}
        <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="rounded border border-slate-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-800">›</button>
      </div>
    </div>
  );
}
