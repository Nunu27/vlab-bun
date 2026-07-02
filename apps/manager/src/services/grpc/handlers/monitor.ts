import EventEmitter from "node:events";
import db from "@manager/db";
import { labSessionNodes } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import { cache } from "@manager/services/http/middlewares/caching";
import ws from "@manager/services/ws";
import type { TempNodeEvents } from "@manager/types/clab";
import type { TypedEventEmitter } from "@manager/types/events";
import Debouncer from "@manager/utils/debouncer";
import Throttler from "@manager/utils/throttler";
import type { appRouter } from "@vlab/grpc";
import type { NodeHealth } from "@vlab/shared/enums";
import { eq } from "drizzle-orm";

const logger = baseLogger.child({ service: "monitor-grpc" });

// Populated by the (not-yet-rebuilt) worker-side forwarding of temp-node
// events for device-template test provisioning; see the TODOs in
// apps/worker/src/services/monitor.ts. Kept here so
// domain/device-template/test.ts still has something to await.
export const tempNodeEvents: TypedEventEmitter<TempNodeEvents> =
	new EventEmitter();

const sessionThrottle = new Throttler(1000);
const interfaceDebounce = new Debouncer(750);

export function attachMonitorHandlers(
	workerId: string,
	client: ReturnType<typeof appRouter.buildClient>,
) {
	client.onData("monitor:node-health", {
		callback: async (event) => {
			const { node } = event;
			const health =
				node.health === "none" ? null : (node.health as NodeHealth | null);

			tempNodeEvents.emit(`${node.id}:health`, health);

			if (!node.labSessionId) return;

			try {
				await sessionThrottle.wait(node.labSessionId, {
					id: "health",
					execute: async () => {
						await db
							.update(labSessionNodes)
							.set({ health })
							.where(eq(labSessionNodes.id, node.id));

						await cache.delete(`lab:*:lab-session:${node.labSessionId}`);
					},
				});

				ws.server.emit("node:[id]:health", {
					params: { id: node.id },
					data: health,
				});
			} catch (err) {
				logger.error(
					{ err, nodeId: node.id, workerId },
					"Failed to process node-health event",
				);
			}
		},
	});

	client.onData("monitor:interface-update", {
		callback: async (event) => {
			const { node } = event;

			try {
				for (const [iface, ips] of Object.entries(node.interfaces)) {
					ws.server.emit("node:[id]:interfaces:[interface]", {
						params: { id: node.id, interface: iface },
						data: ips,
					});
				}

				await interfaceDebounce.run(node.id, async () => {
					await db
						.update(labSessionNodes)
						.set({ interfaces: node.interfaces })
						.where(eq(labSessionNodes.id, node.id));

					await cache.delete(`lab:*:lab-session:${node.labSessionId}`);
				});
			} catch (err) {
				logger.error(
					{ err, nodeId: node.id, workerId },
					"Failed to process interface-update event",
				);
			}
		},
	});
}
