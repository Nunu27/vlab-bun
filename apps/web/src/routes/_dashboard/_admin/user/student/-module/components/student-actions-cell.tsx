import { ActionButton } from "@web/components/buttons/action-button";
import { KeyRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useUserPasswordModalStore } from "../../../-module/stores/user-password-modal-store";
import { useStudentModalStore } from "../stores/student-modal-store";
import type { StudentItem } from "../types";

export function StudentActionsCell({ student }: { student: StudentItem }) {
	const { changePassword } = useUserPasswordModalStore().use.actions();
	const actions = useStudentModalStore().use.actions();

	return (
		<div className="flex gap-2">
			<ActionButton
				icon={KeyRoundIcon}
				tooltip="Change Password"
				onClick={() => changePassword.open(student)}
			/>
			<ActionButton
				icon={PencilIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(student)}
			/>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(student)}
			/>
		</div>
	);
}
