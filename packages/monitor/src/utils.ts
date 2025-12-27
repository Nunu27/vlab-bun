import type { ContainerInspectInfo } from "dockerode";

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
		const hostPort = parseInt(bindings[0]!.HostPort);

		if (!isNaN(containerPort) && !isNaN(hostPort)) {
			portMappings[containerPort] = hostPort;
		}
	}

	return portMappings;
}
