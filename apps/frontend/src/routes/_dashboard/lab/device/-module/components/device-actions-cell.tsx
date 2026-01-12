import { ActionButton } from '@frontend/components/action-button';
import { Link } from '@tanstack/react-router';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useDeviceActionStore } from '../stores/device-action-store';
import type { DeviceItem } from '../types';

export function DeviceActionsCell({ device }: { device: DeviceItem }) {
  const { setDelete } = useDeviceActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton icon={PencilIcon} tooltip="Edit" asChild>
        <Link to="/lab/device/$id/update" params={{ id: device.id }}>
          <PencilIcon className="size-4" />
          <span className="sr-only">Edit</span>
        </Link>
      </ActionButton>
      <ActionButton
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(device)}
      />
    </div>
  );
}
