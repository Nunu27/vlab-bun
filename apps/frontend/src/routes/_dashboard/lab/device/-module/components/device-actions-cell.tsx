import { Button } from '@frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@frontend/components/ui/dropdown-menu';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { Link } from '@tanstack/react-router';
import { MoreVerticalIcon } from 'lucide-react';
import { useState } from 'react';
import { DeleteDeviceModal } from './modals/delete-device-modal';

type Item = ExtractPaginationData<(typeof api)['device']['pagination']>;

export function DeviceActionsCell({ device }: { device: Item }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <MoreVerticalIcon />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem asChild>
              <Link to="/lab/device/$id/update" params={{ id: device.id }}>
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteDialogOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
