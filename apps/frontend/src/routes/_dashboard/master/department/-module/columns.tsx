import { type ColumnDef } from '@tanstack/react-table';
import { DepartmentActionsCell } from './components/department-actions-cell';
import type { DepartmentItem } from './types';

export const departmentColumns: ColumnDef<DepartmentItem>[] = [
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
