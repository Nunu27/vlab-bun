import type { LabNoteNode } from "@vlab/shared/schemas/lab";
import type { StateCreator } from "zustand";
import type { Dictionary, Position } from "../types";
import type { TopologyStore } from ".";

export interface TopologyNoteState {
	notes: Dictionary<string, LabNoteNode>;
	editingNoteId: string | null;
}

export const noteInitialState: TopologyNoteState = {
	notes: {},
	editingNoteId: null,
};

export interface TopologyNoteActions {
	addNote: (position: Position) => void;
	setEditingNoteId: (id: string | null) => void;
	updateNote: (id: string, update: Partial<LabNoteNode>) => void;
}

export const checkNote = (
	notes: Dictionary<string, LabNoteNode>,
	id: string | null,
) => {
	if (!id) return notes;
	const note = notes[id];
	if (!note || note.content.trim()) return notes;
	delete notes[id];

	return notes;
};

export const createNoteSlice: StateCreator<
	TopologyStore,
	[],
	[],
	TopologyNoteActions
> = (set, get) => ({
	addNote: (position) => {
		const { notes, mode, actions } = get();

		if (mode !== "note") return;

		const id = crypto.randomUUID();
		actions.clearSelection();

		position.x -= 15;
		position.y -= 25;

		const newNotes = { ...notes };
		newNotes[id] = {
			...position,
			content: "",
		};

		set({
			editingNoteId: id,
			selectedNotes: new Set([id]),
			notes: newNotes,
		});
	},
	setEditingNoteId: (id) => {
		const { mode, notes, editingNoteId } = get();
		if (mode !== "note") return;

		set({
			notes: checkNote({ ...notes }, editingNoteId),
			editingNoteId: id,
			selectedNotes: id ? new Set([id]) : new Set(),
		});
	},
	updateNote: (id, update) => {
		const { notes } = get();
		const note = notes[id];
		if (!note) return;

		set({
			notes: {
				...notes,
				[id]: { ...note, ...update },
			},
		});
	},
});
