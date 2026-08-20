import { RouterOSClient, type RouterOSStream } from "mikro-routeros";
import type { NetworkMonitor, NodeCredentials } from "../types";
import { removeItemFromArray } from "../utils";

const listeners = new Map<string, RouterOSStream>();
// Node ids whose listener cancellation was requested by stop()/stopAll(), so
// the "stop" handler below can tell an intentional teardown apart from the
// RouterOS API subscription dying on its own (which must reject to trigger
// network/index.ts's retry loop).
const stopping = new Set<string>();
const connections = new Map<string, RouterOSClient>();
const pendingConnections = new Map<string, Promise<RouterOSClient>>();

type InterfaceMapping = Map<string, { iface: string; address: string }>;
const interfaceIdMapping = new Map<string, InterfaceMapping>();

async function getApi(
	id: string,
	options: { host: string; port: number; credentials: NodeCredentials },
): Promise<RouterOSClient> {
	const existing = connections.get(id);
	if (existing) return existing;

	const pending = pendingConnections.get(id);
	if (pending) return pending;

	const { username = "admin", password = "admin" } = options.credentials;

	const promise = (async () => {
		const client = new RouterOSClient(options.host, options.port);

		await client.connect();
		await client.login(username, password);

		pendingConnections.delete(id);

		return client;
	})();

	pendingConnections.set(id, promise);

	return promise;
}

export default {
	async read(_, { info, details }) {
		const api = await getApi(info.id, {
			host: details.ip,
			port: 8728,
			credentials: details.credentials,
		});

		const data: { ".id": string; interface: string; address: string }[] =
			await api.runQuery("/ip/address/print");
		const idMap: InterfaceMapping = new Map();
		const interfaces = data.reduce(
			(acc, { ".id": id, interface: iface, address }) => {
				if (acc[iface]) acc[iface].push(address);
				else acc[iface] = [address];

				idMap.set(id, { iface, address });

				return acc;
			},
			{} as Record<string, string[]>,
		);

		interfaceIdMapping.set(info.id, idMap);

		return interfaces;
	},
	async start({ interfaceMap, emitter }, { info, details }) {
		if (listeners.has(info.id)) return;

		const api = await getApi(info.id, {
			host: details.ip,
			port: 8728,
			credentials: details.credentials,
		});

		const listener = await api.stream("/ip/address/listen");
		listeners.set(info.id, listener);

		await new Promise((_, reject) => {
			listener.on("data", (data) => {
				if (!interfaceIdMapping.has(info.id))
					interfaceIdMapping.set(info.id, new Map());
				let idMap = interfaceIdMapping.get(info.id);
				if (!idMap) {
					idMap = new Map();
					interfaceIdMapping.set(info.id, idMap);
				}

				const interfaces = interfaceMap.get(info.id) ?? {};
				interfaceMap.set(info.id, interfaces);

				const { ".id": ifaceId, address, ".dead": dead } = data;

				if (dead) {
					const entry = idMap.get(ifaceId);
					if (!entry) return;

					const { iface, address: oldAddress } = entry;
					idMap.delete(ifaceId);

					if (!interfaces[iface]) return;

					removeItemFromArray(interfaces[iface], oldAddress);
				} else {
					const interfaceData = interfaces[data.interface] ?? [];
					interfaces[data.interface] = interfaceData;

					const entry = idMap.get(ifaceId);

					if (entry) {
						const index = interfaceData.indexOf(entry.address);
						if (index === -1) interfaceData.push(address);
						else interfaceData[index] = address;
						entry.address = address;
					} else {
						idMap.set(ifaceId, { iface: data.interface, address });
						interfaceData.push(address);
					}
				}

				emitter.emit("interface-update", info, interfaces);
			});
			listener.on("stop", () => {
				// A newer listener may have already replaced this one for the
				// same node id (rapid stop-then-restart); only touch shared
				// state if this stop still belongs to the registered listener.
				if (listeners.get(info.id) !== listener) return;

				listeners.delete(info.id);
				if (!stopping.delete(info.id)) {
					reject(
						new Error(`Interface listener for ${info.id} stopped unexpectedly`),
					);
				}
			});
			listener.on("error", (error) => {
				if (listeners.get(info.id) === listener) {
					listeners.delete(info.id);
					stopping.delete(info.id);
				}
				reject(error);
			});
		});
	},
	async stop(_, { info: node }) {
		const listener = listeners.get(node.id);
		if (!listener || stopping.has(node.id)) return;

		stopping.add(node.id);
		await listener.cancel();
		listeners.delete(node.id);
	},
	async stopAll(_) {
		const ids = [...listeners.keys()].filter((id) => !stopping.has(id));
		for (const id of ids) stopping.add(id);

		for (const id of ids) {
			await listeners.get(id)?.cancel();
		}
		for (const id of ids) listeners.delete(id);
	},
} satisfies NetworkMonitor;
