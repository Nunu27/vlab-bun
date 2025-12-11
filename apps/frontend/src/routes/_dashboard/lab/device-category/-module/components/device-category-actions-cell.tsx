import { Button } from '@frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@frontend/components/ui/dropdown-menu';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/lib/api-types';
import { MoreVerticalIcon } from 'lucide-react';
import { useState } from 'react';
import { DeleteDeviceCategoryModal } from './modals/delete-device-category-modal';
import { EditDeviceCategoryModal } from './modals/edit-device-category-modal';

type Item = ExtractPaginationData<
  (typeof api)['device-category']['pagination']
>;

export function DeviceCategoryActionsCell({
  deviceCategory,
}: {
  deviceCategory: Item;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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
            <DropdownMenuItem onSelect={() => setEditDialogOpen(true)}>
              Edit
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
      <EditDeviceCategoryModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        deviceCategoryId={deviceCategory.id}
        deviceCategoryName={deviceCategory.name}
        deviceCategoryColor={deviceCategory.color}
      />
      <DeleteDeviceCategoryModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        deviceCategoryId={deviceCategory.id}
        deviceCategoryName={deviceCategory.name}
      />
    </>
  );
}
