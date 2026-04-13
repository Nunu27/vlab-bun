import type { StateCreator } from "zustand";
import type { Dictionary, Position } from "../types";
import { calculateGroupDimensions, snapToGrid } from "../utils";
import type { TopologyStore } from ".";
import type { NodeIdentifier } from "./node-slice";

export type DragState = {
	start: Position;
	nodesPos: Dictionary<string, Position>;
};

export interface TopologyNodeDragState {
	dragState: DragState | null;
}

export const dragInitialState: TopologyNodeDragState = {
	dragState: null,
};

export interface TopologyNodeDragActions {
	applyPos: (transform: (id: string) => Position) => void;

	setDragState: (start: Position | null, source?: NodeIdentifier) => void;
	onDrag: (pos: Position) => void;
}

export const createNodeDragSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyNodeDragActions
> = (set, get) => ({
	applyPos: (transform) => {
		const { selectedDevices, selectedNotes, devices, notes, groups } = get();

		const newDevices = { ...devices };
		const newNotes = { ...notes };
		const newGroups = { ...groups };
		const groupsToUpdate = new Set<string>();

		selectedDevices.forEach((id) => {
			const pos = transform(id);
			const device = devices[id];
			if (!device) return;

			newDevices[id] = { ...device, ...pos };
			device.groupIds.forEach((groupId) => {
				groupsToUpdate.add(groupId);
			});
		});

		selectedNotes.forEach((id) => {
			const pos = transform(id);
			const note = newNotes[id];
			if (!note) return;

			newNotes[id] = { ...note, ...pos };
		});

		groupsToUpdate.forEach((groupId) => {
			const group = groups[groupId];
			if (!group) return;

			newGroups[groupId] = {
				...group,
				...calculateGroupDimensions(group.members, newDevices),
			};
		});

		set({ devices: newDevices, notes: newNotes, groups: newGroups });
	},

	setDragState: (start, source) => {
		const {
			mode,
			dragState,
			devices,
			notes,
			selectedDevices,
			selectedGroups,
			selectedNotes,
			actions,
			editingNoteId,
		} = get();

		if (mode !== "select") return;
		if (!!dragState === !!start) return;
		if (source?.id === editingNoteId) return;

		if (source) {
			const lookup: Record<NodeIdentifier["type"], Set<string>> = {
				device: selectedDevices,
				group: selectedGroups,
				note: selectedNotes,
			};

			if (!lookup[source.type].has(source.id)) {
				actions.select({ [`${source.type}s`]: [source.id] });
				return actions.setDragState(start, source);
			}
		}

		const nodesPos: Record<string, Position | undefined> = {};

		selectedDevices.forEach((id) => {
			const device = devices[id];
			if (!device) return;

			nodesPos[id] = { x: device.x, y: device.y };
		});

		selectedNotes.forEach((id) => {
			const note = notes[id];
			if (!note) return;

			nodesPos[id] = { x: note.x, y: note.y };
		});

		if (start) {
			set({ dragState: { start, nodesPos } });
		} else {
			actions.applyPos((id) => {
				const pos = nodesPos[id];
				if (!pos) return { x: 0, y: 0 };

				return {
					x: snapToGrid(pos.x),
					y: snapToGrid(pos.y),
				};
			});

			set({ dragState: null });
		}
	},
	onDrag: (pos) => {
		const { view, dragState, actions } = get();

		if (!dragState) return;
		const { start, nodesPos } = dragState;

		const dX = (pos.x - start.x) / view.scale;
		const dY = (pos.y - start.y) / view.scale;

		actions.applyPos((id) => {
			const nodePos = nodesPos[id];
			if (!nodePos) return { x: 0, y: 0 };

			return { x: nodePos.x + dX, y: nodePos.y + dY };
		});
	},
});
