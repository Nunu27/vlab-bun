import { ActionButton } from '@frontend/components/action-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@frontend/components/ui/alert-dialog';
import { Button } from '@frontend/components/ui/button';
import api from '@frontend/lib/api';
import { useAuthStore } from '@frontend/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { PencilIcon, PlayIcon, RotateCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import type { LabItem } from '../lecturer-columns';

export function LabActionsCell({ lab }: { lab: LabItem }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore.use.user()!;
  const canManage = user.role === 'admin' || user.id === lab.authorId;
  const isStudent = user.role === 'student';

  const queryClient = useQueryClient();
  const { mutate, isPending } = api.lab({ id: lab.id }).delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab', 'pagination'] });
      setShowDeleteDialog(false);
    },
  });

  if (isStudent) {
    if (lab.sessionId) {
      return (
        <Button size="sm" variant="outline" className="w-full">
          <RotateCwIcon className="mr-2 size-4" />
          Resume
        </Button>
      );
    }
    return (
      <Button size="sm" className="w-full">
        <PlayIcon className="mr-2 size-4" />
        Open
      </Button>
    );
  }

  if (!canManage) return null;

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <ActionButton
          icon={PencilIcon}
          tooltip="Edit"
          onClick={() =>
            navigate({ to: '/lab/$id/update', params: { id: lab.id } })
          }
        />
        <ActionButton
          icon={Trash2Icon}
          tooltip="Delete"
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lab
              "{lab.name}" and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                mutate();
              }}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
