import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default (id: string) => {
	const store = useTopologyStore();

	return store(
		useShallow((state) => ({
			selected: state.selectedGroups.has(id),
			state: state.groups[id],
		})),
	);
};
