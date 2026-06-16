import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { DEVICE_HEIGHT, DEVICE_WIDTH, TOPOLOGY_ID } from "../../constants";
import { useTopologyStore } from "../../stores";
import type { Position } from "../../types";

function PendingEdge() {
	const store = useTopologyStore();
	const [cursor, setCursor] = useState<Position | null>(null);

	const { connectSource, sourceDevice } = store(
		useShallow(({ connectSource, devices }) => ({
			connectSource,
			sourceDevice: connectSource ? devices[connectSource.deviceId] : null,
		})),
	);

	useEffect(() => {
		if (!connectSource) {
			setCursor(null);
			return;
		}

		const canvas = document.getElementById(TOPOLOGY_ID.CANVAS);
		if (!canvas) return;

		const handleMouseMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			const { view } = store.getState();
			setCursor({
				x: (e.clientX - rect.left - view.x) / view.scale,
				y: (e.clientY - rect.top - view.y) / view.scale,
			});
		};

		const handleMouseLeave = () => setCursor(null);

		canvas.addEventListener("mousemove", handleMouseMove);
		canvas.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			canvas.removeEventListener("mousemove", handleMouseMove);
			canvas.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [connectSource, store]);

	if (!connectSource || !sourceDevice || !cursor) return null;

	const sx = sourceDevice.x + DEVICE_WIDTH / 2;
	const sy = sourceDevice.y + DEVICE_HEIGHT / 2;
	const tx = cursor.x;
	const ty = cursor.y;

	const dx = tx - sx;
	const dy = ty - sy;
	const length = Math.sqrt(dx * dx + dy * dy);
	const angle = Math.atan2(dy, dx);

	const labelOffset = 70;
	const labelX = sx + labelOffset * Math.cos(angle);
	let labelY = sy + labelOffset * Math.sin(angle);
	if (labelY > sy + DEVICE_HEIGHT / 2) labelY += 20;

	const interfaceName = connectSource.interface;
	const labelWidth = Math.max(40, interfaceName.length * 5 + 8);

	return (
		<g>
			<path
				d={`M ${sx} ${sy} L ${tx} ${ty}`}
				className="fill-none stroke-[2px] stroke-orange-500/60"
				strokeDasharray="6,4"
			/>

			{length > labelOffset && (
				<g transform={`translate(${labelX}, ${labelY})`}>
					<rect
						x={-labelWidth / 2}
						y="-8"
						width={labelWidth}
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
			)}

			<circle
				cx={tx}
				cy={ty}
				r="3"
				className="fill-orange-500/60 stroke-1 stroke-orange-500/80"
			/>
		</g>
	);
}

export default PendingEdge;
