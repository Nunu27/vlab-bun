'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';

import { Spinner } from '@frontend/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@frontend/components/ui/table';
import type { PageInfo, SortOrder } from '@frontend/types/pagination';
import { useState } from 'react';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';

export type DataTableProps<TData, TFields extends string> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  pageInfo: PageInfo;
  isLoading?: boolean;
  sortBy?: TFields;
  sortOrder?: SortOrder;
  search?: string;
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  filters?: React.ReactNode;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sortBy: TFields | undefined, sortOrder: SortOrder) => void;
  onRefresh: () => void;
};

export function DataTable<TData, TFields extends string>({
  columns,
  data,
  pageInfo,
  isLoading = false,
  sortBy,
  sortOrder,
  search: searchValue,
  searchPlaceholder,
  pageSizeOptions,
  emptyMessage = 'No results.',
  filters,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSortChange,
  onRefresh,
}: DataTableProps<TData, TFields>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Convert server-side sorting to TanStack Table format
  const sorting: SortingState =
    sortBy && sortOrder ? [{ id: sortBy, desc: sortOrder === 'desc' }] : [];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination: {
        pageIndex: pageInfo.page - 1,
        pageSize: pageInfo.perPage,
      },
    },
    pageCount: pageInfo.totalPages,
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater;
      if (newSorting.length === 0) {
        onSortChange(undefined, 'asc');
      } else {
        const sort = newSorting[0];
        onSortChange(sort.id as TFields, sort.desc ? 'desc' : 'asc');
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar
        table={table}
        searchValue={searchValue}
        searchPlaceholder={searchPlaceholder}
        isLoading={isLoading}
        onSearchChange={onSearchChange}
        onRefresh={onRefresh}
        filters={filters}
      />
      <div className="relative flex flex-col gap-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table className="w-full">
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        style={{
                          width:
                            header.getSize() !== 150
                              ? header.getSize()
                              : undefined,
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <DataTableColumnHeader column={header.column} />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="relative">
              {isLoading && (
                <tr className="pointer-events-none absolute inset-0 z-20">
                  <td className="h-full w-full">
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="bg-card text-card-foreground flex items-center gap-2 rounded-lg border px-4 py-2 shadow-sm">
                        <Spinner className="h-4 w-4" />
                        <span className="text-sm font-medium">Loading</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width:
                            cell.column.getSize() !== 150
                              ? cell.column.getSize()
                              : undefined,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-24 text-center"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          pageInfo={pageInfo}
          isLoading={isLoading}
          pageSizeOptions={pageSizeOptions}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
