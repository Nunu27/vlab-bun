import { Link } from "@tanstack/react-router";
import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useDeviceTemplateModalStore } from "../stores/device-template-modal-store";
import type { DeviceTemplateItem } from "../types";

export function DeviceTemplateActionsCell({
	deviceTemplate,
}: {
	deviceTemplate: DeviceTemplateItem;
}) {
	const store = useDeviceTemplateModalStore();
	const actions = store.use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton icon={PencilIcon} tooltip="Edit" asChild>
				<Link
					to="/lab-data/device-template/$deviceTemplateId/edit"
					params={{ deviceTemplateId: deviceTemplate.id }}
				/>
			</ActionButton>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(deviceTemplate)}
			/>
		</div>
	);
}
