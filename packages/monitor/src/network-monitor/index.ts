import type { DeviceKind } from "@vlab/shared/enums";
import type { NetworkMonitor } from "../types";

import linux from "./linux";
import mikrotik_ros from "./mikrotik_ros";

const monitors: Partial<Record<DeviceKind, NetworkMonitor>> = {
	linux,
	mikrotik_ros
};

export default {
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

		return handler.start(ctx, container, node);
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
		}

		return handler.extractInterfaces(ctx, container, node);
	}
} satisfies NetworkMonitor;
