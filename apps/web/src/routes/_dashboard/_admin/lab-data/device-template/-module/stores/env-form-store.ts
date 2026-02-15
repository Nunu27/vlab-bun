import { createScopedStore } from "@jawit/zustand-helper/react";
import type { Store } from "@jawit/zustand-helper/types";
import { removeFromArray } from "@web/lib/utils";
import { create } from "zustand";

export type EnvEntry = { id: string; key: string; value: string };

interface EnvState {
	value: Record<string, string>;
	entries: EnvEntry[];
	keyCounts: Record<string, number>;
	emptyIds: Set<string>;
}

interface EnvActions {
	addEntry: () => void;
	removeEntry: (index: number) => void;
	updateEntry: (index: number, entry: EnvEntry) => void;
	setValue: (value: Record<string, string>) => void;
}

type EnvStore = Store<EnvState, EnvActions>;

const initialState: EnvState = {
	value: {},
	entries: [],
	keyCounts: {},
	emptyIds: new Set(),
};

const { Provider, useContext } = createScopedStore(() =>
	create<EnvStore>()((set) => ({
		...initialState,
		actions: {
			addEntry: () =>
				set((state) => {
					const key = `ENV_${state.entries.length}`;
					const value = "";

					const keyCounts = { ...state.keyCounts };
					keyCounts[key] = (keyCounts[key] || 0) + 1;

					return {
						entries: [
							...state.entries,
							{ id: crypto.randomUUID(), key, value },
						],
						value: { ...state.value, [key]: value },
						keyCounts,
					};
				}),
			removeEntry: (index) =>
				set((state) => {
					const { id, key } = state.entries[index];

					const value = { ...state.value };
					const entries = [...state.entries];
					const emptyIds = new Set(state.emptyIds);
					const keyCounts = { ...state.keyCounts };

					delete value[key];
					removeFromArray(entries, index);
					emptyIds.delete(id);
					keyCounts[key] = (keyCounts[key] || 1) - 1;

					return {
						value,
						entries,
						keyCounts,
						emptyIds,
					};
				}),
			updateEntry: (index, entry) =>
				set((state) => {
					const { id, key } = state.entries[index];
					const value = { ...state.value };
					const entries = [...state.entries];

					const isKeyChange = entry.key !== key;

					const keyCounts = isKeyChange ? { ...state.keyCounts } : undefined;
					const emptyIds = isKeyChange ? new Set(state.emptyIds) : undefined;

					if (keyCounts && emptyIds) {
						delete value[key];

						if (!entry.key.trim()) emptyIds.add(id);
						else emptyIds.delete(id);

						keyCounts[key] = (keyCounts[key] || 1) - 1;
						keyCounts[entry.key] = (keyCounts[entry.key] || 0) + 1;
					}

					value[entry.key] = entry.value;
					entries[index] = entry;

					return {
						value,
						entries,
						keyCounts,
						emptyIds,
					};
				}),
			setValue: (value) => {
				const keyCounts: Record<string, number> = {};
				const entries = Object.entries(value).map(([key, value]) => {
					keyCounts[key] = (keyCounts[key] || 0) + 1;

					return {
						id: crypto.randomUUID(),
						key,
						value,
					};
				});

				return set({
					value,
					entries,
					keyCounts,
				});
			},
		},
	})),
);

export const EnvFormStoreProvider = Provider;
export const useEnvFormStore = useContext;
