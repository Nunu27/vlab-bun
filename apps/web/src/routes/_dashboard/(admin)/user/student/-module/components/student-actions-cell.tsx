import { ActionButton } from "@web/components/buttons/action-button";
import { EditIcon, TrashIcon } from "lucide-react";
import { useStudentModalStore } from "../stores/student-modal-store";
import type { StudentItem } from "../types";

export function StudentActionsCell({ student }: { student: StudentItem }) {
	const store = useStudentModalStore();
	const actions = store.use.actions();

	return (
		<div className="flex gap-2 justify-center">
			<ActionButton
				icon={EditIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(student)}
			/>
			<ActionButton
				icon={TrashIcon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(student)}
			/>
		</div>
	);
}
