import { GroupIcon } from "lucide-react";
import { type RefObject, useRef } from "react";
import { useTopologyNodeInteraction } from "../../hooks/helper/use-topology-node-interaction";
import useTopologyGroup from "../../hooks/store/use-topology-group";

function Group({ id }: { id: string }) {
	const ref = useRef<SVGGElement>(null) as RefObject<SVGGElement>;
	const { selected, state } = useTopologyGroup(id);

	useTopologyNodeInteraction({
		identifier: { id, type: "group" },
		elementRef: ref,
	});

	if (!state) return null;

	return (
		<g className="node pointer-events-auto cursor-pointer" ref={ref}>
			<rect
				x={state.x}
				y={state.y}
				width={state.width}
				height={state.height}
				rx={12}
				fill={state.color || "#f3f4f6"}
				fillOpacity={0.25}
				stroke={selected ? "#6366f1" : "#9ca3af"}
				strokeWidth={2}
				strokeDasharray={selected ? "none" : "8,4"}
			/>

			<foreignObject
				x={state.x + 12}
				y={state.y + 12}
				width={200}
				height={30}
				className="overflow-visible"
			>
				<div className="flex items-center gap-1.5">
					<GroupIcon size={14} className="text-foreground" />
					<span className="whitespace-nowrap font-extrabold text-[10px] text-foreground uppercase tracking-wider">
						{state.name}
					</span>
				</div>
			</foreignObject>
		</g>
	);
}

export default Group;
