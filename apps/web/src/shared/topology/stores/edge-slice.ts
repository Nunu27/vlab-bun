import type { StateCreator } from "zustand";
import type { ConnectionEntry, Dictionary } from "../types";
import type { TopologyStore } from ".";

export interface TopologyEdgeState {
	connectDeviceId: string | null;
	connectSource: ConnectionEntry | null;
	edges: Dictionary<string, [ConnectionEntry, ConnectionEntry]>;
}

export const edgeInitialState: TopologyEdgeState = {
	connectDeviceId: null,
	connectSource: null,
	edges: {},
};

export interface TopologyEdgeActions {
	connectDevice: (id: string) => void;
	selectInterface: (id: string) => void;
	cancelConnection: () => void;
}

export const createEdgeSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyEdgeActions
> = (set, get) => ({
	cancelConnection: () => {
		const { connectDeviceId, connectSource } = get();
		if (!connectDeviceId && !connectSource) return;

		if (connectDeviceId) {
			set({ connectDeviceId: null });
		} else {
			set({ connectSource: null });
		}
	},

	connectDevice: (id) => {
		const { mode, connectSource } = get();
		if (mode !== "connect") return;
		if (connectSource?.deviceId === id) return;

		set({ connectDeviceId: id });
	},
	selectInterface: (id) => {
		const { connectDeviceId, connectSource, devices, edges } = get();
		if (!connectDeviceId) return;
		if (connectDeviceId === connectSource?.deviceId) return;

		if (!connectSource) {
			set({
				connectDeviceId: null,
				connectSource: {
					deviceId: connectDeviceId,
					interface: id,
				},
			});
		} else {
			const newDevices = { ...devices };
			const edgeId = crypto.randomUUID();

			const sourceDevice = newDevices[connectSource.deviceId];
			const targetDevice = newDevices[connectDeviceId];
			if (!sourceDevice || !targetDevice) return;

			newDevices[connectSource.deviceId] = {
				...sourceDevice,
				edges: {
					...sourceDevice.edges,
					[edgeId]: connectSource.interface,
				},
			};
			newDevices[connectDeviceId] = {
				...targetDevice,
				edges: {
					...targetDevice.edges,
					[edgeId]: id,
				},
			};

			set({
				connectDeviceId: null,
				connectSource: null,
				devices: newDevices,
				edges: {
					...edges,
					[edgeId]: [
						connectSource,
						{ deviceId: connectDeviceId, interface: id },
					],
				},
			});
		}
	},
});
