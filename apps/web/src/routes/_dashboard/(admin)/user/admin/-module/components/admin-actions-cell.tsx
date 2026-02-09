import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useAdminModalStore } from "../stores/admin-modal-store";
import type { AdminItem } from "../types";

export function AdminActionsCell({ admin }: { admin: AdminItem }) {
	const store = useAdminModalStore();
	const actions = store.use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton
				icon={PencilIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(admin)}
			/>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(admin)}
			/>
		</div>
	);
}
