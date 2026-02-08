import { useShallow } from "zustand/shallow";
import { useTopologyStore } from "../../stores";
import Device from "../nodes/device";

function DeviceLayer() {
	const store = useTopologyStore();
	const devices = store.use.devices(
		useShallow((devices) => Object.keys(devices).sort()),
	);

	return (
		<div
			id="device-layer"
			className="pointer-events-none absolute overflow-visible"
		>
			{devices.map((id) => (
				<Device key={id} id={id} />
			))}
		</div>
	);
}

export default DeviceLayer;
