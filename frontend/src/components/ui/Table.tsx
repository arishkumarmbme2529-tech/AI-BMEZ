import React from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TableProps<T> {
  columns: Array<{
    key: string;
    header: string;
    cell: (row: T) => React.ReactNode;
    className?: string;
    headerClassName?: string;
  }>;
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading,
  emptyMessage = 'No data found',
  className,
}: TableProps<T>) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="skeleton h-4 w-full rounded" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'table-row-hover transition-colors',
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-4 py-3 text-sm text-slate-700 whitespace-nowrap', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  size: number;
  onPageChange: (page: number) => void;
}

export const TablePagination: React.FC<PaginationProps> = ({ page, pages, total, size, onPageChange }) => {
  const start = (page - 1) * size + 1;
  const end = Math.min(page * size, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(pages, 7) }).map((_, i) => {
          let pageNum: number;
          if (pages <= 7) {
            pageNum = i + 1;
          } else if (page <= 4) {
            pageNum = i + 1;
            if (i === 6) pageNum = pages;
          } else if (page >= pages - 3) {
            if (i === 0) pageNum = 1;
            else pageNum = pages - 6 + i;
          } else {
            if (i === 0) pageNum = 1;
            else if (i === 6) pageNum = pages;
            else pageNum = page - 2 + (i - 1);
          }
          return (
            <button
              key={i}
              onClick={() => onPageChange(pageNum)}
              className={clsx(
                'min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors',
                pageNum === page
                  ? 'bg-navy-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
