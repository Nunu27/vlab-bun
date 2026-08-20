import type { PassThrough } from "node:stream";
import { execLines, execOutput } from "../exec";
import type { NetworkMonitor, NodeInterfaces } from "../types";
import { removeItemFromArray } from "../utils";

type AddrEntry = {
	ifname: string;
	addr_info?: Array<{ family: string; local: string; prefixlen: number }>;
};

const streams = new Map<string, PassThrough>();
// Node ids whose stream close was requested by stop()/stopAll(), so the
// close handler below can tell an intentional teardown apart from the
// docker exec pipe dying on its own (which must reject to trigger a retry).
const stopping = new Set<string>();

function parseAddrJson(json: string): NodeInterfaces {
	const entries = JSON.parse(json) as AddrEntry[];
	const interfaces: NodeInterfaces = {};

	entries.forEach((entry) => {
		if (entry.ifname === "lo") return;
		if (!entry.addr_info) return;

		const ipv4 = entry.addr_info.filter((a) => a.family === "inet");

		interfaces[entry.ifname] = ipv4.map((a) => `${a.local}/${a.prefixlen}`);
	});

	return interfaces;
}

export default {
	async read({ docker }, { container }) {
		const output = await execOutput(docker, container, ["ip", "-j", "addr"]);

		return parseAddrJson(output);
	},
	async start({ docker, interfaceMap, emitter }, { container, info: node }) {
		if (streams.has(node.id)) return;

		await new Promise((_, reject) => {
			execLines(
				docker,
				container,
				["ip", "-o", "monitor", "address"],
				async (line) => {
					if (!line.trim()) return;

					const [info, data] = line.split(": ", 2);
					const [iface, type, ip] = data?.split(/\s+/, 4) ?? [];

					if (!iface || !type || !ip) return;
					if (type !== "inet") return;

					const interfaces = interfaceMap.get(node.id) ?? {};
					interfaceMap.set(node.id, interfaces);

					const addresses = interfaces[iface] ?? [];
					interfaces[iface] = addresses;

					if (info?.startsWith("Deleted")) {
						if (!addresses.includes(ip)) return;
						removeItemFromArray(addresses, ip);
					} else {
						if (addresses.includes(ip)) return;
						addresses.push(ip);
					}

					emitter.emit("interface-update", node, interfaces);
				},
				(error) => reject(error),
			).then((stream) => {
				stream.on("close", () => {
					// A newer stream may have already replaced this one for the
					// same node id (rapid stop-then-restart); only touch shared
					// state if this close still belongs to the registered stream.
					if (streams.get(node.id) !== stream) return;

					streams.delete(node.id);
					if (!stopping.delete(node.id)) {
						reject(
							new Error(
								`Interface monitor stream for ${node.id} closed unexpectedly`,
							),
						);
					}
				});
				streams.set(node.id, stream);
			}, reject);
		});
	},
	stop(_, { info: { id } }) {
		const stream = streams.get(id);
		if (!stream || stopping.has(id)) return;

		stopping.add(id);
		stream.destroy();
		streams.delete(id);
	},
	stopAll(_) {
		const ids = [...streams.keys()].filter((id) => !stopping.has(id));
		for (const id of ids) stopping.add(id);

		for (const id of ids) streams.get(id)?.destroy();
		for (const id of ids) streams.delete(id);
	},
} satisfies NetworkMonitor;
