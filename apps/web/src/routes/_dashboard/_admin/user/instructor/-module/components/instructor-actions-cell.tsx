import { ActionButton } from "@web/components/buttons/action-button";
import { KeyRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useUserPasswordModalStore } from "../../../-module/stores/user-password-modal-store";
import { useInstructorModalStore } from "../stores/instructor-modal-store";
import type { InstructorItem } from "../types";

export function InstructorActionsCell({
	instructor,
}: {
	instructor: InstructorItem;
}) {
	const { changePassword } = useUserPasswordModalStore().use.actions();
	const actions = useInstructorModalStore().use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton
				icon={KeyRoundIcon}
				tooltip="Change Password"
				onClick={() => changePassword.open(instructor)}
			/>
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
