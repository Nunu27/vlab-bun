import type { ExtractTreatyData } from "@jawit/query/types";
import { createScopedStore } from "@jawit/zustand-helper/react";
import type { DeviceKind } from "@vlab/shared/enums";
import type { LabChecksMap } from "@vlab/shared/schemas/lab";
import type api from "@web/lib/api";
import { create } from "zustand";

interface LabChecksEditorStore {
	nodes: { label: string; value: string }[];
	kindMapping: Record<string, DeviceKind>;
	evaluator: ExtractTreatyData<typeof api.evaluator.list.get>;
	checks?: LabChecksMap;
}

const { Provider, useContext } = createScopedStore(
	(state: LabChecksEditorStore) =>
		create<LabChecksEditorStore>()(() => ({
			...state,
		})),
);

export const LabChecksEditorProvider = Provider;
export const useLabChecksEditorStore = useContext;
