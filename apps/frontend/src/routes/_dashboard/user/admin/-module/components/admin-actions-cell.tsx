import { ActionButton } from '@frontend/components/action-button';
import type api from '@frontend/lib/api';
import { useDashboardActionStore } from '@frontend/routes/_dashboard/-module/stores/dashboard-action-store';
import { useAuthStore } from '@frontend/stores/auth-store';
import type { ExtractPaginationData } from '@frontend/types/api';
import { KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useAdminActionStore } from '../stores/admin-action-store';

type Item = ExtractPaginationData<typeof api.user.admin.pagination>;

export function AdminActionsCell({ admin }: { admin: Item }) {
  const { id } = useAuthStore.use.user()!;
  const { setChangeUserPassword } = useDashboardActionStore().use.actions();
  const { setUpdate, setDelete } = useAdminActionStore().use.actions();

  return (
    <div className="flex items-center justify-center gap-1">
      <ActionButton
        icon={PencilIcon}
        tooltip="Edit"
        onClick={() => setUpdate(admin)}
      />
      <ActionButton
        icon={KeyRoundIcon}
        tooltip="Change Password"
        onClick={() => setChangeUserPassword(admin)}
      />
      <ActionButton
        disabled={admin.id === id}
        icon={Trash2Icon}
        tooltip="Delete"
        variant="destructive"
        onClick={() => setDelete(admin)}
      />
    </div>
  );
}
