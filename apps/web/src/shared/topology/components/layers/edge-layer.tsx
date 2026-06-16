import { useShallow } from "zustand/shallow";
import { TOPOLOGY_ID } from "../../constants";
import { useTopologyStore } from "../../stores";
import Edge from "../nodes/edge";
import PendingEdge from "../nodes/pending-edge";

function EdgeLayer() {
	const store = useTopologyStore();
	const edges = store.use.edges(
		useShallow((edges) => Object.keys(edges).sort()),
	);

	return (
		<svg
			role="presentation"
			id={TOPOLOGY_ID.EDGE_LAYER}
			className="pointer-events-none absolute overflow-visible"
		>
			{edges.map((id) => (
				<Edge key={id} id={id} />
			))}
			<PendingEdge />
		</svg>
	);
}

export default EdgeLayer;
