import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useInstructorModalStore } from "../stores/instructor-modal-store";
import type { InstructorItem } from "../types";

export function InstructorActionsCell({
	instructor,
}: {
	instructor: InstructorItem;
}) {
	const store = useInstructorModalStore();
	const actions = store.use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton
				icon={PencilIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(instructor)}
			/>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(instructor)}
			/>
		</div>
	);
}
