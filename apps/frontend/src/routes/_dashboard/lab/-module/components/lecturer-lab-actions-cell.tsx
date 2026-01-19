import { ActionButton } from '@frontend/components/action-button';
import { useNavigate } from '@tanstack/react-router';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useLecturerLabActionStore } from '../stores/lecturer-lab-action-store';
import type { LabItem } from '../types';

function LecturerLabActionsCell({ lab }: { lab: LabItem }) {
  const navigate = useNavigate();
  const { setDelete } = useLecturerLabActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton
        icon={PencilIcon}
        tooltip="Edit"
        onClick={() =>
          navigate({ to: '/lab/$id/update', params: { id: lab.id } })
        }
      />
      <ActionButton
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(lab)}
      />
    </div>
  );
}

export default LecturerLabActionsCell;
