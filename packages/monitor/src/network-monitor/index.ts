import type { DeviceKind } from "@vlab/shared/enums";
import type { NetworkMonitor } from "../types";

import linux from "./linux";
import mikrotik_ros from "./mikrotik_ros";
import { healthyStatus } from "../utils";

const waiters = new Map<string, () => void>();
const monitors: Partial<Record<DeviceKind, NetworkMonitor>> = {
	linux,
	mikrotik_ros
};

export const getPorts = (kind: DeviceKind) => {
	return monitors[kind]?.ports ?? [];
};

export default {
	checkAccess(ctx, node) {
		const handler = monitors[node.deviceKind];

		if (!handler || !handler.checkAccess) {
			return true;
		}

		return handler.checkAccess(ctx, node);
	},
	start(ctx, container, node) {
		const { logger } = ctx;
		const handler = monitors[node.deviceKind];

		if (!handler) {
			logger.warn(
				"No network monitor found for device kind %s",
				node.deviceKind
			);
			return;
		}

		const cancel = ctx.waitForHealth(node.id, async () => {
			handler.start(ctx, container, node);
			waiters.delete(node.id);
		});

		waiters.set(node.id, cancel);
	},
	stop(ctx, node) {
		const { logger } = ctx;
		const handler = monitors[node.deviceKind];

		if (!handler) {
			logger.warn(
				"No network monitor found for device kind %s",
				node.deviceKind
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
				node.deviceKind
			);
			return {};
		} else if (!healthyStatus.has(node.health)) {
			logger.debug(
				"The node %s is not healthy. Skipping network interface extraction.",
				node.id
			);
			return {};
		}

		return handler.extractInterfaces(ctx, container, node);
	}
} satisfies NetworkMonitor;
