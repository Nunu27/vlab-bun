import { ActionButton } from '@frontend/components/action-button';
import { ChangePasswordModal } from '@frontend/components/modals/change-password-modal';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { DeleteLecturerModal } from './modals/delete-lecturer-modal';
import { EditLecturerModal } from './modals/edit-lecturer-modal';

type Item = ExtractPaginationData<typeof api.user.lecturer.pagination>;

export function LecturerActionsCell({ lecturer }: { lecturer: Item }) {
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
      <EditLecturerModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lecturerId={lecturer.id}
        lecturerName={lecturer.name}
        lecturerEmail={lecturer.email}
        lecturerNip={lecturer.nip}
      />
      <ChangePasswordModal
        open={changePasswordDialogOpen}
        onOpenChange={setChangePasswordDialogOpen}
        userId={lecturer.id}
        userName={lecturer.name}
      />
      <DeleteLecturerModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        lecturerId={lecturer.id}
        lecturerName={lecturer.name}
        lecturerNip={lecturer.nip}
      />
    </>
  );
}
