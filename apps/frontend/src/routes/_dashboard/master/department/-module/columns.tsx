import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DepartmentActionsCell } from './components/department-actions-cell';

type Item = ExtractPaginationData<typeof api.department.pagination>;

export const departmentColumns: ColumnDef<Item>[] = [
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
      label: 'Department Name',
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
    cell: ({ row }) => <DepartmentActionsCell department={row.original} />,
  },
];
