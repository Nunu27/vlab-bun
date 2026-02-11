import { ActionButton } from "@web/components/buttons/action-button";
import { useAuthStore } from "@web/stores/auth-store";
import { KeyRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useUserPasswordModalStore } from "../../../-module/stores/user-password-modal-store";
import { useAdminModalStore } from "../stores/admin-modal-store";
import type { AdminItem } from "../types";

export function AdminActionsCell({ admin }: { admin: AdminItem }) {
	const { changePassword } = useUserPasswordModalStore().use.actions();
	const actions = useAdminModalStore().use.actions();
	const isSelf = useAuthStore.use.user((user) => user?.id === admin.id);

	return (
		<div className="flex gap-2">
			<ActionButton
				icon={KeyRoundIcon}
				tooltip="Change Password"
				onClick={() => changePassword.open(admin)}
			/>
			<ActionButton
				icon={PencilIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(admin)}
			/>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				disabled={isSelf}
				onClick={() => actions.delete.open(admin)}
			/>
		</div>
	);
}
