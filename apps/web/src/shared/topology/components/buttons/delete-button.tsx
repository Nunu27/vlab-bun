import { ActionButton } from "@web/components/buttons/action-button";
import { Trash2Icon } from "lucide-react";
import { useTopologyStore } from "../../stores";

function DeleteButton() {
	const store = useTopologyStore();
	const { delete: deleteSelected } = store.use.actions();
	const hasSelection = store(
		({ selectedDevices, selectedNotes }) =>
			selectedDevices.size > 0 || selectedNotes.size > 0,
	);

	return (
		<ActionButton
			icon={Trash2Icon}
			tooltip="Delete [Del]"
			variant="ghost"
			disabled={!hasSelection}
			onClick={deleteSelected}
			className="text-destructive hover:text-destructive/90"
		/>
	);
}

export default DeleteButton;
