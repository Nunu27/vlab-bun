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

  const deleteStudyProgram = api['study-program']({
    id: studyProgramId,
  }).delete.useMutation({
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ['study-program', 'pagination'],
      });
      onOpenChange(false);
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
