import { ActionButton } from '@frontend/components/action-button';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { Link } from '@tanstack/react-router';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { DeleteDeviceModal } from './modals/delete-device-modal';

type Item = ExtractPaginationData<(typeof api)['device']['pagination']>;

export function DeviceActionsCell({ device }: { device: Item }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
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
          onClick={() => setDeleteDialogOpen(true)}
        />
      </div>
      <DeleteDeviceModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        deviceId={device.id}
        deviceName={device.name}
      />
    </>
  );
}
