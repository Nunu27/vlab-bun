import type { NodeHealth } from "@vlab/shared/enums";
import { useWSData } from "@web/hooks/ws";
import { cn } from "@web/lib/utils";
import { memo, type RefObject, useRef } from "react";
import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../../constants";
import { useTopologyNodeInteraction } from "../../hooks/helper/use-topology-node-interaction";
import useTopologyDevice from "../../hooks/store/use-topology-device";
import useTopologyTemplate from "../../hooks/store/use-topology-template";
import Icon from "../icon";

const healthColorMap: Record<Exclude<NodeHealth, null>, string> = {
	starting: "bg-yellow-500 animate-pulse",
	healthy: "bg-green-500",
	unhealthy: "bg-red-500",
	died: "bg-red-500",
	destroyed: "bg-red-500",
};

const getHealthColor = (health: NodeHealth | undefined) => {
	if (!health) return healthColorMap.healthy;

	return healthColorMap[health];
};

function Device({ id }: { id: string }) {
	const ref = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;

	const { selected, state, data, isConnectSource } = useTopologyDevice(id);

	const template = useTopologyTemplate(state?.deviceId);
	const health = useWSData("node:[id]:health", {
		params: { id: data?.id ?? "" },
		// biome-ignore lint/suspicious/noExplicitAny: bypassed generic type
		initialData: (data?.health as any) ?? null,
		enabled: !!data?.id,
	});
	const healthColor = getHealthColor(health);

	useTopologyNodeInteraction({
		identifier: { id, type: "device" },
		elementRef: ref,
	});

	if (!state) return null;

	return (
		<div
			ref={ref}
			data-connect-source={isConnectSource || undefined}
			className={cn(
				"node pointer-events-auto absolute flex flex-col items-center justify-center rounded-lg border border-border bg-card shadow-sm transition-shadow duration-200",
				selected && "shadow-lg ring-2 ring-indigo-500",
				isConnectSource && "shadow-lg ring-2 ring-orange-500",
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
						"absolute top-1 right-1 h-2 w-2 rounded-full border border-background",
						healthColor,
					)}
				/>
			)}
			<div className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded border border-border bg-popover px-2 py-0.5 font-semibold text-[10px] text-popover-foreground/80 shadow-sm">
				{state.name}
			</div>
		</div>
	);
}

export default memo(Device);
