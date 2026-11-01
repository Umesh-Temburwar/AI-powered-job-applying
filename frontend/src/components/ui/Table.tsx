import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyText = 'No records found.',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto border-2 border-[var(--border-color)] bg-[var(--bg-card)] retro-shadow-sm font-mono">
      <table className="w-full text-left text-[13px] border-collapse">
        <thead>
          <tr className="border-b-2 border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[11px] uppercase tracking-wider">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3 px-4 font-bold ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-[var(--border-color)]">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-[var(--text-secondary)] text-[13px]">
                Loading records...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-10 text-center text-[var(--text-secondary)] text-[13px]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick
                    ? 'hover:bg-[var(--bg-card-hover)] cursor-pointer'
                    : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-3 px-4 text-[var(--text-primary)] ${col.className || ''}`}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
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
