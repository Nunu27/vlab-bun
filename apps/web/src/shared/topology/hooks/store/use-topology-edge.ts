import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default (id: string) => {
	const store = useTopologyStore();

	return store(
		useShallow(({ edges, devices, selectedEdges, nodesData }) => {
			const [source, target] = edges[id] ?? [];
			if (!source || !target) throw new Error("Edge not found");

			const sourceDevice = devices[source.deviceId];
			const targetDevice = devices[target.deviceId];

			if (!sourceDevice || !targetDevice) throw new Error("Edge not found");

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
};
