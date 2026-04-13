import { ActionButton } from "@web/components/buttons/action-button";
import { Trash2Icon } from "lucide-react";
import { useLabModalStore } from "../../stores/lab-modal-store";
import type { LabItem } from "../../types";

function DeleteLabButton({ lab }: { lab: Pick<LabItem, "id" | "name"> }) {
	const actions = useLabModalStore().use.actions();

	return (
		<ActionButton
			icon={Trash2Icon}
			tooltip="Delete"
			variant="destructive"
			onClick={() => actions.delete.open(lab)}
		/>
	);
}

export default DeleteLabButton;
