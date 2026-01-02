import { createSelectors } from '@frontend/lib/utils';
import type { Store } from '@frontend/types/store';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TestDeviceState {
  open: boolean;
  token: string | undefined;
  dispose: VoidFunction | undefined;
  logs: { type: 'info' | 'warn' | 'error'; message: string }[];
  issue: { type: 'warn' | 'error'; message: string }[];
}

interface TestDeviceActions {
  log: (type: 'info' | 'warn' | 'error', message: string) => void;
  setOpen: (open: boolean) => void;
  setToken: (token: string) => void;
  setDispose: (dispose?: () => void) => void;
  reset: VoidFunction;
}

type TestDeviceStore = Store<TestDeviceState, TestDeviceActions>;

const initialState: TestDeviceState = {
  open: false,
  token: undefined,
  dispose: undefined,
  logs: [],
  issue: [],
};

const store = create<TestDeviceStore>()(
  immer((set, get) => ({
    ...initialState,
    actions: {
      log: (type, message) =>
        set((state) => {
          state.logs.push({ type, message });
        }),
      setOpen: (open) => {
        if (open) return set({ open });
        else return get().actions.reset();
      },
      setToken: (token) => set({ token }),
      setDispose: (dispose) => set({ dispose }),
      reset: () =>
        set((state) => {
          state.dispose?.();
          return initialState;
        }),
    },
  })),
);

export const useTestDeviceStore = createSelectors(store);
