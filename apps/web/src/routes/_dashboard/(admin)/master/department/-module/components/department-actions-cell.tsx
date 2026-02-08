import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useDepartmentModalStore } from "../stores/department-modal-store";
import type { DepartmentItem } from "../types";

export function DepartmentActionsCell({
	department,
}: {
	department: DepartmentItem;
}) {
	const actions = useDepartmentModalStore().use.actions();

	return (
		<div className="flex items-center justify-center gap-1">
			<ActionButton
				icon={PencilIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(department)}
			/>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(department)}
			/>
		</div>
	);
}
