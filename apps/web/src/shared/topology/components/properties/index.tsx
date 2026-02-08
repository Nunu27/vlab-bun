import { Button } from "@web/components/ui/button";
import { XIcon } from "lucide-react";
import useTopologyNodePropertiesState from "../../hooks/store/use-topology-node-properties-state";
import DeviceProperties from "./device-properties";
import GroupProperties from "./group-properties";

export default function NodeProperties() {
	const state = useTopologyNodePropertiesState();
	if (!state) return null;

	return (
		<div className="animate-in slide-in-from-right dark:border-border dark:bg-card z-20 flex w-80 flex-col border-l border-gray-200 bg-white shadow-xl duration-300">
			<div className="dark:border-border dark:bg-card flex items-center justify-between border-b border-gray-200 bg-white p-4">
				<h2 className="dark:text-muted-foreground text-xs font-semibold tracking-wider text-gray-500 uppercase">
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
