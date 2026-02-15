import { getFirst } from "@web/lib/utils";
import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

export default () => {
	const store = useTopologyStore();

	return store(
		useShallow((state) => {
			const { selectedDevices, selectedGroups, actions } = state;

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
