import { ActionButton } from '@frontend/components/action-button';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { DeleteStudyProgramModal } from './modals/delete-study-program-modal';
import { EditStudyProgramModal } from './modals/edit-study-program-modal';

type Item = ExtractPaginationData<(typeof api)['study-program']['pagination']>;

export function StudyProgramActionsCell({
  studyProgram,
}: {
  studyProgram: Item;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <ActionButton
          icon={PencilIcon}
          tooltip="Edit"
          onClick={() => setEditDialogOpen(true)}
        />
        <ActionButton
          icon={Trash2Icon}
          tooltip="Delete"
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        />
      </div>
      <EditStudyProgramModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        studyProgramId={studyProgram.id}
        studyProgramName={studyProgram.name}
        studyProgramDepartmentId={studyProgram.department?.id ?? ''}
      />
      <DeleteStudyProgramModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        studyProgramId={studyProgram.id}
        studyProgramName={studyProgram.name}
      />
    </>
  );
}
