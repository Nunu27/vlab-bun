import { useShallow } from "zustand/shallow";
import { TOPOLOGY_ID } from "../../constants";
import { useTopologyStore } from "../../stores";
import Device from "../nodes/device";

function DeviceLayer() {
	const store = useTopologyStore();
	const devices = store.use.devices(
		useShallow((devices) => Object.keys(devices).sort()),
	);

	return (
		<div
			id={TOPOLOGY_ID.DEVICE_LAYER}
			className="pointer-events-none absolute overflow-visible"
		>
			{devices.map((id) => (
				<Device key={id} id={id} />
			))}
		</div>
	);
}

export default DeviceLayer;
