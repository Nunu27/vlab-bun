import { ActionButton } from '@frontend/components/action-button';
import { useDashboardActionStore } from '@frontend/routes/_dashboard/-module/stores/dashboard-action-store';
import { KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useStudentActionStore } from '../stores/student-action-store';
import type { StudentItem } from '../types';

export function StudentActionsCell({ student }: { student: StudentItem }) {
  const { setUpdate, setDelete } = useStudentActionStore().use.actions();
  const { setChangeUserPassword } = useDashboardActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton
        icon={PencilIcon}
        tooltip="Edit"
        onClick={() => setUpdate(student)}
      />
      <ActionButton
        icon={KeyRoundIcon}
        tooltip="Change Password"
        onClick={() => setChangeUserPassword(student)}
      />
      <ActionButton
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(student)}
      />
    </div>
  );
}
