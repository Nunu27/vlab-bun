import { createScopedStore } from "@jawit/zustand-helper/react";
import type { Store } from "@jawit/zustand-helper/types";
import { create } from "zustand";

export type ConnectionState =
	| "connecting"
	| "connected"
	| "error"
	| "disconnected";

interface GuacamoleConnectionState {
	state: ConnectionState | undefined;
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
	state: undefined,
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
	create<GuacamoleConnectionStore>((set, get) => ({
		...initialState,

		actions: {
			setState: (state) =>
				set({ state, isConnected: connectionMapByState[state] }),
			setError: (errorMessage) => {
				if (!get().state) return;

				return set({
					errorMessage,
					state: "error",
					isConnected: false,
					hasError: true,
				});
			},
			setConnected: (isConnected) => set({ isConnected }),
			setHasError: (hasError) => set({ hasError }),
			reset: () => set({ ...initialState }),
		},
	})),
);

export const GuacamoleConnectionProvider = Provider;
export const useGuacamoleConnectionStore = useContext;
