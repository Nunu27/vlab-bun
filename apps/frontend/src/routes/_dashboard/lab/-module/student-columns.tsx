import { type ColumnDef } from '@tanstack/react-table';
import { formatTimeAgo } from '@frontend/lib/utils';
import api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { StudentLabActions } from './components/student-lab-actions';

export type LabItem = ExtractPaginationData<typeof api.lab.pagination>;

export const studentLabColumns: ColumnDef<LabItem>[] = [
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
      label: 'Lab Name',
      isGrow: true,
    },
  },
  {
    accessorKey: 'author.name',
    enableSorting: false,
    meta: {
      label: 'Author',
    },
    cell: ({ row }) => row.original.author.name || 'Unknown',
  },
  {
    accessorKey: 'updatedAt',
    meta: {
      label: 'Updated At',
    },
    cell: ({ row }) => {
      const updatedAt = row.original.updatedAt;
      return updatedAt ? formatTimeAgo(updatedAt) : '-';
    },
  },
  {
    id: 'actions',
    size: 140,
    enableSorting: false,
    enableHiding: false,
    meta: {
      center: true,
      label: 'Action',
    },
    cell: ({ row }) => <StudentLabActions lab={row.original} />,
  },
];
