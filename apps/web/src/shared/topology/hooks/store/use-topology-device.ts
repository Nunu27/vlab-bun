import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";

function useTopologyDevice(id: string) {
	const store = useTopologyStore();

	return store(
		useShallow((state) => ({
			selected: state.selectedDevices.has(id),
			state: state.devices[id],
			data: state.nodesData?.[id],
			isConnectSource:
				state.connectDeviceId === id || state.connectSource?.deviceId === id,
		})),
	);
}

export default useTopologyDevice;
