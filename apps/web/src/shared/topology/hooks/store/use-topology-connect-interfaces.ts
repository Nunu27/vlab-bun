import { shallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { useTopologyStore } from "../../stores";

export default () => {
	const store = useTopologyStore();

	return useStoreWithEqualityFn(
		store,
		({ connectDeviceId, templates, devices }) => {
			if (!connectDeviceId) return null;

			const device = devices[connectDeviceId];
			const template = templates.get(device?.deviceId || "");

			return {
				interfaces: template?.interfaces || [],
				used: new Set(device ? Object.values(device.edges) : []),
			};
		},
		(a, b) => {
			if (a === b) return true;
			if (!a || !b) return false;

			return Object.is(a.interfaces, b.interfaces) && shallow(a.used, b.used);
		},
	);
};
