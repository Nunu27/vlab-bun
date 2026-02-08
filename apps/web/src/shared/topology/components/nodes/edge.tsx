import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@web/components/ui/tooltip";
import { cn } from "@web/lib/utils";
import { memo } from "react";
import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../../constants";
import useTopologyEdge from "../../hooks/store/use-topology-edge";

interface InterfaceLabelProps {
	interface: string;
	x: number;
	y: number;
}

function InterfaceLabel({
	interface: interfaceName,
	x,
	y,
}: InterfaceLabelProps) {
	const width = Math.max(40, interfaceName.length * 5 + 8);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<g className="edge-label" transform={`translate(${x}, ${y})`}>
					<rect
						x={-width / 2}
						y="-8"
						width={width}
						height="16"
						rx="4"
						className="fill-card stroke-border stroke-1 opacity-90"
					/>
					<text
						y="3"
						textAnchor="middle"
						className="fill-muted-foreground font-mono text-[8px] select-none"
					>
						{interfaceName}
					</text>
				</g>
			</TooltipTrigger>
			<TooltipContent className="px-2 py-1 text-xs whitespace-pre">
				testing
			</TooltipContent>
		</Tooltip>
	);
}

function Edge({ id }: { id: string }) {
	const {
		source,
		sourceDevice,
		target,
		targetDevice,
		index,
		parallelCount,
		selected,
	} = useTopologyEdge(id);

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
				d={pathData}
				className={cn(
					"fill-none stroke-[3px]",
					selected ? "stroke-orange-500" : "stroke-muted-foreground/40",
				)}
			/>

			<InterfaceLabel {...source} x={sLabelX} y={sLabelY} />
			<InterfaceLabel {...target} x={tLabelX} y={tLabelY} />
		</g>
	);
}

export default memo(Edge);
