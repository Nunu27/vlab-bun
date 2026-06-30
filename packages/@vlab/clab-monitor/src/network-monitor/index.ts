import type { NetworkMonitor } from "../types";
import { healthyStatus } from "../utils";

import linux from "./linux";
import mikrotik_ros from "./mikrotik_ros";

const waiters = new Map<string, () => void>();
const monitors: Partial<Record<string, NetworkMonitor>> = {
	linux,
	mikrotik_ros,
};

export default {
	checkAccess(ctx, node) {
		const handler = monitors[node.deviceKind];

		if (!handler?.checkAccess) {
			return true;
		}

		return handler.checkAccess(ctx, node);
	},
	start(ctx, container, node) {
		const { logger } = ctx;
		const handler = monitors[node.deviceKind];

		if (node.isTemp) {
			return logger.debug("Skipping network monitor for temp node %s", node.id);
		}

		if (!handler) {
			return logger.warn(
				"No network monitor found for device kind %s",
				node.deviceKind,
			);
		}

		const startWaiting = () => {
			const cancel = ctx.waitForHealth(
				node.id,
				async () => {
					handler.start(ctx, container, node);
					waiters.delete(node.id);
				},
				undefined,
				() => {
					logger.warn(
						"Node %s did not become healthy in time, retrying wait...",
						node.id,
					);
					startWaiting();
				},
			);

			waiters.set(node.id, cancel);
		};

		startWaiting();
	},
	stop(ctx, node) {
		const { logger } = ctx;
		const handler = monitors[node.deviceKind];

		if (!handler) {
			logger.warn(
				"No network monitor found for device kind %s",
				node.deviceKind,
			);
			return;
		}

		const cancel = waiters.get(node.id);
		if (cancel) {
			cancel();
			waiters.delete(node.id);
		}

		ctx.logger.debug("Stopping network monitor for node %s", node.id);
		return handler.stop(ctx, node);
	},
	extractInterfaces(ctx, container, node) {
		const { logger } = ctx;
		const handler = monitors[node.deviceKind];

		if (!handler) {
			logger.warn(
				"No network monitor found for device kind %s",
				node.deviceKind,
			);
			return {};
		} else if (!healthyStatus.has(node.health)) {
			logger.debug(
				"The node %s is not healthy. Skipping network interface extraction.",
				node.id,
			);
			return {};
		}

		return handler.extractInterfaces(ctx, container, node);
	},
} satisfies NetworkMonitor;
