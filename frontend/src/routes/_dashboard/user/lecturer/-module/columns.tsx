import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/lib/api-types';
import { formatTimeAgo } from '@frontend/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { LecturerActionsCell } from './components/lecturer-actions-cell';

type Item = ExtractPaginationData<typeof api.user.lecturer.pagination>;

export const lecturerColumns: ColumnDef<Item>[] = [
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
    accessorKey: 'nip',
    size: 130,
    meta: {
      label: 'NIP',
    },
  },
  {
    accessorKey: 'email',
    size: 250,
    cell: ({ row }) => <div className="truncate">{row.original.email}</div>,
    enableSorting: false,
    meta: {
      label: 'Email',
    },
  },
  {
    accessorKey: 'name',
    cell: ({ row }) => <div className="truncate">{row.original.name}</div>,
    enableSorting: false,
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
    cell: ({ row }) => <LecturerActionsCell row={row} />,
  },
];
