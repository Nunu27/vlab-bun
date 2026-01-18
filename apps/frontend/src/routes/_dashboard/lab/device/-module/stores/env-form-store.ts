import { createScopedStore } from '@frontend/helper/store';
import type { Store } from '@frontend/types/store';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type EnvEntry = { id: string; key: string; value: string };

interface TestDeviceState {
  value: Record<string, string>;
  entries: EnvEntry[];
  keyCounts: Map<string, number>;
  emptyIds: Set<string>;
}

interface TestDeviceActions {
  addEntry: () => void;
  removeEntry: (index: number) => void;
  updateEntry: (index: number, entry: EnvEntry) => void;
  setValue: (value: Record<string, string>) => void;
}

type TestDeviceStore = Store<TestDeviceState, TestDeviceActions>;

const initialState: TestDeviceState = {
  value: {},
  entries: [],
  keyCounts: new Map(),
  emptyIds: new Set(),
};

const { Provider, useContext } = createScopedStore(() =>
  create<TestDeviceStore>()(
    immer((set) => ({
      ...initialState,
      actions: {
        addEntry: () =>
          set((state) => {
            const key = `ENV_${state.entries.length}`;
            const value = '';

            state.entries.push({
              id: crypto.randomUUID(),
              key,
              value,
            });
            state.value[key] = value;
            state.keyCounts.set(key, (state.keyCounts.get(key) || 0) + 1);
          }),
        removeEntry: (index) =>
          set((state) => {
            const { id, key } = state.entries[index];

            state.emptyIds.delete(id);
            state.entries.splice(index, 1);
            state.keyCounts.set(key, (state.keyCounts.get(key) || 1) - 1);
            delete state.value[key];
          }),
        updateEntry: (index, entry) =>
          set((state) => {
            const { id, key } = state.entries[index];

            if (entry.key !== key) {
              delete state.value[key];

              if (entry.key === '') {
                state.emptyIds.add(id);
              } else {
                state.emptyIds.delete(id);
              }

              state.keyCounts.set(key, (state.keyCounts.get(key) || 1) - 1);
              state.keyCounts.set(
                entry.key,
                (state.keyCounts.get(entry.key) || 0) + 1,
              );
            }

            state.entries[index] = entry;
            state.value[entry.key] = entry.value;
          }),
        setValue: (value) => {
          const keyCounts = new Map<string, number>();
          const entries = Object.entries(value).map(([key, value]) => {
            keyCounts.set(key, (keyCounts.get(key) || 0) + 1);

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
  ),
);

export const EnvFormStoreProvider = Provider;
export const useEnvFormStore = useContext;
