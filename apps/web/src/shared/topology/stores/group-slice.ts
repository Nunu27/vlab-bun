import type { LabGroupNode } from "@vlab/shared/schemas/lab";
import { getFirst, getRandom } from "@web/lib/utils";
import type { StateCreator } from "zustand";
import { GROUP_COLORS } from "../constants";
import type { Dictionary } from "../types";
import { calculateGroupDimensions } from "../utils";
import type { TopologyStore } from ".";

export interface TopologyGroupState {
	groups: Dictionary<string, LabGroupNode>;
}

export const groupInitialState: TopologyGroupState = {
	groups: {},
};

export interface TopologyGroupActions {
	updateGroup: (id: string, update: Partial<LabGroupNode>) => void;

	group: () => void;
	ungroup: () => void;
}

export const createGroupSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyGroupActions
> = (set, get) => ({
	updateGroup: (id, update) => {
		const { groups } = get();
		const group = groups[id];
		if (!group) return;

		const newGroups = { ...groups };
		newGroups[id] = { ...group, ...update };
		set({ groups: newGroups });
	},

	group: () => {
		const { selectedDevices, devices, groups } = get();

		if (!selectedDevices.size) return;

		const id = crypto.randomUUID();
		const members = Array.from(selectedDevices);

		const newDevices = { ...devices };
		members.forEach((deviceId) => {
			const device = newDevices[deviceId];
			if (!device) return;

			newDevices[deviceId] = {
				...device,
				groupIds: [...device.groupIds, id],
			};
		});

		const newGroups = { ...groups };
		newGroups[id] = {
			name: "Group-" + (Object.keys(newGroups).length + 1),
			color: getRandom(GROUP_COLORS),
			members,
			...calculateGroupDimensions(members, newDevices),
		};

		set({
			devices: newDevices,
			groups: newGroups,
			selectedGroups: new Set([id]),
		});
	},
	ungroup: () => {
		const {
			selectedDevices,
			selectedGroups,
			selectedNotes,
			selectedEdges,
			groups,
			devices,
		} = get();

		const selectCount =
			selectedGroups.size + selectedNotes.size + selectedEdges.size;

		if (selectCount !== 1) return;
		if (!selectedGroups.size) return;

		const groupId = getFirst(selectedGroups);
		if (!groupId) return;

		const group = groups[groupId];
		if (!group) return;

		const allDeviceSelected = group.members.every((deviceId) =>
			selectedDevices.has(deviceId),
		);

		if (!allDeviceSelected) return;

		const newDevices = { ...devices };
		const newGroups = { ...groups };

		selectedGroups.forEach((groupId) => {
			const group = newGroups[groupId];
			if (!group) return;

			group.members.forEach((deviceId) => {
				const device = newDevices[deviceId];
				if (!device) return;

				newDevices[deviceId] = {
					...device,
					groupIds: device.groupIds.filter((id) => id !== groupId),
				};
			});

			delete newGroups[groupId];
		});

		set({
			devices: newDevices,
			groups: newGroups,
			selectedGroups: new Set(),
		});
	},
});
