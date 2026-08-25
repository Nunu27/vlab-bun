import { ActionButton } from "@web/components/buttons/action-button";
import { CopyIcon } from "lucide-react";
import { useLabModalStore } from "../../stores/lab-modal-store";
import type { LabItem } from "../../types";

function DuplicateLabButton({ lab }: { lab: Pick<LabItem, "id" | "name"> }) {
	const actions = useLabModalStore().use.actions();

	return (
		<ActionButton
			icon={CopyIcon}
			tooltip="Duplicate"
			onClick={() => actions.duplicate.open(lab)}
		/>
	);
}

export default DuplicateLabButton;
