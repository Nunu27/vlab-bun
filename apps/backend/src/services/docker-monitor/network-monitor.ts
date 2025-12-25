import db from "@backend/db";
import { labNodes } from "@backend/db/schema/lab-session";
import Debouncer from "@backend/utils/debouncer";
import type { Container, ContainerInspectInfo } from "dockerode";
import { eq } from "drizzle-orm";
import type { Duplex } from "stream";
import logger from "../logger";
import { extractInterfaces } from "./utils";

const interfaceDebouncer = new Debouncer(750);
const interfaceMonitors = new Map<string, Duplex>();

export async function startInterfaceMonitor(
	container: Container,
	nodeId: string,
	networks: ContainerInspectInfo["NetworkSettings"]["Networks"]
) {
	if (interfaceMonitors.has(nodeId)) return;

	try {
		logger.debug("Starting interface monitor for node %s", nodeId);

		const exec = await container.exec({
			Cmd: ["ip", "monitor", "address", "link"],
			AttachStdout: true,
			AttachStderr: false,
			Tty: false
		});

		const stream = await exec.start({ Detach: false, Tty: false });
		interfaceMonitors.set(nodeId, stream);

		stream.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			if (!text.trim()) return;
			if (text.includes("OCI runtime exec failed")) {
				return stopInterfaceMonitor(nodeId);
			}

			interfaceDebouncer.run(nodeId, async () => {
				await db
					.update(labNodes)
					.set({ interfaces: await extractInterfaces(container, networks) })
					.where(eq(labNodes.id, nodeId));
			});
		});

		stream.on("end", () => {
			logger.debug("Interface monitor for node %s ended", nodeId);
			return interfaceMonitors.delete(nodeId);
		});
		stream.on("error", () => stopInterfaceMonitor(nodeId));
	} catch (err: any) {
		if (err.statusCode !== 409) {
			logger.error({ err, id: nodeId }, "Failed to start interface monitor");
		}
	}
}

export function stopInterfaceMonitor(nodeId: string) {
	const monitor = interfaceMonitors.get(nodeId);

	if (monitor) {
		logger.debug("Stopping interface monitor for node %s", nodeId);
		monitor.destroy();
		interfaceMonitors.delete(nodeId);
	}
}
