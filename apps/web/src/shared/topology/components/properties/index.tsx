import { Button } from "@web/components/ui/button";
import { XIcon } from "lucide-react";
import useTopologyNodePropertiesState from "../../hooks/store/use-topology-node-properties-state";
import DeviceProperties from "./device-properties";
import GroupProperties from "./group-properties";

export default function NodeProperties() {
	const state = useTopologyNodePropertiesState();
	if (!state) return null;

	return (
		<div className="slide-in-from-right z-20 flex w-80 animate-in flex-col border-gray-200 border-l bg-white shadow-xl duration-300 dark:border-border dark:bg-card">
			<div className="flex items-center justify-between border-gray-200 border-b bg-white p-4 dark:border-border dark:bg-card">
				<h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-muted-foreground">
					Configuration
				</h2>
				<Button type="button" onClick={state.clear} variant="ghost" size="icon">
					<XIcon size={16} />
				</Button>
			</div>

			<div className="flex-1 space-y-6 overflow-y-auto p-5">
				{state.type === "device" ? (
					<DeviceProperties id={state.id} />
				) : (
					<GroupProperties id={state.id} />
				)}
			</div>
		</div>
	);
}
