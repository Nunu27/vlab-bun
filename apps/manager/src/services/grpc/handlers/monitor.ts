import EventEmitter from "node:events";
import db from "@manager/db";
import { labSessionNodes } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import { cache } from "@manager/services/http/middlewares/caching";
import ws from "@manager/services/ws";
import type { TempNodeEvents } from "@manager/types/clab";
import type { TypedEventEmitter } from "@manager/types/events";
import Debouncer from "@manager/utils/debouncer";
import type { appRouter } from "@vlab/grpc";
import { eq } from "drizzle-orm";

const logger = baseLogger.child({ service: "monitor-grpc" });

export const tempNodeEvents: TypedEventEmitter<TempNodeEvents> =
	new EventEmitter();

const interfaceDebounce = new Debouncer(750);

export function attachMonitorHandlers(
	workerId: string,
	client: ReturnType<typeof appRouter.buildClient>,
) {
	client.onData("monitor:node-health", {
		callback: async ({ id, lab, health }) => {
			if (lab.startsWith("test-")) {
				tempNodeEvents.emit(`${id}:health`, health);
				return;
			}

			try {
				await db
					.update(labSessionNodes)
					.set({ health })
					.where(eq(labSessionNodes.id, id));

				await cache.delete(`lab:*:lab-session:${lab}`);

				ws.server.emit("node:[id]:health", {
					params: { id },
					data: health,
				});
			} catch (err) {
				logger.error(
					{ err, nodeId: id, workerId },
					"Failed to process node-health event",
				);
			}
		},
	});

	client.onData("monitor:interface-update", {
		callback: async ({ id, lab, interfaces }) => {
			if (lab.startsWith("test-")) return;

			try {
				for (const [iface, ips] of Object.entries(interfaces)) {
					ws.server.emit("node:[id]:interfaces:[interface]", {
						params: { id, interface: iface },
						data: ips,
					});
				}

				await interfaceDebounce.run(id, async () => {
					await db
						.update(labSessionNodes)
						.set({ interfaces })
						.where(eq(labSessionNodes.id, id));

					await cache.delete(`lab:*:lab-session:${lab}`);
				});
			} catch (err) {
				logger.error(
					{ err, nodeId: id, workerId },
					"Failed to process interface-update event",
				);
			}
		},
	});
}
