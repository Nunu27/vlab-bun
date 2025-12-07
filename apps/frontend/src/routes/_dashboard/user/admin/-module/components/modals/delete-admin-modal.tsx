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

interface DeleteAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  adminName: string;
  adminEmail: string;
}

export function DeleteAdminModal({
  open,
  onOpenChange,
  adminId,
  adminName,
  adminEmail,
}: DeleteAdminModalProps) {
  const queryClient = useQueryClient();

  const deleteAdmin = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.user.admin({ id }).delete();

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['admin', 'pagination'],
        exact: false,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    deleteAdmin.mutate(adminId);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Admin</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{adminName}</strong> (
            {adminEmail})? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAdmin.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleteAdmin.isPending}
          >
            {deleteAdmin.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
