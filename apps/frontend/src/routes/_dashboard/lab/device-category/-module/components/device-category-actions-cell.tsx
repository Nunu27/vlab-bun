import { ActionButton } from '@frontend/components/action-button';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useDeviceCategoryActionStore } from '../stores/device-category-action-store';
import type { DeviceCategoryItem } from '../types';

export function DeviceCategoryActionsCell({
  deviceCategory,
}: {
  deviceCategory: DeviceCategoryItem;
}) {
  const { setUpdate, setDelete } = useDeviceCategoryActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton
        icon={PencilIcon}
        tooltip="Edit"
        onClick={() => setUpdate(deviceCategory)}
      />
      <ActionButton
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(deviceCategory)}
      />
    </div>
  );
}
