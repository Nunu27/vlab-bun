import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

function useTopologyEdge(id: string) {
	const store = useTopologyStore();

	return store(
		useShallow(({ edges, devices, selectedEdges, nodesData }) => {
			const [source, target] = edges[id] ?? [];
			if (!source || !target) return null;

			const sourceDevice = devices[source.deviceId];
			const targetDevice = devices[target.deviceId];

			if (!sourceDevice || !targetDevice) return null;

			let index = -1;
			let parallelCount = 0;

			Object.keys(sourceDevice.edges).forEach((edgeId) => {
				if (!(edgeId in targetDevice.edges)) return;
				if (edgeId === id) index = parallelCount;

				parallelCount++;
			});

			const sourceNode = nodesData?.[source.deviceId];
			const targetNode = nodesData?.[target.deviceId];

			return {
				source,
				sourceDevice,
				sourceIp: sourceNode?.interfaces[source.interface],
				sourceNode: sourceNode?.id,
				target,
				targetDevice,
				targetIp: targetNode?.interfaces[target.interface],
				targetNode: targetNode?.id,

				index,
				parallelCount,
				selected: selectedEdges.has(id),
			};
		}),
	);
}

export default useTopologyEdge;
