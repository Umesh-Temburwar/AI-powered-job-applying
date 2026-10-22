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
    <div className="w-full overflow-x-auto border border-[#E5E5E5] rounded-[6px] bg-[#FFFFFF]">
      <table className="w-full text-left text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] sticky top-0">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B] ${
                  col.className || ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5E5]">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-[#6B6B6B] text-[13px]">
                Loading records...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-10 text-center text-[#6B6B6B] text-[13px]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors duration-150 hover:bg-[#FAFAFA] ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`py-3 px-4 text-[#111111] ${col.className || ''}`}>
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
