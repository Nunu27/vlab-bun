import { ActionButton } from '@frontend/components/action-button';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { DeleteDepartmentModal } from './modals/delete-department-modal';
import { EditDepartmentModal } from './modals/edit-department-modal';

type Item = ExtractPaginationData<typeof api.department.pagination>;

export function DepartmentActionsCell({ department }: { department: Item }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <ActionButton
          icon={PencilIcon}
          tooltip="Edit"
          onClick={() => setEditDialogOpen(true)}
        />
        <ActionButton
          icon={Trash2Icon}
          tooltip="Delete"
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        />
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
