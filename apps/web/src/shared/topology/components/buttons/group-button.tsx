import { ActionButton } from "@web/components/buttons/action-button";
import { GroupIcon } from "lucide-react";
import { useTopologyStore } from "../../stores";

function GroupButton() {
	const store = useTopologyStore();
	const canGroup = store(({ selectedDevices, selectedGroups }) => {
		return !selectedGroups.size && selectedDevices.size >= 2;
	});
	const { group } = store.use.actions();

	return (
		<ActionButton
			icon={GroupIcon}
			tooltip="Group [G]"
			variant="ghost"
			disabled={!canGroup}
			onClick={group}
		/>
	);
}

export default GroupButton;
