import { ActionButton } from '@frontend/components/action-button';
import { ChangePasswordModal } from '@frontend/components/modals/change-password-modal';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { DeleteStudentModal } from './modals/delete-student-modal';
import { EditStudentModal } from './modals/edit-student-modal';

type Item = ExtractPaginationData<typeof api.user.student.pagination>;

export function StudentActionsCell({ student }: { student: Item }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] =
    useState(false);
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
          icon={KeyRoundIcon}
          tooltip="Change Password"
          onClick={() => setChangePasswordDialogOpen(true)}
        />
        <ActionButton
          icon={Trash2Icon}
          tooltip="Delete"
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        />
      </div>
      <EditStudentModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        student={student}
      />
      <ChangePasswordModal
        open={changePasswordDialogOpen}
        onOpenChange={setChangePasswordDialogOpen}
        userId={student.id}
        userName={student.name}
      />
      <DeleteStudentModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        studentId={student.id}
        studentName={student.name}
        studentNrp={student.nrp}
      />
    </>
  );
}
