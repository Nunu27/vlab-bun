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

interface DeleteStudyProgramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyProgramId: string;
  studyProgramName: string;
}

export function DeleteStudyProgramModal({
  open,
  onOpenChange,
  studyProgramId,
  studyProgramName,
}: DeleteStudyProgramModalProps) {
  const queryClient = useQueryClient();

  const deleteStudyProgram = useMutation({
    mutationFn: async () => {
      const result = await api['study-program']({
        id: studyProgramId,
      }).delete();

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Study program deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['study-program', 'pagination'],
        exact: false,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete study program');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the study program{' '}
            <strong>{studyProgramName}</strong>. This action cannot be undone
            and may affect students associated with this study program.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              deleteStudyProgram.mutate();
            }}
            disabled={deleteStudyProgram.isPending}
          >
            {deleteStudyProgram.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
