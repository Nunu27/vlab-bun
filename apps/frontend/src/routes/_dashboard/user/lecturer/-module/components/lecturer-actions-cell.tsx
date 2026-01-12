import { ActionButton } from '@frontend/components/action-button';
import { useDashboardActionStore } from '@frontend/routes/_dashboard/-module/stores/dashboard-action-store';
import { KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useLecturerActionStore } from '../stores/lecturer-action-store';
import type { LecturerItem } from '../types';

export function LecturerActionsCell({ lecturer }: { lecturer: LecturerItem }) {
  const { setUpdate, setDelete } = useLecturerActionStore().use.actions();
  const { setChangeUserPassword } = useDashboardActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton
        icon={PencilIcon}
        tooltip="Edit"
        onClick={() => setUpdate(lecturer)}
      />
      <ActionButton
        icon={KeyRoundIcon}
        tooltip="Change Password"
        onClick={() => setChangeUserPassword(lecturer)}
      />
      <ActionButton
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(lecturer)}
      />
    </div>
  );
}
