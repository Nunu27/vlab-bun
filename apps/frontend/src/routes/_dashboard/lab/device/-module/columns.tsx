import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/lib/api-types';
import { type ColumnDef } from '@tanstack/react-table';
import { DeviceActionsCell } from './components/device-actions-cell';

type Item = ExtractPaginationData<(typeof api)['device']['pagination']>;

export const deviceColumns: ColumnDef<Item>[] = [
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
      label: 'Device Name',
      isGrow: true,
    },
  },
  {
    accessorKey: 'kind',
    meta: {
      label: 'Kind',
    },
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.original.kind}</div>
    ),
  },
  {
    accessorKey: 'category',
    enableSorting: false,
    meta: {
      label: 'Category',
    },
    cell: ({ row }) => <div>{row.original.category.name}</div>,
  },
  {
    accessorKey: 'image',
    meta: {
      label: 'Image',
    },
    cell: ({ row }) => (
      <div className="font-mono text-xs text-muted-foreground">
        {row.original.image}
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
    cell: ({ row }) => <DeviceActionsCell device={row.original} />,
  },
];
