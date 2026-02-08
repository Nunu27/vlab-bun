import { ActionButton } from "@web/components/buttons/action-button";
import { EditIcon, TrashIcon } from "lucide-react";
import { useDeviceCategoryModalStore } from "../stores/device-category-modal-store";
import type { DeviceCategoryItem } from "../types";

export function DeviceCategoryActionsCell({
	deviceCategory,
}: {
	deviceCategory: DeviceCategoryItem;
}) {
	const store = useDeviceCategoryModalStore();
	const actions = store.use.actions();

	return (
		<div className="flex gap-2 justify-center">
			<ActionButton
				icon={EditIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(deviceCategory)}
			/>
			<ActionButton
				icon={TrashIcon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(deviceCategory)}
			/>
		</div>
	);
}
