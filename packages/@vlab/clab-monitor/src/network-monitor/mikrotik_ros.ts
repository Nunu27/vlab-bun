import type { Logger } from "pino";
import { type RosApiMenu, RouterOSClient, type RStream } from "routeros-client";
import type { NetworkMonitor } from "../types";
import { removeItemFromArray } from "../utils";

const monitors = new Map<string, RStream>();
const connections = new Map<
	string,
	{ client: RouterOSClient; api: RosApiMenu }
>();
const nodeInterfaceMap = new Map<string, Record<string, string[]>>();
const nodeInterfaceIdMapping = new Map<
	string,
	Record<string, { iface: string; address: string }>
>();

const getApi = async (
	id: string,
	{ logger, ...options }: { host: string; port: number; logger: Logger },
) => {
	const connection = connections.get(id);

	if (!connection) {
		const client = new RouterOSClient({
			...options,
			user: "admin",
			password: "admin",
			keepalive: true,
		});
		const api = await client.connect();

		const cleanup = () => {
			connections.delete(id);
			monitors.delete(id);
			nodeInterfaceIdMapping.delete(id);
		};

		client.on("stop", cleanup);
		client.on("error", (error) => {
			logger.error({ error, id }, "MikroTik ROS client error for node %s", id);
			cleanup();
		});

		connections.set(id, { client, api });
		return api;
	} else return connection.api;
};

export default {
	async checkAccess({ logger }, { id, ip }) {
		if (!ip) {
			logger.warn("MikroTik ROS monitor: No ip detected, skipping");
			return false;
		}

		try {
			await getApi(id, { host: ip, port: 8728, logger });

			return true;
		} catch (error) {
			logger.warn(
				{ error, id },
				"MikroTik ROS monitor: Access failed for node %s",
				id,
			);
			return false;
		}
	},
	async start(ctx, container, node) {
		const { logger, eventEmitter } = ctx;
		const { id, ip, labSessionId, isTemp } = node;

		if (!ip) {
			return logger.warn("MikroTik ROS monitor: No ip detected, skipping");
		}

		try {
			logger.debug("Starting MikroTik ROS network monitor for node %s", id);

			if (!nodeInterfaceMap.has(id)) {
				const interfaces = await this.extractInterfaces(ctx, container, node);
				eventEmitter.emit(
					"interface-update",
					{
						id,
						interfaces,
						labSessionId,
					},
					isTemp,
				);
			}

			const api = await getApi(id, {
				host: ip,
				port: 8728,
				logger,
			});

			const listener = api.menu("/ip address").stream("listen");

			listener.on("data", (data) => {
				if (!data || Array.isArray(data)) return;

				const idMap = nodeInterfaceIdMapping.get(id);
				const interfaces = nodeInterfaceMap.get(id) || {};

				if (!idMap) return;

				const { ".id": ifaceId, address, ".dead": dead } = data;

				if (dead) {
					if (!idMap[ifaceId]) return;

					const { iface, address } = idMap[ifaceId];
					if (!interfaces[iface]) return;

					removeItemFromArray(interfaces[iface], address);
				} else {
					const interfaceData = interfaces[data.interface] ?? [];
					if (!interfaces[data.interface]) {
						interfaces[data.interface] = interfaceData;
					}

					if (idMap[ifaceId]) {
						const index = interfaceData.indexOf(idMap[ifaceId].address);
						if (index === -1) return;

						interfaceData[index] = address;
						idMap[ifaceId].address = address;
					} else {
						idMap[ifaceId] = { iface: data.interface, address };
						interfaceData.push(address);
					}
				}

				eventEmitter.emit(
					"interface-update",
					{ id, labSessionId, interfaces },
					isTemp,
				);
			});
			listener.on("stop", () => {
				logger.debug("Network monitor for node %s ended", id);
				return monitors.delete(id);
			});
			listener.on("error", (error) => {
				logger.error({ error, id }, "Network monitor error for node %s", id);
				this.stop(ctx, node);
			});

			monitors.set(id, listener);
		} catch (error) {
			logger.error(
				{ error, id },
				"Failed to start MikroTik ROS network monitor for node %s",
				id,
			);
		}
	},
	async stop(_, { id }) {
		const client = connections.get(id)?.client;
		const monitor = monitors.get(id);

		if (client || monitor) {
			await monitor?.stop();
			await client?.disconnect();
		}
	},
	async extractInterfaces({ logger }, _, { id, ip }) {
		const existingInterfaces = nodeInterfaceMap.get(id);
		if (existingInterfaces) return existingInterfaces;

		if (!ip) {
			logger.warn("MikroTik ROS monitor: No ip detected, skipping");
			return {};
		}

		try {
			const api = await getApi(id, {
				host: ip,
				port: 8728,
				logger,
			});

			const data: { id: string; interface: string; address: string }[] =
				await api.menu("/ip address").print();
			const idMap: Record<string, { iface: string; address: string }> = {};
			const interfaces = data.reduce(
				(acc, { id, interface: iface, address }) => {
					if (acc[iface]) acc[iface].push(address);
					else acc[iface] = [address];

					idMap[id] = { iface, address };

					return acc;
				},
				{} as Record<string, string[]>,
			);

			nodeInterfaceIdMapping.set(id, idMap);
			nodeInterfaceMap.set(id, interfaces);

			return interfaces;
		} catch (error) {
			logger.warn({ error, id }, "Failed to extract interfaces");
		}

		return {};
	},
} satisfies NetworkMonitor;
