import { createScopedStore } from "@jawit/zustand-helper/react";
import type { Store } from "@jawit/zustand-helper/types";
import { create } from "zustand";

export type LogLevel = "info" | "warn" | "error";
export type LogEntry = { type: LogLevel; message: string };

interface TestDeviceState {
	open: boolean;
	token: string | undefined;
	dispose: VoidFunction | undefined;
	logs: LogEntry[];
	activeTab: string;
}

interface TestDeviceActions {
	log: (type: LogLevel, message: string) => void;
	setOpen: (open: boolean) => void;
	setToken: (token: string) => void;
	setDispose: (dispose: VoidFunction) => void;
	setTab: (tab: string) => void;
	reset: () => void;
}

type TestDeviceStore = Store<TestDeviceState, TestDeviceActions>;

const initialState: TestDeviceState = {
	open: false,
	token: undefined,
	dispose: undefined,
	logs: [],
	activeTab: "logs",
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
