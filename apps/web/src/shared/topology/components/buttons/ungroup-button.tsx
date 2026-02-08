import { ActionButton } from "@web/components/buttons/action-button";
import { UngroupIcon } from "lucide-react";
import { useTopologyStore } from "../../stores";

function UngroupButton() {
	const store = useTopologyStore();
	const canUngroup = store.use.selectedGroups(({ size }) => size === 1);
	const { ungroup } = store.use.actions();

	return (
		<ActionButton
			icon={UngroupIcon}
			tooltip="Ungroup [U]"
			variant="ghost"
			disabled={!canUngroup}
			onClick={ungroup}
		/>
	);
}

export default UngroupButton;
