import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useDeviceCategoryModalStore } from "../stores/device-category-modal-store";
import type { DeviceCategoryItem } from "../types";

export function DeviceCategoryActionsCell({
	deviceCategory,
}: {
	deviceCategory: DeviceCategoryItem;
}) {
	const actions = useDeviceCategoryModalStore().use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton
				icon={PencilIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(deviceCategory)}
			/>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(deviceCategory)}
			/>
		</div>
	);
}
