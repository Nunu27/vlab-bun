import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { formatTimeAgo } from '@frontend/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { StudentActionsCell } from './components/student-actions-cell';

type Item = ExtractPaginationData<typeof api.user.student.pagination>;

export const studentColumns: ColumnDef<Item>[] = [
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
    accessorKey: 'nrp',
    size: 130,
    meta: {
      label: 'NRP',
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
    enableHiding: false,
    enableSorting: false,
    meta: {
      label: 'Name',
      isGrow: true,
    },
  },
  {
    accessorKey: 'studyProgram',
    size: 250,
    cell: ({ row }) => (
      <div className="truncate">{row.original.studyProgram?.name ?? '-'}</div>
    ),
    enableSorting: false,
    meta: {
      label: 'Study Program',
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
    cell: ({ row }) => <StudentActionsCell student={row.original} />,
  },
];
