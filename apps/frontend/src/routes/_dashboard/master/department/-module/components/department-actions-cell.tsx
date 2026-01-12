import { ActionButton } from '@frontend/components/action-button';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useDepartmentActionStore } from '../stores/department-action-store';
import type { DepartmentItem } from '../types';

export function DepartmentActionsCell({
  department,
}: {
  department: DepartmentItem;
}) {
  const { setUpdate, setDelete } = useDepartmentActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton
        icon={PencilIcon}
        tooltip="Edit"
        onClick={() => setUpdate(department)}
      />
      <ActionButton
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(department)}
      />
    </div>
  );
}
