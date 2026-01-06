import { ActionButton } from '@frontend/components/action-button';
import { ChangePasswordModal } from '@frontend/components/modals/change-password-modal';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { DeleteAdminModal } from './modals/delete-admin-modal';
import { EditAdminModal } from './modals/edit-admin-modal';

type Item = ExtractPaginationData<typeof api.user.admin.pagination>;

export function AdminActionsCell({ admin }: { admin: Item }) {
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
      <EditAdminModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        adminId={admin.id}
        adminName={admin.name}
        adminEmail={admin.email}
      />
      <ChangePasswordModal
        open={changePasswordDialogOpen}
        onOpenChange={setChangePasswordDialogOpen}
        userId={admin.id}
        userName={admin.name}
      />
      <DeleteAdminModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        adminId={admin.id}
        adminName={admin.name}
        adminEmail={admin.email}
      />
    </>
  );
}
