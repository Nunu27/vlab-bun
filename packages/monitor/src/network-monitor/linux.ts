import type { Duplex } from "stream";
import type { NetworkMonitor } from "../types";
import type { LabNodeInterfaceData } from "@vlab/shared/schemas";

const monitors = new Map<string, Duplex>();
const nodeInterfaceMap = new Map<
	string,
	Record<string, LabNodeInterfaceData>
>();

export default {
	async start(ctx, container, node) {
		const { logger, eventEmitter } = ctx;
		const { id, labSessionId } = node;

		if (monitors.has(id)) return;

		try {
			logger.debug("Starting interface monitor for node %s", id);

			const exec = await container.exec({
				Cmd: ["ip", "monitor", "address", "link"],
				AttachStdout: true,
				AttachStderr: false,
				Tty: false
			});

			const stream = await exec.start({ Detach: false, Tty: false });
			monitors.set(id, stream);

			stream.on("data", (chunk: Buffer) => {
				const text = chunk.toString();
				if (!text.trim()) return;
				if (text.includes("OCI runtime exec failed")) {
					return this.stop(ctx, node);
				}

				logger.debug("Interface update for node %s: %s", id, text.trim());
				const interfaces = nodeInterfaceMap.get(id) || {};

				eventEmitter.emit("interface-update", { id, labSessionId, interfaces });
			});

			stream.on("end", () => {
				logger.debug("Interface monitor for node %s ended", id);
				return monitors.delete(id);
			});
			stream.on("error", () => this.stop(ctx, node));
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
				Tty: true
			});

			const abortSignal = AbortSignal.timeout(3000);
			const stream = await exec.start({
				Detach: false,
				Tty: true,
				abortSignal
			});

			const output = await new Promise<string>((resolve, reject) => {
				docker.modem.followProgress(stream, (err, results) => {
					if (err) {
						reject(err);
						return;
					}

					resolve(
						results.reduce((acc, curr) => acc + curr, "").replace(/^[^{[]+/, "")
					);
				});
			});

			try {
				const data = JSON.parse(output);
				for (const iface of data) {
					if (iface.ifname === "lo") continue;

					const ipv4 = iface.addr_info?.find((a: any) => a.family === "inet");

					interfaces[iface.ifname] = {
						state: iface.operstate === "UP" ? "UP" : "DOWN",
						macAddress: iface.address,
						ipAddress: ipv4?.local
					};
				}
				return interfaces;
			} catch (e) {
				logger.debug(
					{ err: e },
					"JSON parsing failed, falling back to filesystem"
				);
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
