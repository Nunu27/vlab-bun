import { useEffect, useRef } from "react";
import { useTopologyStore } from "../../stores";
import DeviceLayer from "./device-layer";
import EdgeLayer from "./edge-layer";
import GroupLayer from "./group-layer";
import NoteLayer from "./note-layer";
import SelectionLayer from "./selection-layer";

function TopologyLayers() {
	const containerRef = useRef<HTMLDivElement>(null);
	const store = useTopologyStore();

	useEffect(() => {
		return store.subscribe(
			(state) => state.view,
			(view) => {
				if (!containerRef.current) return;

				containerRef.current.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
			},
		);
	}, [store]);

	return (
		<div
			ref={containerRef}
			className="pointer-events-none absolute top-0 left-0 h-full w-full origin-top-left"
		>
			<GroupLayer />
			<EdgeLayer />
			<DeviceLayer />
			<NoteLayer />
			<SelectionLayer />
		</div>
	);
}

export default TopologyLayers;
