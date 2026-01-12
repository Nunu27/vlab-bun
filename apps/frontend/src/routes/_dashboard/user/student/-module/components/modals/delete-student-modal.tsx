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
import { useActionState } from '@frontend/hooks/use-action-state';
import api from '@frontend/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useStudentActionStore } from '../../stores/student-action-store';

export function DeleteStudentModal() {
  const store = useStudentActionStore();
  const { open, data } = useActionState(store.use.delete());
  const { setDelete } = store.use.actions();

  const queryClient = useQueryClient();

  const deleteStudent = api.user
    .student({ id: data?.id ?? '' })
    .delete.useMutation({
      onSuccess: ({ message }) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['student', 'pagination'] });
        setDelete(null);
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={() => setDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Student</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{data?.name}</strong> (NRP:{' '}
            {data?.nrp})? This action cannot be undone.
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
              deleteStudent.mutate();
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
