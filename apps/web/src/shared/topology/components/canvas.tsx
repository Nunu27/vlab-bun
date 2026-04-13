import { type RefObject, useEffect, useRef } from "react";
import { TOPOLOGY_ID } from "../constants";
import { useScreenToWorld } from "../hooks/helper/use-screen-to-world";
import { useTopologyDrop } from "../hooks/helper/use-topology-drop";
import { useTopologyHotkeys } from "../hooks/helper/use-topology-hotkey";
import { useTopologyPanAndDrag } from "../hooks/helper/use-topology-pan-and-drag";
import { useTopologySelect } from "../hooks/helper/use-topology-select";
import { useTopologyText } from "../hooks/helper/use-topology-text";
import { useTopologyWheel } from "../hooks/helper/use-topology-wheel";
import { useTopologyStore } from "../stores";
import Background from "./background";
import Controls from "./controls";
import TopologyLayers from "./layers";
import Toolbar from "./toolbar";

function TopologyCanvas() {
	const canvasRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
	const backgroundRef = useRef<HTMLDivElement>(
		null,
	) as RefObject<HTMLDivElement>;

	const store = useTopologyStore();
	const sessionId = store.use.sessionId();
	const isEditor = store.use.isEditor();
	const screenToWorld = useScreenToWorld({ worldRef: canvasRef });

	useTopologyWheel({ elementRef: canvasRef });
	useTopologyPanAndDrag({ backgroundRef, foregroundRef: canvasRef });

	useTopologyText({
		enabled: isEditor,
		elementRef: backgroundRef,
		screenToWorld,
	});
	useTopologyDrop({
		enabled: isEditor,
		elementRef: backgroundRef,
		screenToWorld,
	});
	useTopologySelect({
		enabled: isEditor,
		backgroundRef,
		foregroundRef: canvasRef,
		screenToWorld,
	});

	useTopologyHotkeys({ canvasRef });

	useEffect(() => {
		canvasRef.current.dataset.mode = store.getState().mode;

		return store.subscribe(
			(state) => state.mode,
			(mode) => {
				canvasRef.current.dataset.mode = mode;
			},
		);
	}, [store]);

	useEffect(() => {
		if (canvasRef.current) {
			store
				.getState()
				.actions.recenter(canvasRef.current.getBoundingClientRect());
		}
	}, [store]);

	return (
		<div
			id={TOPOLOGY_ID.CANVAS}
			data-sessionid={sessionId}
			ref={canvasRef}
			className="relative flex-1 select-none overflow-hidden"
			onDragOver={(e) => e.preventDefault()}
			onContextMenu={(e) => e.preventDefault()}
		>
			<Background ref={backgroundRef} />
			<TopologyLayers />
			<Controls canvasRef={canvasRef} />

			{isEditor && <Toolbar />}
		</div>
	);
}

export default TopologyCanvas;
