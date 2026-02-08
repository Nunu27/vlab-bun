import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default (id: string) => {
	const store = useTopologyStore();

	return store(
		useShallow((state) => {
			const [source, target] = state.edges[id] ?? [];
			if (!source || !target) throw new Error("Edge not found");

			const sourceDevice = state.devices[source.deviceId];
			const targetDevice = state.devices[target.deviceId];

			if (!sourceDevice || !targetDevice) throw new Error("Edge not found");

			let index = -1;
			let parallelCount = 0;

			Object.keys(sourceDevice.edges).forEach((edgeId) => {
				if (!(edgeId in targetDevice.edges)) return;
				if (edgeId === id) index = parallelCount;

				parallelCount++;
			});

			return {
				source,
				sourceDevice,
				target,
				targetDevice,

				index,
				parallelCount,
				selected: state.selectedEdges.has(id),
			};
		}),
	);
};
