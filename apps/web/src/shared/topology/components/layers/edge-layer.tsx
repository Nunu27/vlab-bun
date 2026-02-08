import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";
import Edge from "../nodes/edge";

function EdgeLayer() {
	const store = useTopologyStore();
	const edges = store.use.edges(
		useShallow((edges) => Object.keys(edges).sort()),
	);

	return (
		<svg
			role="presentation"
			id="edge-layer"
			className="pointer-events-none absolute overflow-visible"
		>
			{edges.map((id) => (
				<Edge key={id} id={id} />
			))}
		</svg>
	);
}

export default EdgeLayer;
