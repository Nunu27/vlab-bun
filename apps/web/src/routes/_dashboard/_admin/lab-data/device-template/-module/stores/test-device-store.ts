import { createScopedStore } from "@jawit/zustand-helper/react";
import type { Store } from "@jawit/zustand-helper/types";
import type { LogEntry, LogLevel } from "@web/components/log-viewer";
import { create } from "zustand";

interface TestDeviceState {
	open: boolean;
	token: string | undefined;
	dispose: VoidFunction | undefined;
	logs: LogEntry[];
	activeTab: string;
	suggestedStats: { cpuCores: number; memoryMB: number } | undefined;
}

interface TestDeviceActions {
	log: (type: LogLevel, message: string) => void;
	setOpen: (open: boolean) => void;
	setToken: (token: string) => void;
	setDispose: (dispose: VoidFunction) => void;
	setTab: (tab: string) => void;
	setSuggestedStats: (
		stats: { cpuCores: number; memoryMB: number } | undefined,
	) => void;
	reset: () => void;
}

type TestDeviceStore = Store<TestDeviceState, TestDeviceActions>;

const initialState: TestDeviceState = {
	open: false,
	token: undefined,
	dispose: undefined,
	logs: [],
	activeTab: "logs",
	suggestedStats: undefined,
};

const { Provider, useContext } = createScopedStore(() =>
	create<TestDeviceStore>()((set, get) => ({
		...initialState,
		actions: {
			log: (type, message) =>
				set((state) => ({
					logs: [...state.logs, { type, message }],
				})),
			setOpen: (open) => {
				if (open) return set({ open });
				else {
					get().actions.reset();
				}
			},
			setToken: (token) => set({ token, activeTab: "desktop" }),
			setDispose: (dispose) => set({ dispose }),
			setTab: (tab) => set({ activeTab: tab }),
			setSuggestedStats: (stats) => set({ suggestedStats: stats }),
			reset: () => {
				const dispose = get().dispose;
				if (dispose) dispose();
				set({ ...initialState });
			},
		},
	})),
);

export const TestDeviceStoreProvider = Provider;
export const useTestDeviceStore = useContext;
