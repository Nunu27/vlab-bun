import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { type ColumnDef } from '@tanstack/react-table';
import { StudyProgramActionsCell } from './components/study-program-actions-cell';

type Item = ExtractPaginationData<(typeof api)['study-program']['pagination']>;

export const studyProgramColumns: ColumnDef<Item>[] = [
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
      label: 'Study Program Name',
      isGrow: true,
    },
  },
  {
    accessorKey: 'department',
    cell: ({ row }) => (
      <div className="truncate">{row.original.department?.name ?? '-'}</div>
    ),
    enableSorting: false,
    meta: {
      label: 'Department',
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
    cell: ({ row }) => <StudyProgramActionsCell studyProgram={row.original} />,
  },
];
