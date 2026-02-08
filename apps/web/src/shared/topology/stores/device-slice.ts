import type { LabDeviceNode } from "@vlab/shared/schemas/lab";
import type { StateCreator } from "zustand";
import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../constants";
import type { Dictionary, Position } from "../types";
import { snapToGrid } from "../utils";
import type { TopologyStore } from ".";

export type DeviceData = {
	id: string;
	name: string;
};

export interface TopologyDeviceState {
	devices: Dictionary<string, LabDeviceNode>;
	deviceNames: Set<string>;
	deviceCounts: Dictionary<string, number>;
}

export const deviceInitialState: TopologyDeviceState = {
	devices: {},
	deviceNames: new Set(),
	deviceCounts: {},
};

export interface TopologyDeviceActions {
	addDevice: (device: string, pos: Position) => void;
	updateDevice: (id: string, update: Partial<LabDeviceNode>) => void;
}

export const createDeviceSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyDeviceActions
> = (set, get) => ({
	addDevice: (deviceId, pos) => {
		const { templates, deviceCounts, deviceNames, devices, actions } = get();

		const template = templates.get(deviceId);
		if (!template) return;

		const id = crypto.randomUUID();
		const count = (deviceCounts[deviceId] || 0) + 1;
		const name = `${template.name} ${count}`;

		actions.select({ devices: [id] });

		const newDeviceNames = new Set(deviceNames);
		newDeviceNames.add(name);

		const newDeviceCounts = { ...deviceCounts };
		newDeviceCounts[deviceId] = count;

		const newDevices = { ...devices };
		newDevices[id] = {
			name,
			deviceId,
			edges: {},
			groupIds: [],
			resources: {},
			x: snapToGrid(pos.x - DEVICE_WIDTH / 2),
			y: snapToGrid(pos.y - DEVICE_HEIGHT / 2),
		};

		set({
			deviceNames: newDeviceNames,
			deviceCounts: newDeviceCounts,
			devices: {
				...devices,
				[id]: {
					name,
					deviceId,
					edges: {},
					groupIds: [],
					resources: {},
					x: snapToGrid(pos.x - DEVICE_WIDTH / 2),
					y: snapToGrid(pos.y - DEVICE_HEIGHT / 2),
				},
			},
		});
	},
	updateDevice: (id, update) => {
		const { devices, deviceNames } = get();
		const device = devices[id];
		if (!device) return;

		const nameChanged =
			update.name !== undefined && update.name !== device.name;

		const newDeviceNames = nameChanged ? new Set(deviceNames) : deviceNames;
		if (nameChanged && update.name) {
			newDeviceNames.delete(device.name);
			newDeviceNames.add(update.name);
		}

		set({
			deviceNames: newDeviceNames,
			devices: {
				...devices,
				[id]: { ...device, ...update },
			},
		});
	},
});
