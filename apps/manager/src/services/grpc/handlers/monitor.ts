import EventEmitter from "node:events";
import db from "@manager/db";
import { deviceTemplates, labSessionNodes } from "@manager/db/schema";
import baseLogger from "@manager/lib/logger";
import guacamole from "@manager/services/guacamole-lite";
import { cache } from "@manager/services/http/middlewares/caching";
import ws from "@manager/services/ws";
import type { TempNodeEvents } from "@manager/types/clab";
import type { TypedEventEmitter } from "@manager/types/events";
import Debouncer from "@manager/utils/debouncer";
import type { appRouter } from "@vlab/grpc";
import type { NodeHealth } from "@vlab/shared/enums";
import { eq } from "drizzle-orm";

const logger = baseLogger.child({ service: "monitor-grpc" });

export const tempNodeEvents: TypedEventEmitter<TempNodeEvents> =
	new EventEmitter();

const interfaceDebounce = new Debouncer(750);

export function attachMonitorHandlers(
	workerId: string,
	client: ReturnType<typeof appRouter.buildClient>,
	guacdHost: string,
	guacdPort: number,
) {
	client.onData("monitor:node-health", {
		callback: async (event) => {
			const { node } = event;
			const health =
				node.health === "none" ? null : (node.health as NodeHealth | null);

			tempNodeEvents.emit(`${node.id}:health`, health);

			if (!node.labSessionId) return;

			try {
				await db
					.update(labSessionNodes)
					.set({ health })
					.where(eq(labSessionNodes.id, node.id));

				await cache.delete(`lab:*:lab-session:${node.labSessionId}`);

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

	client.onData("monitor:node-redeployed", {
		callback: async (event) => {
			const { node } = event;

			try {
				const [info] = await db
					.select({
						connection: deviceTemplates.connection,
						kind: deviceTemplates.kind,
					})
					.from(labSessionNodes)
					.innerJoin(
						deviceTemplates,
						eq(labSessionNodes.deviceTemplateId, deviceTemplates.id),
					)
					.where(eq(labSessionNodes.id, node.id))
					.limit(1);

				if (!info) {
					logger.error(
						{ nodeId: node.id, workerId },
						"Redeployed node not found for token regeneration",
					);
					return;
				}

				const token = guacamole.generateNodeToken(
					info.connection,
					info.kind,
					node.ip,
					guacdHost,
					guacdPort,
				);

				await db
					.update(labSessionNodes)
					.set({ ip: node.ip, containerId: node.containerId, token })
					.where(eq(labSessionNodes.id, node.id));

				await cache.delete(`lab:*:lab-session:${node.labSessionId}`);
			} catch (err) {
				logger.error(
					{ err, nodeId: node.id, workerId },
					"Failed to process node-redeployed event",
				);
			}
		},
	});
}
