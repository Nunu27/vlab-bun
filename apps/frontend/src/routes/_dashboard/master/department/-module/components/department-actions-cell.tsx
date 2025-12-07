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
import { MoreVerticalIcon } from 'lucide-react';
import { useState } from 'react';
import { DeleteDepartmentModal } from './modals/delete-department-modal';
import { EditDepartmentModal } from './modals/edit-department-modal';

type Item = ExtractPaginationData<typeof api.department.pagination>;

export function DepartmentActionsCell({ department }: { department: Item }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
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
            <DropdownMenuItem onSelect={() => setEditDialogOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteDialogOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditDepartmentModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        departmentId={department.id}
        departmentName={department.name}
      />
      <DeleteDepartmentModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        departmentId={department.id}
        departmentName={department.name}
      />
    </>
  );
}
