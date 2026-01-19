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
import { Spinner } from '@frontend/components/ui/spinner';
import { useActionState } from '@frontend/hooks/use-action-state';
import api from '@frontend/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useLecturerLabActionStore } from '../../stores/lecturer-lab-action-store';

function DeleteLabModal() {
  const store = useLecturerLabActionStore();
  const { open, data } = useActionState(store.use.delete());
  const { setDelete } = store.use.actions();

  const queryClient = useQueryClient();
  const { mutate, isPending } = api
    .lab({ id: data?.id ?? '' })
    .delete.useMutation({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['lab', 'pagination'] });
        setDelete(null);
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={() => setDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Lab</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{data?.name}</strong>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              mutate();
            }}
            disabled={isPending}
          >
            {isPending && <Spinner />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteLabModal;
