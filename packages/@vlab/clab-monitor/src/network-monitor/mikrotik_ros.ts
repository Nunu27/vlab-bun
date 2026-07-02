import type { Container } from "dockerode";
import { RouterOSClient, type RouterOSStream } from "mikro-routeros";
import type { Logger } from "pino";
import type { NetworkMonitor } from "../types";
import { extractCredentials, removeItemFromArray } from "../utils";

const monitors = new Map<string, RouterOSStream>();
const connections = new Map<string, RouterOSClient>();
const nodeInterfaceIdMapping = new Map<
	string,
	Record<string, { iface: string; address: string }>
>();

// Containerlab injects the node's resolved credentials as USERNAME/PASSWORD
// env vars on vrnetlab-backed containers, so read them straight from the
// running container instead of assuming a fixed login.
async function getCredentials(container: Container) {
	const { Config } = await container.inspect();
	return extractCredentials(Config.Env);
}

const getApi = async (
	id: string,
	{
		logger,
		...options
	}: {
		host: string;
		port: number;
		username: string;
		password: string;
		logger: Pick<Logger, "info" | "error" | "debug" | "warn">;
	},
) => {
	const client = connections.get(id);

	if (!client) {
		const client = new RouterOSClient(options.host, options.port);

		await client.connect();
		await client.login(options.username, options.password);

		connections.set(id, client);

		return client;
	} else return client;
};

export default {
	async start(ctx, container, node) {
		const { logger, emitInterfaceUpdate, nodeInterfaceMap } = ctx;
		const { id, ip } = node;

		if (!ip) {
			return logger.warn("MikroTik ROS monitor: No ip detected, skipping");
		}

		try {
			logger.debug("Starting MikroTik ROS network monitor for node %s", id);

			if (!nodeInterfaceMap.has(id)) {
				const interfaces = await this.extractInterfaces(ctx, container, node);
				emitInterfaceUpdate({ id, interfaces });
			}

			const { username, password } = await getCredentials(container);
			const api = await getApi(id, {
				host: ip,
				port: 8728,
				username,
				password,
				logger,
			});

			const listener = await api.stream("/ip/address/listen");

			listener.on("data", (data) => {
				const idMap = nodeInterfaceIdMapping.get(id);
				const interfaces = nodeInterfaceMap.get(id) || {};

				if (!idMap) return;

				const { ".id": ifaceId, address, ".dead": dead } = data;

				if (dead) {
					if (!idMap[ifaceId]) return;

					const { iface, address } = idMap[ifaceId];
					delete idMap[ifaceId];

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

				emitInterfaceUpdate({ id, interfaces });
			});
			listener.on("stop", () => {
				logger.debug("Network monitor for node %s ended", id);
				return monitors.delete(id);
			});
			listener.on("error", (error) => {
				logger.error(
					{ err: error, id },
					"Network monitor error for node %s",
					id,
				);
				this.stop(ctx, node);
			});

			monitors.set(id, listener);
		} catch (error) {
			logger.error(
				{ err: error, id },
				"Failed to start MikroTik ROS network monitor for node %s",
				id,
			);
		}
	},
	async stop({ logger, nodeInterfaceMap }, { id }) {
		const client = connections.get(id);
		const monitor = monitors.get(id);

		if (client || monitor) {
			try {
				if (monitor) await monitor.cancel();
				if (client) client.close();
			} catch (error) {
				logger.error(
					{ err: error, id },
					"Error stopping MikroTik ROS monitor for node %s",
					id,
				);
			} finally {
				connections.delete(id);
				monitors.delete(id);
				nodeInterfaceIdMapping.delete(id);
				nodeInterfaceMap.delete(id);
			}
		}
	},
	async extractInterfaces({ logger, nodeInterfaceMap }, container, { id, ip }) {
		const existingInterfaces = nodeInterfaceMap.get(id);
		if (existingInterfaces) return existingInterfaces;

		if (!ip) {
			logger.warn("MikroTik ROS monitor: No ip detected, skipping");
			return {};
		}

		try {
			const { username, password } = await getCredentials(container);
			const api = await getApi(id, {
				host: ip,
				port: 8728,
				username,
				password,
				logger,
			});

			const data: { ".id": string; interface: string; address: string }[] =
				await api.runQuery("/ip/address/print");
			const idMap: Record<string, { iface: string; address: string }> = {};
			const interfaces = data.reduce(
				(acc, { ".id": id, interface: iface, address }) => {
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
			logger.warn({ err: error, id }, "Failed to extract interfaces");
		}

		return {};
	},
} satisfies NetworkMonitor;
