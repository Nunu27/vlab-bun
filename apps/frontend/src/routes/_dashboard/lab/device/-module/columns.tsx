import { DynamicIcon } from '@frontend/components/dynamic-icon';
import { type ColumnDef } from '@tanstack/react-table';
import { DeviceActionsCell } from './components/device-actions-cell';
import type { DeviceItem } from './types';

export const deviceColumns: ColumnDef<DeviceItem>[] = [
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
    size: 80,
    enableSorting: false,
    meta: {
      label: 'Icon',
      center: true,
    },
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <DynamicIcon
          name={row.original.icon}
          className="text-muted-foreground size-8"
        />
      </div>
    ),
  },
  {
    accessorKey: 'image',
    meta: {
      label: 'Image',
    },
    cell: ({ row }) => (
      <div className="text-muted-foreground font-mono text-xs">
        {row.original.image}
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
