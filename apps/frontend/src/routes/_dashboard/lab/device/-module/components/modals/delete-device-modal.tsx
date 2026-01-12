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
import { useDeviceActionStore } from '../../stores/device-action-store';

export function DeleteDeviceModal() {
  const store = useDeviceActionStore();
  const { open, data } = useActionState(store.use.delete());
  const { setDelete } = store.use.actions();

  const queryClient = useQueryClient();
  const { mutate, isPending } = api
    .device({ id: data?.id ?? '' })
    .delete.useMutation({
      onSuccess: ({ message }) => {
        toast.success(message);
        queryClient.invalidateQueries({ queryKey: ['device', 'pagination'] });
        setDelete(null);
      },
    });

  return (
    <AlertDialog open={open} onOpenChange={() => setDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Device</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{data?.name}</strong>? This
            action cannot be undone and may affect related labs.
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
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
