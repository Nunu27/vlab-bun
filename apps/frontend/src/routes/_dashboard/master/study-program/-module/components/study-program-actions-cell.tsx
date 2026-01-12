import { ActionButton } from '@frontend/components/action-button';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useStudyProgramActionStore } from '../stores/study-program-action-store';
import type { StudyProgramItem } from '../types';

export function StudyProgramActionsCell({
  studyProgram,
}: {
  studyProgram: StudyProgramItem;
}) {
  const { setUpdate, setDelete } = useStudyProgramActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton
        icon={PencilIcon}
        tooltip="Edit"
        onClick={() => setUpdate(studyProgram)}
      />
      <ActionButton
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(studyProgram)}
      />
    </div>
  );
}
