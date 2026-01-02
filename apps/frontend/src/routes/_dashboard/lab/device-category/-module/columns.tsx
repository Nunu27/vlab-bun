import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DeviceCategoryActionsCell } from './components/device-category-actions-cell';

type Item = ExtractPaginationData<
  (typeof api)['device-category']['pagination']
>;

export const deviceCategoryColumns: ColumnDef<Item>[] = [
  {
    accessorKey: 'index',
    size: 60,
    enableHiding: false,
    enableSorting: false,
    meta: {
      label: '#',
      center: true,
    },
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.index}</div>
    ),
  },
  {
    accessorKey: 'name',
    enableHiding: false,
    meta: {
      label: 'Category Name',
      isGrow: true,
    },
  },
  {
    accessorKey: 'color',
    size: 100,
    meta: {
      label: 'Color',
    },
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div
          className="size-4 rounded-full border"
          style={{ backgroundColor: row.original.color }}
        />
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.color}
        </span>
      </div>
    ),
  },
  {
    id: 'actions',
    size: 60,
    enableSorting: false,
    enableHiding: false,
    meta: {
      center: true,
    },
    cell: ({ row }) => (
      <DeviceCategoryActionsCell deviceCategory={row.original} />
    ),
  },
];
