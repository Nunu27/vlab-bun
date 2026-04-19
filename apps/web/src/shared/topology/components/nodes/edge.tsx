import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { useWSData } from "@web/hooks/ws";
import { cn } from "@web/lib/utils";
import { memo, type RefObject, useRef } from "react";
import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../../constants";
import { useTopologyNodeInteraction } from "../../hooks/helper/use-topology-node-interaction";
import useTopologyEdge from "../../hooks/store/use-topology-edge";

interface InterfaceLabelProps {
	nodeId?: string;
	ip?: string[];
	interface: string;
	x: number;
	y: number;
}

function InterfaceTooltip({
	nodeId,
	ip,
	interface: interfaceName,
}: {
	nodeId: string;
	ip?: string[];
	interface: string;
}) {
	const ips = useWSData("node:[id]:interfaces:[interface]", {
		params: { id: nodeId, interface: interfaceName },
		default: ip,
	});

	return (
		<TooltipContent className="whitespace-pre px-2 py-1 text-xs">
			{ips?.join("\n") || "Not Configured"}
		</TooltipContent>
	);
}

function InterfaceLabel({
	nodeId,
	ip,
	interface: interfaceName,
	x,
	y,
}: InterfaceLabelProps) {
	const width = Math.max(40, interfaceName.length * 5 + 8);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<g className="pointer-events-auto" transform={`translate(${x}, ${y})`}>
					<rect
						x={-width / 2}
						y="-8"
						width={width}
						height="16"
						rx="4"
						className="fill-card stroke-1 stroke-border opacity-90"
					/>
					<text
						y="3"
						textAnchor="middle"
						className="select-none fill-muted-foreground font-mono text-[8px]"
					>
						{interfaceName}
					</text>
				</g>
			</TooltipTrigger>
			{nodeId && (
				<InterfaceTooltip nodeId={nodeId} interface={interfaceName} ip={ip} />
			)}
		</Tooltip>
	);
}

function Edge({ id }: { id: string }) {
	const {
		source,
		sourceDevice,
		sourceIp,
		sourceNode,
		target,
		targetDevice,
		targetIp,
		targetNode,
		index,
		parallelCount,
		selected,
	} = useTopologyEdge(id);

	const pathRef = useRef<SVGPathElement>(null) as RefObject<SVGPathElement>;
	useTopologyNodeInteraction({
		identifier: { id, type: "edge" },
		elementRef: pathRef,
	});

	if (!sourceDevice || !targetDevice) return null;

	const sx = sourceDevice.x + DEVICE_WIDTH / 2;
	const sy = sourceDevice.y + DEVICE_HEIGHT / 2;
	const tx = targetDevice.x + DEVICE_WIDTH / 2;
	const ty = targetDevice.y + DEVICE_HEIGHT / 2;

	// Calculate curve offset for parallel edges
	let curvature = 0;
	if (parallelCount > 1) {
		// Distribute edges symmetrically around center
		const maxOffset = 80;
		const step = maxOffset / (parallelCount - 1);
		curvature = (index - (parallelCount - 1) / 2) * step;
	}

	// Calculate control point for curve
	const midX = (sx + tx) / 2;
	const midY = (sy + ty) / 2;

	// Perpendicular offset for curve
	const dx = tx - sx;
	const dy = ty - sy;
	const length = Math.sqrt(dx * dx + dy * dy);
	const perpX = -dy / length;
	const perpY = dx / length;

	const controlX = midX + perpX * curvature;
	const controlY = midY + perpY * curvature;

	// Create curved path
	const pathData =
		curvature === 0
			? `M ${sx} ${sy} L ${tx} ${ty}`
			: `M ${sx} ${sy} Q ${controlX} ${controlY} ${tx} ${ty}`;

	// Calculate label positions with offset from nodes
	const labelOffset = 70; // Distance from node center
	const angle = Math.atan2(ty - sy, tx - sx);

	// Calculate base positions along the edge direction
	let sLabelX = sx + labelOffset * Math.cos(angle);
	let sLabelY = sy + labelOffset * Math.sin(angle);
	let tLabelX = tx - labelOffset * Math.cos(angle);
	let tLabelY = ty - labelOffset * Math.sin(angle);

	// Add curvature offset if edge is curved
	if (curvature !== 0) {
		// Apply perpendicular offset based on curvature
		const curveOffsetRatio = 0.3; // How much curve affects label position
		sLabelX += perpX * curvature * curveOffsetRatio;
		sLabelY += perpY * curvature * curveOffsetRatio;
		tLabelX += perpX * curvature * curveOffsetRatio;
		tLabelY += perpY * curvature * curveOffsetRatio;
	}

	// Check if source label is below source node
	if (sLabelY > sy + DEVICE_HEIGHT / 2) {
		sLabelY += 20; // Extra offset to avoid node label
	}

	// Check if target label is below target node
	if (tLabelY > ty + DEVICE_HEIGHT / 2) {
		tLabelY += 20; // Extra offset to avoid node label
	}

	return (
		<g>
			<path
				ref={pathRef}
				d={pathData}
				className={cn(
					"edge-path fill-none stroke-[3px] transition-colors",
					selected
						? "stroke-orange-500"
						: "stroke-muted-foreground/40 hover:stroke-orange-500/50",
				)}
			/>

			<InterfaceLabel
				{...source}
				nodeId={sourceNode}
				ip={sourceIp}
				x={sLabelX}
				y={sLabelY}
			/>
			<InterfaceLabel
				{...target}
				nodeId={targetNode}
				ip={targetIp}
				x={tLabelX}
				y={tLabelY}
			/>
		</g>
	);
}

export default memo(Edge);
