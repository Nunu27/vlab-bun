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
import api from '@frontend/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DeleteLecturerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecturerId: string;
  lecturerName: string;
  lecturerNip: string;
}

export function DeleteLecturerModal({
  open,
  onOpenChange,
  lecturerId,
  lecturerName,
  lecturerNip,
}: DeleteLecturerModalProps) {
  const queryClient = useQueryClient();

  const deleteLecturer = api.user
    .lecturer({ id: lecturerId })
    .delete.useMutation({
      onSuccess: ({ message }) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['lecturer', 'pagination'] });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Lecturer</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{lecturerName}</strong>{' '}
            (NIP: {lecturerNip})? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteLecturer.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              deleteLecturer.mutate();
            }}
            disabled={deleteLecturer.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteLecturer.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
