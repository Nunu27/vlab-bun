import { getFirst } from "@web/lib/utils";
import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default () => {
	const store = useTopologyStore();

	return store(
		useShallow((state) => {
			const {
				selectedDevices,
				selectedGroups,
				selectedNotes,
				selectedEdges: selectedEdge,
				actions,
			} = state;

			const selectCount =
				selectedDevices.size +
				selectedGroups.size +
				selectedNotes.size +
				(selectedEdge ? 1 : 0);

			if (selectCount !== 1) return null;

			if (selectedDevices.size === 1) {
				const id = getFirst(selectedDevices);
				if (!id) return null;

				return {
					id,
					type: "device" as const,
					clear: actions.clearSelection,
				};
			} else if (selectedGroups.size === 1) {
				const id = getFirst(selectedGroups);
				if (!id) return null;

				return {
					id,
					type: "group" as const,
					clear: actions.clearSelection,
				};
			} else return null;
		}),
	);
};
