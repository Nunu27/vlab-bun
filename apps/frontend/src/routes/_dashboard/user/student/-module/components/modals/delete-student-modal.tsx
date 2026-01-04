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
import { getErrorMessageFromApi } from '@frontend/helper/error';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DeleteStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  studentNrp: string;
}

export function DeleteStudentModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  studentNrp,
}: DeleteStudentModalProps) {
  const queryClient = useQueryClient();

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.user.student({ id }).delete();

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['student', 'pagination'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    deleteStudent.mutate(studentId);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Student</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{studentName}</strong> (NRP:{' '}
            {studentNrp})? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteStudent.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleteStudent.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteStudent.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
