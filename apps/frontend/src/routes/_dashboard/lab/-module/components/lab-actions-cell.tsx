import { Button } from '@frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@frontend/components/ui/dropdown-menu';
import { useAuth } from '@frontend/hooks/use-auth';
import { MoreVerticalIcon, PlayIcon, RotateCwIcon } from 'lucide-react';
import type { LabItem } from '../lecturer-columns';
import { useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@frontend/lib/api';
import { toast } from 'sonner';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { useNavigate } from '@tanstack/react-router';

export function LabActionsCell({ lab }: { lab: LabItem }) {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.id === lab.authorId;
  const isStudent = user?.role === 'student';
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteLab = useMutation({
    mutationFn: async () => {
      const result = await api.lab({ id: lab.id }).delete();
      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success('Lab deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['lab', 'pagination'] });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(error.message);
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
            <DropdownMenuItem
              onClick={() =>
                navigate({ to: '/lab/$id/update', params: { id: lab.id } })
              }
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              onClick={(e) => {
                e.preventDefault();
                deleteLab.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLab.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
