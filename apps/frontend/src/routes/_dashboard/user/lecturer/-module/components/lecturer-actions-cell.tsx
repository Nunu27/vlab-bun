import { Button } from '@frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@frontend/components/ui/dropdown-menu';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { MoreVerticalIcon } from 'lucide-react';
import { useState } from 'react';
import { ChangePasswordModal } from '@frontend/components/modals/change-password-modal';
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => setEditDialogOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setChangePasswordDialogOpen(true)}
            >
              Change Password
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
