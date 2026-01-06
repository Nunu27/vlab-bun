import { ActionButton } from '@frontend/components/action-button';
import type api from '@frontend/lib/api';
import type { ExtractPaginationData } from '@frontend/types/api';
import { PencilIcon, Trash2Icon } from 'lucide-react';
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
      <div className="flex items-center justify-center gap-1">
        <ActionButton
          icon={PencilIcon}
          tooltip="Edit"
          onClick={() => setEditDialogOpen(true)}
        />
        <ActionButton
          icon={Trash2Icon}
          tooltip="Delete"
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        />
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
