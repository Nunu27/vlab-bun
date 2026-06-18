import type { StateCreator } from "zustand";
import { calculateGroupDimensions } from "../utils";
import type { TopologyStore } from ".";

import {
	createNodeDragSlice,
	dragInitialState,
	type TopologyNodeDragActions,
	type TopologyNodeDragState,
} from "./node-drag-slice";
import {
	createNodeSelectSlice,
	nodeSelectInitialState,
	type TopologyNodeSelectActions,
	type TopologyNodeSelectState,
} from "./node-select-slice";

// Re-export from sub-slices
export type { TopologyNodeDragState, TopologyNodeSelectState };
export { dragInitialState, nodeSelectInitialState };

export type NodeIdentifier = {
	id: string;
	type: "device" | "note" | "group" | "edge";
};

export interface TopologyNodeState
	extends TopologyNodeSelectState,
		TopologyNodeDragState {}

export const nodeInitialState: TopologyNodeState = {
	...nodeSelectInitialState,
	...dragInitialState,
};

export interface TopologyNodeActions
	extends TopologyNodeSelectActions,
		TopologyNodeDragActions {
	delete: () => void;
}

export const createNodeSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyNodeActions
> = (...a) => ({
	delete: async () => {
		const state = a[1]();
		const deviceIds = Array.from(state.selectedDevices);

		if (state.onBeforeDelete && deviceIds.length > 0) {
			const shouldDelete = await state.onBeforeDelete(deviceIds);
			if (!shouldDelete) return;
		}

		const devices = { ...state.devices };
		const groups = { ...state.groups };
		const notes = { ...state.notes };
		const edges = { ...state.edges };
		const deviceNames = new Set(state.deviceNames);

		const groupsToUpdate = new Set<string>();

		const deleteEdge = (id: string) => {
			const edge = edges[id];
			if (!edge) return;

			edge.forEach(({ deviceId }) => {
				const device = devices[deviceId];
				if (!device) return;

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [id]: _removed, ...restEdges } = device.edges;
				devices[deviceId] = { ...device, edges: restEdges };
			});

			delete edges[id];
		};

		const deleteDevice = (id: string) => {
			const device = devices[id];
			if (!device) return;

			const { name, groupIds, edges: edgeIds } = device;

			delete devices[id];
			deviceNames.delete(name);

			groupIds.forEach((groupId) => {
				const group = groups[groupId];
				if (!group) return;

				const members = group.members.filter((memberId) => memberId !== id);
				groups[groupId] = { ...group, members };
				groupsToUpdate.add(groupId);
			});
			Object.keys(edgeIds).forEach(deleteEdge);
		};

		state.selectedDevices.forEach(deleteDevice);
		state.selectedNotes.forEach((id) => {
			delete notes[id];
		});

		state.selectedGroups.forEach((id) => {
			const group = groups[id];
			if (!group) return;

			const { members } = group;

			delete groups[id];
			members.forEach(deleteDevice);
		});

		groupsToUpdate.forEach((groupId) => {
			const group = groups[groupId];
			if (!group) return;

			const { members } = group;
			if (members.length === 1) {
				delete groups[groupId];
				const device = devices[members[0]];
				if (device) {
					devices[members[0]] = { ...device, groupIds: [] };
				}
			} else {
				groups[groupId] = {
					...group,
					...calculateGroupDimensions(members, devices),
				};
			}
		});

		state.selectedEdges.forEach(deleteEdge);

		a[0]({
			devices: devices,
			groups: groups,
			notes: notes,
			edges: edges,
			deviceNames: deviceNames,
			selectedDevices: new Set(),
			selectedGroups: new Set(),
			selectedNotes: new Set(),
			selectedEdges: new Set(),
			editingNoteId: null,
		});
	},

	...createNodeSelectSlice(...a),
	...createNodeDragSlice(...a),
});
