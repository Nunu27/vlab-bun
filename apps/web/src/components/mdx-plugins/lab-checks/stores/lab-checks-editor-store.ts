import { createScopedStore } from "@jawit/zustand-helper/react";
import type { DeviceKind } from "@vlab/shared/enums";
import type { LabChecksMap } from "@vlab/shared/schemas";
import { create } from "zustand";

interface LabChecksEditorStore {
	nodes: { label: string; value: string }[];
	kindMapping: Record<string, DeviceKind>;
	evaluator: {
		handlers: Record<string, { kinds: string[]; checks: string[] }>;
		// biome-ignore lint/suspicious/noExplicitAny: AutoForm expects any JSON schema
		checks: Record<string, { name: string; params: any }>;
	};
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
