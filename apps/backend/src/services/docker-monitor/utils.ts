import type { LabNodeInterfaceData } from "@backend/db/schema/lab-session";
import type { DockerEvent } from "@backend/types/docker";
import type { Container, ContainerInspectInfo } from "dockerode";
import logger from "../logger";

export type ContainerEvent = Extract<DockerEvent, { Type: "container" }>;

export function isKey<T extends object>(
	key: PropertyKey,
	obj: T
): key is keyof T {
	return key in obj;
}

export function extractPortMappings(inspect: ContainerInspectInfo) {
	const portMappings: Record<number, number> = {};

	for (const [containerPortKey, bindings] of Object.entries(
		inspect.NetworkSettings?.Ports
	)) {
		if (!bindings || bindings.length === 0) continue;

		const containerPort = parseInt(containerPortKey);
		const hostPort = parseInt(bindings[0].HostPort);

		if (!isNaN(containerPort) && !isNaN(hostPort)) {
			portMappings[containerPort] = hostPort;
		}
	}

	return portMappings;
}

export async function extractInterfaces(
	container: Container,
	networks: ContainerInspectInfo["NetworkSettings"]["Networks"]
) {
	const interfaces: Record<string, LabNodeInterfaceData> = {};

	try {
		const exec = await container.exec({
			Cmd: ["ip", "-j", "addr", "show"],
			AttachStdout: true,
			AttachStderr: false,
			Tty: true
		});

		const stream = await exec.start({ Detach: false, Tty: true });
		let output = "";

		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				stream.destroy();
				reject(new Error("Timeout extracting interfaces"));
			}, 3000);

			stream.on("data", (chunk) => (output += chunk.toString()));
			stream.on("end", () => {
				clearTimeout(timer);
				resolve();
			});
			stream.on("error", (err) => {
				clearTimeout(timer);
				reject(err);
			});
		});

		const cleanOutput = output.replace(/^[^{[]+/, "");

		try {
			const data = JSON.parse(cleanOutput);
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
			return await extractInterfacesFromFilesystem(container, networks);
		}
	} catch (err: any) {
		if (![409, 404].includes(err.statusCode)) {
			logger.warn({ err, id: container.id }, "Failed to extract interfaces");
		}
	}
	return interfaces;
}

async function extractInterfacesFromFilesystem(
	container: Container,
	networks: ContainerInspectInfo["NetworkSettings"]["Networks"]
) {
	const interfaces: Record<string, LabNodeInterfaceData> = {};
	const macLookup = new Map<string, string>();

	for (const net of Object.values(networks)) {
		if (net?.MacAddress) {
			macLookup.set(net.MacAddress.toLowerCase(), net.IPAddress);
		}
	}

	try {
		const exec = await container.exec({
			Cmd: [
				"sh",
				"-c",
				'for p in /sys/class/net/*; do echo "${p##*/}"; cat "$p/address"; cat "$p/operstate"; echo "__END__"; done'
			],
			AttachStdout: true,
			AttachStderr: false,
			Tty: false
		});

		const stream = await exec.start({ Detach: false, Tty: false });
		let data = "";

		await new Promise<void>((resolve, reject) => {
			stream.on("data", (c) => (data += c.toString()));
			stream.on("end", resolve);
			stream.on("error", reject);
			setTimeout(() => {
				stream.destroy();
				reject(new Error("Timeout"));
			}, 3000);
		});

		const parts = data.split("__END__");
		for (const part of parts) {
			const cleanPart = part.replace(/[\x00-\x1F\x7F]/g, "\n");
			const lines = cleanPart
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean);

			if (lines.length < 3) continue;

			const name = lines[0];
			if (name === "lo") continue;

			const mac = lines[1].toLowerCase();
			const state = lines[2].toLowerCase();

			interfaces[name] = {
				state: state === "up" ? "UP" : "DOWN",
				macAddress: mac,
				ipAddress: macLookup.get(mac)
			};
		}
	} catch (err: any) {
		if (err.statusCode !== 409) {
			logger.debug({ err }, "Filesystem interface extraction failed");
		}
	}

	return interfaces;
}
