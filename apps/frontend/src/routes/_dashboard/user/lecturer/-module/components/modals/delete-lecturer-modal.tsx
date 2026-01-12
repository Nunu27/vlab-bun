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
import { useLecturerActionStore } from '../../stores/lecturer-action-store';

export function DeleteLecturerModal() {
  const store = useLecturerActionStore();
  const { open, data } = useActionState(store.use.delete());
  const { setDelete } = store.use.actions();

  const queryClient = useQueryClient();
  const deleteLecturer = api.user
    .lecturer({ id: data?.id ?? '' })
    .delete.useMutation({
      onSuccess: ({ message }) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['lecturer', 'pagination'] });
        setDelete(null);
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={() => setDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Lecturer</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{data?.name}</strong> (NIP:{' '}
            {data?.nip})? This action cannot be undone.
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
