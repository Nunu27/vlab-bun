import { createScopedStore } from '@frontend/helper/store';
import type { Store } from '@frontend/types/store';
import { create } from 'zustand';

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected';

interface GuacamoleConnectionState {
  state: ConnectionState;
  errorMessage: string | null;
  isConnected: boolean;
  hasError: boolean;
}

interface GuacamoleConnectionActions {
  setState: (state: ConnectionState) => void;
  setError: (message: string) => void;
  setConnected: (connected: boolean) => void;
  setHasError: (hasError: boolean) => void;
  reset: () => void;
}

type GuacamoleConnectionStore = Store<
  GuacamoleConnectionState,
  GuacamoleConnectionActions
>;

const initialState: GuacamoleConnectionState = {
  state: 'connecting',
  errorMessage: null,
  isConnected: false,
  hasError: false,
};

const connectionMapByState: Record<ConnectionState, boolean> = {
  connecting: false,
  connected: true,
  error: false,
  disconnected: false,
};

const { Provider, useContext } = createScopedStore(() =>
  create<GuacamoleConnectionStore>((set) => ({
    ...initialState,

    actions: {
      setState: (state) =>
        set({ state, isConnected: connectionMapByState[state] }),
      setError: (errorMessage) =>
        set({
          errorMessage,
          state: 'error',
          isConnected: false,
          hasError: true,
        }),
      setConnected: (isConnected) => set({ isConnected }),
      setHasError: (hasError) => set({ hasError }),
      reset: () => set({ ...initialState }),
    },
  })),
);

export const GuacamoleConnectionProvider = Provider;
export const useGuacamoleConnectionStore = useContext;
