import type { PassThrough } from "node:stream";
import { execLines, execOutput } from "../exec";
import type { NetworkMonitor, NodeInterfaces } from "../types";
import { removeItemFromArray } from "../utils";

type AddrEntry = {
	ifname: string;
	addr_info?: Array<{ family: string; local: string; prefixlen: number }>;
};

const streams = new Map<string, PassThrough>();

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
				stream.on("close", () => streams.delete(node.id));
				streams.set(node.id, stream);
			}, reject);
		});
	},
	stop(_, { info: { id } }) {
		streams.get(id)?.destroy();
		streams.delete(id);
	},
	stopAll(_) {
		for (const stream of streams.values()) {
			stream.destroy();
		}
		streams.clear();
	},
} satisfies NetworkMonitor;
