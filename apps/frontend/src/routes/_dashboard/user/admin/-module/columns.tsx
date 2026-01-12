import { formatTimeAgo } from '@frontend/helper/string';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminActionsCell } from './components/admin-actions-cell';
import type { AdminItem } from './types';

export const adminColumns: ColumnDef<AdminItem>[] = [
  {
    accessorKey: 'index',
    enableSorting: false,
    enableHiding: false,
    size: 60,
    meta: {
      label: '#',
      center: true,
    },
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.index}</div>
    ),
  },
  {
    accessorKey: 'email',
    size: 250,
    meta: {
      label: 'Email',
    },
    cell: ({ row }) => (
      <div className="max-w-50 truncate">{row.original.email}</div>
    ),
  },
  {
    accessorKey: 'name',
    enableHiding: false,
    meta: {
      label: 'Name',
      isGrow: true,
    },
  },
  {
    accessorKey: 'createdAt',
    size: 130,
    meta: {
      label: 'Created At',
    },
    cell: ({ row }) => {
      return formatTimeAgo(row.original.createdAt);
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
    cell: ({ row }) => <AdminActionsCell admin={row.original} />,
  },
];
