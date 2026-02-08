import { ActionButton } from "@web/components/buttons/action-button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useStudyProgramModalStore } from "../stores/study-program-modal-store";
import type { StudyProgramItem } from "../types";

export function StudyProgramActionsCell({
	studyProgram,
}: {
	studyProgram: StudyProgramItem;
}) {
	const actions = useStudyProgramModalStore().use.actions();

	return (
		<div className="flex items-center justify-center gap-1">
			<ActionButton
				icon={PencilIcon}
				tooltip="Edit"
				onClick={() => actions.update.open(studyProgram)}
			/>
			<ActionButton
				icon={Trash2Icon}
				tooltip="Delete"
				variant="destructive"
				onClick={() => actions.delete.open(studyProgram)}
			/>
		</div>
	);
}
