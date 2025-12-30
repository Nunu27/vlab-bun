import { PassThrough, type Duplex } from "stream";
import type { NetworkMonitor } from "../types";
import { removeItemFromArray } from "../utils";

const monitors = new Map<string, Duplex>();
const nodeInterfaceMap = new Map<string, Record<string, string[]>>();

export default {
	async start(ctx, container, node) {
		const { docker, logger, eventEmitter } = ctx;
		const { id, labSessionId } = node;

		if (monitors.has(id)) return;

		try {
			logger.debug("Starting Linux interface monitor for node %s", id);

			const exec = await container.exec({
				Cmd: ["ip", "-o", "monitor", "address", "link"],
				AttachStdout: true,
				AttachStderr: false,
				Tty: false
			});

			const stream = new PassThrough();
			const rawStream = await exec.start({ Detach: false, Tty: false });
			docker.modem.demuxStream(rawStream, stream, process.stderr);
			monitors.set(id, rawStream);

			stream.on("data", (chunk: Buffer) => {
				const text = chunk.toString();
				if (!text.trim()) return;
				if (text.includes("OCI runtime exec failed")) {
					return this.stop(ctx, node);
				}

				const [info, data] = text.split(": ", 2);
				const [iface, type, ip] = data!.split(/\s+/, 4);

				const interfaces = nodeInterfaceMap.get(id) || {};
				if (type !== "inet" || !(iface! in interfaces)) return;

				if (info?.startsWith("Deleted")) {
					removeItemFromArray(interfaces[iface!]!, ip!);
				} else {
					interfaces[iface!]!.push(ip!);
				}

				eventEmitter.emit("interface-update", { id, labSessionId, interfaces });
			});

			rawStream.on("end", () => {
				logger.debug("Network monitor for node %s ended", id);
				return monitors.delete(id);
			});
			rawStream.on("error", (error) => {
				logger.error({ error, id }, "Network monitor error for node %s", id);
				this.stop(ctx, node);
			});
		} catch (error: any) {
			if (error.statusCode !== 409) {
				logger.error({ error, id }, "Failed to start network monitor");
			}
		}
	},
	stop(_, { id }) {
		const monitor = monitors.get(id);

		if (monitor) {
			monitor.destroy();
			monitors.delete(id);
		}
	},
	async extractInterfaces({ docker, logger }, container, { id }) {
		const interfaces = nodeInterfaceMap.get(id) || {};
		if (nodeInterfaceMap.has(id)) return interfaces;

		try {
			const exec = await container.exec({
				Cmd: ["ip", "-j", "addr", "show"],
				AttachStdout: true,
				AttachStderr: false,
				Tty: false
			});

			const stream = new PassThrough();
			const abortSignal = AbortSignal.timeout(3000);
			const rawStream = await exec.start({
				Detach: false,
				Tty: false,
				abortSignal
			});

			docker.modem.demuxStream(rawStream, stream, process.stderr);

			const output = await new Promise<string>((resolve, reject) => {
				let data = "";

				stream.on("data", (chunk) => (data += chunk.toString()));
				rawStream.on("end", () => {
					resolve(data.replace(/^[^{[]+/, ""));
				});
				rawStream.on("error", reject);
			});

			try {
				const data = JSON.parse(output);

				for (const { ifname, addr_info } of data) {
					if (ifname === "lo") continue;

					const ipv4: any[] =
						addr_info?.filter((a: any) => a.family === "inet") || [];

					interfaces[ifname] = ipv4?.map((a) => `${a.local}/${a.prefixlen}`);
				}
			} catch (error) {
				logger.debug({ error, data: output }, "JSON parsing failed");
			}
		} catch (error: any) {
			if (![409, 404].includes(error.statusCode)) {
				logger.warn({ error, id }, "Failed to extract interfaces");
			}
		}

		nodeInterfaceMap.set(id, interfaces);

		return interfaces;
	}
} satisfies NetworkMonitor;
