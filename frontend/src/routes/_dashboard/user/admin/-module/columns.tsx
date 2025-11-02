import { Button } from '@frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@frontend/components/ui/dropdown-menu';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/lib/api-types';
import { formatTimeAgo } from '@frontend/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreVerticalIcon } from 'lucide-react';

type Item = ExtractPaginationData<typeof api.user.admin.pagination>;

export const adminColumns: ColumnDef<Item>[] = [
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
      <div className="max-w-[200px] truncate">{row.original.email}</div>
    ),
  },
  {
    accessorKey: 'name',
    enableHiding: false,
    meta: {
      label: 'Name',
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
    cell: () => (
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <MoreVerticalIcon />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];
