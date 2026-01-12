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
import { useDepartmentActionStore } from '../../stores/department-action-store';
import { useActionState } from '@frontend/hooks/use-action-state';

export function DeleteDepartmentModal() {
  const store = useDepartmentActionStore();
  const { open, data } = useActionState(store.use.delete());
  const { setDelete } = store.use.actions();

  const queryClient = useQueryClient();
  const deleteDepartment = api
    .department({ id: data?.id ?? '' })
    .delete.useMutation({
      onSuccess: ({ message }) => {
        toast.success(message);
        queryClient.invalidateQueries({
          queryKey: ['department', 'pagination'],
        });
        setDelete(null);
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={() => setDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Department</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{data?.name}</strong>? This
            action cannot be undone and may affect related study programs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDepartment.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              deleteDepartment.mutate();
            }}
            disabled={deleteDepartment.isPending || !data}
          >
            {deleteDepartment.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
