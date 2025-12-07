import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/lib/api-types';
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
    accessorKey: 'icon',
    size: 140,
    enableSorting: false,
    meta: {
      label: 'Icon',
      center: true,
    },
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <img
          src={`/api/file/${row.original.icon}`}
          alt={row.original.name}
          className="size-32 rounded-md object-cover border"
        />
      </div>
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
