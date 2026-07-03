import { create } from "zustand";

const HISTORY_RETENTION_MS = 2 * 60 * 60 * 1000; // 2 hours

export type MetricsDataPoint = {
	timestamp: number;
	cpuUsagePercent: number;
	memoryUsagePercent: number;
	storageUsagePercent: number;
	usedCpuCores: number;
	totalCpuCores: number;
	usedMemoryMB: number;
	totalMemoryMB: number;
	usedStorageMB: number;
	totalStorageMB: number;
	activeLabs: number;
	activeNodes: number;
};

type MetricsHistoryState = {
	history: MetricsDataPoint[];
	addDataPoint: (point: MetricsDataPoint) => void;
};

export const useMetricsHistoryStore = create<MetricsHistoryState>((set) => ({
	history: [],
	addDataPoint: (point) =>
		set((state) => {
			const cutoff = Date.now() - HISTORY_RETENTION_MS;
			return {
				history: [...state.history, point].filter((p) => p.timestamp >= cutoff),
			};
		}),
}));
