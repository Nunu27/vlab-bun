import { type Duplex, PassThrough } from "node:stream";
import { sleep } from "bun";
import type { NetworkMonitor } from "../types";
import { removeItemFromArray } from "../utils";

const monitors = new Map<string, Duplex>();

export default {
	async start(ctx, container, node) {
		const { docker, logger, emitInterfaceUpdate, nodeInterfaceMap } = ctx;
		const { id } = node;

		if (monitors.has(id)) return;

		try {
			logger.debug("Starting Linux interface monitor for node %s", id);

			const exec = await container.exec({
				Cmd: ["ip", "-o", "monitor", "address"],
				AttachStdout: true,
				AttachStderr: false,
				Tty: false,
			});

			const stream = new PassThrough();
			const rawStream = await exec.start({ Detach: false, Tty: false });
			docker.modem.demuxStream(rawStream, stream, process.stderr);
			monitors.set(id, rawStream);

			stream.on("data", async (chunk: Buffer) => {
				const text = chunk.toString();
				if (!text.trim()) return;
				if (text.includes("OCI runtime exec failed")) {
					return this.stop(ctx, node);
				}

				const [info, data] = text.split(": ", 2);
				const [iface, type, ip] = data?.split(/\s+/, 4) ?? [];

				if (!iface || !type || !ip) return;

				const interfaces = nodeInterfaceMap.get(id) || {};

				if (type !== "inet") return;
				if (!interfaces[iface]) interfaces[iface] = [];

				if (info?.startsWith("Deleted")) {
					// Event might come from node being destroyed
					await sleep(500);

					// stop() already cleared this node's tracking, discard the stale event
					if (!nodeInterfaceMap.has(id)) return;
					removeItemFromArray(interfaces[iface] ?? [], ip);
				} else {
					interfaces[iface]?.push(ip);
				}

				emitInterfaceUpdate({ id, interfaces });
			});

			rawStream.on("end", () => {
				logger.debug("Network monitor for node %s ended", id);
				return monitors.delete(id);
			});
			rawStream.on("error", (error) => {
				logger.error(
					{ err: error, id },
					"Network monitor error for node %s",
					id,
				);
				this.stop(ctx, node);
			});
		} catch (error) {
			if (
				error instanceof Error &&
				"statusCode" in error &&
				typeof error.statusCode === "number" &&
				![409, 404].includes(error.statusCode)
			) {
				logger.error({ err: error, id }, "Failed to start network monitor");
			}
		}
	},
	stop({ nodeInterfaceMap }, { id }) {
		nodeInterfaceMap.delete(id);
		const monitor = monitors.get(id);

		if (monitor) {
			monitor.destroy();
			monitors.delete(id);
		}
	},
	async extractInterfaces(ctx, container, { id }) {
		const { docker, logger, nodeInterfaceMap } = ctx;
		const interfaces = nodeInterfaceMap.get(id) || {};
		if (nodeInterfaceMap.has(id)) return interfaces;

		try {
			const exec = await container.exec({
				Cmd: ["ip", "-j", "addr"],
				AttachStdout: true,
				AttachStderr: false,
				Tty: false,
			});

			const stream = new PassThrough();
			const abortSignal = AbortSignal.timeout(3000);
			const rawStream = await exec.start({
				Detach: false,
				Tty: false,
				abortSignal,
			});

			docker.modem.demuxStream(rawStream, stream, process.stderr);

			const output = await new Promise<string>((resolve, reject) => {
				let data = "";

				stream.on("data", (chunk: Buffer) => {
					data += chunk.toString();
				});
				rawStream.on("end", () => {
					resolve(data.replace(/^[^{[]+/, ""));
				});
				rawStream.on("error", reject);
			});

			try {
				const data = JSON.parse(output);

				for (const { ifname, addr_info } of data) {
					if (ifname === "lo") continue;

					const ipv4 =
						addr_info?.filter((a: { family: string }) => a.family === "inet") ||
						[];

					interfaces[ifname] = ipv4?.map(
						(a: { local: string; prefixlen: number }) =>
							`${a.local}/${a.prefixlen}`,
					);
				}
			} catch (error) {
				logger.debug({ err: error, data: output }, "JSON parsing failed");
			}
		} catch (error) {
			if (
				error instanceof Error &&
				"statusCode" in error &&
				typeof error.statusCode === "number" &&
				![409, 404].includes(error.statusCode)
			) {
				logger.warn({ err: error, id }, "Failed to extract interfaces");
			}
		}

		nodeInterfaceMap.set(id, interfaces);

		return interfaces;
	},
} satisfies NetworkMonitor;
