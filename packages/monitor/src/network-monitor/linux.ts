import { PassThrough, type Duplex } from "stream";
import type { NetworkMonitor } from "../types";
import type { LabNodeInterfaceData } from "@vlab/shared/schemas";

const monitors = new Map<string, Duplex>();
const nodeInterfaceMap = new Map<
	string,
	Record<string, LabNodeInterfaceData>
>();

export default {
	async start(ctx, container, node) {
		const { docker, logger, eventEmitter } = ctx;
		const { id, labSessionId } = node;

		if (monitors.has(id)) return;

		try {
			logger.debug("Starting interface monitor for node %s", id);

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

				logger.debug("Interface update for node %s: %s", id, text);
				const [info, data] = text.split(": ", 2);
				const [iface, type, ip] = data!.split(/\s+/, 4);

				const interfaces = nodeInterfaceMap.get(id) || {};
				if (!interfaces || type !== "inet" || !(iface! in interfaces)) return;

				if (info?.startsWith("Deleted")) {
					const index = interfaces[iface!]!.ipAddress.indexOf(ip!);
					if (index === -1 || !interfaces[iface!]!.ipAddress.length) return;

					interfaces[iface!]!.ipAddress[index] =
						interfaces[iface!]!.ipAddress.at(-1)!;
					interfaces[iface!]!.ipAddress.pop();
				} else {
					interfaces[iface!]!.ipAddress.push(ip!);
				}

				eventEmitter.emit("interface-update", { id, labSessionId, interfaces });
			});

			rawStream.on("end", () => {
				logger.debug("Interface monitor for node %s ended", id);
				return monitors.delete(id);
			});
			rawStream.on("error", (e) => {
				logger.error({ err: e, id }, "Interface monitor error for node %s", id);
				this.stop(ctx, node);
			});
		} catch (err: any) {
			if (err.statusCode !== 409) {
				logger.error({ err, id }, "Failed to start interface monitor");
			}
		}
	},
	stop({ logger }, { id }) {
		const monitor = monitors.get(id);

		if (monitor) {
			logger.debug("Stopping interface monitor for node %s", id);
			monitor.destroy();
			monitors.delete(id);
		}
	},
	async extractInterfaces({ docker, logger }, container, { id }) {
		const interfaces: Record<string, LabNodeInterfaceData> = {};

		try {
			const exec = await container.exec({
				Cmd: ["ip", "-j", "addr", "show"],
				AttachStdout: true,
				AttachStderr: false,
				Tty: false
			});

			let output = "";
			const stream = new PassThrough();
			const abortSignal = AbortSignal.timeout(3000);
			const rawStream = await exec.start({
				Detach: false,
				Tty: false,
				abortSignal
			});

			docker.modem.demuxStream(rawStream, stream, process.stderr);

			await new Promise<void>((resolve, reject) => {
				stream.on("data", (chunk) => (output += chunk.toString()));
				rawStream.on("end", () => {
					output = output.replace(/^[^{[]+/, "");
					resolve();
				});
				rawStream.on("error", reject);
			});

			try {
				const data = JSON.parse(output);
				for (const iface of data) {
					if (iface.ifname === "lo") continue;

					const ipv4 = iface.addr_info?.filter((a: any) => a.family === "inet");

					interfaces[iface.ifname] = {
						state: iface.operstate === "UP" ? "UP" : "DOWN",
						macAddress: iface.address,
						ipAddress: ipv4?.map((a: any) => `${a.local}/${a.prefixlen}`) || []
					};
				}
			} catch (e) {
				logger.debug({ err: e, data: output }, "JSON parsing failed");
			}
		} catch (err: any) {
			if (![409, 404].includes(err.statusCode)) {
				logger.warn({ err, id: container.id }, "Failed to extract interfaces");
			}
		}

		nodeInterfaceMap.set(id, interfaces);

		return interfaces;
	}
} satisfies NetworkMonitor;
