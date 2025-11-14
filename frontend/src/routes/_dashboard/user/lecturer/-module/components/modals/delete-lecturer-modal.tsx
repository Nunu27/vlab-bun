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
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const deleteLecturer = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.user.lecturer({ id }).delete();

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Lecturer deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['lecturer', 'pagination'],
        exact: false,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete lecturer');
    },
  });

  const handleDelete = () => {
    deleteLecturer.mutate(lecturerId);
  };

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
              handleDelete();
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
