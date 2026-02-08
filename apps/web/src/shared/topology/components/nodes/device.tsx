import type { NodeHealth } from "@vlab/shared/enums";
import { cn } from "@web/lib/utils";
import { memo, type RefObject, useRef } from "react";
import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../../constants";
import { useTopologyNodeInteraction } from "../../hooks/helper/use-topology-node-interaction";
import useTopologyDevice from "../../hooks/store/use-topology-device";
import useTopologyTemplate from "../../hooks/store/use-topology-template";
import Icon from "../icon";

const healthColorMap: Record<NodeHealth, string> = {
	starting: "bg-yellow-500 animate-pulse",
	healthy: "bg-green-500",
	unhealthy: "bg-red-500",
};

const getHealthColor = (health: string | null) => {
	if (!health) return null;
	if (health === "deleted") return healthColorMap.unhealthy;

	return healthColorMap[health as NodeHealth];
};

function Device({ id }: { id: string }) {
	const ref = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;

	const { selected, state, data } = useTopologyDevice(id);

	const template = useTopologyTemplate(state?.deviceId);
	// const health = useLabNodeHealth(data?.id, data?.health);
	const health = data?.health || "starting";
	const healthColor = getHealthColor(health);

	useTopologyNodeInteraction({
		identifier: { id, type: "device" },
		elementRef: ref,
	});

	if (!state) return null;

	return (
		<div
			ref={ref}
			className={cn(
				"node border-border bg-card pointer-events-auto absolute flex flex-col items-center justify-center rounded-lg border shadow-sm transition-shadow duration-200",
				selected && "shadow-lg ring-2 ring-indigo-500",
			)}
			style={{
				left: state.x,
				top: state.y,
				width: DEVICE_WIDTH,
				height: DEVICE_HEIGHT,
			}}
		>
			<div
				className="mb-1 rounded-full p-2"
				style={{
					color: template?.color,
					backgroundColor: template ? `${template.color}1A` : "transparent",
				}}
			>
				<Icon name={template?.icon || "package"} />
			</div>
			{healthColor && (
				<div
					className={cn(
						"border-background absolute top-1 right-1 h-2 w-2 rounded-full border",
						healthColor,
					)}
				/>
			)}
			<div className="bg-popover text-popover-foreground/80 border-border pointer-events-none absolute top-full mt-2 rounded border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-sm">
				{state.name}
			</div>
		</div>
	);
}

export default memo(Device);
