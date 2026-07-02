import type { NetworkMonitor } from "../types";
import { healthyStatus } from "../utils";

import linux from "./linux";
import mikrotik_ros from "./mikrotik_ros";

const monitors: Partial<Record<string, NetworkMonitor>> = {
	linux,
	mikrotik_ros,
};

export default {
	start(ctx, container, node) {
		const { logger } = ctx;
		const handler = monitors[node.deviceKind];

		if (!handler) {
			return logger.warn(
				"No network monitor found for device kind %s",
				node.deviceKind,
			);
		}

		if (!healthyStatus.has(node.health)) {
			logger.debug(
				"The node %s is not healthy. Skipping network monitor start.",
				node.id,
			);
			return;
		}

		return handler.start(ctx, container, node);
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
