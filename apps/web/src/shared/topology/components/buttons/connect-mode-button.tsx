import { ActionButton } from "@web/components/buttons/action-button";
import { UnplugIcon } from "lucide-react";
import { useTopologyStore } from "../../stores";

function ConnectModeButton() {
	const store = useTopologyStore();
	const inConnectMode = store.use.mode((mode) => mode === "connect");
	const { toggleMode } = store.use.actions();

	return (
		<ActionButton
			icon={UnplugIcon}
			tooltip="Connect [C]"
			variant={inConnectMode ? "default" : "ghost"}
			onClick={() => toggleMode("connect")}
		/>
	);
}

export default ConnectModeButton;
