import type { ExtractTreatyData } from "@jawit/query/types";
import { createScopedStore } from "@jawit/zustand-helper/react";
import type { Store } from "@jawit/zustand-helper/types";
import type { LabTopology } from "@vlab/shared/schemas/lab";
import type api from "@web/lib/api";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type { NodeData } from "../types";
import {
	createDeviceSlice,
	deviceInitialState,
	type TopologyDeviceActions,
	type TopologyDeviceState,
} from "./device-slice";
import {
	createEdgeSlice,
	edgeInitialState,
	type TopologyEdgeActions,
	type TopologyEdgeState,
} from "./edge-slice";
import {
	createGroupSlice,
	groupInitialState,
	type TopologyGroupActions,
	type TopologyGroupState,
} from "./group-slice";
import {
	createNodeSlice,
	nodeInitialState,
	type TopologyNodeActions,
	type TopologyNodeDragState,
	type TopologyNodeSelectState,
} from "./node-slice";
import {
	checkNote,
	createNoteSlice,
	noteInitialState,
	type TopologyNoteActions,
	type TopologyNoteState,
} from "./note-slice";
import {
	createViewSlice,
	type TopologyViewActions,
	type TopologyViewState,
	viewInitialState,
} from "./view-slice";

type CategorizedTemplates = ExtractTreatyData<
	(typeof api)["device-template"]["list"]["get"]
>[number];
type TemplateCategory = Omit<CategorizedTemplates, "id" | "templates">;
type TemplateItem = Omit<CategorizedTemplates["templates"][number], "id"> & {
	categoryId: string;
};
type TemplateCategories = Map<string, TemplateCategory>;
type Templates = Map<string, TemplateItem>;

export interface TopologyState
	extends TopologyDeviceState,
		TopologyEdgeState,
		TopologyGroupState,
		TopologyNoteState,
		TopologyViewState,
		TopologyNodeSelectState,
		TopologyNodeDragState {
	// Shared data
	sessionId: string | null;
	nodesData: Record<string, NodeData> | null;

	templateCategories: TemplateCategories;
	templates: Templates;

	isEditor: boolean;

	// Shared states
	mode: "select" | "connect" | "note";
	onBeforeDelete?: (deviceIds: string[]) => Promise<boolean> | boolean;
}

const initialState: TopologyState = {
	...nodeInitialState,
	...deviceInitialState,
	...edgeInitialState,
	...groupInitialState,
	...noteInitialState,
	...viewInitialState,

	// Shared data
	sessionId: null,
	nodesData: null,

	templateCategories: new Map(),
	templates: new Map(),

	isEditor: false,

	// Shared states
	mode: "select",
};

export interface TopologyData extends Partial<LabTopology> {
	sessionId?: string;
	nodesData?: Record<string, NodeData>;
	isEditor?: boolean;

	categorizedTemplates: CategorizedTemplates[];
	onBeforeDelete?: (deviceIds: string[]) => Promise<boolean> | boolean;
}

export interface TopologyActions
	extends TopologyNodeActions,
		TopologyDeviceActions,
		TopologyGroupActions,
		TopologyEdgeActions,
		TopologyNoteActions,
		TopologyViewActions {
	toggleMode: (mode: TopologyState["mode"]) => void;
	importTopology: (topology: Partial<LabTopology>) => void;
}

export type TopologyStore = Store<TopologyState, TopologyActions>;

const { Provider, useContext } = createScopedStore(
	({
		categorizedTemplates,
		topology,
		onBeforeDelete,
		...state
	}: Omit<TopologyData, keyof LabTopology> & { topology?: LabTopology }) => {
		const templateCategories = new Map<string, TemplateCategory>();
		const templates = new Map<string, TemplateItem>();
		const deviceNames = new Set<string>();

		categorizedTemplates.forEach(
			({ id: categoryId, templates: categoryTemplates, ...category }) => {
				templateCategories.set(categoryId, category);

				categoryTemplates.forEach(({ id, ...template }) => {
					templates.set(id, { ...template, categoryId });
				});
			},
		);

		if (topology?.devices) {
			Object.values(topology.devices).forEach((device) => {
				deviceNames.add(device.name);
			});
		}

		return create<TopologyStore>()(
			subscribeWithSelector((...a) => ({
				...initialState,
				templateCategories,
				templates,
				deviceNames,
				...topology,
				...state,
				onBeforeDelete,
				actions: {
					toggleMode: (mode) => {
						const { mode: currentMode, notes, editingNoteId, actions } = a[1]();
						actions.clearSelection();

						const newNotes = checkNote(notes, editingNoteId);

						a[0]({
							mode: currentMode === mode ? "select" : mode,
							connectDeviceId: null,
							connectSource: null,
							notes: newNotes,
							editingNoteId: null,
						});
					},
					importTopology: (topology) => {
						const { actions } = a[1]();
						actions.clearSelection();

						a[0]({
							devices: topology.devices ?? {},
							edges: topology.edges ?? {},
							groups: topology.groups ?? {},
							notes: topology.notes ?? {},
							deviceCounts: topology.deviceCounts ?? {},
						});
					},
					...createNodeSlice(...a),
					...createDeviceSlice(...a),
					...createGroupSlice(...a),
					...createEdgeSlice(...a),
					...createNoteSlice(...a),
					...createViewSlice(...a),
				},
			})),
		);
	},
);

export const TopologyStoreProvider = Provider;
export const useTopologyStore = useContext;
