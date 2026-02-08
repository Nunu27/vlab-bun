import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default (id: string) => {
	const store = useTopologyStore();

	return store(
		useShallow((state) => ({
			selected: state.selectedDevices.has(id),
			state: state.devices[id],
			data: state.nodesData?.[id],
		})),
	);
};
