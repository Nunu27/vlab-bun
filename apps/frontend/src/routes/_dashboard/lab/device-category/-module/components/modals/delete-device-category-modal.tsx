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

interface DeleteDeviceCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceCategoryId: string;
  deviceCategoryName: string;
}

export function DeleteDeviceCategoryModal({
  open,
  onOpenChange,
  deviceCategoryId,
  deviceCategoryName,
}: DeleteDeviceCategoryModalProps) {
  const queryClient = useQueryClient();

  const deleteDeviceCategory = useMutation({
    mutationFn: async (id: string) => {
      const result = await api['device-category']({ id }).delete();

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['device-category', 'pagination'],
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    deleteDeviceCategory.mutate(deviceCategoryId);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Device Category</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong>{deviceCategoryName}</strong>? This action cannot be undone
            and may affect related devices.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDeviceCategory.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleteDeviceCategory.isPending}
          >
            {deleteDeviceCategory.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
