import { sleep } from "bun";
import type { NetworkMonitor } from "../types";

import linux from "./linux";
import mikrotik_ros from "./mikrotik_ros";

const handlers: Record<string, NetworkMonitor> = {
	linux,
	mikrotik_ros,
};

const controllers = new Map<string, AbortController>();

export default {
	async read(ctx, nodeCtx) {
		const handler = handlers[nodeCtx.info.kind];

		if (!handler) {
			ctx.logger?.warn(
				{ node: nodeCtx.info },
				"Unsupported node kind for network monitor",
			);
			return {};
		}

		try {
			await ctx.waitForHealth(nodeCtx.info.id, { timeout: 1 });

			ctx.logger?.debug(
				`[network:read] Reading network interfaces for ${nodeCtx.info.id}`,
			);
			const interfaces = await handler.read(ctx, nodeCtx);

			ctx.interfaceMap.set(nodeCtx.info.id, interfaces);
			ctx.emitter.emit("interface-update", nodeCtx.info, interfaces);

			return interfaces;
		} catch (error) {
			ctx.logger?.error(
				{ err: error, node: nodeCtx.info },
				"Failed to read network interfaces",
			);

			return {};
		}
	},
	async start(ctx, nodeCtx) {
		const handler = handlers[nodeCtx.info.kind];

		if (!handler) {
			ctx.logger?.warn(
				{ node: nodeCtx.info },
				"Unsupported node kind for network monitor",
			);
			return;
		}

		while (ctx.nodes.has(nodeCtx.info.id)) {
			try {
				if (controllers.has(nodeCtx.info.id)) return;
				const controller = new AbortController();
				controllers.set(nodeCtx.info.id, controller);

				await ctx.waitForHealth(nodeCtx.info.id, { signal: controller.signal });
				controllers.delete(nodeCtx.info.id);

				ctx.logger?.debug(
					`[network:start] Starting network interfaces for ${nodeCtx.info.id}`,
				);
				await this.read(ctx, nodeCtx);
				await handler.start(ctx, nodeCtx);
			} catch (error) {
				if (!ctx.nodes.has(nodeCtx.info.id)) return;

				await sleep(3_000);

				ctx.logger?.error(
					{ err: error, node: nodeCtx.info },
					"Failed to start network interfaces, retrying...",
				);
			}
		}
	},
	async stop(ctx, nodeCtx) {
		const handler = handlers[nodeCtx.info.kind];

		if (!handler) {
			ctx.logger?.warn(
				{ node: nodeCtx.info },
				"Unsupported node kind for network monitor",
			);
			return;
		}

		try {
			const controller = controllers.get(nodeCtx.info.id);
			ctx.interfaceMap.delete(nodeCtx.info.id);

			if (controller) {
				controller.abort();
				controllers.delete(nodeCtx.info.id);
			} else await handler.stop(ctx, nodeCtx);

			ctx.logger?.debug(
				`[network:stop] Stopped network interfaces for ${nodeCtx.info.id}`,
			);
		} catch (error) {
			ctx.logger?.error(
				{ err: error, node: nodeCtx.info },
				"Failed to stop network interfaces",
			);
		}
	},
	async stopAll(ctx) {
		for (const handler of Object.values(handlers)) {
			await handler.stopAll(ctx);
		}
	},
} satisfies NetworkMonitor;
