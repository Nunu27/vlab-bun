import type { StateCreator } from "zustand";
import { DEVICE_HEIGHT, DEVICE_WIDTH } from "../constants";
import type { BoundingBox, Position } from "../types";
import { getBoundingBoxCenter, isInBoundingBox } from "../utils";
import type { TopologyStore } from ".";
import { checkNote } from "./note-slice";

export type SelectState = {
	start: Position;
	current: Position;
};

type SelectionParams = {
	devices?: string[];
	groups?: string[];
	notes?: string[];
	edges?: string[];
};

export interface TopologyNodeSelectState {
	selectState: SelectState | null;
	selectedDevices: Set<string>;
	selectedGroups: Set<string>;
	selectedNotes: Set<string>;
	selectedEdges: Set<string>;
}

export const nodeSelectInitialState: TopologyNodeSelectState = {
	selectState: null,
	selectedDevices: new Set(),
	selectedGroups: new Set(),
	selectedNotes: new Set(),
	selectedEdges: new Set(),
};

export interface TopologyNodeSelectActions {
	setSelectState: (start: Position | null) => void;
	onSelect: (pos: Position) => boolean;

	select: (selection: SelectionParams) => void;
	addSelection: (selection: SelectionParams) => void;
	removeSelection: (selection: SelectionParams) => void;
	clearSelection: () => void;
}

export const createNodeSelectSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyNodeSelectActions
> = (set, get) => ({
	setSelectState: (start) => {
		const {
			mode,
			selectState,
			editingNoteId,
			devices,
			groups,
			notes,
			actions,
		} = get();
		if (mode !== "select") return;
		if (!!selectState === !!start) return;

		if (start) {
			actions.clearSelection();
			set({ selectState: { start, current: start } });
		} else if (selectState) {
			const { start, current } = selectState;
			const selectionBox: BoundingBox = {
				x1: Math.min(start.x, current.x),
				y1: Math.min(start.y, current.y),
				x2: Math.max(start.x, current.x),
				y2: Math.max(start.y, current.y),
			};

			const groupsToCheck = new Set<string>();

			const selectedDevices = new Set<string>();
			const selectedGroups = new Set<string>();
			const selectedNotes = new Set<string>();

			Object.entries(devices).forEach(([id, device]) => {
				if (!device) return;

				const { x, y } = device;
				const center = getBoundingBoxCenter({
					x1: x,
					y1: y,
					x2: x + DEVICE_WIDTH,
					y2: y + DEVICE_HEIGHT,
				});

				if (!isInBoundingBox(selectionBox, center)) return;

				selectedDevices.add(id);
				device.groupIds.forEach((groupId) => {
					groupsToCheck.add(groupId);
				});
			});
			groupsToCheck.forEach((id) => {
				const group = groups[id];
				const selected = group?.members.every((deviceId) =>
					selectedDevices.has(deviceId),
				);
				if (!selected) return;

				selectedGroups.add(id);
			});
			Object.entries(notes).forEach(([id, note]) => {
				if (!note) return;

				const { x, y } = note;
				if (!isInBoundingBox(selectionBox, { x, y })) return;

				selectedNotes.add(id);
			});

			set({
				selectState: null,

				selectedDevices,
				selectedGroups,
				selectedNotes,
				selectedEdges: new Set(),

				notes: checkNote(notes, editingNoteId),
			});
		}
	},
	onSelect: (pos) => {
		const { selectState } = get();
		if (!selectState) return false;

		set({ selectState: { ...selectState, current: pos } });
		return true;
	},

	select: ({ devices = [], groups = [], notes = [], edges = [] }) => {
		const { mode, groups: groupsData, notes: notesData, editingNoteId } = get();
		if (mode !== "select") return;

		const selectedDevices = new Set(devices);
		groups.forEach((groupId) => {
			const group = groupsData[groupId];
			if (!group) return;

			for (const id of group.members) selectedDevices.add(id);
		});

		set({
			notes: checkNote(notesData, editingNoteId),
			selectedDevices,
			selectedGroups: new Set(groups),
			selectedNotes: new Set(notes),
			selectedEdges: new Set(edges),
			editingNoteId: null,
		});
	},
	addSelection: ({ devices = [], groups = [], notes = [], edges = [] }) => {
		const {
			mode,
			selectedDevices,
			selectedGroups,
			selectedNotes,
			selectedEdges,
			groups: groupsData,
			notes: notesData,
			editingNoteId,
		} = get();
		if (mode !== "select") return;

		const newSelectedDevices = new Set(selectedDevices);
		const newSelectedGroups = new Set(selectedGroups);
		const newSelectedNotes = new Set(selectedNotes);
		const newSelectedEdges = new Set(selectedEdges);

		devices.forEach((id) => {
			newSelectedDevices.add(id);
		});
		groups.forEach((id) => {
			newSelectedGroups.add(id);
			const group = groupsData[id];
			if (group) {
				for (const memberId of group.members) newSelectedDevices.add(memberId);
			}
		});
		notes.forEach((id) => {
			newSelectedNotes.add(id);
		});
		edges.forEach((id) => {
			newSelectedEdges.add(id);
		});

		set({
			notes: checkNote(notesData, editingNoteId),
			selectedDevices: newSelectedDevices,
			selectedGroups: newSelectedGroups,
			selectedNotes: newSelectedNotes,
			selectedEdges: newSelectedEdges,
			editingNoteId: null,
		});
	},
	removeSelection: ({ devices = [], groups = [], notes = [], edges = [] }) => {
		const {
			mode,
			selectedDevices,
			selectedGroups,
			selectedNotes,
			selectedEdges,
			groups: groupsData,
			devices: devicesData,
			notes: notesData,
			editingNoteId,
		} = get();
		if (mode !== "select") return;

		const newSelectedDevices = new Set(selectedDevices);
		const newSelectedGroups = new Set(selectedGroups);
		const newSelectedNotes = new Set(selectedNotes);
		const newSelectedEdges = new Set(selectedEdges);

		devices.forEach((id) => {
			newSelectedDevices.delete(id);
			// If this device belongs to a selected group, that group is no longer
			// fully selected — remove it to keep the invariant intact.
			const device = devicesData[id];
			if (device) {
				for (const groupId of device.groupIds)
					newSelectedGroups.delete(groupId);
			}
		});
		groups.forEach((id) => {
			newSelectedGroups.delete(id);
			const group = groupsData[id];
			if (group) {
				for (const memberId of group.members)
					newSelectedDevices.delete(memberId);
			}
		});
		notes.forEach((id) => {
			newSelectedNotes.delete(id);
		});
		edges.forEach((id) => {
			newSelectedEdges.delete(id);
		});

		set({
			notes: checkNote(notesData, editingNoteId),
			selectedDevices: newSelectedDevices,
			selectedGroups: newSelectedGroups,
			selectedNotes: newSelectedNotes,
			selectedEdges: newSelectedEdges,
			editingNoteId: null,
		});
	},
	clearSelection: () => {
		const { notes, editingNoteId } = get();

		set({
			selectedDevices: new Set(),
			selectedGroups: new Set(),
			selectedNotes: new Set(),
			selectedEdges: new Set(),

			notes: checkNote(notes, editingNoteId),

			editingNoteId: null,
			selectState: null,
		});
	},
});
