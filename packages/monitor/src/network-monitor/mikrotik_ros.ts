import type { NetworkMonitor } from "../types";

// TODO: Implement MikroTik ROS network monitoring
export default {
	start() {
		throw new Error("Not implemented");
	},
	stop() {
		throw new Error("Not implemented");
	},
	extractInterfaces() {
		throw new Error("Not implemented");
	}
} satisfies NetworkMonitor;
